// Shared number/time formatting for analytics screens

const compactFmt = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("en-IN");

export const formatCount = (n: number) => (Math.abs(n) >= 10000 ? compactFmt.format(n) : intFmt.format(Math.round(n)));
export const formatCompact = (n: number) => (Math.abs(n) >= 1000 ? compactFmt.format(n) : intFmt.format(Math.round(n)));
export const formatPercent = (n: number, digits = 1) => `${n.toFixed(n >= 99.95 || n === 0 ? 0 : digits)}%`;
export const formatMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} s` : `${Math.round(n)} ms`);

// Server timestamps are local wall-clock strings without a zone, e.g. 2026-10-19T14:00:00
export const parseLocal = (s: string) => new Date(s.includes("T") ? s : s.replace(" ", "T"));

export function formatBucket(s: string, bucket: "hour" | "day", long = false) {
  const d = parseLocal(s);
  if (bucket === "hour") {
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return long ? `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}` : time;
  }
  return d.toLocaleDateString("en-IN", long ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

export function formatDateTime(s: string) {
  return parseLocal(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function timeAgo(s: string) {
  const diff = (Date.now() - parseLocal(s).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)} d ago`;
  return formatDateTime(s);
}

// Round an axis maximum up to 1/2/2.5/5 x 10^n so ticks land on clean numbers
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const niceStep = step < 1 && max >= ticks ? 1 : step;
  return { max: Math.ceil(max / niceStep) * niceStep, step: niceStep };
}
