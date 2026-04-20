import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, Integer, Enum, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class EmploymentType(str, enum.Enum):
    monthly = "monthly"
    daily = "daily"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(Enum(EmploymentType), default=EmploymentType.monthly)

    # Compensation
    base_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    daily_rate: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    ot_rate_per_hour: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False, default=0.0)
    lunch_allowance_per_day: Mapped[float] = mapped_column(Numeric(8, 2), default=0.0)

    # Social security
    social_security_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.05)
    social_security_cap: Mapped[float] = mapped_column(Numeric(8, 2), default=750.0)

    # Work schedule (can override global default per employee)
    work_start_time: Mapped[str] = mapped_column(String(5), default="08:00")
    work_end_time: Mapped[str] = mapped_column(String(5), default="17:00")

    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Financial & Privacy Info
    id_card_number: Mapped[str | None] = mapped_column(String(255), nullable=True) # Encrypted
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(255), nullable=True) # Encrypted
    
    # Tax & Deductions Info
    pvd_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.0) # Provident Fund
    tax_allowance_personal: Mapped[float] = mapped_column(Numeric(12, 2), default=60000.0)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="employee", foreign_keys="User.employee_id", uselist=False)
    attendance_logs: Mapped[list["AttendanceLog"]] = relationship("AttendanceLog", back_populates="employee")
    payroll_slips: Mapped[list["PayrollSlip"]] = relationship("PayrollSlip", back_populates="employee")
    advances: Mapped[list["Advance"]] = relationship("Advance", back_populates="employee")
    leave_requests: Mapped[list["LeaveRequest"]] = relationship("LeaveRequest", back_populates="employee")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
