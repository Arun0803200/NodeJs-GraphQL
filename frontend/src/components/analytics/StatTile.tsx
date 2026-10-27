import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "../charts/Charts";

export interface Pair { current: number; previous: number }

interface Props {
  label: string;
  pair: Pair;
  format: (n: number) => string;
  // Which direction is good news; "neutral" shows the change without judging it
  goodWhen?: "up" | "down" | "neutral";
  // Compare as percentage points instead of relative change (for rates)
  points?: boolean;
  periodLabel: string;
  trend?: number[];
  sub?: ReactNode;
  to?: string;
}

export function StatTile({ label, pair, format, goodWhen = "up", points = false, periodLabel, trend, sub, to }: Props) {
  const { current, previous } = pair;
  const diff = current - previous;
  let deltaText: string | null = null;
  if (points) deltaText = `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} pts`;
  else if (previous > 0) deltaText = `${diff >= 0 ? "+" : "−"}${Math.abs((diff / previous) * 100).toFixed(Math.abs(diff / previous) < 0.1 ? 1 : 0)}%`;
  else if (current > 0) deltaText = "New";

  const flat = Math.abs(diff) < 1e-9;
  const tone = flat || goodWhen === "neutral" || deltaText === null ? "neutral"
    : (diff > 0) === (goodWhen === "up") ? "good" : "bad";
  const arrow = flat ? "→" : diff > 0 ? "▲" : "▼";

  const body = (
    <>
      <div className="stat-tile-head">
        <span className="stat-tile-label">{label}</span>
        {trend && <Sparkline values={trend} />}
      </div>
      <div className="stat-tile-value">{format(current)}</div>
      <div className="stat-tile-foot">
        {deltaText !== null ? (
          <span className={`stat-delta stat-delta-${tone}`} title={`Previous period: ${format(previous)}`}>
            <span aria-hidden="true">{arrow}</span> {flat ? "No change" : deltaText}
          </span>
        ) : <span className="stat-delta stat-delta-neutral">No earlier data</span>}
        <span className="stat-tile-period">vs {periodLabel}</span>
      </div>
      {sub && <div className="stat-tile-sub">{sub}</div>}
    </>
  );

  return to ? <Link to={to} className="stat-tile stat-tile-link">{body}</Link> : <div className="stat-tile">{body}</div>;
}
