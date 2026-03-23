import uuid
import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class SeatType(str, enum.Enum):
    COUNTER = "COUNTER"
    TABLE_2 = "TABLE_2"
    TABLE_4 = "TABLE_4"


class SessionStatus(str, enum.Enum):
    VACANT = "VACANT"
    GUIDED = "GUIDED"
    ORDERING = "ORDERING"
    BILLING = "BILLING"
    CLEANING = "CLEANING"


class Seat(TimestampMixin, Base):
    __tablename__ = "seats"

    seat_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    seat_type: Mapped[SeatType] = mapped_column(Enum(SeatType), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sessions: Mapped[List["SeatSession"]] = relationship("SeatSession", back_populates="seat", lazy="selectin")


class SeatSession(TimestampMixin, Base):
    __tablename__ = "seat_sessions"

    seat_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("seats.id"), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.VACANT, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    seated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    billed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cleaned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    seat: Mapped["Seat"] = relationship("Seat", back_populates="sessions", lazy="selectin")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="session", lazy="selectin", foreign_keys="Order.session_id")
