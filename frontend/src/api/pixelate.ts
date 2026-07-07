export interface PixelateParams {
  file: File;
  gridWidth: number;
  removeBackground: boolean;
  bgThreshold: number;
  smooth: boolean;
  reduceColors: number;
  dither: boolean;
  previewCell: number;
  chartCell: number;
  blockCells: number;
}

export interface ColorStat {
  code: string;
  hex: string;
  count: number;
}

export interface BlockInfo {
  block_row: number;
  block_col: number;
  grid_x: number;
  grid_y: number;
  width: number;
  height: number;
  beads: number;
  png_base64: string;
}

export interface PixelateResult {
  grid_width: number;
  grid_height: number;
  total_beads: number;
  color_count: number;
  stats: ColorStat[];
  preview_png_base64: string;
  chart_png_base64: string;
  chart_svg: string;
  block_cells: number;
  block_rows: number;
  block_cols: number;
  blocks: BlockInfo[];
}

// 后端地址：
// - 开发环境（npm run dev）：VITE_API_BASE 未定义，走 Vite 代理，值为空串 -> 请求 "/api/..."
// - 生产环境（Vercel）：VITE_API_BASE 设置为 Render 地址 -> 请求 "https://xxx/api/..."
const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function pixelateImage(p: PixelateParams): Promise<PixelateResult> {
  const form = new FormData();
  form.append("file", p.file);
  form.append("grid_width", String(p.gridWidth));
  form.append("remove_background", String(p.removeBackground));
  form.append("bg_threshold", String(p.bgThreshold));
  form.append("smooth", String(p.smooth));
  form.append("reduce_colors", String(p.reduceColors));
  form.append("dither", String(p.dither));
  form.append("preview_cell", String(p.previewCell));
  form.append("chart_cell", String(p.chartCell));
  form.append("block_cells", String(p.blockCells));

  const res = await fetch(`${API_BASE}/api/pixelate`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`请求失败 ${res.status}：${t}`);
  }
  return res.json();
}

// 唤醒后端（用来在页面加载时预热免费套餐的冷启动）
export async function warmupBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
