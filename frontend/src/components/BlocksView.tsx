import { useState } from "react";
import type { BlockInfo } from "../api/pixelate";

interface Props {
  blocks: BlockInfo[];
  blockRows: number;
  blockCols: number;
}

export default function BlocksView({ blocks, blockRows, blockCols }: Props) {
  const [selected, setSelected] = useState(0);

  if (blocks.length === 0) return null;

  const current = blocks[selected];

  const downloadAll = () => {
    blocks.forEach((b, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `data:image/png;base64,${b.png_base64}`;
        a.download = `block_${b.block_row + 1}_${b.block_col + 1}.png`;
        a.click();
      }, i * 200);
    });
  };

  return (
    <div className="blocks-view">
      <div className="blocks-summary">
        共 <b>{blockRows} × {blockCols} = {blocks.length}</b> 块
        <button className="download-all-btn" onClick={downloadAll}>
          批量下载全部块
        </button>
      </div>

      <div className="blocks-grid" style={{
        gridTemplateColumns: `repeat(${blockCols}, 1fr)`,
      }}>
        {blocks.map((b, i) => (
          <button
            key={i}
            className={`block-cell ${i === selected ? "active" : ""}`}
            onClick={() => setSelected(i)}
            title={`第 ${b.block_row + 1} 行 第 ${b.block_col + 1} 列，${b.beads} 颗豆`}
          >
            {b.block_row + 1},{b.block_col + 1}
          </button>
        ))}
      </div>

      <div className="block-detail">
        <div className="block-detail-header">
          <span>
            第 <b>{current.block_row + 1}</b> 行 · 第 <b>{current.block_col + 1}</b> 列 ·
            {" "}尺寸 {current.width} × {current.height} · {current.beads} 颗豆
          </span>
          <button onClick={() => {
            const a = document.createElement("a");
            a.href = `data:image/png;base64,${current.png_base64}`;
            a.download = `block_${current.block_row + 1}_${current.block_col + 1}.png`;
            a.click();
          }}>下载当前块</button>
        </div>
        <div className="block-image-wrap">
          <img src={`data:image/png;base64,${current.png_base64}`} alt="分块图纸" />
        </div>
      </div>
    </div>
  );
}
