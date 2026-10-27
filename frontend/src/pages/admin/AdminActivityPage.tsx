import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { ADMIN_ACTIVITY_LOGS } from "../../api/queries";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime, timeAgo } from "../../components/charts/format";
import { ACTIVITY_CATEGORIES, LOG_RANGE_OPTIONS, downloadCsv, humanizeAction } from "../../lib/analytics";
import { StatusPill } from "./AdminApiLogsPage";

const PAGE_SIZE = 50;
const DEFAULTS = { range: "7d", category: "", status: "", action: "", q: "", page: "1" };
type Filters = typeof DEFAULTS;

interface ActivityRow {
  id: number; actorUuid: string | null; actorEmail: string | null; actorRole: string | null; action: string; category: string;
  status: string; message: string | null; target: string | null; metadata: Record<string, unknown> | null; ip: string | null; createdAt: string;
}

export function AdminActivityPage() {
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, params.get(k) ?? d])) as Filters;
  const page = Math.max(1, Number(f.page) || 1);
  const [selected, setSelected] = useState<ActivityRow | null>(null);
  const [search, setSearch] = useState(f.q);

  const setFilters = (patch: Partial<Filters>) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (!("page" in patch)) next.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === DEFAULTS[key as keyof Filters]) next.delete(key); else next.set(key, value);
    }
    return next;
  }, { replace: true });

  useEffect(() => {
    if (search === f.q) return;
    const t = setTimeout(() => setFilters({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, previousData, loading, refetch } = useQuery<any>(ADMIN_ACTIVITY_LOGS, {
    variables: {
      filter: {
        range: f.range, category: f.category || null, status: f.status || null, action: f.action || null,
        search: f.q || null, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      },
    },
    notifyOnNetworkStatusChange: true,
  });
  const res = (data ?? previousData)?.adminActivityLogs;
  const rows: ActivityRow[] = res?.data ?? [];
  const total: number = res?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const actions: string[] = res?.actions ?? [];
  const activeFilters = (["category", "status", "action", "q"] as (keyof Filters)[]).filter((k) => f[k]).length;

  const exportCsv = () => downloadCsv(`activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Time", "Actor", "Role", "Action", "Area", "Target", "Status", "Message", "IP", "Details"],
    rows.map((r) => [r.createdAt, r.actorEmail, r.actorRole, r.action, r.category, r.target, r.status, r.message, r.ip, r.metadata ? JSON.stringify(r.metadata) : ""]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p className="text-muted">Who changed what: every create, update, delete, sign-in and submission. Passwords and tokens are never stored.</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary" onClick={() => refetch()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button>
        </div>
      </div>

      <div className="log-filters">
        <input type="search" placeholder="Search person, action, target or message" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <select value={f.range} onChange={(e) => setFilters({ range: e.target.value })} aria-label="Time range">
          {LOG_RANGE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select value={f.category} onChange={(e) => setFilters({ category: e.target.value })} aria-label="Area">
          <option value="">All areas</option>
          {Object.entries(ACTIVITY_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={f.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Outcome">
          <option value="">All outcomes</option>
          <option value="success">Succeeded</option>
          <option value="issues">Rejected or error</option>
          <option value="failed">Rejected only</option>
          <option value="error">Errors only</option>
        </select>
        <select value={f.action} onChange={(e) => setFilters({ action: e.target.value })} aria-label="Action">
          <option value="">All actions</option>
          {f.action && !actions.includes(f.action) && <option value={f.action}>{humanizeAction(f.action)}</option>}
          {actions.map((a) => <option key={a} value={a}>{humanizeAction(a)}</option>)}
        </select>
      </div>
      <div className="tpl-filter-summary">
        <span className="text-muted">{new Intl.NumberFormat("en-IN").format(total)} event{total === 1 ? "" : "s"}</span>
        {activeFilters > 0 && <button className="btn btn-sm btn-secondary" onClick={() => { setSearch(""); setParams(f.range === DEFAULTS.range ? {} : { range: f.range }, { replace: true }); }}>Clear filters</button>}
      </div>

      {!res && loading ? <p className="text-muted">Loading…</p> : rows.length === 0 ? (
        <p className="empty-state">No activity matches these filters.</p>
      ) : (
        <div className={`table-wrapper${loading ? " dash-stale" : ""}`}>
          <table className="data-table log-table">
            <thead>
              <tr><th>Time</th><th>Person</th><th>Action</th><th>Area</th><th>Target</th><th>Outcome</th><th>Message</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                  <td title={formatDateTime(r.createdAt)}>{timeAgo(r.createdAt)}</td>
                  <td>
                    {r.actorUuid ? <Link to={`/admin/users/${r.actorUuid}`} onClick={(e) => e.stopPropagation()}>{r.actorEmail ?? r.actorUuid}</Link>
                      : r.actorEmail ?? <span className="text-muted">Visitor</span>}
                    {r.actorRole === "admin" && <span className="pill pill-system role-pill">Admin</span>}
                  </td>
                  <td>{humanizeAction(r.action)}</td>
                  <td className="muted-cell">{ACTIVITY_CATEGORIES[r.category] ?? r.category}</td>
                  <td>{r.target ? <code>{r.target}</code> : "—"}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td className="log-detail-cell">{r.message ?? "—"}</td>
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

      <Modal title={selected ? humanizeAction(selected.action) : ""} isOpen={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <dl className="log-details">
            <dt>Outcome</dt><dd><StatusPill status={selected.status} /></dd>
            {selected.message && <><dt>Message</dt><dd className="log-message">{selected.message}</dd></>}
            <dt>Time</dt><dd>{formatDateTime(selected.createdAt)}</dd>
            <dt>Person</dt><dd>{selected.actorEmail ?? "Visitor (not signed in)"}{selected.actorRole && ` · ${selected.actorRole}`}</dd>
            <dt>Area</dt><dd>{ACTIVITY_CATEGORIES[selected.category] ?? selected.category}</dd>
            <dt>Action</dt><dd><code>{selected.action}</code></dd>
            <dt>Target</dt><dd>{selected.target ? <code>{selected.target}</code> : "—"}</dd>
            <dt>IP address</dt><dd>{selected.ip ?? "—"}</dd>
            <dt>Details</dt><dd>{selected.metadata ? <pre className="log-json">{JSON.stringify(selected.metadata, null, 2)}</pre> : "—"}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}
