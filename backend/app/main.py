from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, employees, attendance, payroll, advances
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Payroll & Attendance API",
    version="1.0.0",
    description="HRIS Payroll Management System",
    lifespan=lifespan,
)

# Allow all origins in production (Vercel preview URLs vary); restrict if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(payroll.router)
app.include_router(advances.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
