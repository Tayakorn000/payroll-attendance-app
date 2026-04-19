from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from datetime import date

from app.database import get_db
from app.models.advance import Advance, AdvanceStatus
from app.models.user import User
from app.schemas.payroll import AdvanceCreate, AdvanceOut
from app.routers.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/advances", tags=["advances"])


@router.post("/", response_model=AdvanceOut)
async def request_advance(
    payload: AdvanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Employees can only request for themselves
    if current_user.role != "admin" and current_user.employee_id != payload.employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    advance = Advance(**payload.model_dump(), request_date=date.today())
    db.add(advance)
    await db.commit()
    await db.refresh(advance)
    return advance


@router.get("/", response_model=list[AdvanceOut], dependencies=[Depends(require_admin)])
async def list_advances(status: AdvanceStatus | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Advance)
    if status:
        q = q.where(Advance.status == status)
    result = await db.execute(q.order_by(Advance.created_at.desc()))
    return result.scalars().all()


@router.get("/me", response_model=list[AdvanceOut])
async def my_advances(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="No employee linked")
    result = await db.execute(
        select(Advance).where(Advance.employee_id == current_user.employee_id).order_by(Advance.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{advance_id}/approve", response_model=AdvanceOut, dependencies=[Depends(require_admin)])
async def approve_advance(
    advance_id: UUID,
    period_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Advance).where(Advance.id == advance_id))
    advance = result.scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    advance.status = AdvanceStatus.approved
    advance.approved_by = current_user.id
    advance.approved_date = date.today()
    if period_id:
        advance.period_id = period_id
    await db.commit()
    await db.refresh(advance)
    return advance


@router.patch("/{advance_id}/reject", response_model=AdvanceOut, dependencies=[Depends(require_admin)])
async def reject_advance(advance_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Advance).where(Advance.id == advance_id))
    advance = result.scalar_one_or_none()
    if not advance:
        raise HTTPException(status_code=404, detail="Advance not found")
    advance.status = AdvanceStatus.rejected
    await db.commit()
    await db.refresh(advance)
    return advance
