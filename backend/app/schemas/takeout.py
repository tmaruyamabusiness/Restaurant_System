import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.takeout import TakeoutStatus, PaymentStatus
from app.schemas.order import OrderResponse


class TakeoutCreate(BaseModel):
    customer_name: str
    phone_number: Optional[str] = None
    pickup_at: Optional[datetime] = None
    notes: Optional[str] = None


class TakeoutUpdate(BaseModel):
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    pickup_at: Optional[datetime] = None
    notes: Optional[str] = None


class TakeoutStatusUpdate(BaseModel):
    status: TakeoutStatus


class TakeoutResponse(BaseModel):
    id: uuid.UUID
    customer_name: str
    phone_number: Optional[str] = None
    pickup_at: Optional[datetime] = None
    status: TakeoutStatus
    payment_status: PaymentStatus
    notes: Optional[str] = None
    orders: List[OrderResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
