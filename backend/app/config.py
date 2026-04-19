from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/payroll_db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    ss_rate: float = 0.05
    ss_cap_thb: float = 750.0

    work_start: str = "08:00"
    work_end: str = "17:00"
    ot_round_minutes: int = 30

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
