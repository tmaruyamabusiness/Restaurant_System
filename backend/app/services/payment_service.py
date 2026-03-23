import uuid
from decimal import Decimal
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.payment import Payment, PaymentSplit, PaymentMethod
from app.models.order import Order, OrderStatus
from app.models.takeout import TakeoutOrder, PaymentStatus as TakeoutPaymentStatus
from app.schemas.payment import PaymentCreate, SplitPaymentCreate


async def process_payment(db: AsyncSession, data: PaymentCreate) -> Payment:
    order = await db.get(Order, data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail="Order is not open")

    if data.paid_amount < order.total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Paid amount {data.paid_amount} is less than total {order.total_amount}"
        )

    change = Decimal("0.00")
    if data.payment_method == PaymentMethod.CASH:
        change = data.paid_amount - order.total_amount

    payment = Payment(
        order_id=order.id,
        payment_method=data.payment_method,
        paid_amount=data.paid_amount,
        change_amount=change,
        is_split=False,
        receipt_issued=data.receipt_issued,
    )
    db.add(payment)

    order.status = OrderStatus.CLOSED

    if order.takeout_order_id:
        takeout = await db.get(TakeoutOrder, order.takeout_order_id)
        if takeout:
            takeout.payment_status = TakeoutPaymentStatus.PAID

    await db.flush()
    await db.refresh(payment)
    return payment


async def process_split_payment(db: AsyncSession, data: SplitPaymentCreate) -> Payment:
    order = await db.get(Order, data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.OPEN:
        raise HTTPException(status_code=400, detail="Order is not open")

    total_split = sum(s.amount for s in data.splits)
    if total_split < order.total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Split total {total_split} is less than order total {order.total_amount}"
        )

    change = total_split - order.total_amount
    primary_method = data.splits[0].payment_method if data.splits else PaymentMethod.CASH

    payment = Payment(
        order_id=order.id,
        payment_method=primary_method,
        paid_amount=total_split,
        change_amount=change,
        is_split=True,
        receipt_issued=data.receipt_issued,
    )
    db.add(payment)
    await db.flush()

    for split_data in data.splits:
        split = PaymentSplit(
            payment_id=payment.id,
            split_index=split_data.split_index,
            amount=split_data.amount,
            payment_method=split_data.payment_method,
        )
        db.add(split)

    order.status = OrderStatus.CLOSED

    if order.takeout_order_id:
        takeout = await db.get(TakeoutOrder, order.takeout_order_id)
        if takeout:
            takeout.payment_status = TakeoutPaymentStatus.PAID

    await db.flush()
    result = await db.execute(
        select(Payment).options(selectinload(Payment.splits)).where(Payment.id == payment.id)
    )
    return result.scalar_one()


async def get_payments_for_order(db: AsyncSession, order_id: uuid.UUID) -> List[Payment]:
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.splits))
        .where(Payment.order_id == order_id)
        .order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())
