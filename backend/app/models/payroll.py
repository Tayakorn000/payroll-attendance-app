import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, Numeric, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PeriodStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    approved = "approved"
    paid = "paid"


class SlipStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    paid = "paid"


class PayrollPeriod(Base):
    __tablename__ = "payroll_periods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period_name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[PeriodStatus] = mapped_column(Enum(PeriodStatus), default=PeriodStatus.draft)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    slips: Mapped[list["PayrollSlip"]] = relationship("PayrollSlip", back_populates="period")


class PayrollSlip(Base):
    __tablename__ = "payroll_slips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_periods.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)

    # Attendance summary
    working_days_in_period: Mapped[int] = mapped_column(Integer, default=0)
    days_worked: Mapped[int] = mapped_column(Integer, default=0)
    days_absent: Mapped[int] = mapped_column(Integer, default=0)
    days_leave: Mapped[int] = mapped_column(Integer, default=0)
    late_minutes_total: Mapped[int] = mapped_column(Integer, default=0)
    early_leave_minutes_total: Mapped[int] = mapped_column(Integer, default=0)
    ot_minutes_total: Mapped[int] = mapped_column(Integer, default=0)

    # Earnings
    base_salary_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    lunch_allowance_earned: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    ot_pay: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    piece_rate_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    bonus: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    commission: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    other_earnings: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    total_earnings: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    # Deductions
    social_security_deduction: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    provident_fund_deduction: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    tax_deduction: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    advance_deduction: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    loan_deduction: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    late_penalty: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    other_deductions: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    total_deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    net_pay: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    status: Mapped[SlipStatus] = mapped_column(Enum(SlipStatus), default=SlipStatus.draft)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    period: Mapped["PayrollPeriod"] = relationship("PayrollPeriod", back_populates="slips")
    employee: Mapped["Employee"] = relationship("Employee", back_populates="payroll_slips")
