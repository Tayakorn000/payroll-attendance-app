"""
Full database seeder.
Reads แบบ ฟอร์มตรวจสอบการเข้างาน.xls and populates:
  - 23 employees (EMP001–EMP023)
  - user accounts for each (login = employee_code, password = employee_code)
  - all March 2026 attendance logs
  - payroll period + calculated payslips for March 2026
"""
import asyncio
from datetime import datetime, date, timedelta
import pandas as pd
import pytz

BKK = pytz.timezone("Asia/Bangkok")

XLS_PATH = "/Users/tayakornwet/Downloads/แบบ ฟอร์มตรวจสอบการเข้างาน.xls"

# Standard work schedule
WORK_START = "08:00"
WORK_END   = "17:00"

# Default compensation (THB) — adjust per real payroll data
BASE_SALARY         = 15_000.0
OT_RATE_PER_HOUR    = 93.75        # 15000 / 160 working hours/month
LUNCH_ALLOWANCE_DAY = 50.0

# ─────────────────────────────────────────────────────────────
# XLS parsing helpers
# ─────────────────────────────────────────────────────────────

def _to_time(val) -> str | None:
    """Normalise cell value to 'HH:MM' string or None."""
    if val is None or str(val).strip() in ("", "nan", "ขาด"):
        return None
    s = str(val).strip()
    # Already HH:MM
    if ":" in s and len(s) <= 5:
        return s
    return None


def _to_dt(hhmm: str, d: date) -> datetime:
    h, m = map(int, hhmm.split(":"))
    return BKK.localize(datetime(d.year, d.month, d.day, h, m))


def parse_attendance_sheet(sheet_name: str) -> dict[int, dict[date, dict]]:
    """
    Returns { emp_id: { log_date: { 'clock_in': datetime|None, 'clock_out': datetime|None } } }

    Layout per employee block (15 cols wide):
      +0  date "D/วัน"
      +1  เวลา1 เริ่มงาน  (clock-in)
      +3  เวลา1 เลิกงาน  (always 'ขาด', ignored)
      +6  เวลา2 เริ่มงาน  (second punch-in, rare)
      +8  เวลา2 เลิกงาน
      +10 ล่วงเวลา เริ่มงาน  (clock-out OR OT start)
      +12 ล่วงเวลา เลิกงาน  (OT end = final clock-out when OT exists)
    """
    df = pd.read_excel(XLS_PATH, sheet_name=sheet_name, header=None)
    result: dict[int, dict[date, dict]] = {}

    emp_cols = [0, 15, 30]  # up to 3 employees per sheet
    for base in emp_cols:
        # Employee ID is at row 3, col base+9
        if base + 9 >= df.shape[1]:
            break
        raw_id = df.iloc[3, base + 9]
        if pd.isna(raw_id) or str(raw_id) in ("ไอดี", "nan"):
            continue
        try:
            emp_id = int(raw_id)
        except (ValueError, TypeError):
            continue

        logs: dict[date, dict] = {}
        for row in range(11, min(42, df.shape[0])):
            day_cell = str(df.iloc[row, base]).strip()
            if not day_cell or day_cell == "nan":
                continue
            # Format: "D/วัน" e.g. "3/อ"
            day_num_str = day_cell.split("/")[0]
            try:
                day_num = int(day_num_str)
            except ValueError:
                continue

            log_date = date(2026, 3, day_num)

            cin_raw  = df.iloc[row, base + 1]
            # Clock-out: prefer col+12 (OT end), fall back to col+10
            co12 = df.iloc[row, base + 12] if base + 12 < df.shape[1] else None
            co10 = df.iloc[row, base + 10] if base + 10 < df.shape[1] else None

            cin  = _to_time(cin_raw)
            cout = _to_time(co12) or _to_time(co10)

            logs[log_date] = {
                "clock_in":  _to_dt(cin, log_date)  if cin  else None,
                "clock_out": _to_dt(cout, log_date) if cout else None,
            }

        if logs:
            result[emp_id] = logs

    return result


def load_all_attendance() -> dict[int, dict[date, dict]]:
    all_data: dict[int, dict[date, dict]] = {}
    sheets = ["1,2,3", "4,5,6", "7,8,9", "10,11,12", "13,14,15", "16,17,18", "19,20,21", "22,23"]
    for s in sheets:
        data = parse_attendance_sheet(s)
        all_data.update(data)
    return all_data


EMPLOYEES = [
    (1,  "TEE"),   (2,  "AERG"),  (3,  "K"),     (4,  "Beer"),
    (5,  "Kang"),  (6,  "Boss"),  (7,  "Bo"),     (8,  "Man"),
    (9,  "Nida"),  (10, "Fa"),    (11, "Ae"),     (12, "Ta"),
    (13, "Jod"),   (14, "Suwit"), (15, "Noon"),   (16, "Car"),
    (17, "Bomb"),  (18, "Gun"),   (19, "Sun"),    (20, "Nong"),
    (21, "CarSun"),(22, "PNong"), (23, "Off"),
]


# ─────────────────────────────────────────────────────────────
# Database seeding
# ─────────────────────────────────────────────────────────────

async def seed():
    from app.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.models.employee import Employee, EmploymentType
    from app.models.attendance import AttendanceLog
    from app.models.payroll import PayrollPeriod, PayrollSlip, PeriodStatus, SlipStatus
    from app.models.advance import Advance, AdvanceStatus
    from app.core.security import hash_password
    from app.core.calculations import (
        calculate_attendance, calculate_payroll, count_working_days,
        WorkSchedule, AttendanceResult,
    )
    from sqlalchemy import select, and_
    import uuid

    schedule = WorkSchedule(work_start=WORK_START, work_end=WORK_END)

    print("Loading attendance data from XLS…")
    all_attendance = load_all_attendance()
    print(f"Loaded attendance for {len(all_attendance)} employees")

    async with AsyncSessionLocal() as db:

        # ── Ensure admin user exists ──
        admin_check = await db.execute(select(User).where(User.username == "admin"))
        if not admin_check.scalar_one_or_none():
            db.add(User(
                username="admin",
                hashed_password=hash_password("admin1234"),
                role=UserRole.admin,
            ))
            await db.commit()
            print("Created admin: admin / admin1234")

        # ── Create employees + user accounts ──
        emp_id_map: dict[int, uuid.UUID] = {}

        for num, nickname in EMPLOYEES:
            code = f"EMP{num:03d}"
            existing = await db.execute(select(Employee).where(Employee.employee_code == code))
            emp = existing.scalar_one_or_none()

            if not emp:
                emp = Employee(
                    employee_code=code,
                    first_name=nickname,
                    last_name="",
                    department="Not Set1",
                    position="Staff",
                    employment_type=EmploymentType.monthly,
                    base_salary=BASE_SALARY,
                    daily_rate=None,
                    ot_rate_per_hour=OT_RATE_PER_HOUR,
                    lunch_allowance_per_day=LUNCH_ALLOWANCE_DAY,
                    social_security_rate=0.05,
                    social_security_cap=750.0,
                    work_start_time=WORK_START,
                    work_end_time=WORK_END,
                    hire_date=date(2025, 1, 1),
                )
                db.add(emp)
                await db.flush()
                print(f"  Created employee {code} ({nickname})")

            emp_id_map[num] = emp.id

            # User account for this employee
            user_check = await db.execute(select(User).where(User.username == code))
            if not user_check.scalar_one_or_none():
                db.add(User(
                    username=code,
                    hashed_password=hash_password(code),  # password = employee code
                    role=UserRole.employee,
                    employee_id=emp.id,
                ))

        await db.commit()
        print(f"Seeded {len(EMPLOYEES)} employees")

        # ── Seed attendance logs ──
        print("Seeding attendance logs…")
        log_count = 0

        for num, _ in EMPLOYEES:
            db_emp_id = emp_id_map[num]
            day_logs = all_attendance.get(num, {})

            for log_date, times in day_logs.items():
                existing_log = await db.execute(
                    select(AttendanceLog).where(
                        and_(
                            AttendanceLog.employee_id == db_emp_id,
                            AttendanceLog.log_date == log_date,
                        )
                    )
                )
                log = existing_log.scalar_one_or_none()

                result = calculate_attendance(
                    times["clock_in"], times["clock_out"], log_date, schedule
                )

                if log:
                    log.clock_in  = result.clock_in
                    log.clock_out = result.clock_out
                else:
                    log = AttendanceLog(
                        employee_id=db_emp_id,
                        log_date=log_date,
                        clock_in=result.clock_in,
                        clock_out=result.clock_out,
                        source="api",
                    )
                    db.add(log)

                log.status              = result.status
                log.late_minutes        = result.late_minutes
                log.early_leave_minutes = result.early_leave_minutes
                log.ot_minutes          = result.ot_minutes
                log.work_minutes        = result.work_minutes
                log_count += 1

        await db.commit()
        print(f"Seeded {log_count} attendance logs")

        # ── Create March 2026 payroll period ──
        period_check = await db.execute(
            select(PayrollPeriod).where(PayrollPeriod.period_name == "March 2026")
        )
        period = period_check.scalar_one_or_none()

        if not period:
            period = PayrollPeriod(
                period_name="March 2026",
                start_date=date(2026, 3, 1),
                end_date=date(2026, 3, 31),
                payment_date=date(2026, 4, 5),
                status=PeriodStatus.draft,
            )
            db.add(period)
            await db.flush()
            print("Created payroll period: March 2026")

        period_id = period.id
        working_days = count_working_days(date(2026, 3, 1), date(2026, 3, 31))

        # ── Calculate payslips ──
        print(f"Calculating payslips ({working_days} working days)…")
        slip_count = 0

        for num, _ in EMPLOYEES:
            db_emp_id = emp_id_map[num]

            logs_result = await db.execute(
                select(AttendanceLog).where(
                    and_(
                        AttendanceLog.employee_id == db_emp_id,
                        AttendanceLog.log_date >= date(2026, 3, 1),
                        AttendanceLog.log_date <= date(2026, 3, 31),
                    )
                )
            )
            logs = logs_result.scalars().all()

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

            result = calculate_payroll(
                employee_id=str(db_emp_id),
                period_name="March 2026",
                employment_type="monthly",
                base_salary=BASE_SALARY,
                daily_rate=None,
                ot_rate_per_hour=OT_RATE_PER_HOUR,
                lunch_allowance_per_day=LUNCH_ALLOWANCE_DAY,
                social_security_rate=0.05,
                social_security_cap=750.0,
                attendance_records=attendance_results,
                working_days_in_period=working_days,
                days_leave=0,
                advance_deduction=0.0,
            )

            existing_slip = await db.execute(
                select(PayrollSlip).where(
                    and_(
                        PayrollSlip.period_id == period_id,
                        PayrollSlip.employee_id == db_emp_id,
                    )
                )
            )
            slip = existing_slip.scalar_one_or_none()
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
                total_earnings=result.total_earnings,
                social_security_deduction=result.social_security,
                advance_deduction=result.advance_deduction,
                late_penalty=result.late_penalty,
                total_deductions=result.total_deductions,
                net_pay=result.net_pay,
            )

            if slip:
                for k, v in slip_data.items():
                    setattr(slip, k, v)
            else:
                slip = PayrollSlip(
                    period_id=period_id,
                    employee_id=db_emp_id,
                    status=SlipStatus.draft,
                    **slip_data,
                )
                db.add(slip)
            slip_count += 1

        period.status = PeriodStatus.processing
        await db.commit()
        print(f"Generated {slip_count} payslips — period status: processing")

    print("\n✓ Seeding complete!")
    print("─" * 50)
    print("Admin login : admin / admin1234")
    print("Employee login: EMP001 / EMP001  (same pattern for all)")
    print("─" * 50)


if __name__ == "__main__":
    import os
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/payroll_db")
    asyncio.run(seed())
