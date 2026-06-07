"""
StreamCap Studio — Celery Application
Configures broker, result backend, task routing, and Beat schedule.
"""
from celery import Celery
from celery.schedules import crontab
from config import get_settings

settings = get_settings()

# Initialize Celery app
app = Celery(
    "streamcap",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "tasks.recorder",    # Playwright + Xvfb + FFmpeg capture
        "tasks.processor",   # FFmpeg watermark overlay + re-encode
        "tasks.scheduler",   # Beat-triggered scheduled job dispatch
    ],
)

# ─── Celery Configuration ──────────────────────────────────────────────────────
app.conf.update(
    # Serialization — use JSON for cross-language compatibility
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task routing — separate queues for recording vs. processing
    task_routes={
        "tasks.recorder.start_recording": {"queue": "recording"},
        "tasks.processor.process_video": {"queue": "processing"},
        "tasks.scheduler.*": {"queue": "default"},
    },

    # Retry behavior
    task_acks_late=True,             # acknowledge only after task finishes
    task_reject_on_worker_lost=True, # requeue if worker dies mid-task

    # Result expiry — keep results 7 days for job history lookup
    result_expires=60 * 60 * 24 * 7,

    # Visibility timeout must exceed max task runtime (6 hours for long recordings)
    broker_transport_options={
        "visibility_timeout": 60 * 60 * 6,
    },

    # Worker settings
    worker_prefetch_multiplier=1,  # one task per worker at a time (recording is CPU heavy)
    task_soft_time_limit=60 * 60 * 4,   # 4h soft limit → triggers SoftTimeLimitExceeded
    task_time_limit=60 * 60 * 5,        # 5h hard limit → worker killed + restarted
)

# ─── Beat Schedule — polls for scheduled jobs every 30 seconds ─────────────────
app.conf.beat_schedule = {
    "dispatch-scheduled-jobs": {
        "task": "tasks.scheduler.dispatch_pending_jobs",
        "schedule": 30.0,    # every 30 seconds
        "options": {"queue": "default"},
    },
    "cleanup-tmp-files": {
        "task": "tasks.scheduler.cleanup_tmp_files",
        "schedule": crontab(minute="0", hour="*/2"),  # every 2 hours
        "options": {"queue": "default"},
    },
}

if __name__ == "__main__":
    app.start()
