from dataclasses import dataclass
from datetime import datetime, time, date, timedelta
import pytz
from typing import Any
from decimal import Decimal

BKK = pytz.timezone("Asia/Bangkok")


@dataclass
class AttendanceResult:
    date: date
    status: str  # present, absent, late, half_day, leave
    clock_in: datetime | None
    clock_out: datetime | None
    late_minutes: int
    early_leave_minutes: int
    ot_minutes: int
    work_minutes: int


@dataclass
class WorkSchedule:
    start_time: time  # e.g., 08:00
    end_time: time    # e.g., 17:00
    late_grace_period: int = 5  # minutes


@dataclass
class PayrollResult:
    employee_id: str
    period_name: str
    working_days: int
    days_worked: int
    days_absent: int
    days_leave: int
    late_minutes_total: int
    ot_minutes_total: int
    # Earnings
    base_salary_earned: float
    lunch_allowance_earned: float
    ot_pay: float
    piece_rate_earned: float
    bonus: float
    commission: float
    other_earnings: float
    total_earnings: float
    # Deductions
    social_security: float
    provident_fund: float
    tax_deduction: float
    advance_deduction: float
    loan_deduction: float
    late_penalty: float
    other_deductions: float
    total_deductions: float
    net_pay: float


def calculate_thai_pit(annual_income: float, personal_allowance: float = 60000.0, sso_annual: float = 9000.0, tax_steps: list = None) -> float:
    """
    Calculate Thai Personal Income Tax (Progressive Rate).
    """
    # Standard Expense: 50% but not exceeding 100,000
    expense = min(annual_income * 0.5, 100000.0)
    
    taxable_income = annual_income - expense - personal_allowance - sso_annual
    if taxable_income <= 0:
        return 0.0

    tax = 0.0
    # Default steps if not provided from DB
    steps = tax_steps or [
        (150000, 0.00),
        (300000, 0.05),
        (500000, 0.10),
        (750000, 0.15),
        (1000000, 0.20),
        (2000000, 0.25),
        (5000000, 0.30),
        (float('inf'), 0.35)
    ]
    
    prev_limit = 0
    for limit, rate in steps:
        if taxable_income > prev_limit:
            taxable_in_step = min(taxable_income, limit) - prev_limit
            tax += taxable_in_step * rate
            prev_limit = limit
        else:
            break
            
    return round(tax, 2)


def calculate_attendance(
    log_date: date,
    clock_in: datetime | None,
    clock_out: datetime | None,
    schedule: WorkSchedule,
) -> AttendanceResult:
    """
    Evaluate a single day's attendance against the schedule.
    """
    if not clock_in or not clock_out:
        return AttendanceResult(log_date, "absent", None, None, 0, 0, 0, 0)

    # Convert schedule times to full datetimes for comparison
    sched_start = BKK.localize(datetime.combine(log_date, schedule.start_time))
    sched_end = BKK.localize(datetime.combine(log_date, schedule.end_time))

    late_min = 0
    if clock_in > sched_start + timedelta(minutes=schedule.late_grace_period):
        late_min = max(0, int((clock_in - sched_start).total_seconds() / 60))

    early_min = 0
    if clock_out < sched_end:
        early_min = max(0, int((sched_end - clock_out).total_seconds() / 60))

    ot_min = 0
    if clock_out > sched_end + timedelta(minutes=30):
        # OT often starts after a 30-min buffer, or rounds down to nearest 30
        diff_sec = (clock_out - sched_end).total_seconds()
        ot_min = int(diff_sec / 60)

    work_min = int((clock_out - clock_in).total_seconds() / 60)
    status = "late" if late_min > 0 else "present"

    return AttendanceResult(
        date=log_date,
        status=status,
        clock_in=clock_in,
        clock_out=clock_out,
        late_minutes=late_min,
        early_leave_minutes=early_min,
        ot_minutes=ot_min,
        work_minutes=work_min,
    )


def calculate_payroll(
    employee_id: str,
    period_name: str,
    employment_type: str,
    base_salary: float,
    daily_rate: float | None,
    ot_rate_per_hour: float,
    lunch_allowance_per_day: float,
    social_security_rate: float,
    social_security_cap: float,
    attendance_records: list[AttendanceResult],
    working_days_in_period: int,
    days_leave: int,
    advance_deduction: float,
    loan_deduction: float = 0.0,
    piece_rate_earned: float = 0.0,
    late_penalty_per_minute: float = 0.0,
    bonus: float = 0.0,
    commission: float = 0.0,
    other_earnings: float = 0.0,
    other_deductions: float = 0.0,
    pvd_rate: float = 0.0,
    tax_allowance_personal: float = 60000.0,
    tax_steps: list = None
) -> PayrollResult:
    """
    Compute a full payroll slip.
    """
    days_worked = sum(1 for r in attendance_records if r.status != "absent")
    days_absent = sum(1 for r in attendance_records if r.status == "absent")
    late_minutes_total = sum(r.late_minutes for r in attendance_records)
    ot_minutes_total = sum(r.ot_minutes for r in attendance_records)
    days_present = sum(1 for r in attendance_records if r.status in ("present", "late", "half_day"))

    # --- Base salary / Piece Rate ---
    if employment_type == "monthly":
        base_earned = float(base_salary)
    elif employment_type == "daily":
        rate = daily_rate if daily_rate else base_salary
        base_earned = rate * days_worked
    else: # piece_rate
        base_earned = 0.0 # mostly relies on piece_rate_earned + maybe a small base

    # --- Lunch allowance ---
    lunch_earned = lunch_allowance_per_day * days_present

    # --- OT pay ---
    ot_hours = ot_minutes_total / 60.0
    ot_pay = round(ot_hours * ot_rate_per_hour, 2)

    total_earnings = round(base_earned + lunch_earned + ot_pay + piece_rate_earned + bonus + commission + other_earnings, 2)

    # --- Social Security ---
    # SSO is usually calculated based on base salary (earned)
    ss_basis = base_earned if employment_type != "piece_rate" else total_earnings
    ss = round(min(ss_basis * social_security_rate, social_security_cap), 2)
    
    # --- Provident Fund ---
    pvd = round(base_earned * pvd_rate, 2)

    # --- Tax Calculation (Simple Annual Estimate) ---
    annual_income = total_earnings * 12
    annual_tax = calculate_thai_pit(annual_income, tax_allowance_personal, ss * 12, tax_steps=tax_steps)
    tax_monthly = round(annual_tax / 12, 2)

    # --- Late penalty ---
    late_penalty = round(late_minutes_total * late_penalty_per_minute, 2)

    total_deductions = round(ss + pvd + tax_monthly + advance_deduction + loan_deduction + late_penalty + other_deductions, 2)
    net_pay = round(total_earnings - total_deductions, 2)

    return PayrollResult(
        employee_id=employee_id,
        period_name=period_name,
        working_days=working_days_in_period,
        days_worked=days_worked,
        days_absent=days_absent,
        days_leave=days_leave,
        late_minutes_total=late_minutes_total,
        ot_minutes_total=ot_minutes_total,
        base_salary_earned=round(base_earned, 2),
        lunch_allowance_earned=round(lunch_earned, 2),
        ot_pay=ot_pay,
        piece_rate_earned=round(piece_rate_earned, 2),
        bonus=bonus,
        commission=commission,
        other_earnings=other_earnings,
        total_earnings=total_earnings,
        social_security=ss,
        provident_fund=pvd,
        tax_deduction=tax_monthly,
        advance_deduction=round(advance_deduction, 2),
        loan_deduction=round(loan_deduction, 2),
        late_penalty=late_penalty,
        other_deductions=other_deductions,
        total_deductions=total_deductions,
        net_pay=net_pay,
    )


def count_working_days(start: date, end: date, holidays: list[date] = None) -> int:
    """
    Count weekdays between two dates, excluding holidays.
    """
    holidays_set = set(holidays or [])
    current = start
    count = 0
    while current <= end:
        if current.weekday() < 5 and current not in holidays_set:
            count += 1
        current += timedelta(days=1)
    return count
