from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from app.models.leave import LeaveType, LeaveStatus


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_count: int
    reason: str | None = None


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatus


class LeaveRequestOut(BaseModel):
    id: UUID
    employee_id: UUID
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_count: int
    reason: str | None
    status: LeaveStatus
    created_at: datetime

    model_config = {"from_attributes": True}
