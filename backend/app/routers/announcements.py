from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("/", response_model=list[AnnouncementOut])
async def list_announcements(active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(Announcement)
    if active_only:
        q = q.where(Announcement.is_active == True)
    result = await db.execute(q.order_by(Announcement.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=AnnouncementOut, dependencies=[Depends(require_admin)])
async def create_announcement(payload: AnnouncementCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ann = Announcement(**payload.model_dump(), created_by=current_user.id)
    db.add(ann)
    await db.commit()
    await db.refresh(ann)
    return ann


@router.delete("/{ann_id}", dependencies=[Depends(require_admin)])
async def delete_announcement(ann_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Announcement).where(Announcement.id == ann_id))
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.delete(ann)
    await db.commit()
    return {"message": "Announcement deleted"}
