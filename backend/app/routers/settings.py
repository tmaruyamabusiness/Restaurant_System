from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

# In-memory settings store (simple approach for now)
_settings = {
    "alert_threshold_minutes": 60,
}


class SettingsUpdate(BaseModel):
    alert_threshold_minutes: Optional[int] = None


@router.get("")
async def get_settings(current_user: User = Depends(get_current_user)):
    return _settings


@router.put("")
async def update_settings(
    data: SettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    if data.alert_threshold_minutes is not None:
        _settings["alert_threshold_minutes"] = data.alert_threshold_minutes
    return _settings
