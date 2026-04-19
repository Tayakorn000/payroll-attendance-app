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

    @property
    def async_database_url(self) -> str:
        """Ensure the URL uses the asyncpg driver regardless of what Neon/Vercel provides."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
