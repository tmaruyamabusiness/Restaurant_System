from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/daily")
async def daily_report(
    report_date: date = Query(default=None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    if report_date is None:
        report_date = date.today()
    return await report_service.daily_report(db, report_date)


@router.get("/monthly")
async def monthly_report(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.monthly_report(db, year, month)
