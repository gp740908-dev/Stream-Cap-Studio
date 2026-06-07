"""
StreamCap Studio — Job ORM Model
Represents a single recording + processing pipeline run.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    String, Integer, Float, Text, DateTime, Enum, ForeignKey, Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RECORDING = "recording"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    # ─── Job Definition ───────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    stream_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    resolution: Mapped[str] = mapped_column(String(10), default="1080p")
    fps: Mapped[int] = mapped_column(Integer, default=30)
    is_immediate: Mapped[bool] = mapped_column(Boolean, default=True)

    # ─── Watermark ────────────────────────────────────────────────────────────
    watermark_preset_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("watermark_presets.id"), nullable=True
    )
    watermark_preset: Mapped["WatermarkPreset | None"] = relationship(
        "WatermarkPreset", back_populates="jobs", lazy="selectin"
    )

    # ─── Status & Lifecycle ───────────────────────────────────────────────────
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus), default=JobStatus.QUEUED, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ─── Output ───────────────────────────────────────────────────────────────
    output_path: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ─── Logs & Error Tracking ────────────────────────────────────────────────
    log: Mapped[str | None] = mapped_column(Text, nullable=True)   # full log output
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r} status={self.status}>"
