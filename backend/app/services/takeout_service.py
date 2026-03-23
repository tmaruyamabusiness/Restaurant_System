import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.takeout import TakeoutOrder, TakeoutStatus
from app.schemas.takeout import TakeoutCreate, TakeoutUpdate, TakeoutStatusUpdate


async def get_all_takeout(
    db: AsyncSession,
    status: Optional[TakeoutStatus] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[TakeoutOrder]:
    q = select(TakeoutOrder).options(selectinload(TakeoutOrder.orders))
    if status:
        q = q.where(TakeoutOrder.status == status)
    q = q.order_by(TakeoutOrder.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_takeout_by_id(db: AsyncSession, takeout_id: uuid.UUID) -> TakeoutOrder:
    result = await db.execute(
        select(TakeoutOrder)
        .options(selectinload(TakeoutOrder.orders))
        .where(TakeoutOrder.id == takeout_id)
    )
    takeout = result.scalar_one_or_none()
    if not takeout:
        raise HTTPException(status_code=404, detail="Takeout order not found")
    return takeout


async def create_takeout(db: AsyncSession, data: TakeoutCreate) -> TakeoutOrder:
    takeout = TakeoutOrder(**data.model_dump())
    db.add(takeout)
    await db.flush()
    await db.refresh(takeout)
    return takeout


async def update_takeout(db: AsyncSession, takeout_id: uuid.UUID, data: TakeoutUpdate) -> TakeoutOrder:
    takeout = await get_takeout_by_id(db, takeout_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(takeout, key, value)
    await db.flush()
    await db.refresh(takeout)
    return takeout


async def update_takeout_status(
    db: AsyncSession, takeout_id: uuid.UUID, data: TakeoutStatusUpdate
) -> TakeoutOrder:
    takeout = await get_takeout_by_id(db, takeout_id)
    takeout.status = data.status
    await db.flush()
    await db.refresh(takeout)
    return takeout
