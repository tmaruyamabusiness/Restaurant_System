import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.order import OrderType, OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate, OrderItemUpdate, OrderResponse, OrderItemResponse
from app.services import order_service
from app.websocket.manager import emit_new_order, emit_order_item_status_changed

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
async def list_orders(
    order_type: Optional[OrderType] = Query(None),
    status: Optional[OrderStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await order_service.get_orders(db, order_type=order_type, status=status, limit=limit, offset=offset)


@router.post("", response_model=OrderResponse)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    order = await order_service.create_order(db, data)
    await emit_new_order(OrderResponse.model_validate(order).model_dump(mode="json"))
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await order_service.get_order_by_id(db, order_id)


@router.post("/{order_id}/items", response_model=OrderResponse)
async def add_items(order_id: uuid.UUID, items: List[OrderItemCreate], db: AsyncSession = Depends(get_db)):
    order = await order_service.add_items_to_order(db, order_id, items)
    await emit_new_order(OrderResponse.model_validate(order).model_dump(mode="json"))
    return order


@router.put("/{order_id}/items/{item_id}", response_model=OrderItemResponse)
async def update_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    item = await order_service.update_order_item(db, order_id, item_id, data)
    if data.status is not None:
        await emit_order_item_status_changed(str(item_id), item.status.value, str(order_id))
    return item


@router.get("/session/{session_id}", response_model=List[OrderResponse])
async def get_session_orders(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await order_service.get_orders_by_session(db, session_id)
