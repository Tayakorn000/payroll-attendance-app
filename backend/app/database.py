from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Neon (serverless PostgreSQL) requires SSL and no prepared-statement caching
# when using pgbouncer pooling. These settings are safe for both local and Neon.
_db_url = settings.async_database_url
_is_neon = "neon.tech" in _db_url
_connect_args: dict = {}
if _is_neon:
    _connect_args = {
        "ssl": "require",
        "statement_cache_size": 0,  # required for pgbouncer
    }

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_size=1,           # serverless: keep pool tiny
    max_overflow=4,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
