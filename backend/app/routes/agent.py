from fastapi import APIRouter
from pydantic import BaseModel
from app.agent.loop import run_agent
from app.agent.tools import run_anomaly_scan, insert_audit_flag

router = APIRouter(prefix="/agent", tags=["AI Agent"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    tools_called: list[str]


class ScanResponse(BaseModel):
    response: str
    tools_called: list[str]
    anomalies_found: int
    flags_inserted: int


# ── POST /api/agent/chat ─────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def agent_chat(req: ChatRequest):
    """Send a message to the AI agent and get a response."""
    result = run_agent(req.message)
    return ChatResponse(
        response=result["response"],
        tools_called=result["tools_called"],
    )


# ── POST /api/agent/scan ─────────────────────────────────────

@router.post("/scan", response_model=ScanResponse)
def agent_scan():
    """Run a full anomaly scan on all transactions.
    Finds anomalies using rule-based checks, inserts flags,
    then asks Gemini to summarize the findings."""
    # Step 1: Run the anomaly scan directly (no need to go through Gemini for this)
    anomalies = run_anomaly_scan()

    # Step 2: Insert flags for each anomaly found
    inserted = 0
    for a in anomalies:
        result = insert_audit_flag(
            txn_id=a["txn_id"],
            reason=f"[{a['rule_name']}] {a['reason']}",
            severity=a["severity"],
        )
        if "flag_id" in result:
            inserted += 1

    # Step 3: Ask Gemini to summarize (with graceful fallback)
    tools_called_list = ["run_anomaly_scan", "insert_audit_flag"]

    try:
        summary_prompt = (
            f"I just ran an anomaly scan on all transactions. "
            f"Here are the results:\n\n"
            f"Total anomalies detected: {len(anomalies)}\n"
            f"Flags inserted into database: {inserted}\n\n"
            f"Anomalies:\n"
        )
        for a in anomalies:
            summary_prompt += (
                f"- Txn #{a['txn_id']} (${a['amount']:,.2f}) to {a['vendor_name']}: "
                f"[{a['severity']}] [{a['rule_name']}] {a['reason']}\n"
            )
        summary_prompt += (
            "\nPlease provide a professional audit summary of these findings. "
            "Group by severity, highlight the most critical issues, and suggest next steps."
        )

        agent_result = run_agent(summary_prompt)
        response_text = agent_result["response"]
        tools_called_list += agent_result["tools_called"]

    except Exception as e:
        # Gemini unavailable (rate limit, quota, etc.) — build a plain summary
        print(f"  ⚠️  Gemini summarization failed ({e}), using fallback summary")
        high = [a for a in anomalies if a["severity"] == "High"]
        medium = [a for a in anomalies if a["severity"] == "Medium"]
        low = [a for a in anomalies if a["severity"] == "Low"]

        lines = [
            f"🔍 Anomaly Scan Complete",
            f"",
            f"Total anomalies detected: {len(anomalies)}",
            f"Flags inserted into database: {inserted}",
            f"",
            f"Breakdown by severity:",
            f"  🔴 High: {len(high)}",
            f"  🟡 Medium: {len(medium)}",
            f"  🟢 Low: {len(low)}",
            f"",
        ]
        for label, group in [("HIGH", high), ("MEDIUM", medium), ("LOW", low)]:
            if group:
                lines.append(f"── {label} severity ──")
                for a in group:
                    lines.append(
                        f"  • Txn #{a['txn_id']} — ${a['amount']:,.2f} to "
                        f"{a['vendor_name']}: [{a['rule_name']}] {a['reason']}"
                    )
                lines.append("")

        lines.append("(AI summary unavailable — Gemini API quota exceeded. "
                      "Scan and flag insertion completed successfully.)")
        response_text = "\n".join(lines)

    return ScanResponse(
        response=response_text,
        tools_called=tools_called_list,
        anomalies_found=len(anomalies),
        flags_inserted=inserted,
    )
