"""
StreamCap Studio — Pydantic Request/Response Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Job ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    stream_url: str = Field(..., description="URL of the stream page to open in Chrome")
    scheduled_at: Optional[datetime] = Field(
        None, description="ISO8601 datetime for scheduled jobs; null = run immediately"
    )
    duration_minutes: int = Field(..., ge=1, le=720, description="Recording duration in minutes")
    resolution: str = Field("1080p", pattern="^(1080p|720p)$")
    fps: int = Field(30, ge=1, le=60)
    watermark_preset_id: Optional[str] = None
    is_immediate: bool = True


class JobResponse(BaseModel):
    id: str
    title: str
    stream_url: str
    scheduled_at: Optional[datetime]
    duration_minutes: int
    resolution: str
    fps: int
    is_immediate: bool
    watermark_preset_id: Optional[str]
    status: str
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    output_path: Optional[str]
    file_size_bytes: Optional[int]
    actual_duration_seconds: Optional[float]
    error_message: Optional[str]
    celery_task_id: Optional[str]
    retry_count: int

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    page_size: int


class JobLogResponse(BaseModel):
    id: str
    log: Optional[str]


# ─── Watermark Preset ─────────────────────────────────────────────────────────

class WatermarkPresetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    position: str = Field(
        "bottom-right",
        pattern="^(top-left|top-center|top-right|middle-left|center|middle-right|bottom-left|bottom-center|bottom-right)$",
    )
    opacity: float = Field(0.8, ge=0.0, le=1.0)
    size_percent: float = Field(15.0, ge=1.0, le=100.0)
    margin_px: int = Field(20, ge=0, le=500)
    is_default: bool = False


class WatermarkPresetUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    opacity: Optional[float] = None
    size_percent: Optional[float] = None
    margin_px: Optional[int] = None
    is_default: Optional[bool] = None


class WatermarkPresetResponse(BaseModel):
    id: str
    name: str
    file_name: str
    file_path: str
    position: str
    opacity: float
    size_percent: float
    margin_px: int
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Settings ─────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    output_dir: Optional[str] = None
    default_watermark_preset_id: Optional[str] = None
    default_resolution: Optional[str] = None
    default_fps: Optional[int] = None
    default_video_bitrate_1080p: Optional[str] = None
    default_video_bitrate_720p: Optional[str] = None
    default_audio_bitrate: Optional[str] = None
    default_audio_sample_rate: Optional[int] = None
    chrome_viewport_width: Optional[int] = None
    chrome_viewport_height: Optional[int] = None
    chrome_pre_record_delay: Optional[int] = None
    chrome_user_agent: Optional[str] = None


class SettingsResponse(BaseModel):
    telegram_bot_token: str
    telegram_chat_id: str
    output_dir: str
    default_watermark_preset_id: Optional[str]
    default_resolution: str
    default_fps: int
    default_video_bitrate_1080p: str
    default_video_bitrate_720p: str
    default_audio_bitrate: str
    default_audio_sample_rate: int
    chrome_viewport_width: int
    chrome_viewport_height: int
    chrome_pre_record_delay: int
    chrome_user_agent: str

    class Config:
        from_attributes = True


# ─── System Status ────────────────────────────────────────────────────────────

class SystemResourceResponse(BaseModel):
    cpu_percent: float
    ram_percent: float
    ram_used_gb: float
    ram_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    disk_warning: bool    # True if disk >80%
    active_jobs: int
    queued_jobs: int
