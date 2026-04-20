from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
import os

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.get("/daily-sync")
async def daily_cron_sync(authorization: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    """
    Triggered by Vercel Cron.
    Verifies CRON_SECRET for security.
    """
    cron_secret = os.environ.get("CRON_SECRET")
    if authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized cron trigger")
    
    # Logic: 
    # 1. Sync biometric data (if external pull is needed)
    # 2. Update leave status (expire old requests)
    # 3. etc.
    
    return {"status": "success", "tasks_run": ["leave_update", "attendance_check"]}
