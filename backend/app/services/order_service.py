import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.order import Order, OrderItem, OrderType, OrderStatus, OrderItemStatus, DiscountType
from app.models.menu import MenuItem
from app.models.seat import SeatSession
from app.models.takeout import TakeoutOrder
from app.schemas.order import OrderCreate, OrderItemCreate, OrderItemUpdate
from app.config import get_settings

settings = get_settings()


def calculate_tax_rate(order_type: OrderType) -> Decimal:
    if order_type == OrderType.TAKEOUT:
        return Decimal(str(settings.TAX_RATE_REDUCED))
    return Decimal(str(settings.TAX_RATE_STANDARD))


def recalculate_order(order: Order) -> None:
    subtotal = Decimal("0.00")
    for item in order.items:
        if item.status != OrderItemStatus.CANCELLED:
            subtotal += item.unit_price * item.quantity
    order.subtotal = subtotal

    discounted = subtotal
    if order.discount_type == DiscountType.PERCENTAGE and order.discount_amount > 0:
        discounted = subtotal * (Decimal("1") - order.discount_amount / Decimal("100"))
    elif order.discount_type == DiscountType.FIXED and order.discount_amount > 0:
        discounted = max(Decimal("0"), subtotal - order.discount_amount)

    tax = (discounted * order.tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    order.tax_amount = tax
    order.total_amount = discounted + tax


async def get_orders(
    db: AsyncSession,
    order_type: Optional[OrderType] = None,
    status: Optional[OrderStatus] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Order]:
    q = select(Order).options(selectinload(Order.items))
    if order_type:
        q = q.where(Order.order_type == order_type)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_order_by_id(db: AsyncSession, order_id: uuid.UUID) -> Order:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def get_orders_by_session(db: AsyncSession, session_id: uuid.UUID) -> List[Order]:
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.session_id == session_id)
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def create_order(db: AsyncSession, data: OrderCreate) -> Order:
    if data.order_type == OrderType.DINE_IN:
        if not data.session_id:
            raise HTTPException(status_code=400, detail="session_id required for dine-in orders")
        sess = await db.get(SeatSession, data.session_id)
        if not sess:
            raise HTTPException(status_code=404, detail="Session not found")
    elif data.order_type == OrderType.TAKEOUT:
        if not data.takeout_order_id:
            raise HTTPException(status_code=400, detail="takeout_order_id required for takeout orders")
        to = await db.get(TakeoutOrder, data.takeout_order_id)
        if not to:
            raise HTTPException(status_code=404, detail="Takeout order not found")

    tax_rate = calculate_tax_rate(data.order_type)
    order = Order(
        session_id=data.session_id,
        takeout_order_id=data.takeout_order_id,
        order_type=data.order_type,
        tax_rate=tax_rate,
        discount_amount=data.discount_amount,
        discount_type=data.discount_type,
        status=OrderStatus.OPEN,
        notes=data.notes,
    )
    db.add(order)
    await db.flush()

    for item_data in data.items:
        menu_item = await db.get(MenuItem, item_data.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")
        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item '{menu_item.name}' is not available")

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            unit_price=menu_item.price,
            quantity=item_data.quantity,
            notes=item_data.notes,
        )
        db.add(order_item)

    await db.flush()
    await db.refresh(order)
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    order = result.scalar_one()
    recalculate_order(order)
    await db.flush()
    await db.refresh(order)
    return order


async def add_items_to_order(db: AsyncSession, order_id: uuid.UUID, items: List[OrderItemCreate]) -> Order:
    order = await get_order_by_id(db, order_id)
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail="Cannot add items to a closed or cancelled order")

    for item_data in items:
        menu_item = await db.get(MenuItem, item_data.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")
        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item '{menu_item.name}' is not available")

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            item_name=menu_item.name,
            unit_price=menu_item.price,
            quantity=item_data.quantity,
            notes=item_data.notes,
        )
        db.add(order_item)

    await db.flush()
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    order = result.scalar_one()
    recalculate_order(order)
    await db.flush()
    await db.refresh(order)
    return order


async def update_order_item(
    db: AsyncSession, order_id: uuid.UUID, item_id: uuid.UUID, data: OrderItemUpdate
) -> OrderItem:
    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    if data.quantity is not None:
        item.quantity = data.quantity
    if data.status is not None:
        item.status = data.status
    if data.notes is not None:
        item.notes = data.notes

    await db.flush()

    order = await get_order_by_id(db, order_id)
    recalculate_order(order)
    await db.flush()
    await db.refresh(item)
    return item
