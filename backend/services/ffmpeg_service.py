"""
StreamCap Studio — FFmpeg Service
Utilities for building FFmpeg commands for recording and watermark processing.
"""
import logging
import os
import subprocess
from pathlib import Path

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Resolution presets ───────────────────────────────────────────────────────
RESOLUTION_MAP = {
    "1080p": (1920, 1080),
    "720p":  (1280, 720),
}

BITRATE_MAP = {
    "1080p": settings.default_video_bitrate_1080p,
    "720p":  settings.default_video_bitrate_720p,
}


def build_record_command(
    display_num: int,
    output_path: str,
    resolution: str = "1080p",
    fps: int = 30,
    duration_seconds: int | None = None,
) -> list[str]:
    """
    Build an FFmpeg command to capture the Xvfb virtual display
    and PulseAudio virtual sink to a raw/lossless intermediate file.

    We capture to a fast intermediate (lossless) format first,
    then re-encode with watermark in the processor task.
    """
    width, height = RESOLUTION_MAP.get(resolution, (1920, 1080))
    video_size = f"{width}x{height}"

    cmd = [
        "ffmpeg",
        "-y",
        # ─── Input: Xvfb virtual display (X11 grab) ────────────────────────
        "-f", "x11grab",
        "-r", str(fps),
        "-s", video_size,
        "-i", f":{display_num}.0+0,0",
        # ─── Input: PulseAudio virtual sink (audio) ────────────────────────
        "-f", "pulse",
        "-i", "virtual_sink.monitor",
        # ─── Video: fast lossless encode for intermediate file ─────────────
        "-c:v", "libx264",
        "-preset", "ultrafast",   # minimize CPU during capture
        "-crf", "0",              # lossless (file will be re-encoded later)
        "-pix_fmt", "yuv420p",
        # ─── Audio: PCM for lossless intermediate ──────────────────────────
        "-c:a", "pcm_s16le",
        "-ar", str(settings.default_audio_sample_rate),
        "-ac", "2",
    ]

    if duration_seconds:
        cmd += ["-t", str(duration_seconds)]

    cmd.append(output_path)
    return cmd


def build_watermark_encode_command(
    input_path: str,
    watermark_path: str,
    output_path: str,
    resolution: str = "1080p",
    watermark_overlay_expr: str = "W-w-20:H-h-20",
    watermark_opacity: float = 0.8,
    watermark_size_percent: float = 15.0,
    fps: int = 30,
) -> list[str]:
    """
    Build FFmpeg command to apply watermark overlay and re-encode
    to YouTube-ready H.264/AAC MP4.

    Filter graph:
      1. Scale watermark to size_percent% of video width with preserved aspect ratio
      2. Adjust watermark opacity via colorchannelmixer alpha channel
      3. Overlay at the specified grid position
    """
    width, height = RESOLUTION_MAP.get(resolution, (1920, 1080))
    video_bitrate = BITRATE_MAP.get(resolution, "8000k")
    keyframe_interval = fps * 2    # YouTube recommends keyframe every 2 seconds

    # Scale watermark: iw = input (watermark) width, ow = output video width
    wm_scale = f"scale=iw*{watermark_size_percent/100}*{width}/iw:-1"
    # Apply opacity via alpha channel multiplication
    wm_opacity = f"colorchannelmixer=aa={watermark_opacity:.3f}"
    # Full filter complex
    filter_complex = (
        f"[1:v]{wm_scale},{wm_opacity}[wm];"
        f"[0:v][wm]overlay={watermark_overlay_expr}"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,        # main video (intermediate lossless)
        "-i", watermark_path,    # watermark PNG
        # ─── Filter: scale + opacity + overlay ─────────────────────────────
        "-filter_complex", filter_complex,
        # ─── Video: H.264 YouTube-ready ────────────────────────────────────
        "-c:v", "libx264",
        "-preset", "slow",       # better compression for final file
        "-b:v", video_bitrate,
        "-maxrate", video_bitrate,
        "-bufsize", f"{int(video_bitrate[:-1]) * 2}k",
        "-g", str(keyframe_interval),   # keyframe every 2 seconds
        "-keyint_min", str(keyframe_interval),
        "-sc_threshold", "0",           # disable scene detection for consistent keyframes
        "-pix_fmt", "yuv420p",
        # ─── Audio: AAC YouTube-ready ──────────────────────────────────────
        "-c:a", "aac",
        "-b:a", settings.default_audio_bitrate,
        "-ar", str(settings.default_audio_sample_rate),
        "-ac", "2",
        # ─── Container ─────────────────────────────────────────────────────
        "-movflags", "+faststart",   # move moov atom to start for streaming
        "-f", "mp4",
        output_path,
    ]
    return cmd


def build_no_watermark_encode_command(
    input_path: str,
    output_path: str,
    resolution: str = "1080p",
    fps: int = 30,
) -> list[str]:
    """
    Build FFmpeg re-encode command without watermark overlay.
    Used when no watermark preset is selected.
    """
    video_bitrate = BITRATE_MAP.get(resolution, "8000k")
    keyframe_interval = fps * 2

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "slow",
        "-b:v", video_bitrate,
        "-maxrate", video_bitrate,
        "-bufsize", f"{int(video_bitrate[:-1]) * 2}k",
        "-g", str(keyframe_interval),
        "-keyint_min", str(keyframe_interval),
        "-sc_threshold", "0",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", settings.default_audio_bitrate,
        "-ar", str(settings.default_audio_sample_rate),
        "-ac", "2",
        "-movflags", "+faststart",
        "-f", "mp4",
        output_path,
    ]
    return cmd


def get_video_duration(video_path: str) -> float | None:
    """
    Probe a video file and return its duration in seconds using ffprobe.
    Returns None on failure.
    """
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                video_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"ffprobe failed on {video_path}: {e}")
    return None


def make_output_filename(title: str, resolution: str) -> str:
    """
    Generate a sanitized output filename.
    Format: [title]_[YYYYMMDD_HHMMSS]_[resolution].mp4
    """
    from datetime import datetime
    import re

    # Sanitize title: keep alphanumeric, spaces, hyphens
    safe_title = re.sub(r"[^\w\s\-]", "", title).strip()
    safe_title = re.sub(r"\s+", "_", safe_title)[:60]  # max 60 chars
    date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{safe_title}_{date_str}_{resolution}.mp4"
