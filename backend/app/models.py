from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# ── Table models ──────────────────────────────────────────────


class User(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    created_at: Optional[datetime] = None


class Company(BaseModel):
    company_id: int
    company_name: str
    created_at: Optional[datetime] = None


class Vendor(BaseModel):
    vendor_id: int
    vendor_name: str
    company_id: int
    created_at: Optional[datetime] = None


class Category(BaseModel):
    category_id: int
    category_name: str


class Transaction(BaseModel):
    txn_id: int
    vendor_id: int
    company_id: int
    category_id: int
    batch_id: Optional[int] = None
    user_id: int
    amount: float
    date: date
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class VendorStat(BaseModel):
    vendor_id: int
    avg_amount: float
    txn_count: int
    max_amount: float
    min_amount: float
    updated_at: Optional[datetime] = None


class AuditFlag(BaseModel):
    flag_id: int
    txn_id: int
    rule_id: Optional[int] = None
    severity: str
    reason: str
    reviewed: bool = False
    created_at: Optional[datetime] = None


class AuditReport(BaseModel):
    report_id: int
    company_id: int
    generated_by: int
    report_date: date
    period_from: date
    period_to: date
    summary: str
    created_at: Optional[datetime] = None


class AuditRule(BaseModel):
    rule_id: int
    rule_name: str
    description: str
    threshold: Optional[float] = None
    is_active: bool = True


class UploadBatch(BaseModel):
    batch_id: int
    uploaded_by: int
    uploaded_at: Optional[datetime] = None
    source: Optional[str] = "manual"


# ── Input / create schemas ────────────────────────────────────


class TransactionCreate(BaseModel):
    vendor_id: int
    company_id: int
    category_id: int
    user_id: int
    amount: float
    date: date
    description: Optional[str] = None
    batch_id: Optional[int] = None


class ReportCreate(BaseModel):
    company_id: int
    generated_by: int
    period_from: date
    period_to: date
    summary: str


# ── View / response models ───────────────────────────────────


class DashboardKPI(BaseModel):
    total_transactions: int
    total_flags: int
    high_flags: int
    medium_flags: int
    low_flags: int
    unreviewed_flags: int
    total_vendors: int
    total_spend: float


class FlaggedTransaction(BaseModel):
    flag_id: int
    severity: str
    reason: str
    reviewed: bool
    flagged_at: Optional[datetime] = None
    txn_id: int
    amount: float
    date: date
    vendor_name: str
    category_name: str
    vendor_avg: Optional[float] = None
    pct_above_avg: Optional[float] = None


class VendorWithStats(BaseModel):
    vendor_id: int
    vendor_name: str
    company_id: int
    created_at: Optional[datetime] = None
    avg_amount: Optional[float] = None
    txn_count: Optional[int] = None
    max_amount: Optional[float] = None
    min_amount: Optional[float] = None


class DailySpend(BaseModel):
    date: date
    amount: float


class TransactionDetail(Transaction):
    vendor_name: str
    category_name: str
