import uuid
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class OrderType(str, enum.Enum):
    DINE_IN = "DINE_IN"
    TAKEOUT = "TAKEOUT"


class OrderStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class OrderItemStatus(str, enum.Enum):
    PENDING = "PENDING"
    COOKING = "COOKING"
    READY = "READY"
    SERVED = "SERVED"
    CANCELLED = "CANCELLED"


class DiscountType(str, enum.Enum):
    NONE = "NONE"
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("seat_sessions.id"), nullable=True)
    takeout_order_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("takeout_orders.id"), nullable=True)
    order_type: Mapped[OrderType] = mapped_column(Enum(OrderType), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.10"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType), default=DiscountType.NONE, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.OPEN, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped[Optional["SeatSession"]] = relationship("SeatSession", back_populates="orders", lazy="selectin", foreign_keys=[session_id])
    takeout_order: Mapped[Optional["TakeoutOrder"]] = relationship("TakeoutOrder", back_populates="orders", lazy="selectin")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", lazy="selectin")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="order", lazy="selectin")


class OrderItem(TimestampMixin, Base):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    menu_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_items.id"), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[OrderItemStatus] = mapped_column(Enum(OrderItemStatus), default=OrderItemStatus.PENDING, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="items", lazy="selectin")
    menu_item: Mapped["MenuItem"] = relationship("MenuItem", lazy="selectin")
