# StreamCap Studio

Self-hosted web dashboard for automated video recording, watermarking, and YouTube-ready export. Schedule → Chrome opens stream → FFmpeg records → Watermark overlay → MP4 → Telegram notification.

## Run & Operate

```bash
# Copy and configure environment
cp .env.example .env   # fill in passwords, secrets, optional Telegram

# Start all services (first run pulls/builds images)
docker-compose up -d

# Dashboard at http://localhost
# API docs at http://localhost/api/docs

# Apply DB migrations inside the container
docker-compose exec api alembic upgrade head

# View logs
docker-compose logs -f worker
docker-compose logs -f api
```

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Python 3.11 + FastAPI (async REST API)
- **Task Queue**: Celery + Redis (recording + processing workers)
- **Scheduler**: Celery Beat (dispatches scheduled jobs every 30s)
- **Automation**: Playwright (headless Chromium) + Xvfb (virtual display)
- **Video**: FFmpeg (screen capture, watermark overlay, H.264/AAC re-encode)
- **Database**: PostgreSQL 15 + SQLAlchemy (async) + Alembic
- **Notifications**: python-telegram-bot v20 (message + thumbnail)
- **Proxy**: Nginx (routes /api → FastAPI, / → Next.js)
- **Storage**: Local filesystem + optional MinIO (S3-compatible)

## Where things live

| Path | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app entry point, router registration |
| `backend/config.py` | Pydantic settings (all values from env) |
| `backend/celery_app.py` | Celery + Beat configuration, task routing |
| `backend/models/` | SQLAlchemy ORM: Job, WatermarkPreset, Settings |
| `backend/routers/` | FastAPI route handlers (auth, jobs, watermarks, settings, system) |
| `backend/tasks/recorder.py` | Celery task: Xvfb + Playwright + FFmpeg capture |
| `backend/tasks/processor.py` | Celery task: watermark overlay + H.264/AAC re-encode |
| `backend/tasks/scheduler.py` | Beat tasks: job dispatch + temp file cleanup |
| `backend/services/telegram_service.py` | Telegram notifications with thumbnail |
| `backend/services/ffmpeg_service.py` | FFmpeg command builders |
| `backend/migrations/env.py` | Alembic async migration environment |
| `frontend/app/dashboard/page.tsx` | Live dashboard: active jobs, SSE, resource bar |
| `frontend/app/jobs/` | Job history table + new job form |
| `frontend/app/watermarks/page.tsx` | Watermark preset manager with 9-point grid |
| `frontend/app/settings/page.tsx` | Global settings + Telegram test |
| `frontend/lib/api.ts` | API client (fetch wrapper with auth) |
| `nginx/nginx.conf` | Reverse proxy: /api → FastAPI, / → Next.js |
| `docker-compose.yml` | All services: api, worker, beat, redis, db, frontend, nginx |
| `.env.example` | All required environment variables |

## Architecture decisions

- **Lossless intermediate capture**: FFmpeg records to lossless MKV first (ultrafast preset, CRF 0) during Playwright session to minimize CPU contention. A separate Celery worker re-encodes with watermark afterwards — decouples I/O-bound capture from CPU-bound encode.
- **SSE not WebSockets**: Dashboard uses Server-Sent Events for live job status — simpler, no connection state, works through Nginx without upgrade headers (except the SSE-specific `proxy_buffering off` config).
- **Singleton settings row**: Global settings stored as a single row (id=1) in PostgreSQL — upserted on update. No separate config files to sync with the DB.
- **9-point watermark grid**: Position is stored as a semantic string (`bottom-right`) and converted to FFmpeg overlay expressions dynamically by the ORM model's `ffmpeg_overlay_expr` property — keeps the DB clean and the FFmpeg logic in one place.
- **Celery Beat polls at 30s**: Scheduled jobs are stored in PostgreSQL with `scheduled_at` datetime. Beat runs `dispatch_pending_jobs` every 30s, picks up any `queued` jobs whose time has arrived, and dispatches the recorder task.

## User preferences

- Dark utilitarian UI: Vercel dashboard meets broadcast control room
- Font: DM Sans for UI text, Geist Mono for data/numbers
- Single accent color: amber #F59E0B
- No gradients, no illustrations, status via color+typography only
- All secrets via environment variables — no hardcoded credentials

## Gotchas

- Worker container needs `shm_size: 2gb` — Chrome requires large shared memory
- `DISPLAY=:99` env var must be set on the worker service for Xvfb to work
- PulseAudio virtual sink must be set up before FFmpeg audio capture (handled in recorder.py)
- `proxy_buffering off` in Nginx is required for SSE to stream in real time
- Alembic migrations must be run manually after first deploy: `docker-compose exec api alembic upgrade head`
- MinIO is disabled by default (`MINIO_ENABLED=false`) — set to `true` and configure endpoint to enable S3 backup

## Pointers

- See `README.md` for quick start guide and VPS requirements
- FFmpeg output spec: H.264 + AAC, 8Mbps/5Mbps, keyframe every 2s, 320kbps audio 48kHz stereo
- Job lifecycle: `queued` → `recording` → `processing` → `done` / `failed`
- Max 2 automatic retries per job (configurable in celery_app.py)
