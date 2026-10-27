import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { ADMIN_API_EVENTS } from "../../api/queries";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime, formatMs, timeAgo } from "../../components/charts/format";
import { API_STATUS, LOG_RANGE_OPTIONS, downloadCsv } from "../../lib/analytics";

const PAGE_SIZE = 50;
const LIVE_MS = 10_000;
const DEFAULTS = { range: "24h", status: "", type: "", operation: "", q: "", page: "1" };
type Filters = typeof DEFAULTS;

interface ApiEventRow {
  id: number; operationName: string; operationType: string; fields: string[]; status: string; errorMessage: string | null;
  errorCode: string | null; durationMs: number; userUuid: string | null; userEmail: string | null; role: string | null;
  ip: string | null; userAgent: string | null; createdAt: string;
}

export function StatusPill({ status }: { status: string }) {
  const s = API_STATUS[status] ?? { label: status, icon: "•" };
  return <span className={`status-pill status-${status}`}><span aria-hidden="true">{s.icon}</span> {s.label}</span>;
}

export function AdminApiLogsPage() {
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, params.get(k) ?? d])) as Filters;
  const page = Math.max(1, Number(f.page) || 1);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<ApiEventRow | null>(null);
  const [search, setSearch] = useState(f.q);

  const setFilters = (patch: Partial<Filters>) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    // Any filter change goes back to the first page
    if (!("page" in patch)) next.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === DEFAULTS[key as keyof Filters]) next.delete(key); else next.set(key, value);
    }
    return next;
  }, { replace: true });

  // Search is applied after typing pauses
  useEffect(() => {
    if (search === f.q) return;
    const t = setTimeout(() => setFilters({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, previousData, loading, refetch } = useQuery<any>(ADMIN_API_EVENTS, {
    variables: {
      filter: {
        range: f.range, status: f.status || null, operationType: f.type || null, operationName: f.operation || null,
        search: f.q || null, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      },
    },
    pollInterval: live ? LIVE_MS : 0,
    notifyOnNetworkStatusChange: true,
  });
  const res = (data ?? previousData)?.adminApiEvents;
  const rows: ApiEventRow[] = res?.data ?? [];
  const total: number = res?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const operations: string[] = res?.operations ?? [];
  const activeFilters = (["status", "type", "operation", "q"] as (keyof Filters)[]).filter((k) => f[k]).length;

  const exportCsv = () => downloadCsv(`api-log-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Time", "Operation", "Type", "Status", "Duration ms", "Error code", "Error", "User", "Role", "IP", "User agent"],
    rows.map((r) => [r.createdAt, r.operationName, r.operationType, r.status, r.durationMs, r.errorCode, r.errorMessage, r.userEmail, r.role, r.ip, r.userAgent]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>API Logs</h1>
          <p className="text-muted">Every GraphQL request with its outcome, duration and caller. Rejected = the API answered with status 0 (e.g. wrong password); Error = the request threw.</p>
        </div>
        <div className="log-actions">
          <label className="dash-auto"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Live (every 10 s)</label>
          <button className="btn btn-sm btn-secondary" onClick={() => refetch()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button>
        </div>
      </div>

      <div className="log-filters">
        <input type="search" placeholder="Search operation, error, user or IP" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select value={f.range} onChange={(e) => setFilters({ range: e.target.value })} aria-label="Time range">
          {LOG_RANGE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select value={f.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Status">
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="issues">Rejected or error</option>
          <option value="failed">Rejected only</option>
          <option value="error">Errors only</option>
        </select>
        <select value={f.type} onChange={(e) => setFilters({ type: e.target.value })} aria-label="Type">
          <option value="">All types</option>
          <option value="query">Queries (reads)</option>
          <option value="mutation">Mutations (writes)</option>
        </select>
        <select value={f.operation} onChange={(e) => setFilters({ operation: e.target.value })} aria-label="Operation">
          <option value="">All operations</option>
          {f.operation && !operations.includes(f.operation) && <option value={f.operation}>{f.operation}</option>}
          {operations.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="tpl-filter-summary">
        <span className="text-muted">{formatCountText(total)} request{total === 1 ? "" : "s"}{live && " · live"}</span>
        {activeFilters > 0 && <button className="btn btn-sm btn-secondary" onClick={() => { setSearch(""); setParams(f.range === DEFAULTS.range ? {} : { range: f.range }, { replace: true }); }}>Clear filters</button>}
      </div>

      {!res && loading ? <p className="text-muted">Loading…</p> : rows.length === 0 ? (
        <p className="empty-state">No requests match these filters.</p>
      ) : (
        <div className={`table-wrapper${loading ? " dash-stale" : ""}`}>
          <table className="data-table log-table">
            <thead>
              <tr><th>Time</th><th>Operation</th><th>Status</th><th className="num">Duration</th><th>User</th><th>IP</th><th>Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                  <td title={formatDateTime(r.createdAt)}>{timeAgo(r.createdAt)}</td>
                  <td><span className={`op-type op-${r.operationType}`}>{r.operationType === "mutation" ? "M" : r.operationType === "query" ? "Q" : "?"}</span>{r.operationName}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td className={`num${r.durationMs >= 1000 ? " text-warning-strong" : ""}`}>{formatMs(r.durationMs)}</td>
                  <td>{r.userEmail ?? <span className="text-muted">Guest</span>}</td>
                  <td className="muted-cell">{r.ip ?? "—"}</td>
                  <td className="log-detail-cell">{r.errorMessage ?? <span className="text-muted">{r.fields.join(", ")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setFilters({ page: String(page - 1) })}>← Newer</button>
          <span className="text-muted">Page {page} of {pages}</span>
          <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setFilters({ page: String(page + 1) })}>Older →</button>
        </div>
      )}

      <Modal title={selected ? `${selected.operationName} · #${selected.id}` : ""} isOpen={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <dl className="log-details">
            <dt>Status</dt><dd><StatusPill status={selected.status} />{selected.errorCode && <code className="log-code">{selected.errorCode}</code>}</dd>
            {selected.errorMessage && <><dt>Message</dt><dd className="log-message">{selected.errorMessage}</dd></>}
            <dt>Time</dt><dd>{formatDateTime(selected.createdAt)}</dd>
            <dt>Type</dt><dd>{selected.operationType}</dd>
            <dt>Fields</dt><dd><code>{selected.fields.join(", ") || "—"}</code></dd>
            <dt>Duration</dt><dd>{formatMs(selected.durationMs)}</dd>
            <dt>User</dt><dd>{selected.userEmail ? `${selected.userEmail} (${selected.role})` : "Guest (not signed in)"}</dd>
            <dt>IP address</dt><dd>{selected.ip ?? "—"}</dd>
            <dt>Browser</dt><dd className="log-message">{selected.userAgent ?? "—"}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

const formatCountText = (n: number) => new Intl.NumberFormat("en-IN").format(n);
