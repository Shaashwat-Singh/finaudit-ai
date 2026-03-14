from fastapi import APIRouter, HTTPException
from app.database import get_cursor
from app.models import Transaction, TransactionCreate, TransactionDetail, DailySpend

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionDetail])
def get_all_transactions():
    """Return every transaction with vendor and category names, newest first."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT t.*, v.vendor_name, c.category_name
            FROM transactions t
            JOIN vendors v ON t.vendor_id = v.vendor_id
            JOIN categories c ON t.category_id = c.category_id
            ORDER BY t.date DESC, t.txn_id DESC
        """)
        return cur.fetchall()


@router.get("/spend-over-time", response_model=list[DailySpend])
def get_spend_over_time():
    """Return total spend by day for charting."""
    with get_cursor() as cur:
        cur.execute("""
            SELECT date, SUM(amount) as amount
            FROM transactions
            GROUP BY date
            ORDER BY date ASC
        """)
        return cur.fetchall()


@router.get("/{txn_id}", response_model=Transaction)
def get_transaction(txn_id: int):
    """Return a single transaction by ID."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM transactions WHERE txn_id = %s",
            (txn_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return row


@router.post("", response_model=Transaction, status_code=201)
def create_transaction(payload: TransactionCreate):
    """Insert a new transaction and return it."""
    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO transactions
                (vendor_id, company_id, category_id, user_id,
                 amount, date, description, batch_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                payload.vendor_id,
                payload.company_id,
                payload.category_id,
                payload.user_id,
                payload.amount,
                payload.date,
                payload.description,
                payload.batch_id,
            ),
        )
        return cur.fetchone()
