from fastapi import APIRouter
from app.database import get_cursor
from app.models import Category

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[Category])
def get_all_categories():
    """Return all transaction categories."""
    with get_cursor() as cur:
        cur.execute("SELECT * FROM categories ORDER BY category_name")
        return cur.fetchall()
