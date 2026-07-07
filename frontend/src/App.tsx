import { useEffect, useState } from "react";
import Uploader from "./components/Uploader";
import ParamsPanel, { type ParamsState } from "./components/ParamsPanel";
import StatsTable from "./components/StatsTable";
import BlocksView from "./components/BlocksView";
import { pixelateImage, type PixelateResult } from "./api/pixelate";
import "./App.css";

const DEFAULT_PARAMS: ParamsState = {
  gridWidth: 64,
  removeBackground: true,
  bgThreshold: 240,
  smooth: true,
  reduceColors: 12,
  dither: false,
  blockCells: 0,
};

type Tab = "preview" | "chart" | "blocks";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [params, setParams] = useState<ParamsState>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PixelateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("preview");

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await pixelateImage({
        file,
        gridWidth: params.gridWidth,
        removeBackground: params.removeBackground,
        bgThreshold: params.bgThreshold,
        smooth: params.smooth,
        reduceColors: params.reduceColors,
        dither: params.dither,
        blockCells: params.blockCells,
        previewCell: 16,
        chartCell: 40,
      });
      setResult(res);
      setTab("preview");
    } catch (e: any) {
      setError(e.message || "处理失败");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const downloadSvg = (svg: string) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, "chart.svg");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const hasBlocks = result && result.blocks && result.blocks.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧩 拼豆图纸生成器</h1>
        <p className="subtitle">上传图片，一键生成 MARD 色卡拼豆图纸</p>
      </header>

      <main className="app-main">
        <section className="left-panel">
          <Uploader onSelect={setFile} previewUrl={previewUrl} />
          <ParamsPanel
            {...params}
            onChange={(patch) => setParams((p) => ({ ...p, ...patch }))}
            onSubmit={handleSubmit}
            loading={loading}
            disabled={!file}
          />
          {error && <div className="error-msg">⚠ {error}</div>}
        </section>

        <section className="right-panel">
          {!result && !loading && (
            <div className="placeholder">
              <div style={{ fontSize: 48 }}>🎨</div>
              <div>上传图片后，这里将显示生成结果</div>
            </div>
          )}
          {loading && (
            <div className="placeholder">
              <div className="spinner" />
              <div>正在处理，请稍候...</div>
            </div>
          )}
          {result && (
            <>
              <div className="result-tabs">
                <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
                  像素预览
                </button>
                <button className={tab === "chart" ? "active" : ""} onClick={() => setTab("chart")}>
                  完整图纸
                </button>
                {hasBlocks && (
                  <button className={tab === "blocks" ? "active" : ""} onClick={() => setTab("blocks")}>
                    分块图纸
                  </button>
                )}
                <div className="result-info">
                  {result.grid_width} × {result.grid_height}
                </div>
              </div>

              {tab === "preview" && (
                <>
                  <div className="result-image-wrap">
                    <img src={`data:image/png;base64,${result.preview_png_base64}`} alt="像素预览" />
                  </div>
                  <div className="result-actions">
                    <button onClick={() => downloadFile(
                      `data:image/png;base64,${result.preview_png_base64}`,
                      "preview.png",
                    )}>下载预览图</button>
                  </div>
                </>
              )}

              {tab === "chart" && (
                <>
                  <div className="result-image-wrap">
                    <img src={`data:image/png;base64,${result.chart_png_base64}`} alt="拼豆图纸" />
                  </div>
                  <div className="result-actions">
                    <button onClick={() => downloadFile(
                      `data:image/png;base64,${result.chart_png_base64}`,
                      "chart.png",
                    )}>下载图纸 PNG</button>
                    <button onClick={() => downloadSvg(result.chart_svg)}>
                      下载图纸 SVG（打印推荐）
                    </button>
                  </div>
                </>
              )}

              {tab === "blocks" && hasBlocks && (
                <BlocksView
                  blocks={result.blocks}
                  blockRows={result.block_rows}
                  blockCols={result.block_cols}
                />
              )}

              <StatsTable stats={result.stats} total={result.total_beads} />
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>MARD 221 色卡 · 本地运行 · 图片不会上传服务器</span>
      </footer>
    </div>
  );
}
