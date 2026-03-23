import uuid
import enum
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, Boolean, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class TaxType(str, enum.Enum):
    STANDARD_10 = "STANDARD_10"
    REDUCED_8 = "REDUCED_8"


class MenuCategory(TimestampMixin, Base):
    __tablename__ = "menu_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    items: Mapped[List["MenuItem"]] = relationship("MenuItem", back_populates="category", lazy="selectin")


class MenuItem(TimestampMixin, Base):
    __tablename__ = "menu_items"

    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("menu_categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_type: Mapped[TaxType] = mapped_column(Enum(TaxType), default=TaxType.STANDARD_10, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    category: Mapped["MenuCategory"] = relationship("MenuCategory", back_populates="items", lazy="selectin")
