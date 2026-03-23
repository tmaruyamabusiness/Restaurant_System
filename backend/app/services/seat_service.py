import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.seat import Seat, SeatSession, SessionStatus
from app.schemas.seat import SeatCreate, SeatUpdate


VALID_TRANSITIONS = {
    SessionStatus.VACANT: [SessionStatus.GUIDED],
    SessionStatus.GUIDED: [SessionStatus.ORDERING, SessionStatus.VACANT],
    SessionStatus.ORDERING: [SessionStatus.BILLING],
    SessionStatus.BILLING: [SessionStatus.CLEANING],
    SessionStatus.CLEANING: [SessionStatus.VACANT],
}


async def get_all_seats(db: AsyncSession) -> List[Seat]:
    result = await db.execute(
        select(Seat).options(selectinload(Seat.sessions)).order_by(Seat.sort_order)
    )
    return list(result.scalars().all())


async def get_seat_by_id(db: AsyncSession, seat_id: uuid.UUID) -> Seat:
    result = await db.execute(
        select(Seat).options(selectinload(Seat.sessions)).where(Seat.id == seat_id)
    )
    seat = result.scalar_one_or_none()
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
    return seat


def get_current_session(seat: Seat) -> Optional[SeatSession]:
    active = [s for s in seat.sessions if s.status != SessionStatus.VACANT]
    if active:
        return max(active, key=lambda s: s.created_at)
    return None


async def create_seat(db: AsyncSession, data: SeatCreate) -> Seat:
    seat = Seat(**data.model_dump())
    db.add(seat)
    await db.flush()
    await db.refresh(seat)
    return seat


async def update_seat(db: AsyncSession, seat_id: uuid.UUID, data: SeatUpdate) -> Seat:
    seat = await get_seat_by_id(db, seat_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(seat, key, value)
    await db.flush()
    await db.refresh(seat)
    return seat


async def guide_to_seat(db: AsyncSession, seat_id: uuid.UUID, party_size: int) -> SeatSession:
    seat = await get_seat_by_id(db, seat_id)
    current = get_current_session(seat)
    if current is not None:
        raise HTTPException(status_code=400, detail=f"Seat is not vacant. Current status: {current.status}")
    if party_size > seat.capacity:
        raise HTTPException(status_code=400, detail=f"Party size {party_size} exceeds seat capacity {seat.capacity}")

    session = SeatSession(
        seat_id=seat.id,
        status=SessionStatus.GUIDED,
        party_size=party_size,
        seated_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def change_session_status(db: AsyncSession, seat_id: uuid.UUID, new_status: SessionStatus) -> SeatSession:
    seat = await get_seat_by_id(db, seat_id)
    current = get_current_session(seat)

    if current is None:
        if new_status == SessionStatus.GUIDED:
            session = SeatSession(
                seat_id=seat.id,
                status=SessionStatus.GUIDED,
                party_size=1,
                seated_at=datetime.now(timezone.utc),
            )
            db.add(session)
            await db.flush()
            await db.refresh(session)
            return session
        raise HTTPException(status_code=400, detail="No active session. Guide a customer first.")

    allowed = VALID_TRANSITIONS.get(current.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {current.status} to {new_status}. Allowed: {[s.value for s in allowed]}"
        )

    now = datetime.now(timezone.utc)
    current.status = new_status
    if new_status == SessionStatus.BILLING:
        current.billed_at = now
    elif new_status == SessionStatus.CLEANING:
        current.cleaned_at = now
    elif new_status == SessionStatus.VACANT:
        current.status = SessionStatus.VACANT
        current.cleaned_at = current.cleaned_at or now

    await db.flush()
    await db.refresh(current)
    return current
