"""
StreamCap Studio — Application Configuration
Loads all settings from environment variables via pydantic-settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── Database ────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://streamcap:password@db:5432/streamcap"

    # ─── Redis / Celery ───────────────────────────────────────────────────────
    redis_url: str = "redis://:password@redis:6379/0"
    celery_broker_url: str = "redis://:password@redis:6379/0"
    celery_result_backend: str = "redis://:password@redis:6379/1"

    # ─── Auth ─────────────────────────────────────────────────────────────────
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440   # 24 hours
    admin_username: str = "admin"
    admin_password: str = "change_me"

    # ─── Telegram ────────────────────────────────────────────────────────────
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # ─── Storage ─────────────────────────────────────────────────────────────
    output_dir: str = "/app/outputs"
    upload_dir: str = "/app/uploads"
    tmp_dir: str = "/tmp/streamcap"

    # ─── MinIO (optional) ─────────────────────────────────────────────────────
    minio_enabled: bool = False
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "streamcap-outputs"
    minio_secure: bool = False

    # ─── Chrome / Playwright ─────────────────────────────────────────────────
    chrome_viewport_width: int = 1920
    chrome_viewport_height: int = 1080
    chrome_pre_record_delay: int = 5   # seconds before FFmpeg starts capture
    chrome_user_agent: str = (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )

    # ─── FFmpeg Defaults ──────────────────────────────────────────────────────
    default_resolution: str = "1080p"
    default_fps: int = 30
    default_video_bitrate_1080p: str = "8000k"
    default_video_bitrate_720p: str = "5000k"
    default_audio_bitrate: str = "320k"
    default_audio_sample_rate: int = 48000

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton Settings instance."""
    return Settings()
