from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User
from app.schemas.leave import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestOut
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/leaves", tags=["leaves"])


@router.post("/", response_model=LeaveRequestOut)
async def create_leave(payload: LeaveRequestCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User not linked to employee")
    
    leave = LeaveRequest(
        **payload.model_dump(),
        employee_id=current_user.employee_id,
        status=LeaveStatus.pending
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return leave


@router.get("/me", response_model=list[LeaveRequestOut])
async def my_leaves(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user.employee_id:
        return []
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.employee_id == current_user.employee_id)
        .order_by(LeaveRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/", response_model=list[LeaveRequestOut], dependencies=[Depends(require_admin)])
async def list_leaves(status: LeaveStatus | None = None, db: AsyncSession = Depends(get_db)):
    q = select(LeaveRequest)
    if status:
        q = q.where(LeaveRequest.status == status)
    result = await db.execute(q.order_by(LeaveRequest.created_at.desc()))
    return result.scalars().all()


@router.patch("/{leave_id}", response_model=LeaveRequestOut, dependencies=[Depends(require_admin)])
async def update_leave_status(leave_id: UUID, payload: LeaveRequestUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = payload.status
    leave.approved_by = current_user.id
    leave.approved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(leave)
    return leave
