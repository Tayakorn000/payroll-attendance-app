"""
Core payroll calculation engine.

All time calculations use aware datetimes (Asia/Bangkok by default).
OT is counted only after the standard work_end time; work done before
work_start is NOT counted as OT (treated as early arrival).
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from math import floor
import pytz

BKK = pytz.timezone("Asia/Bangkok")


@dataclass
class WorkSchedule:
    work_start: str = "08:00"   # HH:MM
    work_end: str = "17:00"     # HH:MM
    ot_round_minutes: int = 30  # round OT down to nearest N minutes


@dataclass
class AttendanceResult:
    date: date
    status: str            # present / absent / late / half_day
    clock_in: datetime | None
    clock_out: datetime | None
    late_minutes: int
    early_leave_minutes: int
    ot_minutes: int
    work_minutes: int


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
    bonus: float
    commission: float
    other_earnings: float
    total_earnings: float
    # Deductions
    social_security: float
    advance_deduction: float
    late_penalty: float
    other_deductions: float
    total_deductions: float
    net_pay: float


def _parse_hhmm(hhmm: str, ref_date: date) -> datetime:
    """Convert 'HH:MM' string + a reference date into a timezone-aware datetime."""
    h, m = map(int, hhmm.split(":"))
    return BKK.localize(datetime(ref_date.year, ref_date.month, ref_date.day, h, m))


def calculate_attendance(
    clock_in: datetime | None,
    clock_out: datetime | None,
    log_date: date,
    schedule: WorkSchedule,
) -> AttendanceResult:
    """
    Derive late_minutes, early_leave_minutes, ot_minutes, and work_minutes
    from a single day's clock-in / clock-out pair.

    OT rounding example (ot_round_minutes=30):
        43 raw OT minutes → 30 credited OT minutes
        91 raw OT minutes → 90 credited OT minutes

    Returns an AttendanceResult with calculated values.
    """
    work_start_dt = _parse_hhmm(schedule.work_start, log_date)
    work_end_dt = _parse_hhmm(schedule.work_end, log_date)

    # Absent: no clock-in at all
    if clock_in is None:
        return AttendanceResult(
            date=log_date,
            status="absent",
            clock_in=None,
            clock_out=None,
            late_minutes=0,
            early_leave_minutes=0,
            ot_minutes=0,
            work_minutes=0,
        )

    # Ensure timezone awareness
    if clock_in.tzinfo is None:
        clock_in = BKK.localize(clock_in)
    if clock_out is not None and clock_out.tzinfo is None:
        clock_out = BKK.localize(clock_out)

    # --- Late minutes ---
    late_minutes = 0
    if clock_in > work_start_dt:
        late_minutes = int((clock_in - work_start_dt).total_seconds() / 60)

    # --- Early leave & OT minutes ---
    early_leave_minutes = 0
    ot_minutes = 0
    work_minutes = 0

    if clock_out is not None:
        # Effective work end for this day (clock_out may be before or after schedule)
        effective_end = clock_out

        # Early leave: left before scheduled end
        if effective_end < work_end_dt:
            early_leave_minutes = int((work_end_dt - effective_end).total_seconds() / 60)

        # OT: stayed past scheduled end
        if effective_end > work_end_dt:
            raw_ot = int((effective_end - work_end_dt).total_seconds() / 60)
            # Round DOWN to nearest ot_round_minutes block
            ot_minutes = floor(raw_ot / schedule.ot_round_minutes) * schedule.ot_round_minutes

        # Total minutes actually at work (clock_in → clock_out)
        work_minutes = int((effective_end - clock_in).total_seconds() / 60)

    # Status
    if late_minutes >= 240:  # > 4 hours late = half day
        status = "half_day"
    elif late_minutes > 0:
        status = "late"
    else:
        status = "present"

    return AttendanceResult(
        date=log_date,
        status=status,
        clock_in=clock_in,
        clock_out=clock_out,
        late_minutes=late_minutes,
        early_leave_minutes=early_leave_minutes,
        ot_minutes=ot_minutes,
        work_minutes=work_minutes,
    )


def calculate_payroll(
    employee_id: str,
    period_name: str,
    employment_type: str,           # "monthly" | "daily"
    base_salary: float,             # monthly base OR daily rate * working_days
    daily_rate: float | None,
    ot_rate_per_hour: float,
    lunch_allowance_per_day: float,
    social_security_rate: float,
    social_security_cap: float,
    attendance_records: list[AttendanceResult],
    working_days_in_period: int,    # total weekdays in the cycle (excl. holidays)
    days_leave: int,
    advance_deduction: float,
    late_penalty_per_minute: float = 0.0,
    bonus: float = 0.0,
    commission: float = 0.0,
    other_earnings: float = 0.0,
    other_deductions: float = 0.0,
) -> PayrollResult:
    """
    Compute a full payroll slip from aggregated attendance data.

    Earnings:
      - Monthly: full base_salary regardless of attendance (absent = penalty only)
      - Daily  : daily_rate × days_worked
      - Lunch  : lunch_allowance_per_day × days_present (absent/leave excluded)
      - OT     : (ot_minutes_total / 60) × ot_rate_per_hour
      - Bonus/Comm/Other: manual additions

    Deductions:
      - Social Security : min(base_salary × ss_rate, ss_cap)
      - Advances        : sum of approved advances assigned to this period
      - Late penalty    : late_minutes × penalty_rate (optional, can be 0)
      - Other deductions: manual deductions
    """
    days_worked = sum(1 for r in attendance_records if r.status != "absent")
    days_absent = sum(1 for r in attendance_records if r.status == "absent")
    late_minutes_total = sum(r.late_minutes for r in attendance_records)
    ot_minutes_total = sum(r.ot_minutes for r in attendance_records)
    days_present = sum(1 for r in attendance_records if r.status in ("present", "late", "half_day"))

    # --- Base salary ---
    if employment_type == "monthly":
        base_earned = float(base_salary)
    else:
        rate = daily_rate if daily_rate else base_salary
        base_earned = rate * days_worked

    # --- Lunch allowance ---
    lunch_earned = lunch_allowance_per_day * days_present

    # --- OT pay ---
    ot_hours = ot_minutes_total / 60.0
    ot_pay = round(ot_hours * ot_rate_per_hour, 2)

    total_earnings = round(base_earned + lunch_earned + ot_pay + bonus + commission + other_earnings, 2)

    # --- Social Security ---
    ss = round(min(base_earned * social_security_rate, social_security_cap), 2)

    # --- Late penalty ---
    late_penalty = round(late_minutes_total * late_penalty_per_minute, 2)

    total_deductions = round(ss + advance_deduction + late_penalty + other_deductions, 2)
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
        bonus=bonus,
        commission=commission,
        other_earnings=other_earnings,
        total_earnings=total_earnings,
        social_security=ss,
        advance_deduction=round(advance_deduction, 2),
        late_penalty=late_penalty,
        other_deductions=other_deductions,
        total_deductions=total_deductions,
        net_pay=net_pay,
    )


def count_working_days(start: date, end: date, holidays: list[date] | None = None) -> int:
    """Count Mon-Fri weekdays between start and end (inclusive), excluding holidays."""
    holidays_set = set(holidays or [])
    current = start
    count = 0
    while current <= end:
        if current.weekday() < 5 and current not in holidays_set:
            count += 1
        current += timedelta(days=1)
    return count
