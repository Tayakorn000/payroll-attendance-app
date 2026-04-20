from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str
    content: str


class AnnouncementOut(BaseModel):
    id: UUID
    title: str
    content: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
