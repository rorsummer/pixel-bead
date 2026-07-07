"""
像素化测试脚本（v2）。

用法示例：
    python test_pixelate.py --image test1.png --grid-width 64 --reduce-colors 12
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.palette import load_palette
from app.core.pixelator import pixelate, render_preview, render_chart, compute_stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--grid-width", type=int, default=48)
    parser.add_argument("--preview-cell", type=int, default=16)
    parser.add_argument("--chart-cell", type=int, default=40)
    parser.add_argument("--bg-threshold", type=int, default=240,
                        help="亮度阈值，>=此值视为背景，0-255")
    parser.add_argument("--no-remove-bg", action="store_true",
                        help="加此参数则不识别背景")
    parser.add_argument("--no-smooth", action="store_true",
                        help="加此参数则不做去噪")
    parser.add_argument("--reduce-colors", type=int, default=None,
                        help="先压缩到 N 种颜色再匹配，卡通图建议 8-16")
    args = parser.parse_args()

    image_path = Path(args.image)
    stem = image_path.stem

    palette = load_palette()
    print(f"色卡：{len(palette)} 色")

    result = pixelate(
        str(image_path),
        palette,
        grid_width=args.grid_width,
        remove_background=not args.no_remove_bg,
        bg_threshold=args.bg_threshold,
        smooth=not args.no_smooth,
        reduce_colors=args.reduce_colors,
    )
    print(f"网格：{result['grid_width']} x {result['grid_height']}")

    preview = render_preview(result, cell_size=args.preview_cell)
    preview.save(f"{stem}_preview.png")

    chart = render_chart(result, cell_size=args.chart_cell)
    chart.save(f"{stem}_chart.png")

    stats = compute_stats(result)
    total = sum(s["count"] for s in stats)
    with open(f"{stem}_stats.txt", "w", encoding="utf-8") as f:
        f.write(f"总豆数：{total}\n用色种类：{len(stats)}\n\n色号\tHEX\t\t数量\n")
        for s in stats:
            f.write(f"{s['code']}\t{s['hex']}\t{s['count']}\n")

    print(f"完成！总豆数 {total}，用色 {len(stats)} 种")
    print(f"输出：{stem}_preview.png / {stem}_chart.png / {stem}_stats.txt")


if __name__ == "__main__":
    main()
