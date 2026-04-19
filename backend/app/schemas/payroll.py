from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from app.models.payroll import PeriodStatus, SlipStatus


class PayrollPeriodCreate(BaseModel):
    period_name: str
    start_date: date
    end_date: date
    payment_date: date | None = None


class PayrollPeriodOut(BaseModel):
    id: UUID
    period_name: str
    start_date: date
    end_date: date
    payment_date: date | None
    status: PeriodStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PayrollSlipOut(BaseModel):
    id: UUID
    period_id: UUID
    employee_id: UUID
    working_days_in_period: int
    days_worked: int
    days_absent: int
    days_leave: int
    late_minutes_total: int
    ot_minutes_total: int
    base_salary_earned: float
    lunch_allowance_earned: float
    ot_pay: float
    total_earnings: float
    social_security_deduction: float
    advance_deduction: float
    late_penalty: float
    total_deductions: float
    net_pay: float
    status: SlipStatus
    approved_at: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdvanceCreate(BaseModel):
    employee_id: UUID
    amount: float
    reason: str | None = None


class AdvanceOut(BaseModel):
    id: UUID
    employee_id: UUID
    amount: float
    request_date: date
    approved_date: date | None
    period_id: UUID | None
    status: str
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
