from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserOut, ChangePassword, ResetPassword
from app.core.security import verify_password, hash_password, create_access_token, decode_token, oauth2_scheme
from uuid import UUID

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    user.last_login = datetime.utcnow()
    await db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role, "employee_id": str(user.employee_id)})
    return Token(access_token=token, role=user.role, employee_id=user.employee_id)


@router.post("/users", response_model=UserOut, dependencies=[Depends(require_admin)])
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        employee_id=payload.employee_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(payload: ChangePassword, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}


@router.post("/employees/{employee_id}/reset-password", dependencies=[Depends(require_admin)])
async def reset_employee_password(employee_id: UUID, payload: ResetPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.employee_id == employee_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสเข้าใช้งานของพนักงานคนนี้")
    user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"message": "รีเซ็ตรหัสผ่านพนักงานสำเร็จ"}

