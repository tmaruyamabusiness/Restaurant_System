import uuid
import enum
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    QR = "QR"


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    change_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_split: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    receipt_issued: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="payments", lazy="selectin")
    splits: Mapped[List["PaymentSplit"]] = relationship("PaymentSplit", back_populates="payment", lazy="selectin")


class PaymentSplit(TimestampMixin, Base):
    __tablename__ = "payment_splits"

    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False)
    split_index: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)

    payment: Mapped["Payment"] = relationship("Payment", back_populates="splits", lazy="selectin")
