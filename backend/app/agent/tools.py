"""
Tool functions for the FinAudit AI agent.
Each function queries PostgreSQL and returns plain dicts/lists
that Gemini can read as function-call results.
"""

from datetime import date, timedelta
from app.database import get_cursor


# ── 1. get_all_transactions ──────────────────────────────────

def get_all_transactions(limit: int = 20) -> list[dict]:
    """Fetch the most recent transactions with vendor and category names."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT t.txn_id, t.amount, t.date, t.description,
                   v.vendor_name, c.category_name,
                   t.vendor_id, t.company_id, t.category_id
            FROM transactions t
            JOIN vendors v ON t.vendor_id = v.vendor_id
            JOIN categories c ON t.category_id = c.category_id
            ORDER BY t.date DESC, t.txn_id DESC
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        # Convert date objects to strings for JSON serialization
        for r in rows:
            r["date"] = str(r["date"])
        return rows


# ── 2. get_vendor_profile ────────────────────────────────────

def get_vendor_profile(vendor_id: int) -> dict:
    """Return vendor info + stats + number of flags on its transactions."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT v.vendor_id, v.vendor_name, v.company_id, v.created_at,
                   vs.avg_amount, vs.txn_count, vs.max_amount, vs.min_amount,
                   (SELECT COUNT(*) FROM audit_flags af
                    JOIN transactions t ON af.txn_id = t.txn_id
                    WHERE t.vendor_id = v.vendor_id) AS flag_count
            FROM vendors v
            LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
            WHERE v.vendor_id = %s
        """, (vendor_id,))
        row = cur.fetchone()
        if row:
            row["created_at"] = str(row["created_at"]) if row["created_at"] else None
        return row or {"error": f"Vendor {vendor_id} not found"}


# ── 3. get_audit_flags ───────────────────────────────────────

def get_audit_flags(severity: str | None = None) -> list[dict]:
    """Fetch flags from flagged_transactions_view, optionally filtered by severity."""
    with get_cursor() as cur:
        if severity:
            cur.execute("""
                SELECT flag_id, severity, reason, reviewed, flagged_at,
                       txn_id, amount, date, vendor_name, category_name,
                       vendor_avg, pct_above_avg
                FROM flagged_transactions_view
                WHERE severity = %s
                ORDER BY flagged_at DESC
            """, (severity,))
        else:
            cur.execute("""
                SELECT flag_id, severity, reason, reviewed, flagged_at,
                       txn_id, amount, date, vendor_name, category_name,
                       vendor_avg, pct_above_avg
                FROM flagged_transactions_view
                ORDER BY flagged_at DESC
            """)
        rows = cur.fetchall()
        for r in rows:
            r["flagged_at"] = str(r["flagged_at"]) if r["flagged_at"] else None
            r["date"] = str(r["date"])
            r["pct_above_avg"] = float(r["pct_above_avg"]) if r["pct_above_avg"] is not None else None
        return rows


# ── 4. insert_audit_flag ─────────────────────────────────────

def insert_audit_flag(txn_id: int, reason: str, severity: str) -> dict:
    """Insert a new audit flag for a transaction. Returns the created flag."""
    # Map severity to rule_id for traceability
    severity_upper = severity.capitalize()
    if severity_upper not in ("High", "Medium", "Low"):
        return {"error": f"Invalid severity '{severity}'. Must be High, Medium, or Low."}

    with get_cursor() as cur:
        # Check that the transaction exists
        cur.execute("SELECT txn_id FROM transactions WHERE txn_id = %s", (txn_id,))
        if not cur.fetchone():
            return {"error": f"Transaction {txn_id} not found"}

        # Check for duplicate flag (same txn + same reason)
        cur.execute(
            "SELECT flag_id FROM audit_flags WHERE txn_id = %s AND reason = %s",
            (txn_id, reason),
        )
        if cur.fetchone():
            return {"skipped": True, "message": f"Flag already exists for txn {txn_id} with this reason"}

        cur.execute("""
            INSERT INTO audit_flags (txn_id, severity, reason)
            VALUES (%s, %s, %s)
            RETURNING flag_id, txn_id, severity, reason, reviewed, created_at
        """, (txn_id, severity_upper, reason))
        row = cur.fetchone()
        row["created_at"] = str(row["created_at"])
        return row


# ── 5. run_anomaly_scan ──────────────────────────────────────

def run_anomaly_scan() -> list[dict]:
    """Check ALL transactions against active audit_rules thresholds.
    Returns a list of suspicious transactions with rule names and reasons."""
    suspicious = []

    with get_cursor() as cur:
        # Load active rules
        cur.execute("SELECT * FROM audit_rules WHERE is_active = true")
        rules = {r["rule_name"]: r for r in cur.fetchall()}

        # Load all transactions with vendor info
        cur.execute("""
            SELECT t.txn_id, t.amount, t.date, t.description,
                   t.vendor_id, t.company_id,
                   v.vendor_name, v.created_at AS vendor_created_at,
                   vs.avg_amount, vs.txn_count
            FROM transactions t
            JOIN vendors v ON t.vendor_id = v.vendor_id
            LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
            ORDER BY t.txn_id
        """)
        transactions = cur.fetchall()

        for txn in transactions:
            txn_id = txn["txn_id"]
            amount = txn["amount"]
            vendor_avg = txn["avg_amount"] or 0
            vendor_name = txn["vendor_name"]
            txn_date = txn["date"]

            # Rule 1: HIGH_AMOUNT_DEVIATION
            rule = rules.get("HIGH_AMOUNT_DEVIATION")
            if rule and vendor_avg > 0:
                threshold_mult = rule["threshold"]  # 2x
                if amount > vendor_avg * threshold_mult:
                    pct = round((amount - vendor_avg) / vendor_avg * 100, 1)
                    suspicious.append({
                        "txn_id": txn_id,
                        "rule_name": "HIGH_AMOUNT_DEVIATION",
                        "rule_id": rule["rule_id"],
                        "severity": "High",
                        "amount": amount,
                        "vendor_name": vendor_name,
                        "reason": (
                            f"Transaction ${amount:,.2f} is {pct}% above "
                            f"vendor avg ${vendor_avg:,.2f} (>{threshold_mult}x threshold)"
                        ),
                    })

            # Rule 2: NEW_VENDOR_LARGE_TXN
            rule = rules.get("NEW_VENDOR_LARGE_TXN")
            if rule:
                txn_count = txn["txn_count"] or 0
                if txn_count <= 1 and amount > rule["threshold"]:
                    suspicious.append({
                        "txn_id": txn_id,
                        "rule_name": "NEW_VENDOR_LARGE_TXN",
                        "rule_id": rule["rule_id"],
                        "severity": "High",
                        "amount": amount,
                        "vendor_name": vendor_name,
                        "reason": (
                            f"Large first transaction ${amount:,.2f} with vendor "
                            f"'{vendor_name}' (threshold: ${rule['threshold']:,.2f})"
                        ),
                    })

            # Rule 3: DUPLICATE_AMOUNT_DATE (same amount, same vendor, within 3 days)
            rule = rules.get("DUPLICATE_AMOUNT_DATE")
            if rule:
                cur.execute("""
                    SELECT txn_id FROM transactions
                    WHERE vendor_id = %s AND amount = %s
                      AND txn_id != %s
                      AND ABS(date - %s) <= 3
                """, (txn["vendor_id"], amount, txn_id, txn_date))
                dupes = cur.fetchall()
                if dupes:
                    dupe_ids = [d["txn_id"] for d in dupes]
                    suspicious.append({
                        "txn_id": txn_id,
                        "rule_name": "DUPLICATE_AMOUNT_DATE",
                        "rule_id": rule["rule_id"],
                        "severity": "Medium",
                        "amount": amount,
                        "vendor_name": vendor_name,
                        "reason": (
                            f"Duplicate amount ${amount:,.2f} to '{vendor_name}' "
                            f"within 3 days of txn(s) {dupe_ids}"
                        ),
                    })

            # Rule 4: NEW_VENDOR_30_DAYS
            rule = rules.get("NEW_VENDOR_30_DAYS")
            if rule and txn["vendor_created_at"]:
                vendor_created = txn["vendor_created_at"]
                if hasattr(vendor_created, "date"):
                    vendor_created = vendor_created.date()
                if isinstance(txn_date, str):
                    txn_date_obj = date.fromisoformat(txn_date)
                else:
                    txn_date_obj = txn_date
                days_diff = (txn_date_obj - vendor_created).days
                if 0 <= days_diff <= 30:
                    suspicious.append({
                        "txn_id": txn_id,
                        "rule_name": "NEW_VENDOR_30_DAYS",
                        "rule_id": rule["rule_id"],
                        "severity": "Medium",
                        "amount": amount,
                        "vendor_name": vendor_name,
                        "reason": (
                            f"Vendor '{vendor_name}' created only {days_diff} days "
                            f"before this transaction"
                        ),
                    })

            # Rule 5: ROUND_NUMBER_SUSPICION
            rule = rules.get("ROUND_NUMBER_SUSPICION")
            if rule and amount > rule["threshold"] and amount == int(amount) and amount % 1000 == 0:
                suspicious.append({
                    "txn_id": txn_id,
                    "rule_name": "ROUND_NUMBER_SUSPICION",
                    "rule_id": rule["rule_id"],
                    "severity": "Low",
                    "amount": amount,
                    "vendor_name": vendor_name,
                    "reason": (
                        f"Suspiciously round amount ${amount:,.2f} to '{vendor_name}' "
                        f"(over ${rule['threshold']:,.2f} threshold)"
                    ),
                })

            # Rule 6: FREQUENCY_SPIKE
            # (checked per-vendor below, not per-txn)

        # Rule 6: FREQUENCY_SPIKE — per vendor
        rule = rules.get("FREQUENCY_SPIKE")
        if rule:
            cur.execute("""
                WITH monthly AS (
                    SELECT vendor_id,
                           DATE_TRUNC('month', date) AS month,
                           COUNT(*) AS cnt
                    FROM transactions
                    GROUP BY vendor_id, DATE_TRUNC('month', date)
                ),
                vendor_avg AS (
                    SELECT vendor_id, AVG(cnt) AS avg_monthly
                    FROM monthly
                    GROUP BY vendor_id
                ),
                current_month AS (
                    SELECT vendor_id, COUNT(*) AS cnt
                    FROM transactions
                    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
                    GROUP BY vendor_id
                )
                SELECT cm.vendor_id, cm.cnt AS current_cnt,
                       va.avg_monthly, v.vendor_name
                FROM current_month cm
                JOIN vendor_avg va ON cm.vendor_id = va.vendor_id
                JOIN vendors v ON cm.vendor_id = v.vendor_id
                WHERE cm.cnt > va.avg_monthly * %s
            """, (rule["threshold"],))
            spikes = cur.fetchall()
            for s in spikes:
                # Flag the most recent transaction from that vendor this month
                cur.execute("""
                    SELECT txn_id, amount FROM transactions
                    WHERE vendor_id = %s
                      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
                    ORDER BY date DESC LIMIT 1
                """, (s["vendor_id"],))
                latest = cur.fetchone()
                if latest:
                    suspicious.append({
                        "txn_id": latest["txn_id"],
                        "rule_name": "FREQUENCY_SPIKE",
                        "rule_id": rule["rule_id"],
                        "severity": "Medium",
                        "amount": latest["amount"],
                        "vendor_name": s["vendor_name"],
                        "reason": (
                            f"Vendor '{s['vendor_name']}' has {s['current_cnt']} txns this month "
                            f"vs avg {float(s['avg_monthly']):.1f}/month "
                            f"(>{rule['threshold']}x spike threshold)"
                        ),
                    })

    # Deduplicate by (txn_id, rule_name)
    seen = set()
    deduped = []
    for s in suspicious:
        key = (s["txn_id"], s["rule_name"])
        if key not in seen:
            seen.add(key)
            deduped.append(s)

    return deduped


# ── 6. generate_audit_report ─────────────────────────────────

def generate_audit_report(period_from: str, period_to: str, user_id: int) -> dict:
    """Aggregate flags in date range, write summary to audit_reports, return report."""
    with get_cursor() as cur:
        # Get flags in the period
        cur.execute("""
            SELECT af.flag_id, af.severity, af.reason, t.txn_id,
                   t.amount, t.date, v.vendor_name
            FROM audit_flags af
            JOIN transactions t ON af.txn_id = t.txn_id
            JOIN vendors v ON t.vendor_id = v.vendor_id
            WHERE t.date BETWEEN %s AND %s
            ORDER BY af.severity, t.amount DESC
        """, (period_from, period_to))
        flags = cur.fetchall()

        # Count by severity
        severity_counts = {"High": 0, "Medium": 0, "Low": 0}
        total_flagged_amount = 0
        for f in flags:
            severity_counts[f["severity"]] = severity_counts.get(f["severity"], 0) + 1
            total_flagged_amount += f["amount"]

        # Count total transactions in period
        cur.execute("""
            SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
            FROM transactions WHERE date BETWEEN %s AND %s
        """, (period_from, period_to))
        txn_stats = cur.fetchone()

        # Build summary text
        summary = (
            f"Audit Report for {period_from} to {period_to}\n"
            f"{'='*50}\n"
            f"Total Transactions: {txn_stats['cnt']}\n"
            f"Total Spend: ${txn_stats['total']:,.2f}\n"
            f"Total Flags: {len(flags)}\n"
            f"  - High: {severity_counts['High']}\n"
            f"  - Medium: {severity_counts['Medium']}\n"
            f"  - Low: {severity_counts['Low']}\n"
            f"Total Flagged Amount: ${total_flagged_amount:,.2f}\n\n"
        )

        if flags:
            summary += "Flagged Transactions:\n"
            for f in flags:
                summary += (
                    f"  [{f['severity']}] Txn #{f['txn_id']} — ${f['amount']:,.2f} "
                    f"to {f['vendor_name']} on {f['date']}: {f['reason']}\n"
                )

        # Get company_id from transactions in the period
        cur.execute("""
            SELECT DISTINCT company_id FROM transactions
            WHERE date BETWEEN %s AND %s LIMIT 1
        """, (period_from, period_to))
        company_row = cur.fetchone()
        company_id = company_row["company_id"] if company_row else 1

        # Insert report
        cur.execute("""
            INSERT INTO audit_reports
                (company_id, generated_by, period_from, period_to, summary)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING report_id, company_id, generated_by,
                      report_date, period_from, period_to, summary, created_at
        """, (company_id, user_id, period_from, period_to, summary))
        report = cur.fetchone()

        # Serialize dates
        for key in ("report_date", "period_from", "period_to", "created_at"):
            if report.get(key):
                report[key] = str(report[key])

        return report
