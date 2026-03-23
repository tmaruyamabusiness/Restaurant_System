import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.models.order import OrderType, OrderStatus, OrderItemStatus, DiscountType


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = 1
    notes: Optional[str] = None


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    status: Optional[OrderItemStatus] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    menu_item_id: uuid.UUID
    item_name: str
    unit_price: Decimal
    quantity: int
    status: OrderItemStatus
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    session_id: Optional[uuid.UUID] = None
    takeout_order_id: Optional[uuid.UUID] = None
    order_type: OrderType
    notes: Optional[str] = None
    discount_amount: Decimal = Decimal("0.00")
    discount_type: DiscountType = DiscountType.NONE
    items: List[OrderItemCreate] = []


class OrderResponse(BaseModel):
    id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    takeout_order_id: Optional[uuid.UUID] = None
    order_type: OrderType
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    discount_amount: Decimal
    discount_type: DiscountType
    status: OrderStatus
    notes: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
