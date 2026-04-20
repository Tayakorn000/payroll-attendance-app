from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime, date
from app.models.employee import EmploymentType
class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    department: str | None = None
    position: str | None = None
    employment_type: EmploymentType = EmploymentType.monthly
    base_salary: float
    daily_rate: float | None = None
    ot_rate_per_hour: float = 0.0
    lunch_allowance_per_day: float = 0.0
    social_security_rate: float = 0.05
    social_security_cap: float = 750.0
    work_start_time: str = "08:00"
    work_end_time: str = "17:00"
    hire_date: date
    id_card_number: str | None = None
    bank_name: str | None = None
    bank_account_number: str | None = None
    pvd_rate: float = 0.0
    tax_allowance_personal: float = 60000.0


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    department: str | None = None
    position: str | None = None
    employment_type: EmploymentType | None = None
    base_salary: float | None = None
    daily_rate: float | None = None
    ot_rate_per_hour: float | None = None
    lunch_allowance_per_day: float | None = None
    social_security_rate: float | None = None
    social_security_cap: float | None = None
    work_start_time: str | None = None
    work_end_time: str | None = None
    is_active: bool | None = None
    id_card_number: str | None = None
    bank_name: str | None = None
    bank_account_number: str | None = None
    pvd_rate: float | None = None
    tax_allowance_personal: float | None = None


class EmployeeOut(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    full_name: str
    email: EmailStr | None
    phone: str | None
    department: str | None
    position: str | None
    employment_type: EmploymentType
    base_salary: float
    daily_rate: float | None
    ot_rate_per_hour: float
    lunch_allowance_per_day: float
    social_security_rate: float
    social_security_cap: float
    work_start_time: str
    work_end_time: str
    hire_date: date
    is_active: bool
    id_card_number: str | None
    bank_name: str | None
    bank_account_number: str | None
    pvd_rate: float
    tax_allowance_personal: float
    created_at: datetime

    model_config = {"from_attributes": True}

