import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus, OrderItemStatus
from app.schemas.order import OrderResponse, OrderItemResponse, OrderItemUpdate
from app.websocket.manager import emit_order_item_status_changed

router = APIRouter(prefix="/api/kds", tags=["kds"])


@router.get("/orders", response_model=List[OrderResponse])
async def get_kds_orders(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.status == OrderStatus.OPEN,
            Order.items.any(
                or_(
                    OrderItem.status == OrderItemStatus.PENDING,
                    OrderItem.status == OrderItemStatus.COOKING,
                )
            ),
        )
        .order_by(Order.created_at.asc())
    )
    return list(result.scalars().unique().all())


@router.put("/items/{item_id}/status", response_model=OrderItemResponse)
async def update_kds_item_status(
    item_id: uuid.UUID,
    data: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(OrderItem).where(OrderItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    if data.status is not None:
        item.status = data.status
    await db.flush()
    await db.refresh(item)

    await emit_order_item_status_changed(str(item_id), item.status.value, str(item.order_id))
    return item
