from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/daily")
async def daily_report(
    date: date = Query(default=None, alias="date", description="Date in YYYY-MM-DD format"),
    report_date: date = Query(default=None, description="Date in YYYY-MM-DD format (legacy)"),
    db: AsyncSession = Depends(get_db),
):
    target_date = date or report_date
    if target_date is None:
        from datetime import date as date_cls
        target_date = date_cls.today()
    return await report_service.daily_report(db, target_date)


@router.get("/monthly")
async def monthly_report(
    month: str = Query(default=None, description="Month in YYYY-MM format"),
    year: int = Query(default=None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
):
    if month:
        parts = month.split("-")
        y, m = int(parts[0]), int(parts[1])
    elif year is not None:
        raise ValueError("When using 'year', 'month' query param is also required")
    else:
        from datetime import date as date_cls
        today = date_cls.today()
        y, m = today.year, today.month
    return await report_service.monthly_report(db, y, m)
