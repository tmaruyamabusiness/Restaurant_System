import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.seat import SeatType, SessionStatus


class SeatCreate(BaseModel):
    seat_number: str
    seat_type: SeatType
    capacity: int
    is_active: bool = True
    sort_order: int = 0


class SeatUpdate(BaseModel):
    seat_number: Optional[str] = None
    seat_type: Optional[SeatType] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SeatSessionResponse(BaseModel):
    id: uuid.UUID
    seat_id: uuid.UUID
    status: SessionStatus
    party_size: int
    seated_at: Optional[datetime] = None
    billed_at: Optional[datetime] = None
    cleaned_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SeatResponse(BaseModel):
    id: uuid.UUID
    seat_number: str
    seat_type: SeatType
    number: str = ""
    type: str = ""
    status: str = "VACANT"
    capacity: int
    is_active: bool
    active: bool = True
    sort_order: int
    current_session: Optional[SeatSessionResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GuideRequest(BaseModel):
    party_size: int


class StatusChangeRequest(BaseModel):
    status: SessionStatus
