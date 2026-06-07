"""
Alembic migration environment for StreamCap Studio.
Supports both online (real DB) and offline (SQL dump) migration modes.
"""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Import all models so Alembic can auto-detect schema changes
from database import Base
import models.job          # noqa: F401
import models.watermark_preset  # noqa: F401
import models.settings     # noqa: F401

from config import get_settings

settings = get_settings()
alembic_cfg = context.config
if alembic_cfg.config_file_name:
    fileConfig(alembic_cfg.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    """Emit SQL to stdout without a real DB connection."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    """Run migrations against the actual database."""
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: context.configure(
                connection=sync_conn,
                target_metadata=target_metadata,
            )
        )
        await conn.run_sync(lambda _: context.run_migrations())
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
