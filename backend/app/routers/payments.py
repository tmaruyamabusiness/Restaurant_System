import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.payment import PaymentCreate, SplitPaymentCreate, PaymentResponse
from app.services import payment_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("", response_model=PaymentResponse)
async def process_payment(data: PaymentCreate, db: AsyncSession = Depends(get_db)):
    return await payment_service.process_payment(db, data)


@router.post("/split", response_model=PaymentResponse)
async def process_split_payment(data: SplitPaymentCreate, db: AsyncSession = Depends(get_db)):
    return await payment_service.process_split_payment(db, data)


@router.get("/order/{order_id}", response_model=List[PaymentResponse])
async def get_payments_for_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await payment_service.get_payments_for_order(db, order_id)
