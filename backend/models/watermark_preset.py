"""
StreamCap Studio — WatermarkPreset ORM Model
Stores a reusable watermark configuration (PNG file + positioning).
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Float, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class WatermarkPreset(Base):
    __tablename__ = "watermark_presets"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ─── Identity ─────────────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ─── PNG Asset ────────────────────────────────────────────────────────────
    # Relative path from UPLOAD_DIR, e.g. "watermarks/uuid.png"
    file_path: Mapped[str] = mapped_column(String(4096), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # ─── Position — 9-point grid ──────────────────────────────────────────────
    # Values: top-left, top-center, top-right,
    #         middle-left, center, middle-right,
    #         bottom-left, bottom-center, bottom-right
    position: Mapped[str] = mapped_column(String(20), default="bottom-right")

    # ─── Appearance ───────────────────────────────────────────────────────────
    opacity: Mapped[float] = mapped_column(Float, default=0.8)       # 0.0–1.0
    size_percent: Mapped[float] = mapped_column(Float, default=15.0)  # % of video width
    margin_px: Mapped[int] = mapped_column(Integer, default=20)       # pixels from edge

    # ─── Relationship back to jobs ────────────────────────────────────────────
    jobs: Mapped[list["Job"]] = relationship(
        "Job", back_populates="watermark_preset", lazy="select"
    )

    @property
    def ffmpeg_overlay_expr(self) -> str:
        """
        Returns the FFmpeg overlay position expression string
        based on the 9-point grid position and margin.
        W = output video width, H = height, w = watermark width, h = watermark height
        """
        m = self.margin_px
        expressions = {
            "top-left":      f"{m}:{m}",
            "top-center":    f"(W-w)/2:{m}",
            "top-right":     f"W-w-{m}:{m}",
            "middle-left":   f"{m}:(H-h)/2",
            "center":        f"(W-w)/2:(H-h)/2",
            "middle-right":  f"W-w-{m}:(H-h)/2",
            "bottom-left":   f"{m}:H-h-{m}",
            "bottom-center": f"(W-w)/2:H-h-{m}",
            "bottom-right":  f"W-w-{m}:H-h-{m}",
        }
        return expressions.get(self.position, expressions["bottom-right"])

    def __repr__(self) -> str:
        return f"<WatermarkPreset id={self.id} name={self.name!r}>"
