from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from app.models.attendance import AttendanceStatus, LogSource


class AttendanceLogCreate(BaseModel):
    employee_id: UUID
    log_date: date
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    source: LogSource = LogSource.api
    notes: str | None = None


class AttendanceLogUpdate(BaseModel):
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    notes: str | None = None


class AttendanceLogOut(BaseModel):
    id: UUID
    employee_id: UUID
    log_date: date
    clock_in: datetime | None
    clock_out: datetime | None
    source: LogSource
    status: AttendanceStatus
    late_minutes: int
    early_leave_minutes: int
    ot_minutes: int
    work_minutes: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkAttendanceCreate(BaseModel):
    """For fingerprint scanner API push — multiple logs at once."""
    logs: list[AttendanceLogCreate]


class AttendanceSummary(BaseModel):
    employee_id: UUID
    period_start: date
    period_end: date
    days_present: int
    days_absent: int
    days_late: int
    total_late_minutes: int
    total_ot_minutes: int
    total_work_minutes: int
