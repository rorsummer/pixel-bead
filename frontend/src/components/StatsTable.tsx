import type { ColorStat } from "../api/pixelate";

interface Props {
  stats: ColorStat[];
  total: number;
}

export default function StatsTable({ stats, total }: Props) {
  return (
    <div className="stats-table">
      <div className="stats-summary">
        共 <b>{total}</b> 颗豆，<b>{stats.length}</b> 种颜色
      </div>
      <table>
        <thead>
          <tr>
            <th>色号</th>
            <th>颜色</th>
            <th>HEX</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.code}>
              <td className="col-code">{s.code}</td>
              <td>
                <span className="color-swatch" style={{ background: s.hex }} />
              </td>
              <td className="col-hex">{s.hex}</td>
              <td className="col-count">{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
