"""像素化 API 接口（v2）"""
import base64
import io

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

from app.core.palette import load_palette
from app.core.pixelator import (
    pixelate,
    render_preview,
    render_chart,
    render_chart_svg,
    split_into_blocks,
    compute_stats,
)

router = APIRouter()
_PALETTE = load_palette()


def _img_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


@router.get("/palette")
def get_palette():
    return {"count": len(_PALETTE), "colors": _PALETTE}


@router.post("/pixelate")
async def pixelate_image(
    file: UploadFile = File(...),
    grid_width: int = Form(48, ge=8, le=200),
    remove_background: bool = Form(True),
    bg_threshold: int = Form(240, ge=0, le=255),
    smooth: bool = Form(True),
    reduce_colors: int = Form(0, ge=0, le=64),
    dither: bool = Form(False),
    preview_cell: int = Form(16, ge=1, le=40),
    chart_cell: int = Form(40, ge=8, le=80),
    block_cells: int = Form(0, ge=0, le=100, description="0 表示不分块"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "只接受图片文件")

    data = await file.read()
    tmp = io.BytesIO(data)

    try:
        result = pixelate(
            tmp,
            _PALETTE,
            grid_width=grid_width,
            remove_background=remove_background,
            bg_threshold=bg_threshold,
            smooth=smooth,
            reduce_colors=reduce_colors if reduce_colors > 0 else None,
            dither=dither,
        )
    except Exception as e:
        raise HTTPException(500, f"处理失败：{e}")

    preview_img = render_preview(result, cell_size=preview_cell)
    chart_img = render_chart(result, cell_size=chart_cell, axis=True)
    chart_svg = render_chart_svg(result, cell_size=chart_cell, axis=True)
    stats = compute_stats(result)

    blocks_out = []
    if block_cells > 0:
        split = split_into_blocks(result, block_cells=block_cells)
        for b in split["blocks"]:
            sub_img = render_chart(
                b["sub_result"],
                cell_size=chart_cell,
                origin_x=b["grid_x"],
                origin_y=b["grid_y"],
                axis=True,
            )
            blocks_out.append({
                "block_row": b["block_row"],
                "block_col": b["block_col"],
                "grid_x": b["grid_x"],
                "grid_y": b["grid_y"],
                "width": b["width"],
                "height": b["height"],
                "beads": b["beads"],
                "png_base64": _img_to_b64(sub_img),
            })

    return JSONResponse({
        "grid_width": result["grid_width"],
        "grid_height": result["grid_height"],
        "total_beads": sum(s["count"] for s in stats),
        "color_count": len(stats),
        "stats": stats,
        "preview_png_base64": _img_to_b64(preview_img),
        "chart_png_base64": _img_to_b64(chart_img),
        "chart_svg": chart_svg,
        "block_cells": block_cells,
        "block_rows": max(1, (result["grid_height"] + block_cells - 1) // block_cells) if block_cells > 0 else 0,
        "block_cols": max(1, (result["grid_width"] + block_cells - 1) // block_cells) if block_cells > 0 else 0,
        "blocks": blocks_out,
    })
