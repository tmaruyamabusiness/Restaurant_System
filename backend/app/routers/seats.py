import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.seat import SeatCreate, SeatUpdate, SeatResponse, SeatSessionResponse, GuideRequest, StatusChangeRequest
from app.services import seat_service
from app.websocket.manager import emit_seat_status_changed

router = APIRouter(prefix="/api/seats", tags=["seats"])


def build_seat_response(seat) -> dict:
    current = seat_service.get_current_session(seat)
    status = current.status.value if current else "VACANT"
    data = {
        "id": seat.id,
        "seat_number": seat.seat_number,
        "seat_type": seat.seat_type,
        "number": seat.seat_number,
        "type": seat.seat_type.value,
        "status": status,
        "capacity": seat.capacity,
        "is_active": seat.is_active,
        "active": seat.is_active,
        "sort_order": seat.sort_order,
        "created_at": seat.created_at,
        "current_session": None,
    }
    if current:
        data["current_session"] = SeatSessionResponse.model_validate(current).model_dump()
    return data


@router.get("", response_model=List[SeatResponse])
async def list_seats(db: AsyncSession = Depends(get_db)):
    seats = await seat_service.get_all_seats(db)
    return [build_seat_response(s) for s in seats]


@router.get("/{seat_id}")
async def get_seat(seat_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    seat = await seat_service.get_seat_by_id(db, seat_id)
    return build_seat_response(seat)


@router.post("", response_model=SeatResponse)
async def create_seat(data: SeatCreate, db: AsyncSession = Depends(get_db)):
    seat = await seat_service.create_seat(db, data)
    return build_seat_response(seat)


@router.put("/{seat_id}", response_model=SeatResponse)
async def update_seat(seat_id: uuid.UUID, data: SeatUpdate, db: AsyncSession = Depends(get_db)):
    seat = await seat_service.update_seat(db, seat_id, data)
    return build_seat_response(seat)


@router.post("/{seat_id}/guide", response_model=SeatSessionResponse)
async def guide_to_seat(seat_id: uuid.UUID, data: GuideRequest, db: AsyncSession = Depends(get_db)):
    session = await seat_service.guide_to_seat(db, seat_id, data.party_size)
    await emit_seat_status_changed(str(seat_id), session.status.value, SeatSessionResponse.model_validate(session).model_dump(mode="json"))
    return session


@router.put("/{seat_id}/status", response_model=SeatSessionResponse)
async def change_status(seat_id: uuid.UUID, data: StatusChangeRequest, db: AsyncSession = Depends(get_db)):
    session = await seat_service.change_session_status(db, seat_id, data.status)
    await emit_seat_status_changed(str(seat_id), session.status.value, SeatSessionResponse.model_validate(session).model_dump(mode="json"))
    return session
