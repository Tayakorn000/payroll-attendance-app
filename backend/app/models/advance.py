import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Numeric, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class AdvanceStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    deducted = "deducted"


class Advance(Base):
    __tablename__ = "advances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    request_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    approved_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payroll_periods.id"), nullable=True)
    status: Mapped[AdvanceStatus] = mapped_column(Enum(AdvanceStatus), default=AdvanceStatus.pending)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="advances")
