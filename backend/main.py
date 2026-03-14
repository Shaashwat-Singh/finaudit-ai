from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import transactions, vendors, flags, dashboard, reports, agent, categories

app = FastAPI(
    title="FinAudit AI",
    description="AI-powered Financial Audit System — Backend API",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(transactions.router, prefix="/api")
app.include_router(vendors.router,      prefix="/api")
app.include_router(categories.router,   prefix="/api")
app.include_router(flags.router,        prefix="/api")
app.include_router(dashboard.router,    prefix="/api")
app.include_router(reports.router,      prefix="/api")
app.include_router(agent.router,        prefix="/api")


@app.get("/")
def root():
    return {"message": "FinAudit AI API is running 🚀"}
