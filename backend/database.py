"""
StreamCap Studio — Async Database Engine + Session Factory
Uses SQLAlchemy 2.0 async API with asyncpg driver.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config import get_settings

settings = get_settings()

# Create async engine — pool_pre_ping reconnects stale connections automatically
engine = create_async_engine(
    settings.database_url,
    echo=False,          # set True for SQL query logging in development
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory bound to the async engine
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # avoid lazy-load errors after commit
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Create all tables on startup (dev convenience — production uses Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
