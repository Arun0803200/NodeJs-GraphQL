import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { formatBucket, formatCompact, formatCount, niceScale } from "./format";
import { VIZ } from "./tokens";

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// Rect with only the top corners rounded (data end), square at the baseline
function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

interface TimeChartProps {
  labels: string[];
  bucket: "hour" | "day";
  series: Series[];
  kind: "stacked" | "line";
  height?: number;
  formatValue?: (n: number) => string;
}

// Time series as stacked columns or lines, with a crosshair tooltip, keyboard focus and a table view
export function TimeChart({ labels, bucket, series, kind, height = 220, formatValue = formatCount }: TimeChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const n = labels.length;
  const m = { top: 10, right: 12, bottom: 24, left: 44 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const rawMax = kind === "stacked" ? Math.max(0, ...totals) : Math.max(0, ...series.flatMap((s) => s.values));
  const { max, step } = niceScale(rawMax);
  const y = (v: number) => m.top + plotH - (v / max) * plotH;
  const band = n > 0 ? plotW / n : 0;
  const cx = (i: number) => m.left + band * (i + 0.5);
  const barW = Math.max(2, Math.min(24, band * 0.7));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));
  const empty = rawMax === 0;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left) / (rect.width / n));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  const tooltipLeft = hover === null ? 0 : Math.min(Math.max(cx(hover) - 80, 0), Math.max(0, width - 170));

  return (
    <div className="viz">
      {series.length > 1 && (
        <ul className="viz-legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className={kind === "line" ? "viz-key-line" : "viz-key-rect"} style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={wrapRef} className="viz-plot" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)}
            aria-label={`${series.map((s) => s.label).join(", ")} over time. Use left and right arrow keys to read values.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} strokeWidth={1} />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-tick">{formatCompact(t)}</text>
              </g>
            ))}
            {labels.map((l, i) => (i % labelEvery === 0 || i === n - 1) && (n - 1 - i >= labelEvery / 2 || i === n - 1) ? (
              <text key={l} x={cx(i)} y={height - 6} textAnchor="middle" className="viz-tick">{formatBucket(l, bucket)}</text>
            ) : null)}

            {kind === "stacked" && hover !== null && (
              <rect x={m.left + band * hover} y={m.top} width={band} height={plotH} fill="rgba(15,23,42,0.04)" />
            )}

            {kind === "stacked" && labels.map((l, i) => {
              let base = 0;
              const nonZero = series.filter((s) => (s.values[i] ?? 0) > 0);
              const topKey = nonZero[nonZero.length - 1]?.key;
              return (
                <g key={l}>
                  {series.map((s) => {
                    const v = s.values[i] ?? 0;
                    if (v <= 0) return null;
                    const y1 = y(base);
                    const y0 = y(base + v);
                    const isBottom = base === 0;
                    base += v;
                    // 2px surface gap between stacked segments
                    const top = y0 + (s.key === topKey ? 0 : 1);
                    const bottom = y1 - (isBottom ? 0 : 1);
                    const h = Math.max(0.5, bottom - top);
                    const x = cx(i) - barW / 2;
                    return s.key === topKey
                      ? <path key={s.key} d={topRoundedRect(x, top, barW, h, 4)} fill={s.color} />
                      : <rect key={s.key} x={x} y={top} width={barW} height={h} fill={s.color} />;
                  })}
                </g>
              );
            })}

            {kind === "line" && series.map((s) => {
              const d = s.values.map((v, i) => `${i ? "L" : "M"}${cx(i)},${y(v)}`).join("");
              const last = s.values.length - 1;
              return (
                <g key={s.key}>
                  {series.length === 1 && (
                    <path d={`${d}L${cx(last)},${y(0)}L${cx(0)},${y(0)}Z`} fill={s.color} opacity={0.1} />
                  )}
                  <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {last >= 0 && <circle cx={cx(last)} cy={y(s.values[last])} r={4} fill={s.color} stroke={VIZ.surface} strokeWidth={2} />}
                  {hover !== null && <circle cx={cx(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke={VIZ.surface} strokeWidth={2} />}
                </g>
              );
            })}
            {kind === "line" && hover !== null && (
              <line x1={cx(hover)} x2={cx(hover)} y1={m.top} y2={m.top + plotH} stroke={VIZ.muted} strokeWidth={1} />
            )}

            {empty && <text x={m.left + plotW / 2} y={m.top + plotH / 2} textAnchor="middle" className="viz-empty">No data in this period</text>}

            <rect x={m.left} y={m.top} width={plotW} height={plotH} fill="transparent"
              onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
          </svg>
        )}
        {hover !== null && labels[hover] && (
          <div className="viz-tooltip" style={{ left: tooltipLeft }}>
            <div className="viz-tooltip-title">{formatBucket(labels[hover], bucket, true)}</div>
            {series.map((s) => (
              <div key={s.key} className="viz-tooltip-row">
                <span className="viz-key-line" style={{ background: s.color }} />
                <strong>{formatValue(s.values[hover] ?? 0)}</strong>
                <span>{s.label}</span>
              </div>
            ))}
            {kind === "stacked" && series.length > 1 && (
              <div className="viz-tooltip-row viz-tooltip-total"><strong>{formatValue(totals[hover])}</strong><span>Total</span></div>
            )}
          </div>
        )}
      </div>
      <button type="button" className="viz-table-toggle" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
        {showTable ? "Hide table" : "View as table"}
      </button>
      {showTable && (
        <div className="viz-table-wrap">
          <table className="viz-table">
            <thead>
              <tr><th>{bucket === "hour" ? "Hour" : "Day"}</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}{kind === "stacked" && series.length > 1 && <th>Total</th>}</tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l}>
                  <td>{formatBucket(l, bucket, true)}</td>
                  {series.map((s) => <td key={s.key}>{formatValue(s.values[i] ?? 0)}</td>)}
                  {kind === "stacked" && series.length > 1 && <td>{formatValue(totals[i])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Ranked horizontal bars as plain HTML: label, bar, value, share
export function BarList({ items, color = VIZ.series1, max = 8, formatLabel, emptyText = "No data yet", onSelect }: {
  items: { label: string; count: number; hint?: ReactNode }[];
  color?: string;
  max?: number;
  formatLabel?: (label: string) => ReactNode;
  emptyText?: string;
  onSelect?: (label: string) => void;
}) {
  if (items.length === 0) return <p className="viz-empty-text">{emptyText}</p>;
  const shown = items.slice(0, max);
  const total = items.reduce((s, i) => s + i.count, 0);
  const top = Math.max(...shown.map((i) => i.count), 1);
  return (
    <ul className="barlist">
      {shown.map((item) => {
        const content = (
          <>
            <span className="barlist-label">{formatLabel ? formatLabel(item.label) : item.label}{item.hint}</span>
            <span className="barlist-track"><span className="barlist-fill" style={{ width: `${(item.count / top) * 100}%`, background: color }} /></span>
            <span className="barlist-value">{formatCount(item.count)}</span>
            <span className="barlist-share">{total ? Math.round((item.count / total) * 100) : 0}%</span>
          </>
        );
        return (
          <li key={item.label} title={`${item.label}: ${formatCount(item.count)}`}>
            {onSelect ? <button type="button" className="barlist-row" onClick={() => onSelect(item.label)}>{content}</button> : <div className="barlist-row">{content}</div>}
          </li>
        );
      })}
    </ul>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Weekday x hour grid on the sequential blue ramp
export function Heatmap({ cells, unit = "views" }: { cells: { weekday: number; hour: number; count: number }[]; unit?: string }) {
  const [hover, setHover] = useState<{ weekday: number; hour: number; count: number } | null>(null);
  const grid = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.count]));
  const max = Math.max(0, ...cells.map((c) => c.count));
  const shade = (count: number) => (count === 0 || max === 0 ? "#f1f5f9" : VIZ.ramp[Math.min(VIZ.ramp.length - 1, Math.floor((count / max) * (VIZ.ramp.length - 1) + 0.0001))]);
  const peak = cells.reduce<typeof cells[number] | null>((best, c) => (!best || c.count > best.count ? c : best), null);
  const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div className="heatmap">
      <div className="heatmap-grid" role="img" aria-label={peak && peak.count ? `Busiest time: ${WEEKDAYS[peak.weekday]} ${hourLabel(peak.hour)} with ${peak.count} ${unit}` : "No traffic in this period"}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="heatmap-hour">{h % 3 === 0 ? h : ""}</span>)}
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="heatmap-row">
            <span className="heatmap-day">{WEEKDAYS[d]}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const count = grid.get(`${d}-${h}`) ?? 0;
              return (
                <span key={h} className="heatmap-cell" style={{ background: shade(count) }}
                  onPointerEnter={() => setHover({ weekday: d, hour: h, count })} onPointerLeave={() => setHover(null)} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-foot">
        <span className="heatmap-readout">
          {hover ? <><strong>{formatCount(hover.count)}</strong> {unit} · {WEEKDAYS[hover.weekday]} {hourLabel(hover.hour)}</>
            : peak && peak.count ? <>Busiest: <strong>{WEEKDAYS[peak.weekday]} {hourLabel(peak.hour)}</strong> ({formatCount(peak.count)} {unit})</>
            : "No traffic in this period"}
        </span>
        <span className="heatmap-scale">Less {VIZ.ramp.filter((_, i) => i % 2 === 0).map((c) => <i key={c} style={{ background: c }} />)} More</span>
      </div>
    </div>
  );
}

// 12-ish point trend line for stat tiles: history in gray, the latest point in the accent
export function Sparkline({ values, color = VIZ.series1 }: { values: number[]; color?: string }) {
  const w = 96, h = 28, pad = 3;
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const last = values.length - 1;
  return (
    <svg width={w} height={h} className="sparkline" aria-hidden="true">
      <path d={d} fill="none" stroke={VIZ.axis} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill={color} />
    </svg>
  );
}
