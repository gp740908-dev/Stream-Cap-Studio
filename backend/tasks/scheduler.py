"""
StreamCap Studio — Scheduler Tasks (Celery Beat)
Polls for scheduled jobs and dispatches them when their start time arrives.
Also handles periodic cleanup of orphaned temp files.
"""
import asyncio
import glob
import logging
import os
import time
from datetime import datetime

from celery.utils.log import get_task_logger

from celery_app import app
from config import get_settings

logger = get_task_logger(__name__)
settings = get_settings()


def _get_pending_jobs():
    """Return all queued + scheduled jobs whose scheduled_at <= now."""
    from sqlalchemy import select, and_
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from models.job import Job, JobStatus

    async def _query():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            now = datetime.utcnow()
            stmt = select(Job).where(
                and_(
                    Job.status == JobStatus.QUEUED,
                    # Either immediate OR scheduled time has arrived
                    (Job.is_immediate == True) | (Job.scheduled_at <= now),
                )
            )
            result = await session.execute(stmt)
            jobs = result.scalars().all()
        await engine.dispose()
        return jobs

    return asyncio.run(_query())


def _mark_job_dispatched(job_id: str, celery_task_id: str) -> None:
    """Mark job as dispatched so Beat doesn't pick it up again."""
    from sqlalchemy import update
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from models.job import Job, JobStatus

    async def _do():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            await session.execute(
                update(Job)
                .where(Job.id == job_id)
                .values(
                    status=JobStatus.RECORDING,
                    started_at=datetime.utcnow(),
                    celery_task_id=celery_task_id,
                )
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(_do())


@app.task(name="tasks.scheduler.dispatch_pending_jobs", queue="default")
def dispatch_pending_jobs() -> dict:
    """
    Celery Beat task — runs every 30 seconds.
    Checks for queued/scheduled jobs and dispatches the recorder task.
    """
    from tasks.recorder import start_recording

    pending = _get_pending_jobs()
    dispatched = []

    for job in pending:
        try:
            celery_task = start_recording.apply_async(
                args=[job.id],
                queue="recording",
            )
            _mark_job_dispatched(job.id, celery_task.id)
            dispatched.append(job.id)
            logger.info(f"Dispatched job {job.id} (task {celery_task.id})")
        except Exception as e:
            logger.error(f"Failed to dispatch job {job.id}: {e}")

    return {"dispatched": dispatched, "count": len(dispatched)}


@app.task(name="tasks.scheduler.cleanup_tmp_files", queue="default")
def cleanup_tmp_files() -> dict:
    """
    Celery Beat task — runs every 2 hours.
    Deletes orphaned intermediate files in /tmp/streamcap/ older than 24 hours.
    """
    tmp_dir = settings.tmp_dir
    if not os.path.exists(tmp_dir):
        return {"deleted": 0}

    deleted = 0
    now = time.time()
    cutoff = 60 * 60 * 24   # 24 hours in seconds

    for fpath in glob.glob(os.path.join(tmp_dir, "intermediate_*.mkv")):
        try:
            age = now - os.path.getmtime(fpath)
            if age > cutoff:
                os.unlink(fpath)
                deleted += 1
                logger.info(f"Cleaned up orphaned temp file: {fpath}")
        except OSError as e:
            logger.warning(f"Could not delete {fpath}: {e}")

    return {"deleted": deleted}
