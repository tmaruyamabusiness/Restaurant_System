from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus, OrderType
from app.models.payment import Payment, PaymentMethod


async def daily_report(db: AsyncSession, report_date: date) -> Dict[str, Any]:
    start = datetime(report_date.year, report_date.month, report_date.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    base_filter = and_(
        Order.status == OrderStatus.CLOSED,
        Order.created_at >= start,
        Order.created_at < end,
    )

    total_q = await db.execute(
        select(
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.subtotal), 0).label("subtotal"),
            func.coalesce(func.sum(Order.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total"),
            func.coalesce(func.sum(Order.discount_amount), 0).label("discount"),
        ).where(base_filter)
    )
    row = total_q.one()

    dinein_q = await db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        ).where(and_(base_filter, Order.order_type == OrderType.DINE_IN))
    )
    dinein = dinein_q.one()

    takeout_q = await db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        ).where(and_(base_filter, Order.order_type == OrderType.TAKEOUT))
    )
    takeout = takeout_q.one()

    payment_q = await db.execute(
        select(
            Payment.payment_method,
            func.coalesce(func.sum(Payment.paid_amount - Payment.change_amount), 0),
        )
        .join(Order, Payment.order_id == Order.id)
        .where(and_(
            Order.status == OrderStatus.CLOSED,
            Payment.created_at >= start,
            Payment.created_at < end,
        ))
        .group_by(Payment.payment_method)
    )
    payment_breakdown = {r[0].value: float(r[1]) for r in payment_q.all()}

    return {
        "date": report_date.isoformat(),
        "order_count": row.order_count,
        "subtotal": float(row.subtotal),
        "tax_total": float(row.tax),
        "discount_total": float(row.discount),
        "grand_total": float(row.total),
        "dine_in": {"count": dinein[0], "total": float(dinein[1])},
        "takeout": {"count": takeout[0], "total": float(takeout[1])},
        "payment_methods": payment_breakdown,
    }


async def monthly_report(db: AsyncSession, year: int, month: int) -> Dict[str, Any]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    base_filter = and_(
        Order.status == OrderStatus.CLOSED,
        Order.created_at >= start,
        Order.created_at < end,
    )

    total_q = await db.execute(
        select(
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.subtotal), 0).label("subtotal"),
            func.coalesce(func.sum(Order.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total"),
            func.coalesce(func.sum(Order.discount_amount), 0).label("discount"),
        ).where(base_filter)
    )
    row = total_q.one()

    daily_q = await db.execute(
        select(
            func.date_trunc("day", Order.created_at).label("day"),
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        )
        .where(base_filter)
        .group_by("day")
        .order_by("day")
    )
    daily_breakdown = [
        {"date": r[0].strftime("%Y-%m-%d"), "count": r[1], "total": float(r[2])}
        for r in daily_q.all()
    ]

    return {
        "year": year,
        "month": month,
        "order_count": row.order_count,
        "subtotal": float(row.subtotal),
        "tax_total": float(row.tax),
        "discount_total": float(row.discount),
        "grand_total": float(row.total),
        "daily_breakdown": daily_breakdown,
    }
