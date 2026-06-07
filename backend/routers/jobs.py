"""
StreamCap Studio — Jobs Router
CRUD for recording jobs + SSE stream for live status updates.
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.job import Job, JobStatus
from routers.auth import get_current_user
from schemas import JobCreate, JobResponse, JobListResponse, JobLogResponse

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    List all jobs with optional filtering by status and keyword search.
    Returns paginated results ordered by created_at descending.
    """
    conditions = []

    if status_filter:
        try:
            conditions.append(Job.status == JobStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    if search:
        conditions.append(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.stream_url.ilike(f"%{search}%"),
            )
        )

    # Count total matching rows
    count_stmt = select(func.count()).select_from(Job)
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Fetch page
    stmt = select(Job).order_by(Job.created_at.desc())
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    return JobListResponse(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Create a new recording job.
    - If is_immediate=True: dispatches to Celery immediately
    - If scheduled_at is set: Celery Beat will pick it up at the right time
    """
    job = Job(
        title=payload.title,
        stream_url=str(payload.stream_url),
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        resolution=payload.resolution,
        fps=payload.fps,
        watermark_preset_id=payload.watermark_preset_id,
        is_immediate=payload.is_immediate,
        status=JobStatus.QUEUED,
        created_at=datetime.utcnow(),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Dispatch immediately if requested (Beat handles scheduled ones)
    if payload.is_immediate:
        from tasks.recorder import start_recording
        celery_task = start_recording.apply_async(args=[job.id], queue="recording")
        job.celery_task_id = celery_task.id
        job.status = JobStatus.RECORDING
        job.started_at = datetime.utcnow()
        await db.commit()
        await db.refresh(job)

    return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse.model_validate(job)


@router.get("/{job_id}/log", response_model=JobLogResponse)
async def get_job_log(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobLogResponse(id=job.id, log=job.log)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    delete_file: bool = Query(False, description="Also delete the output MP4 file"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Delete a job record and optionally its output file."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Optionally delete the output file
    if delete_file and job.output_path and os.path.exists(job.output_path):
        try:
            os.unlink(job.output_path)
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"Could not delete file: {e}")

    await db.delete(job)
    await db.commit()


@router.get("/{job_id}/download")
async def download_job_file(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Download the output MP4 file for a completed job."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.output_path:
        raise HTTPException(status_code=404, detail="No output file for this job")
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Output file not found on disk")

    return FileResponse(
        path=job.output_path,
        media_type="video/mp4",
        filename=os.path.basename(job.output_path),
    )


@router.get("/stream/status")
async def stream_job_status(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Server-Sent Events (SSE) endpoint for real-time job status updates.
    The frontend connects once and receives events whenever job statuses change.
    Polls the DB every 2 seconds — lightweight and reliable without WebSocket overhead.
    """
    async def event_generator():
        while True:
            try:
                result = await db.execute(
                    select(Job)
                    .where(Job.status.in_([JobStatus.QUEUED, JobStatus.RECORDING, JobStatus.PROCESSING]))
                    .order_by(Job.created_at.desc())
                    .limit(20)
                )
                active_jobs = result.scalars().all()

                data = json.dumps([
                    {
                        "id": j.id,
                        "title": j.title,
                        "status": j.status.value,
                        "started_at": j.started_at.isoformat() if j.started_at else None,
                    }
                    for j in active_jobs
                ])
                yield f"data: {data}\n\n"
                await asyncio.sleep(2)
            except asyncio.CancelledError:
                break
            except Exception:
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering for SSE
        },
    )
