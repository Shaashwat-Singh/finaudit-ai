from fastapi import APIRouter, HTTPException
from app.database import get_cursor
from app.models import AuditReport, ReportCreate

router = APIRouter(prefix="/reports", tags=["Audit Reports"])


@router.get("", response_model=list[AuditReport])
def get_all_reports():
    """Return all audit reports, newest first."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT report_id, company_id, generated_by,
                   report_date, period_from, period_to,
                   summary, created_at
            FROM audit_reports
            ORDER BY report_date DESC
        """)
        return cur.fetchall()


@router.post("", response_model=AuditReport, status_code=201)
def create_report(payload: ReportCreate):
    """Insert a new audit report and return it."""
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_reports
                (company_id, generated_by, period_from, period_to, summary)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                payload.company_id,
                payload.generated_by,
                payload.period_from,
                payload.period_to,
                payload.summary,
            ),
        )
        return cur.fetchone()
