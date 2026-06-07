# StreamCap Studio

> Self-hosted automated video recording, watermarking, and YouTube-ready export pipeline.

Schedule → Chrome opens stream URL → FFmpeg records → Watermark overlay → H.264/AAC MP4 → Telegram notification. Zero manual intervention.

---

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url> && cd streamcap-studio

# 2. Copy and fill in environment variables
cp .env.example .env
#    Edit .env: set POSTGRES_PASSWORD, REDIS_PASSWORD, SECRET_KEY,
#    NEXTAUTH_SECRET, ADMIN_PASSWORD, and optionally TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID

# 3. Start all services
docker-compose up -d

# 4. Open the dashboard
open http://localhost
```

Default login: `admin` / (your ADMIN_PASSWORD from .env)

---

## Services

| Service    | Description                                    | Port       |
|------------|------------------------------------------------|------------|
| `nginx`    | Reverse proxy — routes `/api` and `/`          | 80         |
| `api`      | FastAPI backend (uvicorn)                       | 8000       |
| `worker`   | Celery worker (recording + processing tasks)    | —          |
| `beat`     | Celery Beat (job scheduler, cron)              | —          |
| `redis`    | Celery broker + result backend                 | 6379       |
| `db`       | PostgreSQL 15                                  | 5432       |
| `frontend` | Next.js 14 dashboard                           | 3000       |

---

## Architecture

```
Dashboard (Next.js)
    │
    ├─ POST /api/jobs       → FastAPI creates Job row (status: queued)
    │
    ├─ SSE /api/jobs/stream/status  → real-time active job updates
    │
    └─ GET /api/system/resources    → CPU/RAM/disk polling

FastAPI → Celery (Redis broker)
    │
    ├─ tasks.recorder.start_recording
    │     1. Start Xvfb virtual display
    │     2. Start PulseAudio virtual sink
    │     3. Playwright launches Chromium → opens stream URL
    │     4. FFmpeg captures display to lossless intermediate (.mkv)
    │     5. Dispatches tasks.processor.process_video
    │
    └─ tasks.processor.process_video
          1. FFmpeg: scale watermark + apply opacity + overlay
          2. FFmpeg: re-encode → H.264 + AAC MP4 (YouTube spec)
          3. Update job status → done
          4. Send Telegram notification (text + thumbnail)
          5. Optionally sync to MinIO
```

---

## Environment Variables

See `.env.example` for the full list. Required variables:

| Variable             | Description                                      |
|----------------------|--------------------------------------------------|
| `POSTGRES_PASSWORD`  | PostgreSQL password                              |
| `REDIS_PASSWORD`     | Redis auth password                              |
| `SECRET_KEY`         | JWT signing key (`openssl rand -hex 32`)         |
| `NEXTAUTH_SECRET`    | NextAuth session secret (`openssl rand -base64 32`) |
| `ADMIN_USERNAME`     | Dashboard login username                         |
| `ADMIN_PASSWORD`     | Dashboard login password                         |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather (optional)    |
| `TELEGRAM_CHAT_ID`   | Telegram chat/group ID (optional)                |

---

## FFmpeg Output Spec (YouTube-ready)

| Setting          | 1080p              | 720p               |
|------------------|--------------------|--------------------|
| Codec            | H.264 (libx264)    | H.264 (libx264)    |
| Video bitrate    | 8 Mbps             | 5 Mbps             |
| Keyframe interval| 2 seconds          | 2 seconds          |
| Audio codec      | AAC                | AAC                |
| Audio bitrate    | 320 kbps           | 320 kbps           |
| Audio sample rate| 48 kHz stereo      | 48 kHz stereo      |
| Container        | MP4 (faststart)    | MP4 (faststart)    |

---

## Database Migrations (Alembic)

```bash
# Apply migrations (run inside the api container)
docker-compose exec api alembic upgrade head

# Create a new migration after changing models
docker-compose exec api alembic revision --autogenerate -m "describe change"
```

---

## VPS Requirements

- Ubuntu 20.04+ or Debian 11+
- Docker 24+ + Docker Compose v2
- 4 GB RAM minimum (8 GB recommended for concurrent jobs)
- FFmpeg 4.4+ (included in Docker image)
- Disk space: ~2 GB/hour of 1080p recording

---

## Project Structure

```
.
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Pydantic settings
│   ├── database.py              # Async SQLAlchemy engine
│   ├── celery_app.py            # Celery + Beat configuration
│   ├── models/                  # SQLAlchemy ORM models
│   ├── routers/                 # FastAPI route handlers
│   ├── tasks/                   # Celery tasks (recorder, processor, scheduler)
│   ├── services/                # telegram_service, ffmpeg_service
│   └── migrations/              # Alembic migrations
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # Shared UI components
│   └── lib/                     # API client, types, utilities
├── nginx/
│   └── nginx.conf               # Reverse proxy configuration
├── docker-compose.yml
└── .env.example
```
