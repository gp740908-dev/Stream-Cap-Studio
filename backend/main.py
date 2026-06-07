"""
StreamCap Studio — FastAPI Application Entry Point
Registers all routers, CORS middleware, startup events, and static file mounts.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import create_tables
from routers.auth import router as auth_router
from routers.jobs import router as jobs_router
from routers.watermarks import router as watermarks_router
from routers.settings_router import router as settings_router
from routers.system import router as system_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    - On startup: create DB tables if they don't exist, ensure directories exist.
    - On shutdown: nothing special needed (workers managed by Docker).
    """
    # Ensure storage directories exist
    for directory in [settings.output_dir, settings.upload_dir, settings.tmp_dir]:
        os.makedirs(directory, exist_ok=True)

    # Create tables (dev convenience — production should use Alembic migrations)
    await create_tables()
    yield
    # Shutdown: clean up resources if needed


app = FastAPI(
    title="StreamCap Studio API",
    description="Self-hosted automated video recording and watermarking pipeline",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allow the Next.js frontend to call the API.
# In production, restrict origins to your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production: e.g. ["https://yourdomain.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Routers ──────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(watermarks_router)
app.include_router(settings_router)
app.include_router(system_router)

# ─── Static file serving (watermark uploads, accessible at /api/uploads/) ─────
if os.path.exists(settings.upload_dir):
    app.mount(
        "/api/uploads",
        StaticFiles(directory=settings.upload_dir),
        name="uploads",
    )
