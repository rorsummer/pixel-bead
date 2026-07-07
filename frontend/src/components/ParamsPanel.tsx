export interface ParamsState {
  gridWidth: number;
  removeBackground: boolean;
  bgThreshold: number;
  smooth: boolean;
  reduceColors: number;
  dither: boolean;
  blockCells: number;
}

interface Props extends ParamsState {
  onChange: (patch: Partial<ParamsState>) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function ParamsPanel(props: Props) {
  const {
    gridWidth, removeBackground, bgThreshold, smooth, reduceColors,
    dither, blockCells, onChange, onSubmit, loading, disabled,
  } = props;

  return (
    <div className="params-panel">
      <h3>参数设置</h3>

      <div className="param-row">
        <label>横向豆数：<span className="param-value">{gridWidth}</span></label>
        <input type="range" min={16} max={128} step={4} value={gridWidth}
          onChange={(e) => onChange({ gridWidth: Number(e.target.value) })} />
        <div className="param-hint">数值越大越精细，也越费豆</div>
      </div>

      <div className="param-row">
        <label>
          颜色压缩数：
          <span className="param-value">{reduceColors === 0 ? "不压缩" : reduceColors}</span>
        </label>
        <input type="range" min={0} max={32} step={1} value={reduceColors}
          onChange={(e) => onChange({ reduceColors: Number(e.target.value) })} />
        <div className="param-hint">先压到 N 种色，卡通图建议 8-16</div>
      </div>

      <div className="param-row">
        <label className="param-checkbox">
          <input type="checkbox" checked={dither}
            onChange={(e) => onChange({ dither: e.target.checked })} />
          抖动算法（照片类图片开启效果更好）
        </label>
        <div className="param-hint">用 Floyd-Steinberg 算法模拟渐变，会略慢</div>
      </div>

      <div className="param-row">
        <label className="param-checkbox">
          <input type="checkbox" checked={removeBackground}
            onChange={(e) => onChange({ removeBackground: e.target.checked })} />
          自动去除背景
        </label>
      </div>

      {removeBackground && (
        <div className="param-row">
          <label>背景识别阈值：<span className="param-value">{bgThreshold}</span></label>
          <input type="range" min={200} max={255} step={1} value={bgThreshold}
            onChange={(e) => onChange({ bgThreshold: Number(e.target.value) })} />
          <div className="param-hint">越低会把更多浅色识别为背景</div>
        </div>
      )}

      <div className="param-row">
        <label className="param-checkbox">
          <input type="checkbox" checked={smooth}
            onChange={(e) => onChange({ smooth: e.target.checked })} />
          去噪平滑（推荐开启）
        </label>
      </div>

      <div className="param-row">
        <label>
          分块尺寸：
          <span className="param-value">{blockCells === 0 ? "不分块" : `${blockCells} × ${blockCells}`}</span>
        </label>
        <input type="range" min={0} max={50} step={1} value={blockCells}
          onChange={(e) => onChange({ blockCells: Number(e.target.value) })} />
        <div className="param-hint">按拼豆板尺寸切分成多块打印，常见 29 或 32</div>
      </div>

      <button className="submit-btn" onClick={onSubmit} disabled={disabled || loading}>
        {loading ? "处理中..." : "生成拼豆图纸"}
      </button>
    </div>
  );
}
