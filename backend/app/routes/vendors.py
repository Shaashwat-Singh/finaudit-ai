from fastapi import APIRouter
from app.database import get_cursor
from app.models import VendorWithStats

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=list[VendorWithStats])
def get_all_vendors():
    """Return all vendors joined with their stats."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT v.vendor_id, v.vendor_name, v.company_id, v.created_at,
                   vs.avg_amount, vs.txn_count, vs.max_amount, vs.min_amount
            FROM vendors v
            LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
            ORDER BY v.vendor_name
        """)
        return cur.fetchall()
