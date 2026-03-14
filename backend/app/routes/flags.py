from fastapi import APIRouter, HTTPException
from app.database import get_cursor
from app.models import FlaggedTransaction

router = APIRouter(prefix="/flags", tags=["Audit Flags"])


@router.get("", response_model=list[FlaggedTransaction])
def get_all_flags():
    """Return all flags via the flagged_transactions_view."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT flag_id, severity, reason, reviewed, flagged_at,
                   txn_id, amount, date, vendor_name,
                   category_name, vendor_avg, pct_above_avg
            FROM flagged_transactions_view
            ORDER BY flagged_at DESC
        """)
        return cur.fetchall()


@router.patch("/{flag_id}/review")
def mark_flag_reviewed(flag_id: int):
    """Set reviewed = true for a specific flag."""
    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE audit_flags
            SET reviewed = true
            WHERE flag_id = %s
            RETURNING flag_id, reviewed
            """,
            (flag_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Flag not found")
        return {"message": "Flag marked as reviewed", **row}
