from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.employee import Employee
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.routers.auth import require_admin, get_current_user
from app.core.security import hash_password

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("/", response_model=list[EmployeeOut], dependencies=[Depends(require_admin)])
async def list_employees(active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(Employee)
    if active_only:
        q = q.where(Employee.is_active == True)
    result = await db.execute(q.order_by(Employee.employee_code))
    return result.scalars().all()


@router.post("/", response_model=EmployeeOut, dependencies=[Depends(require_admin)])
async def create_employee(payload: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.employee_code == payload.employee_code))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee code already exists")
    
    emp = Employee(**payload.model_dump())
    db.add(emp)
    await db.flush() # Get the emp.id
    
    # Auto-create user login
    new_user = User(
        username=emp.employee_code,
        hashed_password=hash_password(emp.employee_code),
        role="employee",
        employee_id=emp.id
    )
    db.add(new_user)
    
    await db.commit()
    await db.refresh(emp)
    return emp


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Employees can only view their own record
    if current_user.role != "admin" and current_user.employee_id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.patch("/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_admin)])
async def update_employee(employee_id: UUID, payload: EmployeeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/{employee_id}", dependencies=[Depends(require_admin)])
async def delete_employee(employee_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลพนักงาน")
    
    # Delete associated user if exists
    user_result = await db.execute(select(User).where(User.employee_id == employee_id))
    user = user_result.scalar_one_or_none()
    if user:
        await db.delete(user)
    
    await db.delete(emp)
    await db.commit()
    return {"message": "ลบพนักงานเรียบร้อยแล้ว"}
