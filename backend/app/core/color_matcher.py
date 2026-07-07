"""
颜色匹配模块：把任意 RGB 颜色匹配到色卡里最接近的一个。
使用 Lab 色彩空间做距离计算，比 RGB 更符合人眼视觉。
"""
import numpy as np


def _srgb_to_linear(c):
    """把 sRGB (0-255) 转成线性 RGB (0-1)。"""
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rgb_to_lab(rgb):
    """
    RGB 转 Lab 色彩空间。
    输入：shape (..., 3) 的 numpy 数组，值范围 0-255
    输出：shape (..., 3) 的 Lab 数组
    """
    rgb = np.asarray(rgb, dtype=np.float64)
    linear = _srgb_to_linear(rgb)

    # sRGB D65 到 XYZ 的转换矩阵
    M = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = linear @ M.T

    # D65 白点
    xyz_ref = np.array([0.95047, 1.0, 1.08883])
    xyz_norm = xyz / xyz_ref

    epsilon = 216 / 24389
    kappa = 24389 / 27
    f = np.where(
        xyz_norm > epsilon,
        np.cbrt(xyz_norm),
        (kappa * xyz_norm + 16) / 116,
    )

    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def build_palette_lab(palette):
    """预先算好色卡的 Lab 值，避免重复计算。"""
    palette_rgb = np.array([p["rgb"] for p in palette], dtype=np.float64)
    return rgb_to_lab(palette_rgb)


def find_nearest_indices(pixels_rgb, palette_lab):
    """
    给每个像素找到色卡里最接近的颜色索引。
    pixels_rgb: shape (H, W, 3) 或 (N, 3)，值 0-255
    palette_lab: shape (K, 3)
    返回：shape (H, W) 或 (N,) 的整数索引
    """
    pixels_lab = rgb_to_lab(pixels_rgb)
    # 距离计算：每个像素到每个色卡颜色的欧氏距离平方
    diff = pixels_lab[..., None, :] - palette_lab  # (..., K, 3)
    dist2 = (diff ** 2).sum(axis=-1)
    return dist2.argmin(axis=-1)
