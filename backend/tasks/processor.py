"""
StreamCap Studio — Video Processing Task
Celery task that:
  1. Loads the intermediate lossless file from the recorder task
  2. Applies watermark overlay (if watermark preset is set)
  3. Re-encodes to YouTube-ready H.264/AAC MP4 at target bitrate
  4. Moves output to the configured output directory
  5. Sends Telegram notification (success or failure)
  6. Cleans up the intermediate file
"""
import asyncio
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path

from celery.utils.log import get_task_logger

from celery_app import app
from config import get_settings
from services.ffmpeg_service import (
    build_watermark_encode_command,
    build_no_watermark_encode_command,
    get_video_duration,
    make_output_filename,
)

logger = get_task_logger(__name__)
settings = get_settings()


def _db_get_job_with_watermark(job_id: str):
    """Synchronous wrapper: load Job + WatermarkPreset from DB."""
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from models.job import Job

    async def _query():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
        await engine.dispose()
        return job

    return asyncio.run(_query())


def _db_update_job(job_id: str, **kwargs) -> None:
    """Synchronous wrapper: update Job fields."""
    from sqlalchemy import update
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from models.job import Job, JobStatus

    async def _do_update():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            update_values = {}
            for k, v in kwargs.items():
                if k == "status":
                    update_values[k] = JobStatus(v)
                else:
                    update_values[k] = v
            await session.execute(
                update(Job).where(Job.id == job_id).values(**update_values)
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(_do_update())


@app.task(
    name="tasks.processor.process_video",
    bind=True,
    max_retries=1,
    default_retry_delay=30,
    queue="processing",
)
def process_video(self, job_id: str, intermediate_path: str) -> dict:
    """
    Process the recorded intermediate file into a YouTube-ready MP4.

    Args:
        job_id: UUID of the Job row
        intermediate_path: Absolute path to the lossless intermediate file

    Returns:
        dict with output_path and file metadata
    """
    logger.info(f"[{job_id}] Processing task started — {intermediate_path}")

    job = _db_get_job_with_watermark(job_id)
    if not job:
        logger.error(f"[{job_id}] Job not found")
        return {"error": "Job not found"}

    if not os.path.exists(intermediate_path):
        logger.error(f"[{job_id}] Intermediate file not found: {intermediate_path}")
        _db_update_job(job_id, status="failed", error_message="Intermediate file missing")
        return {"error": "Intermediate file not found"}

    # ─── Update status: PROCESSING ────────────────────────────────────────────
    _db_update_job(job_id, status="processing")

    # ─── Prepare output path ──────────────────────────────────────────────────
    output_dir = settings.output_dir
    os.makedirs(output_dir, exist_ok=True)
    output_filename = make_output_filename(job.title, job.resolution)
    output_path = os.path.join(output_dir, output_filename)

    try:
        # ─── Build FFmpeg command ─────────────────────────────────────────────
        if job.watermark_preset and job.watermark_preset.file_path:
            watermark_abs_path = os.path.join(settings.upload_dir, job.watermark_preset.file_path)

            if os.path.exists(watermark_abs_path):
                logger.info(f"[{job_id}] Applying watermark: {watermark_abs_path}")
                ffmpeg_cmd = build_watermark_encode_command(
                    input_path=intermediate_path,
                    watermark_path=watermark_abs_path,
                    output_path=output_path,
                    resolution=job.resolution,
                    watermark_overlay_expr=job.watermark_preset.ffmpeg_overlay_expr,
                    watermark_opacity=job.watermark_preset.opacity,
                    watermark_size_percent=job.watermark_preset.size_percent,
                    fps=job.fps,
                )
            else:
                logger.warning(f"[{job_id}] Watermark file not found, encoding without")
                ffmpeg_cmd = build_no_watermark_encode_command(
                    input_path=intermediate_path,
                    output_path=output_path,
                    resolution=job.resolution,
                    fps=job.fps,
                )
        else:
            logger.info(f"[{job_id}] No watermark preset — encoding without watermark")
            ffmpeg_cmd = build_no_watermark_encode_command(
                input_path=intermediate_path,
                output_path=output_path,
                resolution=job.resolution,
                fps=job.fps,
            )

        # ─── Run FFmpeg re-encode ─────────────────────────────────────────────
        logger.info(f"[{job_id}] FFmpeg encode: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            # Allow 2x the original duration for encode headroom
            timeout=job.duration_minutes * 60 * 2,
        )

        if result.returncode != 0:
            error = result.stderr.decode("utf-8", errors="replace")[-2000:]
            raise RuntimeError(f"FFmpeg encode failed (code {result.returncode}): {error}")

        # ─── Gather output metadata ───────────────────────────────────────────
        file_size = os.path.getsize(output_path)
        actual_duration = get_video_duration(output_path)

        logger.info(
            f"[{job_id}] Encoding complete — {output_path} "
            f"({file_size / 1024 / 1024:.1f} MB, {actual_duration:.1f}s)"
        )

        # ─── Update job: DONE ─────────────────────────────────────────────────
        _db_update_job(
            job_id,
            status="done",
            finished_at=datetime.utcnow(),
            output_path=output_path,
            file_size_bytes=file_size,
            actual_duration_seconds=actual_duration,
        )

        # ─── Telegram success notification ────────────────────────────────────
        from services.telegram_service import send_job_notification
        asyncio.run(send_job_notification(
            job_id=job_id,
            job_title=job.title,
            status="done",
            duration_seconds=actual_duration,
            file_size_bytes=file_size,
            output_path=output_path,
        ))

        # ─── Optional: sync to MinIO ──────────────────────────────────────────
        if settings.minio_enabled:
            _upload_to_minio(output_path, output_filename)

        return {
            "output_path": output_path,
            "file_size_bytes": file_size,
            "actual_duration_seconds": actual_duration,
        }

    except Exception as exc:
        logger.error(f"[{job_id}] Processing failed: {exc}")
        _db_update_job(
            job_id,
            status="failed",
            finished_at=datetime.utcnow(),
            error_message=str(exc)[:2000],
        )

        # Telegram failure notification
        from services.telegram_service import send_job_notification
        asyncio.run(send_job_notification(
            job_id=job_id,
            job_title=job.title if job else job_id,
            status="failed",
            duration_seconds=None,
            file_size_bytes=None,
            output_path=None,
            error_message=str(exc)[:500],
        ))

        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"error": str(exc)}

    finally:
        # Clean up intermediate file to free disk space
        if os.path.exists(intermediate_path):
            try:
                os.unlink(intermediate_path)
                logger.info(f"[{job_id}] Cleaned up intermediate file")
            except OSError as e:
                logger.warning(f"[{job_id}] Could not delete intermediate file: {e}")


def _upload_to_minio(local_path: str, object_name: str) -> None:
    """Upload a file to MinIO/S3-compatible storage (optional)."""
    from minio import Minio
    from minio.error import S3Error

    client = Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
    try:
        client.fput_object(settings.minio_bucket, object_name, local_path)
        logger.info(f"Uploaded {object_name} to MinIO bucket {settings.minio_bucket}")
    except S3Error as e:
        logger.error(f"MinIO upload failed: {e}")
