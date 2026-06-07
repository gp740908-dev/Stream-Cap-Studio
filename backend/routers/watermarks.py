"""
StreamCap Studio — Watermark Presets Router
Upload PNG files, manage presets, generate live preview images.
"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models.watermark_preset import WatermarkPreset
from routers.auth import get_current_user
from schemas import WatermarkPresetCreate, WatermarkPresetResponse, WatermarkPresetUpdate

router = APIRouter(prefix="/api/watermarks", tags=["watermarks"])
settings = get_settings()

MAX_FILE_SIZE = 5 * 1024 * 1024   # 5 MB


@router.get("", response_model=list[WatermarkPresetResponse])
async def list_presets(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatermarkPreset).order_by(WatermarkPreset.created_at.desc())
    )
    return [WatermarkPresetResponse.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=WatermarkPresetResponse, status_code=status.HTTP_201_CREATED)
async def create_preset(
    name: str = Form(...),
    position: str = Form("bottom-right"),
    opacity: float = Form(0.8),
    size_percent: float = Form(15.0),
    margin_px: int = Form(20),
    is_default: bool = Form(False),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Upload a watermark PNG and create a new preset.
    Validates: must be PNG, max 5MB.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files are accepted")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    # Validate PNG header magic bytes
    if content[:8] != b"\x89PNG\r\n\x1a\n":
        raise HTTPException(status_code=400, detail="File is not a valid PNG")

    # Save to uploads/watermarks/
    watermarks_dir = os.path.join(settings.upload_dir, "watermarks")
    os.makedirs(watermarks_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_name = f"{file_id}.png"
    relative_path = os.path.join("watermarks", file_name)
    abs_path = os.path.join(settings.upload_dir, relative_path)

    with open(abs_path, "wb") as f:
        f.write(content)

    # If this is set as default, clear other defaults
    if is_default:
        await db.execute(
            update(WatermarkPreset).values(is_default=False)
        )

    preset = WatermarkPreset(
        name=name,
        file_path=relative_path,
        file_name=file.filename,
        position=position,
        opacity=opacity,
        size_percent=size_percent,
        margin_px=margin_px,
        is_default=is_default,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)

    return WatermarkPresetResponse.model_validate(preset)


@router.get("/{preset_id}", response_model=WatermarkPresetResponse)
async def get_preset(
    preset_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatermarkPreset).where(WatermarkPreset.id == preset_id)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return WatermarkPresetResponse.model_validate(preset)


@router.patch("/{preset_id}", response_model=WatermarkPresetResponse)
async def update_preset(
    preset_id: str,
    payload: WatermarkPresetUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatermarkPreset).where(WatermarkPreset.id == preset_id)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # If setting as default, clear others first
    if payload.is_default:
        await db.execute(update(WatermarkPreset).values(is_default=False))

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preset, field, value)

    await db.commit()
    await db.refresh(preset)
    return WatermarkPresetResponse.model_validate(preset)


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatermarkPreset).where(WatermarkPreset.id == preset_id)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # Delete the PNG file
    abs_path = os.path.join(settings.upload_dir, preset.file_path)
    if os.path.exists(abs_path):
        os.unlink(abs_path)

    await db.delete(preset)
    await db.commit()


@router.get("/{preset_id}/preview")
async def get_watermark_preview(
    preset_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Generate a preview image: watermark overlaid on a dark 1920×1080 sample frame.
    Returns a PNG image response.
    Used by the frontend watermark editor for live preview.
    """
    from PIL import Image, ImageDraw
    import io

    result = await db.execute(
        select(WatermarkPreset).where(WatermarkPreset.id == preset_id)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    wm_abs_path = os.path.join(settings.upload_dir, preset.file_path)
    if not os.path.exists(wm_abs_path):
        raise HTTPException(status_code=404, detail="Watermark file not found on disk")

    # Create a dark sample frame (simulates a video frame background)
    canvas_w, canvas_h = 1280, 720   # preview at 720p for efficiency
    canvas = Image.new("RGB", (canvas_w, canvas_h), color=(20, 20, 20))

    # Add a subtle grid to make positioning visible
    draw = ImageDraw.Draw(canvas)
    for x in range(0, canvas_w, 80):
        draw.line([(x, 0), (x, canvas_h)], fill=(35, 35, 35))
    for y in range(0, canvas_h, 80):
        draw.line([(0, y), (canvas_w, y)], fill=(35, 35, 35))

    # Load watermark and resize
    wm = Image.open(wm_abs_path).convert("RGBA")
    wm_target_w = int(canvas_w * preset.size_percent / 100)
    wm_aspect = wm.height / wm.width
    wm_target_h = int(wm_target_w * wm_aspect)
    wm_resized = wm.resize((wm_target_w, wm_target_h), Image.LANCZOS)

    # Apply opacity
    r, g, b, a = wm_resized.split()
    a = a.point(lambda v: int(v * preset.opacity))
    wm_resized = Image.merge("RGBA", (r, g, b, a))

    # Calculate position
    m = preset.margin_px
    positions = {
        "top-left":      (m, m),
        "top-center":    ((canvas_w - wm_target_w) // 2, m),
        "top-right":     (canvas_w - wm_target_w - m, m),
        "middle-left":   (m, (canvas_h - wm_target_h) // 2),
        "center":        ((canvas_w - wm_target_w) // 2, (canvas_h - wm_target_h) // 2),
        "middle-right":  (canvas_w - wm_target_w - m, (canvas_h - wm_target_h) // 2),
        "bottom-left":   (m, canvas_h - wm_target_h - m),
        "bottom-center": ((canvas_w - wm_target_w) // 2, canvas_h - wm_target_h - m),
        "bottom-right":  (canvas_w - wm_target_w - m, canvas_h - wm_target_h - m),
    }
    pos = positions.get(preset.position, positions["bottom-right"])
    canvas.paste(wm_resized, pos, mask=wm_resized)

    # Serialize to PNG bytes
    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.read(), media_type="image/png")
