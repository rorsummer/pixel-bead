"""
像素化核心模块（v4）
新增：Floyd-Steinberg 抖动、SVG 图纸、区块划分
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from .color_matcher import build_palette_lab, find_nearest_indices, rgb_to_lab


def _flood_fill_bg(light_mask):
    try:
        from scipy.ndimage import label
    except ImportError:
        return light_mask

    labeled, _ = label(light_mask)
    edge_labels = set()
    edge_labels.update(labeled[0, :].tolist())
    edge_labels.update(labeled[-1, :].tolist())
    edge_labels.update(labeled[:, 0].tolist())
    edge_labels.update(labeled[:, -1].tolist())
    edge_labels.discard(0)
    if not edge_labels:
        return np.zeros_like(light_mask)
    return np.isin(labeled, list(edge_labels))


def _prepare_image(image_path, bg_threshold, smooth):
    img = Image.open(image_path)
    if img.mode == "RGBA":
        rgba = np.array(img)
        alpha = rgba[..., 3]
        rgb = rgba[..., :3].copy()
        rgb[alpha < 128] = 255
        img_rgb = Image.fromarray(rgb, mode="RGB")
        if smooth:
            img_rgb = img_rgb.filter(ImageFilter.MedianFilter(3))
        return img_rgb, alpha < 128

    img_rgb = img.convert("RGB")
    if smooth:
        img_rgb = img_rgb.filter(ImageFilter.MedianFilter(3))
    arr = np.array(img_rgb)
    luminance = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    light_mask = luminance >= bg_threshold
    bg_mask = _flood_fill_bg(light_mask)
    return img_rgb, bg_mask


def _reduce_colors_kmeans(pixels, n_colors):
    try:
        from sklearn.cluster import KMeans
    except ImportError:
        return pixels
    km = KMeans(n_clusters=n_colors, n_init=4, random_state=0)
    labels = km.fit_predict(pixels)
    return km.cluster_centers_[labels]


def _apply_floyd_steinberg(pixels_float, palette_rgb_f, bg_mask):
    """
    Floyd-Steinberg 抖动，RGB 空间。
    pixels_float: (H, W, 3) float 数组
    palette_rgb_f: (K, 3) float 数组
    bg_mask: (H, W) bool
    返回：(H, W) 索引数组
    """
    h, w = pixels_float.shape[:2]
    work = pixels_float.copy()
    indices = np.zeros((h, w), dtype=np.int32)

    for y in range(h):
        for x in range(w):
            if bg_mask[y, x]:
                continue
            old = work[y, x]
            clipped = np.clip(old, 0, 255)
            diff = palette_rgb_f - clipped
            dist2 = (diff * diff).sum(axis=-1)
            idx = int(dist2.argmin())
            new = palette_rgb_f[idx]
            indices[y, x] = idx
            err = old - new
            if x + 1 < w:
                work[y, x + 1] += err * (7 / 16)
            if y + 1 < h:
                if x - 1 >= 0:
                    work[y + 1, x - 1] += err * (3 / 16)
                work[y + 1, x] += err * (5 / 16)
                if x + 1 < w:
                    work[y + 1, x + 1] += err * (1 / 16)
    return indices


def pixelate(
    image_path,
    palette,
    grid_width=48,
    remove_background=True,
    bg_threshold=240,
    smooth=True,
    reduce_colors=None,
    dither=False,
):
    img_rgb, bg_mask_full = _prepare_image(image_path, bg_threshold, smooth)
    w, h = img_rgb.size
    grid_height = max(1, round(grid_width * h / w))

    small = img_rgb.resize((grid_width, grid_height), Image.LANCZOS)
    pixels = np.array(small)

    bg_img = Image.fromarray(bg_mask_full.astype(np.uint8) * 255)
    bg_small = bg_img.resize((grid_width, grid_height), Image.NEAREST)
    bg_mask = np.array(bg_small) > 128

    if reduce_colors is not None and reduce_colors > 0:
        fg = ~bg_mask
        fg_pixels = pixels[fg]
        if len(fg_pixels) > reduce_colors:
            reduced = _reduce_colors_kmeans(fg_pixels.astype(np.float64), reduce_colors)
            pixels[fg] = np.clip(reduced, 0, 255).astype(np.uint8)

    palette_rgb = np.array([p["rgb"] for p in palette], dtype=np.uint8)

    if dither:
        indices = _apply_floyd_steinberg(
            pixels.astype(np.float64),
            palette_rgb.astype(np.float64),
            bg_mask,
        )
    else:
        palette_lab = build_palette_lab(palette)
        indices = find_nearest_indices(pixels, palette_lab)

    if not remove_background:
        bg_mask = np.zeros_like(bg_mask)

    return {
        "grid_width": grid_width,
        "grid_height": grid_height,
        "indices": indices,
        "bg_mask": bg_mask,
        "palette": palette,
    }


def _load_font(font_size):
    for font_name in ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(font_name, font_size)
        except Exception:
            continue
    return ImageFont.load_default()


def render_preview(result, cell_size=20):
    palette = result["palette"]
    indices = result["indices"]
    bg_mask = result["bg_mask"]
    palette_rgb = np.array([p["rgb"] for p in palette], dtype=np.uint8)

    small = palette_rgb[indices]
    small[bg_mask] = [255, 255, 255]
    small_img = Image.fromarray(small, mode="RGB")
    gh, gw = indices.shape
    return small_img.resize((gw * cell_size, gh * cell_size), Image.NEAREST)


def render_chart(
    result,
    cell_size=40,
    origin_x=0,
    origin_y=0,
    axis=False,
):
    """
    渲染图纸。
    origin_x/origin_y: 用于子块时标注坐标原点（该块左上角在整图中的格子位置）
    axis: 是否在图纸顶部和左侧画上行列编号（大图打印时有用）
    """
    palette = result["palette"]
    indices = result["indices"]
    bg_mask = result["bg_mask"]
    gh, gw = indices.shape

    margin = cell_size if axis else 0
    canvas_w = gw * cell_size + margin
    canvas_h = gh * cell_size + margin

    img = Image.new("RGB", (canvas_w, canvas_h), "white")
    draw = ImageDraw.Draw(img)

    font_size = max(10, cell_size // 3)
    font = _load_font(font_size)
    axis_font = _load_font(max(9, cell_size // 4))

    # 坐标刻度
    if axis:
        for x in range(gw):
            label = str(origin_x + x + 1)
            bbox = draw.textbbox((0, 0), label, font=axis_font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text(
                (margin + x * cell_size + (cell_size - tw) / 2 - bbox[0],
                 (margin - th) / 2 - bbox[1]),
                label, fill=(120, 120, 120), font=axis_font,
            )
        for y in range(gh):
            label = str(origin_y + y + 1)
            bbox = draw.textbbox((0, 0), label, font=axis_font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text(
                ((margin - tw) / 2 - bbox[0],
                 margin + y * cell_size + (cell_size - th) / 2 - bbox[1]),
                label, fill=(120, 120, 120), font=axis_font,
            )

    for y in range(gh):
        for x in range(gw):
            x0 = margin + x * cell_size
            y0 = margin + y * cell_size
            x1, y1 = x0 + cell_size, y0 + cell_size

            if bg_mask[y, x]:
                draw.rectangle([x0, y0, x1, y1], fill="white", outline=(230, 230, 230))
                continue

            p = palette[int(indices[y, x])]
            r, g, b = p["rgb"]
            draw.rectangle([x0, y0, x1, y1], fill=(r, g, b), outline=(200, 200, 200))

            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            text_color = "black" if luminance > 140 else "white"

            code = p["code"]
            bbox = draw.textbbox((0, 0), code, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text(
                (x0 + (cell_size - tw) / 2 - bbox[0],
                 y0 + (cell_size - th) / 2 - bbox[1]),
                code, fill=text_color, font=font,
            )
    return img


def render_chart_svg(result, cell_size=40, axis=True):
    """生成 SVG 字符串。矢量图，无限放大不失真，打印质量高。"""
    palette = result["palette"]
    indices = result["indices"]
    bg_mask = result["bg_mask"]
    gh, gw = indices.shape

    margin = cell_size if axis else 0
    width = gw * cell_size + margin
    height = gh * cell_size + margin
    font_size = max(10, cell_size // 3)
    axis_font_size = max(9, cell_size // 4)

    parts = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">'
    )
    parts.append(
        '<style>'
        'text{font-family:Arial,sans-serif;text-anchor:middle;dominant-baseline:central}'
        '.axis{fill:#787878}'
        '</style>'
    )
    parts.append(f'<rect width="{width}" height="{height}" fill="white"/>')

    if axis:
        for x in range(gw):
            cx = margin + x * cell_size + cell_size / 2
            cy = margin / 2
            parts.append(
                f'<text x="{cx:.1f}" y="{cy:.1f}" font-size="{axis_font_size}" class="axis">{x + 1}</text>'
            )
        for y in range(gh):
            cx = margin / 2
            cy = margin + y * cell_size + cell_size / 2
            parts.append(
                f'<text x="{cx:.1f}" y="{cy:.1f}" font-size="{axis_font_size}" class="axis">{y + 1}</text>'
            )

    for y in range(gh):
        for x in range(gw):
            x0 = margin + x * cell_size
            y0 = margin + y * cell_size
            if bg_mask[y, x]:
                parts.append(
                    f'<rect x="{x0}" y="{y0}" width="{cell_size}" height="{cell_size}" '
                    f'fill="white" stroke="#eee"/>'
                )
                continue
            p = palette[int(indices[y, x])]
            r, g, b = p["rgb"]
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            text_color = "black" if luminance > 140 else "white"
            parts.append(
                f'<rect x="{x0}" y="{y0}" width="{cell_size}" height="{cell_size}" '
                f'fill="{p["hex"]}" stroke="#c8c8c8"/>'
            )
            cx = x0 + cell_size / 2
            cy = y0 + cell_size / 2
            parts.append(
                f'<text x="{cx:.1f}" y="{cy:.1f}" font-size="{font_size}" fill="{text_color}">{p["code"]}</text>'
            )

    parts.append('</svg>')
    return "".join(parts)


def split_into_blocks(result, block_cells=29):
    """
    把结果切成 block_cells x block_cells 的多个子块。
    返回：{"n_rows", "n_cols", "block_cells", "blocks": [{...}]}
    """
    palette = result["palette"]
    indices = result["indices"]
    bg_mask = result["bg_mask"]
    gh, gw = indices.shape

    n_rows = (gh + block_cells - 1) // block_cells
    n_cols = (gw + block_cells - 1) // block_cells

    blocks = []
    for br in range(n_rows):
        for bc in range(n_cols):
            y0 = br * block_cells
            y1 = min(y0 + block_cells, gh)
            x0 = bc * block_cells
            x1 = min(x0 + block_cells, gw)

            sub = {
                "palette": palette,
                "indices": indices[y0:y1, x0:x1],
                "bg_mask": bg_mask[y0:y1, x0:x1],
            }
            beads = int((~sub["bg_mask"]).sum())
            blocks.append({
                "block_row": br,
                "block_col": bc,
                "grid_x": x0,
                "grid_y": y0,
                "width": x1 - x0,
                "height": y1 - y0,
                "beads": beads,
                "sub_result": sub,
            })

    return {
        "n_rows": n_rows,
        "n_cols": n_cols,
        "block_cells": block_cells,
        "blocks": blocks,
    }


def compute_stats(result):
    palette = result["palette"]
    indices = result["indices"]
    bg_mask = result["bg_mask"]

    fg_indices = indices[~bg_mask]
    unique, counts = np.unique(fg_indices, return_counts=True)
    stats = []
    for i, c in zip(unique, counts):
        p = palette[int(i)]
        stats.append({"code": p["code"], "hex": p["hex"], "count": int(c)})
    stats.sort(key=lambda s: -s["count"])
    return stats
