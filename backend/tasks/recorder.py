"""
StreamCap Studio — Recording Task
Celery task that:
  1. Starts an Xvfb virtual display on an available display number
  2. Launches Chromium via Playwright, opens the stream URL
  3. Starts a PulseAudio virtual sink for audio capture
  4. Runs FFmpeg to capture the virtual display to a lossless intermediate file
  5. Updates job status throughout the pipeline
  6. Dispatches the processor task on completion
"""
import logging
import os
import signal
import subprocess
import time
from datetime import datetime
from pathlib import Path

from celery import shared_task
from celery.utils.log import get_task_logger
from playwright.sync_api import sync_playwright

from celery_app import app
from config import get_settings
from services.ffmpeg_service import build_record_command, make_output_filename

logger = get_task_logger(__name__)
settings = get_settings()


def _find_free_display() -> int:
    """Find a free Xvfb display number starting from :99."""
    for n in range(99, 120):
        lock_file = f"/tmp/.X{n}-lock"
        if not os.path.exists(lock_file):
            return n
    return 99   # fallback


def _start_xvfb(display_num: int, width: int, height: int) -> subprocess.Popen:
    """Start Xvfb virtual display and return the process handle."""
    cmd = [
        "Xvfb",
        f":{display_num}",
        "-screen", "0", f"{width}x{height}x24",  # 24-bit color
        "-ac",       # disable access control
        "-nolisten", "tcp",
    ]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1)   # give Xvfb time to initialize
    logger.info(f"Xvfb started on :{display_num} (PID {proc.pid})")
    return proc


def _setup_pulseaudio_sink(sink_name: str = "virtual_sink") -> subprocess.Popen | None:
    """
    Load a PulseAudio null sink to capture audio output.
    Returns the pactl process handle or None if PulseAudio is unavailable.
    """
    try:
        result = subprocess.run(
            [
                "pactl", "load-module", "module-null-sink",
                f"sink_name={sink_name}",
                "sink_properties=device.description=VirtualSink",
            ],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            logger.info(f"PulseAudio virtual sink '{sink_name}' created")
            return result.stdout.strip()   # module index for cleanup
    except Exception as e:
        logger.warning(f"PulseAudio setup failed (audio may be silent): {e}")
    return None


def _update_job_status(job_id: str, status: str, **kwargs) -> None:
    """
    Synchronously update job status in PostgreSQL via a direct SQLAlchemy call.
    Using a sync session here since Celery tasks are synchronous.
    """
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import update
    from models.job import Job, JobStatus

    async def _do_update():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            update_values = {"status": JobStatus(status), **kwargs}
            await session.execute(
                update(Job).where(Job.id == job_id).values(**update_values)
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(_do_update())


@app.task(
    name="tasks.recorder.start_recording",
    bind=True,
    max_retries=2,
    default_retry_delay=60,    # wait 60s before retry
    queue="recording",
)
def start_recording(self, job_id: str) -> dict:
    """
    Main recording task.

    Args:
        job_id: UUID of the Job row in PostgreSQL

    Returns:
        dict with intermediate_path and metadata for the processor task
    """
    logger.info(f"[{job_id}] Recording task started")

    # ─── Load job from DB ─────────────────────────────────────────────────────
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from models.job import Job, JobStatus

    async def _load_job():
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
        await engine.dispose()
        return job

    job = asyncio.run(_load_job())
    if not job:
        logger.error(f"[{job_id}] Job not found in DB")
        return {"error": "Job not found"}

    # ─── Prepare paths ────────────────────────────────────────────────────────
    os.makedirs(settings.tmp_dir, exist_ok=True)
    intermediate_filename = f"intermediate_{job_id}.mkv"
    intermediate_path = os.path.join(settings.tmp_dir, intermediate_filename)

    duration_seconds = job.duration_minutes * 60

    # ─── Update status: RECORDING ─────────────────────────────────────────────
    _update_job_status(
        job_id,
        status="recording",
        started_at=datetime.utcnow(),
        celery_task_id=self.request.id,
        log=f"[{datetime.utcnow().isoformat()}] Recording started\n",
    )

    display_num = _find_free_display()
    xvfb_proc = None
    playwright_ctx = None
    browser = None
    page = None
    ffmpeg_proc = None
    pa_module_index = None

    try:
        # ─── 1. Start Xvfb virtual display ────────────────────────────────────
        width = settings.chrome_viewport_width
        height = settings.chrome_viewport_height
        xvfb_proc = _start_xvfb(display_num, width, height)

        # ─── 2. Set up PulseAudio virtual sink ────────────────────────────────
        pa_module_index = _setup_pulseaudio_sink()

        # ─── 3. Launch Playwright → Chromium on virtual display ───────────────
        env = os.environ.copy()
        env["DISPLAY"] = f":{display_num}"

        playwright_ctx = sync_playwright().start()
        browser = playwright_ctx.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=False,  # must be headless=False for Xvfb capture
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                f"--window-size={width},{height}",
                "--autoplay-policy=no-user-gesture-required",  # allow autoplaying video
                "--disable-features=IsolateOrigins,site-per-process",
                f"--user-agent={settings.chrome_user_agent}",
            ],
            env=env,
        )
        context = browser.new_context(
            viewport={"width": width, "height": height},
            user_agent=settings.chrome_user_agent,
        )
        page = context.new_page()
        logger.info(f"[{job_id}] Navigating to {job.stream_url}")
        page.goto(job.stream_url, timeout=60000, wait_until="networkidle")

        # ─── 4. Pre-record delay — let the stream load fully ──────────────────
        delay = settings.chrome_pre_record_delay
        logger.info(f"[{job_id}] Waiting {delay}s pre-record delay")
        time.sleep(delay)

        # ─── 5. Start FFmpeg capture ──────────────────────────────────────────
        ffmpeg_cmd = build_record_command(
            display_num=display_num,
            output_path=intermediate_path,
            resolution=job.resolution,
            fps=job.fps,
            duration_seconds=duration_seconds,
        )
        logger.info(f"[{job_id}] FFmpeg recording: {' '.join(ffmpeg_cmd)}")
        ffmpeg_proc = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )

        # Wait for FFmpeg to complete (it will self-terminate after duration)
        stdout, stderr = ffmpeg_proc.communicate(timeout=duration_seconds + 120)

        if ffmpeg_proc.returncode not in (0, 255):  # 255 = killed by SIGTERM (normal stop)
            error = stderr.decode("utf-8", errors="replace")[-2000:]
            raise RuntimeError(f"FFmpeg exited with code {ffmpeg_proc.returncode}: {error}")

        logger.info(f"[{job_id}] FFmpeg recording finished — {intermediate_path}")

        # ─── 6. Dispatch processor task ───────────────────────────────────────
        from tasks.processor import process_video
        process_task = process_video.apply_async(
            args=[job_id, intermediate_path],
            queue="processing",
        )
        logger.info(f"[{job_id}] Dispatched processor task {process_task.id}")

        return {"intermediate_path": intermediate_path, "processor_task_id": process_task.id}

    except Exception as exc:
        logger.error(f"[{job_id}] Recording failed: {exc}")
        _update_job_status(
            job_id,
            status="failed",
            finished_at=datetime.utcnow(),
            error_message=str(exc)[:2000],
        )

        # Celery retry logic
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            # All retries exhausted — send Telegram failure notification
            from services.telegram_service import send_job_notification
            import asyncio
            asyncio.run(send_job_notification(
                job_id=job_id,
                job_title=job.title if job else job_id,
                status="failed",
                duration_seconds=None,
                file_size_bytes=None,
                output_path=None,
                error_message=str(exc)[:500],
            ))
            return {"error": str(exc)}

    finally:
        # ─── Cleanup in reverse order ──────────────────────────────────────────
        try:
            if ffmpeg_proc and ffmpeg_proc.poll() is None:
                ffmpeg_proc.send_signal(signal.SIGTERM)
        except OSError:
            pass

        try:
            if page:
                page.close()
            if browser:
                browser.close()
            if playwright_ctx:
                playwright_ctx.stop()
        except Exception as e:
            logger.warning(f"[{job_id}] Playwright cleanup error: {e}")

        try:
            if xvfb_proc and xvfb_proc.poll() is None:
                xvfb_proc.terminate()
                xvfb_proc.wait(timeout=5)
        except Exception as e:
            logger.warning(f"[{job_id}] Xvfb cleanup error: {e}")

        # Remove PulseAudio module
        if pa_module_index:
            subprocess.run(
                ["pactl", "unload-module", str(pa_module_index)],
                capture_output=True,
            )
