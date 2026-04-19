from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from datetime import date

from app.database import get_db
from app.models.attendance import AttendanceLog
from app.models.employee import Employee
from app.models.user import User
from app.schemas.attendance import AttendanceLogCreate, AttendanceLogUpdate, AttendanceLogOut, BulkAttendanceCreate
from app.core.calculations import calculate_attendance, WorkSchedule
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _apply_calculations(log: AttendanceLog, emp: Employee) -> AttendanceLog:
    schedule = WorkSchedule(
        work_start=emp.work_start_time,
        work_end=emp.work_end_time,
    )
    result = calculate_attendance(log.clock_in, log.clock_out, log.log_date, schedule)
    log.status = result.status
    log.late_minutes = result.late_minutes
    log.early_leave_minutes = result.early_leave_minutes
    log.ot_minutes = result.ot_minutes
    log.work_minutes = result.work_minutes
    return log


@router.post("/", response_model=AttendanceLogOut, dependencies=[Depends(require_admin)])
async def create_log(payload: AttendanceLogCreate, db: AsyncSession = Depends(get_db)):
    emp_result = await db.execute(select(Employee).where(Employee.id == payload.employee_id))
    emp = emp_result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Upsert — one log per employee per date
    existing = await db.execute(
        select(AttendanceLog).where(
            and_(AttendanceLog.employee_id == payload.employee_id, AttendanceLog.log_date == payload.log_date)
        )
    )
    log = existing.scalar_one_or_none()
    if log:
        if payload.clock_in:
            log.clock_in = payload.clock_in
        if payload.clock_out:
            log.clock_out = payload.clock_out
    else:
        log = AttendanceLog(**payload.model_dump())
        db.add(log)

    log = _apply_calculations(log, emp)
    await db.commit()
    await db.refresh(log)
    return log


@router.post("/bulk", response_model=list[AttendanceLogOut], dependencies=[Depends(require_admin)])
async def bulk_create(payload: BulkAttendanceCreate, db: AsyncSession = Depends(get_db)):
    """Ingest batch of records from fingerprint scanner API."""
    results = []
    for item in payload.logs:
        emp_result = await db.execute(select(Employee).where(Employee.id == item.employee_id))
        emp = emp_result.scalar_one_or_none()
        if not emp:
            continue
        existing = await db.execute(
            select(AttendanceLog).where(
                and_(AttendanceLog.employee_id == item.employee_id, AttendanceLog.log_date == item.log_date)
            )
        )
        log = existing.scalar_one_or_none()
        if log:
            if item.clock_in:
                log.clock_in = item.clock_in
            if item.clock_out:
                log.clock_out = item.clock_out
        else:
            log = AttendanceLog(**item.model_dump())
            db.add(log)
        log = _apply_calculations(log, emp)
        results.append(log)
    await db.commit()
    return results


@router.get("/employee/{employee_id}", response_model=list[AttendanceLogOut])
async def get_employee_attendance(
    employee_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.employee_id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(AttendanceLog).where(
            and_(
                AttendanceLog.employee_id == employee_id,
                AttendanceLog.log_date >= start_date,
                AttendanceLog.log_date <= end_date,
            )
        ).order_by(AttendanceLog.log_date)
    )
    return result.scalars().all()


@router.patch("/{log_id}", response_model=AttendanceLogOut, dependencies=[Depends(require_admin)])
async def update_log(log_id: UUID, payload: AttendanceLogUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AttendanceLog).where(AttendanceLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    emp_result = await db.execute(select(Employee).where(Employee.id == log.employee_id))
    emp = emp_result.scalar_one_or_none()
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(log, field, value)
    log = _apply_calculations(log, emp)
    await db.commit()
    await db.refresh(log)
    return log
