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


@router.post("/periods/{period_id}/calculate", dependencies=[Depends(require_admin)])
async def calculate_period(period_id: UUID, db: AsyncSession = Depends(get_db)):
    """Generate payslips for all active employees in this period."""
    period_result = await db.execute(select(PayrollPeriod).where(PayrollPeriod.id == period_id))
    period = period_result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    employees_result = await db.execute(select(Employee).where(Employee.is_active == True))
    employees = employees_result.scalars().all()

    working_days = count_working_days(period.start_date, period.end_date)
    created_slips = []

    for emp in employees:
        # Fetch attendance logs for this period
        logs_result = await db.execute(
            select(AttendanceLog).where(
                and_(
                    AttendanceLog.employee_id == emp.id,
                    AttendanceLog.log_date >= period.start_date,
                    AttendanceLog.log_date <= period.end_date,
                )
            )
        )
        logs = logs_result.scalars().all()

        # Build AttendanceResult list for calculation engine
        from app.core.calculations import AttendanceResult
        attendance_results = [
            AttendanceResult(
                date=log.log_date,
                status=log.status,
                clock_in=log.clock_in,
                clock_out=log.clock_out,
                late_minutes=log.late_minutes,
                early_leave_minutes=log.early_leave_minutes,
                ot_minutes=log.ot_minutes,
                work_minutes=log.work_minutes,
            )
            for log in logs
        ]

        # Count approved leaves in this period
        leaves_result = await db.execute(
            select(LeaveRequest).where(
                and_(
                    LeaveRequest.employee_id == emp.id,
                    LeaveRequest.status == LeaveStatus.approved,
                    LeaveRequest.start_date <= period.end_date,
                    LeaveRequest.end_date >= period.start_date
                )
            )
        )
        period_leaves = leaves_result.scalars().all()
        days_leave = 0
        for l in period_leaves:
            ov_start = max(l.start_date, period.start_date)
            ov_end = min(l.end_date, period.end_date)
            if ov_start <= ov_end:
                days_leave += (ov_end - ov_start).days + 1

        # Count approved advances assigned to this period
        advances_result = await db.execute(
            select(Advance).where(
                and_(
                    Advance.employee_id == emp.id,
                    Advance.period_id == period_id,
                    Advance.status == AdvanceStatus.approved,
                )
            )
        )
        advances = advances_result.scalars().all()
        advance_total = sum(float(a.amount) for a in advances)

        # Preserve manual adjustments if recalculating
        existing_slip_res = await db.execute(
            select(PayrollSlip).where(
                and_(PayrollSlip.period_id == period_id, PayrollSlip.employee_id == emp.id)
            )
        )
        old_slip = existing_slip_res.scalar_one_or_none()
        
        bonus = float(old_slip.bonus) if old_slip else 0.0
        commission = float(old_slip.commission) if old_slip else 0.0
        other_earnings = float(old_slip.other_earnings) if old_slip else 0.0
        other_deductions = float(old_slip.other_deductions) if old_slip else 0.0

        result = calculate_payroll(
            employee_id=str(emp.id),
            period_name=period.period_name,
            employment_type=emp.employment_type,
            base_salary=float(emp.base_salary),
            daily_rate=float(emp.daily_rate) if emp.daily_rate else None,
            ot_rate_per_hour=float(emp.ot_rate_per_hour),
            lunch_allowance_per_day=float(emp.lunch_allowance_per_day),
            social_security_rate=float(emp.social_security_rate),
            social_security_cap=float(emp.social_security_cap),
            attendance_records=attendance_results,
            working_days_in_period=working_days,
            days_leave=days_leave,
            advance_deduction=advance_total,
            bonus=bonus,
            commission=commission,
            other_earnings=other_earnings,
            other_deductions=other_deductions,
            pvd_rate=float(emp.pvd_rate),
            tax_allowance_personal=float(emp.tax_allowance_personal),
        )

        slip_data = dict(
            working_days_in_period=result.working_days,
            days_worked=result.days_worked,
            days_absent=result.days_absent,
            days_leave=result.days_leave,
            late_minutes_total=result.late_minutes_total,
            ot_minutes_total=result.ot_minutes_total,
            base_salary_earned=result.base_salary_earned,
            lunch_allowance_earned=result.lunch_allowance_earned,
            ot_pay=result.ot_pay,
            bonus=result.bonus,
            commission=result.commission,
            other_earnings=result.other_earnings,
            total_earnings=result.total_earnings,
            social_security_deduction=result.social_security,
            provident_fund_deduction=result.provident_fund,
            tax_deduction=result.tax_deduction,
            advance_deduction=result.advance_deduction,
            late_penalty=result.late_penalty,
            other_deductions=result.other_deductions,
            total_deductions=result.total_deductions,
            net_pay=result.net_pay,
        )
        if old_slip:
            for k, v in slip_data.items():
                setattr(old_slip, k, v)
            slip = old_slip
        else:
            slip = PayrollSlip(period_id=period_id, employee_id=emp.id, **slip_data)
            db.add(slip)

        # Mark advances as deducted
        for adv in advances:
            adv.status = AdvanceStatus.deducted

        created_slips.append(slip)

    period.status = PeriodStatus.processing
    await db.commit()
    return {"message": f"Generated {len(created_slips)} payslips", "period_id": str(period_id)}


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
