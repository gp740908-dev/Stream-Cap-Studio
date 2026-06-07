"""
StreamCap Studio — Settings Router
Read and update global system configuration.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.settings import Settings
from routers.auth import get_current_user
from schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def _get_or_create_settings(db: AsyncSession) -> Settings:
    """Retrieve the singleton Settings row, creating it with defaults if absent."""
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings_row = result.scalar_one_or_none()
    if not settings_row:
        settings_row = Settings(id=1)
        db.add(settings_row)
        await db.commit()
        await db.refresh(settings_row)
    return settings_row


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    settings_row = await _get_or_create_settings(db)
    return SettingsResponse.model_validate(settings_row)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    settings_row = await _get_or_create_settings(db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings_row, field, value)
    await db.commit()
    await db.refresh(settings_row)
    return SettingsResponse.model_validate(settings_row)


@router.post("/telegram/test")
async def test_telegram(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Send a test Telegram message to verify the configured bot and chat ID."""
    settings_row = await _get_or_create_settings(db)
    from services.telegram_service import send_test_notification
    success, error = await send_test_notification(
        bot_token=settings_row.telegram_bot_token,
        chat_id=settings_row.telegram_chat_id,
    )
    if success:
        return {"success": True, "message": "Test notification sent successfully"}
    return {"success": False, "message": error}
