from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.settings import SystemSettings
from app.routers.auth import require_admin
from pydantic import BaseModel

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingUpdate(BaseModel):
    value: str


@router.get("/", dependencies=[Depends(require_admin)])
async def list_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings))
    return result.scalars().all()


@router.patch("/{key}", dependencies=[Depends(require_admin)])
async def update_setting(key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    setting.value = payload.value
    await db.commit()
    return setting
