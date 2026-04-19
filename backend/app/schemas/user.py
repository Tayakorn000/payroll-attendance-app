from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    employee_id: UUID | None


class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.employee
    employee_id: UUID | None = None


class UserOut(BaseModel):
    id: UUID
    username: str
    role: UserRole
    employee_id: UUID | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
