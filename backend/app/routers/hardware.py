from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.attendance import AttendanceLog
from app.models.employee import Employee
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/hardware", tags=["hardware"])


class BiometricRecord(BaseModel):
    employee_code: str
    timestamp: datetime
    type: str # "IN" or "OUT"


@router.post("/sync", dependencies=[Depends(require_admin)])
async def sync_biometric_data(records: list[BiometricRecord], db: AsyncSession = Depends(get_db)):
    """
    Endpoint for biometric hardware to push data.
    Processes raw timestamps into AttendanceLog records.
    """
    count = 0
    for rec in records:
        # Find employee
        res = await db.execute(select(Employee).where(Employee.employee_code == rec.employee_code))
        emp = res.scalar_one_or_none()
        if not emp:
            continue
            
        log_date = rec.timestamp.date()
        
        # Check if log already exists
        log_res = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.log_date == log_date
            )
        )
        log = log_res.scalar_one_or_none()
        
        if not log:
            log = AttendanceLog(employee_id=emp.id, log_date=log_date)
            db.add(log)
            
        if rec.type == "IN":
            if not log.clock_in or rec.timestamp < log.clock_in:
                log.clock_in = rec.timestamp
        else:
            if not log.clock_out or rec.timestamp > log.clock_out:
                log.clock_out = rec.timestamp
        
        count += 1
        
    await db.commit()
    return {"message": f"Synced {count} records successfully"}
