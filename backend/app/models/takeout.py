import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Enum, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class TakeoutStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    PREPARING = "PREPARING"
    READY = "READY"
    PICKED_UP = "PICKED_UP"


class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"


class TakeoutOrder(TimestampMixin, Base):
    __tablename__ = "takeout_orders"

    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pickup_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[TakeoutStatus] = mapped_column(Enum(TakeoutStatus), default=TakeoutStatus.RECEIVED, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    orders: Mapped[List["Order"]] = relationship("Order", back_populates="takeout_order", lazy="selectin")
