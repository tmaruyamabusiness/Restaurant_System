import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.models.payment import PaymentMethod


class PaymentCreate(BaseModel):
    order_id: uuid.UUID
    payment_method: PaymentMethod
    paid_amount: Decimal
    receipt_issued: bool = False


class PaymentSplitItem(BaseModel):
    split_index: int
    amount: Decimal
    payment_method: PaymentMethod


class SplitPaymentCreate(BaseModel):
    order_id: uuid.UUID
    splits: List[PaymentSplitItem]
    receipt_issued: bool = False


class PaymentSplitResponse(BaseModel):
    id: uuid.UUID
    payment_id: uuid.UUID
    split_index: int
    amount: Decimal
    payment_method: PaymentMethod

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    payment_method: PaymentMethod
    paid_amount: Decimal
    change_amount: Decimal
    is_split: bool
    receipt_issued: bool
    splits: List[PaymentSplitResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
