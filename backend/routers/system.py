"""
StreamCap Studio — System Router
System resource monitoring endpoint (CPU, RAM, Disk, active jobs).
"""
import shutil

import psutil
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models.job import Job, JobStatus
from routers.auth import get_current_user
from schemas import SystemResourceResponse

router = APIRouter(prefix="/api/system", tags=["system"])
settings = get_settings()


@router.get("/resources", response_model=SystemResourceResponse)
async def get_system_resources(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Return live CPU, RAM, disk usage and active job counts.
    Used by the dashboard resource bar.
    """
    # ─── CPU ──────────────────────────────────────────────────────────────────
    cpu_percent = psutil.cpu_percent(interval=0.5)

    # ─── RAM ──────────────────────────────────────────────────────────────────
    vm = psutil.virtual_memory()

    # ─── Disk (output directory) ──────────────────────────────────────────────
    disk = shutil.disk_usage(settings.output_dir)

    # ─── Active job counts ────────────────────────────────────────────────────
    active_result = await db.execute(
        select(func.count()).select_from(Job).where(
            Job.status.in_([JobStatus.RECORDING, JobStatus.PROCESSING])
        )
    )
    queued_result = await db.execute(
        select(func.count()).select_from(Job).where(Job.status == JobStatus.QUEUED)
    )

    disk_percent = (disk.used / disk.total) * 100

    return SystemResourceResponse(
        cpu_percent=round(cpu_percent, 1),
        ram_percent=round(vm.percent, 1),
        ram_used_gb=round(vm.used / 1024 ** 3, 2),
        ram_total_gb=round(vm.total / 1024 ** 3, 2),
        disk_percent=round(disk_percent, 1),
        disk_used_gb=round(disk.used / 1024 ** 3, 2),
        disk_total_gb=round(disk.total / 1024 ** 3, 2),
        disk_warning=disk_percent > 80,
        active_jobs=active_result.scalar_one(),
        queued_jobs=queued_result.scalar_one(),
    )


@router.get("/health")
async def health_check():
    """Simple liveness probe — used by Docker healthcheck and Nginx upstream."""
    return {"status": "ok", "service": "streamcap-api"}
