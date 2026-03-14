import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "dbname": os.getenv("DB_NAME", "finaudit_ai"),
    "user": os.getenv("DB_USER", "shaashwatsingh007"),
    "password": os.getenv("DB_PASSWORD", ""),
}


def get_connection():
    """Return a new psycopg2 connection using .env config."""
    return psycopg2.connect(**DB_CONFIG)


@contextmanager
def get_cursor():
    """Context-managed cursor that auto-commits on success and
    rolls back + closes on failure.  Always returns RealDictCursor
    so rows come back as dicts."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
