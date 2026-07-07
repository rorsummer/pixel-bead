"""
backend/scripts/extract_palette.py

用途：从 MARD 221 色卡示意图中提取每个色系区块的颜色，
      按照"每行最多16格"的规则自动切分，生成完整色卡 JSON。

核心思路：
- 色卡图按色系分成 9 个区块（A/B/C/D/E/F/G/H/M）
- 每个区块内部是网格排列，最多每行16个色块，超出换行
- 色号按区块内顺序自动编号（A1, A2, ... A26），无需 OCR，保证准确

使用方法：
1. 先运行 --mode inspect，生成网格线叠加的预览图，用来标定每个区块的像素坐标
2. 确认坐标后，把坐标填进 regions.json，运行 --mode extract 正式提取
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def sample_region_colors(
    img_np: np.ndarray,
    region: dict,
    margin_ratio: float = 0.15,
):
    """
    对单个色系区块采样。

    region 结构：
    {
        "code_prefix": "A",
        "total": 26,
        "max_per_row": 16,
        "box": [x0, y0, x1, y1],
        "row_gap_ratio": 0.0
    }
    """
    x0, y0, x1, y1 = region["box"]
    total = region["total"]
    max_per_row = region["max_per_row"]

    n_rows = 2 if total > max_per_row else 1
    row1_count = min(total, max_per_row)
    row2_count = total - row1_count

    region_np = img_np[y0:y1, x0:x1]
    region_h, region_w, _ = region_np.shape

    row_h = region_h / n_rows

    colors = []
    idx = 1
    for row_i in range(n_rows):
        count_in_row = row1_count if row_i == 0 else row2_count
        if count_in_row == 0:
            continue
        cell_w = region_w / max_per_row
        for col_i in range(count_in_row):
            cx0 = int(col_i * cell_w)
            cx1 = int((col_i + 1) * cell_w)
            cy0 = int(row_i * row_h)
            cy1 = int((row_i + 1) * row_h)

            mh = int((cy1 - cy0) * margin_ratio)
            mw = int((cx1 - cx0) * margin_ratio)

            cell = region_np[cy0 + mh : cy1 - mh, cx0 + mw : cx1 - mw]
            if cell.size == 0:
                cell = region_np[cy0:cy1, cx0:cx1]

            avg = cell.reshape(-1, 3).mean(axis=0)
            r_, g_, b_ = [int(round(v)) for v in avg]

            colors.append(
                {
                    "code": f"{region['code_prefix']}{idx}",
                    "rgb": [r_, g_, b_],
                    "hex": f"#{r_:02X}{g_:02X}{b_:02X}",
                    "name": "",
                }
            )
            idx += 1
    return colors


def draw_inspection_grid(img: Image.Image, regions: list, output_path: str):
    """在原图上画出每个区块的边框和网格线，方便核对坐标。"""
    draw_img = img.copy()
    draw = ImageDraw.Draw(draw_img)

    for region in regions:
        x0, y0, x1, y1 = region["box"]
        draw.rectangle([x0, y0, x1, y1], outline="red", width=3)

        total = region["total"]
        max_per_row = region["max_per_row"]
        n_rows = 2 if total > max_per_row else 1
        row1_count = min(total, max_per_row)
        row2_count = total - row1_count

        region_w = x1 - x0
        region_h = y1 - y0
        row_h = region_h / n_rows
        cell_w = region_w / max_per_row

        for row_i in range(n_rows):
            count_in_row = row1_count if row_i == 0 else row2_count
            y = y0 + row_i * row_h
            draw.line([x0, y, x1, y], fill="blue", width=1)
            for col_i in range(count_in_row + 1):
                x = x0 + col_i * cell_w
                draw.line([x, y, x, y + row_h], fill="lime", width=1)

    draw_img.save(output_path)


def main():
    parser = argparse.ArgumentParser(description="MARD 221 色卡采样脚本")
    parser.add_argument("--image", required=True, help="色卡图片路径")
    parser.add_argument("--regions", required=True, help="区块坐标配置 JSON 路径")
    parser.add_argument(
        "--mode",
        choices=["inspect", "extract"],
        required=True,
        help="inspect: 生成网格预览图核对坐标；extract: 正式提取色卡",
    )
    parser.add_argument("--output", default=None, help="extract 模式下输出 JSON 路径")
    parser.add_argument("--preview", default="./inspect_preview.png", help="inspect 模式输出预览图路径")
    parser.add_argument("--margin-ratio", type=float, default=0.15)

    args = parser.parse_args()

    img = Image.open(args.image).convert("RGB")
    img_np = np.array(img)

    with open(args.regions, "r", encoding="utf-8") as f:
        regions = json.load(f)

    if args.mode == "inspect":
        draw_inspection_grid(img, regions, args.preview)
        print(f"🖼  已生成核对预览图：{args.preview}")
        print("请检查红框是否框住每个色系区块，绿线是否对齐每个色块中心。")
        return

    # extract 模式
    all_colors = []
    for region in regions:
        colors = sample_region_colors(img_np, region, args.margin_ratio)
        all_colors.extend(colors)
        print(f"✅ {region['code_prefix']} 系：提取 {len(colors)} 色")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_colors, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 共提取 {len(all_colors)} 色，保存到 {output_path}")


if __name__ == "__main__":
    main()
