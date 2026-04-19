import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    leave = "leave"


class LogSource(str, enum.Enum):
    fingerprint = "fingerprint"
    api = "api"
    manual = "manual"


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    clock_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped[LogSource] = mapped_column(Enum(LogSource), default=LogSource.api)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), default=AttendanceStatus.present)

    # Calculated fields (stored for performance)
    late_minutes: Mapped[int] = mapped_column(Integer, default=0)
    early_leave_minutes: Mapped[int] = mapped_column(Integer, default=0)
    ot_minutes: Mapped[int] = mapped_column(Integer, default=0)
    work_minutes: Mapped[int] = mapped_column(Integer, default=0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendance_logs")
