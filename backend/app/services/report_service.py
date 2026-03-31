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

    order_count = row.order_count or 0
    total_sales = float(row.total)
    average_per_order = total_sales / order_count if order_count > 0 else 0

    # By order type
    dinein_q = await db.execute(
        select(
            func.coalesce(func.sum(Order.total_amount), 0),
        ).where(and_(base_filter, Order.order_type == OrderType.DINE_IN))
    )
    dinein_total = float(dinein_q.scalar() or 0)

    takeout_q = await db.execute(
        select(
            func.coalesce(func.sum(Order.total_amount), 0),
        ).where(and_(base_filter, Order.order_type == OrderType.TAKEOUT))
    )
    takeout_total = float(takeout_q.scalar() or 0)

    by_order_type = {
        "DINE_IN": dinein_total,
        "TAKEOUT": takeout_total,
    }

    # By payment method
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
    by_payment_method = {r[0].value: float(r[1]) for r in payment_q.all()}

    # Hourly breakdown
    hourly_q = await db.execute(
        select(
            extract("hour", Order.created_at).label("hour"),
            func.coalesce(func.sum(Order.total_amount), 0),
        )
        .where(base_filter)
        .group_by("hour")
        .order_by("hour")
    )
    hourly_map = {int(r[0]): float(r[1]) for r in hourly_q.all()}
    hourly = [{"hour": h, "total": hourly_map.get(h, 0)} for h in range(24)]

    return {
        "date": report_date.isoformat(),
        "total_sales": total_sales,
        "order_count": order_count,
        "average_per_order": round(average_per_order),
        "by_payment_method": by_payment_method,
        "by_order_type": by_order_type,
        "hourly": hourly,
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
            func.coalesce(func.sum(Order.total_amount), 0).label("total"),
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
    daily_totals = [
        {"date": r[0].strftime("%Y-%m-%d"), "order_count": r[1], "total": float(r[2])}
        for r in daily_q.all()
    ]

    return {
        "month": f"{year}-{month:02d}",
        "total_sales": float(row.total),
        "total_orders": row.order_count or 0,
        "daily_totals": daily_totals,
    }
