"""
色卡加载模块：从 JSON 文件读取 MARD 色卡数据。
"""
import json
from pathlib import Path


def load_palette(json_path: str = None):
    """
    加载色卡 JSON。返回列表，每个元素形如：
      {"code": "A1", "rgb": [237, 234, 203], "hex": "#EDEACB", "name": ""}
    """
    if json_path is None:
        # 默认从 app/data/mard_palette.json 读取
        json_path = Path(__file__).parent.parent / "data" / "mard_palette.json"
    with open(json_path, "r", encoding="utf-8") as f:
        palette = json.load(f)
    return palette
