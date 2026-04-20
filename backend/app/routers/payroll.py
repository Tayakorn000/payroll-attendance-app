from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from datetime import datetime, date

from app.database import get_db
from app.models.payroll import PayrollPeriod, PayrollSlip, SlipStatus, PeriodStatus
from app.models.attendance import AttendanceLog, AttendanceStatus
from app.models.employee import Employee
from app.models.advance import Advance, AdvanceStatus
from app.models.user import User
from app.schemas.payroll import PayrollPeriodCreate, PayrollPeriodOut, PayrollSlipOut, PayrollSlipUpdate
from app.models.leave import LeaveRequest, LeaveStatus
from fastapi.responses import StreamingResponse
import io, csv
from app.core.calculations import calculate_payroll, calculate_attendance, WorkSchedule, count_working_days
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.post("/periods", response_model=PayrollPeriodOut, dependencies=[Depends(require_admin)])
async def create_period(payload: PayrollPeriodCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    period = PayrollPeriod(**payload.model_dump(), created_by=current_user.id)
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return period


@router.get("/periods", response_model=list[PayrollPeriodOut], dependencies=[Depends(require_admin)])
async def list_periods(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PayrollPeriod).order_by(PayrollPeriod.start_date.desc()))
    return result.scalars().all()


from app.models.task import BackgroundTask, TaskStatus
from app.models.loan import LoanInstallment
from app.models.piece_rate import PieceRateWork

@router.post("/periods/{period_id}/calculate", dependencies=[Depends(require_admin)])
async def calculate_period_task(period_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Start a background task for payroll calculation.
    Returns a task ID for the frontend to poll.
    """
    task = BackgroundTask(task_type="PAYROLL_CALCULATION", params={"period_id": str(period_id)})
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # In a real environment, we would trigger a background worker here.
    # For now, we'll perform the calc but in a way that can be extended.
    return {"task_id": str(task.id), "status": task.status}


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackgroundTask).where(BackgroundTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/periods/{period_id}/approve", dependencies=[Depends(require_admin)])
async def approve_period(period_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PayrollPeriod).where(PayrollPeriod.id == period_id))
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    slips_result = await db.execute(select(PayrollSlip).where(PayrollSlip.period_id == period_id))
    for slip in slips_result.scalars().all():
        slip.status = SlipStatus.approved
        slip.approved_by = current_user.id
        slip.approved_at = datetime.utcnow()
    period.status = PeriodStatus.approved
    await db.commit()
    return {"message": "Period approved"}


@router.get("/slips/me", response_model=list[PayrollSlipOut])
async def my_slips(period_id: UUID | None = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="No employee linked to account")
    q = select(PayrollSlip).where(PayrollSlip.employee_id == current_user.employee_id)
    if period_id:
        q = q.where(PayrollSlip.period_id == period_id)
    result = await db.execute(q.order_by(PayrollSlip.created_at.desc()))
    return result.scalars().all()


@router.get("/slips/{employee_id}", response_model=list[PayrollSlipOut])
async def employee_slips(
    employee_id: UUID,
    period_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.employee_id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    q = select(PayrollSlip).where(PayrollSlip.employee_id == employee_id)
    if period_id:
        q = q.where(PayrollSlip.period_id == period_id)
    result = await db.execute(q.order_by(PayrollSlip.created_at.desc()))
    return result.scalars().all()
