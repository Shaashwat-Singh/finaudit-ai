from fastapi import APIRouter
from app.database import get_cursor
from app.models import DashboardKPI

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPI)
def get_dashboard_kpis():
    """Return aggregated KPIs from the dashboard_kpi_view."""
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_kpi_view")
        return cur.fetchone()
