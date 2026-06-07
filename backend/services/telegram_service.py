"""
StreamCap Studio — Telegram Notification Service
Sends job completion/failure notifications with thumbnail attachment.
Uses python-telegram-bot v20 (async API).
"""
import asyncio
import logging
import os
import subprocess
from pathlib import Path

import telegram
from telegram import Bot
from telegram.error import TelegramError

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _extract_first_frame(video_path: str, output_path: str) -> bool:
    """
    Extract the first frame of the video as a JPEG thumbnail using FFmpeg.
    Returns True on success, False on failure.
    """
    try:
        cmd = [
            "ffmpeg",
            "-y",                    # overwrite output
            "-i", video_path,
            "-vframes", "1",         # extract exactly 1 frame
            "-vf", "scale=640:-1",   # resize thumbnail to 640px wide
            "-q:v", "3",             # JPEG quality (lower = better)
            output_path,
        ]
        result = subprocess.run(
            cmd, capture_output=True, timeout=30
        )
        return result.returncode == 0
    except Exception as e:
        logger.warning(f"Failed to extract thumbnail from {video_path}: {e}")
        return False


def _format_file_size(size_bytes: int | None) -> str:
    """Format file size in human-readable form."""
    if size_bytes is None:
        return "N/A"
    if size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / 1024 ** 2:.1f} MB"
    return f"{size_bytes / 1024 ** 3:.2f} GB"


def _format_duration(seconds: float | None) -> str:
    """Format duration in HH:MM:SS."""
    if seconds is None:
        return "N/A"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


async def send_job_notification(
    job_id: str,
    job_title: str,
    status: str,                    # "done" or "failed"
    duration_seconds: float | None,
    file_size_bytes: int | None,
    output_path: str | None,
    error_message: str | None = None,
    bot_token: str | None = None,
    chat_id: str | None = None,
) -> bool:
    """
    Send a Telegram notification for a completed or failed job.
    Attaches a thumbnail image if the output file is available.

    Returns True if message was sent successfully, False otherwise.
    """
    # Use provided credentials or fall back to settings
    token = bot_token or settings.telegram_bot_token
    cid = chat_id or settings.telegram_chat_id

    if not token or not cid:
        logger.warning("Telegram credentials not configured — skipping notification")
        return False

    # ─── Compose message text ─────────────────────────────────────────────────
    status_emoji = "✅" if status == "done" else "❌"
    status_label = "Completed" if status == "done" else "Failed"

    lines = [
        f"{status_emoji} *StreamCap Studio — Job {status_label}*",
        "",
        f"📌 *Job:* `{job_title}`",
        f"🔖 *Status:* `{status.upper()}`",
        f"⏱ *Duration:* `{_format_duration(duration_seconds)}`",
        f"💾 *File size:* `{_format_file_size(file_size_bytes)}`",
    ]

    if output_path:
        # Show filename only — full path may be internal
        filename = Path(output_path).name
        lines.append(f"📁 *Output:* `{filename}`")

    if error_message and status == "failed":
        # Truncate long error messages to avoid Telegram's 4096 char limit
        short_error = (error_message[:500] + "...") if len(error_message) > 500 else error_message
        lines.append(f"\n⚠️ *Error:*\n```\n{short_error}\n```")

    message_text = "\n".join(lines)

    bot = Bot(token=token)
    thumbnail_path = None

    try:
        # ─── Try to extract and attach thumbnail ──────────────────────────────
        if output_path and status == "done" and os.path.exists(output_path):
            thumbnail_path = f"/tmp/streamcap/thumb_{job_id}.jpg"
            os.makedirs("/tmp/streamcap", exist_ok=True)
            has_thumb = _extract_first_frame(output_path, thumbnail_path)

            if has_thumb and os.path.exists(thumbnail_path):
                with open(thumbnail_path, "rb") as thumb_file:
                    await bot.send_photo(
                        chat_id=cid,
                        photo=thumb_file,
                        caption=message_text,
                        parse_mode="Markdown",
                    )
                logger.info(f"Sent Telegram notification with thumbnail for job {job_id}")
                return True

        # ─── Fallback: text-only message ──────────────────────────────────────
        await bot.send_message(
            chat_id=cid,
            text=message_text,
            parse_mode="Markdown",
        )
        logger.info(f"Sent Telegram text notification for job {job_id}")
        return True

    except TelegramError as e:
        logger.error(f"Telegram send failed for job {job_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending Telegram notification: {e}")
        return False
    finally:
        # Cleanup temp thumbnail
        if thumbnail_path and os.path.exists(thumbnail_path):
            try:
                os.unlink(thumbnail_path)
            except OSError:
                pass


async def send_test_notification(bot_token: str, chat_id: str) -> tuple[bool, str]:
    """
    Send a test message to verify Telegram credentials.
    Returns (success, error_message).
    """
    bot = Bot(token=bot_token)
    test_text = (
        "✅ *StreamCap Studio — Test Notification*\n\n"
        "Your Telegram bot is configured correctly\\. "
        "Job notifications will be sent to this chat\\."
    )
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=test_text,
            parse_mode="MarkdownV2",
        )
        return True, ""
    except TelegramError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Unexpected error: {e}"
