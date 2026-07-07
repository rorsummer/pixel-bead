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

  const res = await fetch("/api/pixelate", { method: "POST", body: form });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`请求失败 ${res.status}：${t}`);
  }
  return res.json();
}
