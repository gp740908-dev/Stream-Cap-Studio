"""
StreamCap Studio — Settings ORM Model
Stores global system configuration as key-value rows.
Single-row singleton pattern: always upsert on row id=1.
"""
from sqlalchemy import String, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Settings(Base):
    __tablename__ = "settings"

    # Singleton row — always ID 1
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # ─── Telegram ─────────────────────────────────────────────────────────────
    telegram_bot_token: Mapped[str] = mapped_column(Text, default="")
    telegram_chat_id: Mapped[str] = mapped_column(String(64), default="")

    # ─── Storage ──────────────────────────────────────────────────────────────
    output_dir: Mapped[str] = mapped_column(String(4096), default="/app/outputs")
    default_watermark_preset_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )

    # ─── Default Export Preset ────────────────────────────────────────────────
    default_resolution: Mapped[str] = mapped_column(String(10), default="1080p")
    default_fps: Mapped[int] = mapped_column(Integer, default=30)
    default_video_bitrate_1080p: Mapped[str] = mapped_column(String(16), default="8000k")
    default_video_bitrate_720p: Mapped[str] = mapped_column(String(16), default="5000k")
    default_audio_bitrate: Mapped[str] = mapped_column(String(16), default="320k")
    default_audio_sample_rate: Mapped[int] = mapped_column(Integer, default=48000)

    # ─── Chrome / Playwright ─────────────────────────────────────────────────
    chrome_viewport_width: Mapped[int] = mapped_column(Integer, default=1920)
    chrome_viewport_height: Mapped[int] = mapped_column(Integer, default=1080)
    chrome_pre_record_delay: Mapped[int] = mapped_column(Integer, default=5)
    chrome_user_agent: Mapped[str] = mapped_column(Text, default="")

    def __repr__(self) -> str:
        return "<Settings id=1>"
