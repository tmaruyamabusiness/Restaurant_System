import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.takeout import TakeoutStatus
from app.schemas.takeout import TakeoutCreate, TakeoutUpdate, TakeoutStatusUpdate, TakeoutResponse
from app.services import takeout_service
from app.websocket.manager import emit_takeout_status_changed

router = APIRouter(prefix="/api/takeout", tags=["takeout"])


@router.get("", response_model=List[TakeoutResponse])
async def list_takeout(
    status: Optional[TakeoutStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await takeout_service.get_all_takeout(db, status=status, limit=limit, offset=offset)


@router.post("", response_model=TakeoutResponse)
async def create_takeout(data: TakeoutCreate, db: AsyncSession = Depends(get_db)):
    return await takeout_service.create_takeout(db, data)


@router.get("/{takeout_id}", response_model=TakeoutResponse)
async def get_takeout(takeout_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await takeout_service.get_takeout_by_id(db, takeout_id)


@router.put("/{takeout_id}/status", response_model=TakeoutResponse)
async def update_status(
    takeout_id: uuid.UUID,
    data: TakeoutStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    takeout = await takeout_service.update_takeout_status(db, takeout_id, data)
    await emit_takeout_status_changed(str(takeout_id), takeout.status.value)
    return takeout


@router.put("/{takeout_id}", response_model=TakeoutResponse)
async def update_takeout(
    takeout_id: uuid.UUID,
    data: TakeoutUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await takeout_service.update_takeout(db, takeout_id, data)
