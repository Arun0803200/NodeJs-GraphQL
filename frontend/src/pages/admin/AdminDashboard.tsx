import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { ADMIN_ACTIVITY_LOGS, ADMIN_ANALYTICS } from "../../api/queries";
import { StatTile } from "../../components/analytics/StatTile";
import { BarList, Heatmap, TimeChart } from "../../components/charts/Charts";
import { VIZ } from "../../components/charts/tokens";
import { formatCompact, formatCount, formatMs, formatPercent, timeAgo } from "../../components/charts/format";
import { ACTIVITY_CATEGORIES, API_STATUS, PAGE_TYPES, RANGE_OPTIONS, capitalize, humanizeAction } from "../../lib/analytics";

type OpsView = "calls" | "errors" | "slowest";
type AudienceView = "devices" | "browsers" | "operatingSystems";

const REFRESH_MS = 60_000;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const range = RANGE_OPTIONS.some((r) => r.key === params.get("range")) ? params.get("range")! : "7d";
  const rangeInfo = RANGE_OPTIONS.find((r) => r.key === range)!;
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [opsView, setOpsView] = useState<OpsView>("calls");
  const [audienceView, setAudienceView] = useState<AudienceView>("devices");

  const { data, previousData, loading, error, refetch } = useQuery<any>(ADMIN_ANALYTICS, {
    variables: { range },
    pollInterval: autoRefresh ? REFRESH_MS : 0,
    notifyOnNetworkStatusChange: true,
  });
  const { data: activityData, refetch: refetchActivity } = useQuery<any>(ADMIN_ACTIVITY_LOGS, {
    variables: { filter: { range: "all", limit: 8 } },
    pollInterval: autoRefresh ? REFRESH_MS : 0,
  });

  // Keep showing the last result while a new range loads, so the layout never jumps
  const response = (data ?? previousData)?.adminAnalytics;
  const a = response?.data;
  const stale = loading && !!a;

  // Each new result object marks a completed fetch
  const updatedAt = useMemo(() => (data ? new Date() : null), [data]);

  const series = useMemo(() => {
    const s = a?.series ?? [];
    const pick = (k: string) => s.map((p: any) => p[k] as number);
    return {
      labels: s.map((p: any) => p.bucket as string),
      apiSuccess: pick("apiSuccess"), apiFailed: pick("apiFailed"), apiErrors: pick("apiErrors"),
      apiTotal: s.map((p: any) => p.apiSuccess + p.apiFailed + p.apiErrors),
      avgLatency: pick("avgLatencyMs"), p95Latency: pick("p95LatencyMs"),
      pageViews: pick("pageViews"), visitors: pick("visitors"),
      newUsers: pick("newUsers"), logins: pick("logins"),
    };
  }, [a]);

  const operations = useMemo(() => {
    const ops = [...(a?.operations ?? [])];
    if (opsView === "errors") return ops.filter((o) => o.failed + o.errors > 0).sort((x, y) => (y.failed + y.errors) - (x.failed + x.errors)).slice(0, 10);
    if (opsView === "slowest") return ops.sort((x, y) => y.p95Ms - x.p95Ms).slice(0, 10);
    return ops.slice(0, 10);
  }, [a, opsView]);

  const refresh = () => { refetch(); refetchActivity(); };
  const setRange = (key: string) => setParams(key === "7d" ? {} : { range: key }, { replace: true });

  if (!a) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        {loading ? <p className="text-muted">Loading analytics…</p> : <p className="text-muted">{error?.message || response?.message || "Failed to load analytics"}</p>}
      </div>
    );
  }

  const k = a.kpis;
  const t = a.totals;
  const bucket = a.bucket as "hour" | "day";
  const period = rangeInfo.period;
  const issues = k.apiErrors.current + k.apiFailed.current;
  const activities: any[] = activityData?.adminActivityLogs?.data ?? [];
  const pagesPerSession = k.sessions.current ? k.pageViews.current / k.sessions.current : 0;
  const audience = { devices: a.devices, browsers: a.browsers, operatingSystems: a.operatingSystems }[audienceView];

  return (
    <div className="page dash">
      <div className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Platform health, site traffic and activity{updatedAt && <> · updated {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</>}</p>
        </div>
        <div className="dash-controls">
          <div className="dash-range" role="group" aria-label="Date range">
            {RANGE_OPTIONS.map((r) => (
              <button key={r.key} className={r.key === range ? "active" : ""} onClick={() => setRange(r.key)} aria-pressed={r.key === range}>{r.label}</button>
            ))}
          </div>
          <label className="dash-auto"><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
          <button className="btn btn-sm btn-secondary" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </div>

      {(k.apiErrors.current > 0 || t.pendingApprovals > 0 || k.failedLogins.current >= 5) && (
        <div className="dash-attention">
          {k.apiErrors.current > 0 && (
            <Link to={`/admin/api-logs?status=error&range=${range}`} className="attention attention-critical">
              <span aria-hidden="true">✕</span> {formatCount(k.apiErrors.current)} API error{k.apiErrors.current === 1 ? "" : "s"} in the last {rangeInfo.label} — view log
            </Link>
          )}
          {t.pendingApprovals > 0 && (
            <Link to="/admin/approvals" className="attention attention-warning">
              <span aria-hidden="true">!</span> {t.pendingApprovals} website{t.pendingApprovals === 1 ? "" : "s"} waiting for approval — review
            </Link>
          )}
          {k.failedLogins.current >= 5 && (
            <Link to={`/admin/activity?action=login&status=failed&range=${range}`} className="attention attention-warning">
              <span aria-hidden="true">!</span> {k.failedLogins.current} failed sign-in attempts — check activity
            </Link>
          )}
        </div>
      )}

      <div className={`dash-body${stale ? " dash-stale" : ""}`}>
        <section className="stat-grid" aria-label="Key metrics">
          <StatTile label="API requests" pair={k.apiCalls} format={formatCompact} goodWhen="neutral" periodLabel={period} trend={series.apiTotal} to={`/admin/api-logs?range=${range}`}
            sub={<>{formatCount(k.mutations.current)} writes · {formatCount(k.signedInUsers.current)} signed-in users</>} />
          <StatTile label="Success rate" pair={k.successRate} format={(n) => formatPercent(n)} points periodLabel={period}
            sub={<>{formatCount(k.apiSuccess.current)} of {formatCount(k.apiCalls.current)} succeeded</>} />
          <StatTile label="Failed requests" pair={{ current: issues, previous: k.apiErrors.previous + k.apiFailed.previous }} format={formatCount} goodWhen="down" periodLabel={period}
            to={`/admin/api-logs?status=issues&range=${range}`}
            sub={<><span className="dot dot-critical" /> {formatCount(k.apiErrors.current)} error{k.apiErrors.current === 1 ? "" : "s"} · <span className="dot dot-warning" /> {formatCount(k.apiFailed.current)} rejected</>} />
          <StatTile label="Response time (p95)" pair={k.p95LatencyMs} format={formatMs} goodWhen="down" periodLabel={period} trend={series.p95Latency}
            sub={<>Average {formatMs(k.avgLatencyMs.current)}</>} />
          <StatTile label="Visitors" pair={k.visitors} format={formatCompact} periodLabel={period} trend={series.visitors}
            sub={<>{formatCount(k.newVisitors.current)} first-time visitors</>} />
          <StatTile label="Page views" pair={k.pageViews} format={formatCompact} periodLabel={period} trend={series.pageViews}
            sub={<>{pagesPerSession.toFixed(1)} pages per visit</>} />
          <StatTile label="New users" pair={k.newUsers} format={formatCount} periodLabel={period} trend={series.newUsers} to="/admin/users"
            sub={<>{formatCount(t.totalUsers)} users in total</>} />
          <StatTile label="Sign-ins" pair={k.logins} format={formatCount} goodWhen="neutral" periodLabel={period} trend={series.logins}
            to={`/admin/activity?action=login&range=${range}`}
            sub={<>{formatCount(k.failedLogins.current)} failed attempts</>} />
        </section>

        <div className="dash-grid dash-grid-2-1">
          <section className="dash-card">
            <header className="dash-card-head">
              <div><h2>API traffic</h2><p>Requests per {bucket} by outcome</p></div>
              <Link to={`/admin/api-logs?range=${range}`} className="dash-link">API log →</Link>
            </header>
            <TimeChart kind="stacked" bucket={bucket} labels={series.labels} series={[
              { key: "success", label: "Success", color: VIZ.good, values: series.apiSuccess },
              { key: "failed", label: "Rejected (status 0)", color: VIZ.warning, values: series.apiFailed },
              { key: "error", label: "Error", color: VIZ.critical, values: series.apiErrors },
            ]} />
          </section>
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Response time</h2><p>Milliseconds per {bucket}</p></div></header>
            <TimeChart kind="line" bucket={bucket} labels={series.labels} formatValue={formatMs} height={220} series={[
              { key: "avg", label: "Average", color: VIZ.series1, values: series.avgLatency },
              { key: "p95", label: "95th percentile", color: VIZ.series2, values: series.p95Latency },
            ]} />
          </section>
        </div>

        <div className="dash-grid dash-grid-2-1">
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Site traffic</h2><p>Public pages: storefront, builder and portfolios</p></div></header>
            <TimeChart kind="line" bucket={bucket} labels={series.labels} series={[
              { key: "views", label: "Page views", color: VIZ.series1, values: series.pageViews },
              { key: "visitors", label: "Visitors", color: VIZ.series2, values: series.visitors },
            ]} />
          </section>
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Visits</h2><p>How people use the site</p></div></header>
            <dl className="mini-stats">
              <div><dt>Visits</dt><dd>{formatCount(k.sessions.current)}</dd></div>
              <div><dt>Pages per visit</dt><dd>{pagesPerSession.toFixed(1)}</dd></div>
              <div><dt>Single-page visits</dt><dd>{formatPercent(k.bounceRate.current, 0)}</dd></div>
              <div><dt>First-time visitors</dt><dd>{formatCount(k.newVisitors.current)}</dd></div>
              <div><dt>Websites submitted</dt><dd>{formatCount(k.siteSubmissions.current)}</dd></div>
              <div><dt>Websites published</dt><dd>{formatCount(k.sitesPublished.current)}</dd></div>
              <div><dt>Contact messages</dt><dd>{formatCount(k.contactMessages.current)}</dd></div>
              <div><dt>New accounts</dt><dd>{formatCount(k.newUsers.current)}</dd></div>
            </dl>
          </section>
        </div>

        <div className="dash-grid dash-grid-2-1">
          <section className="dash-card">
            <header className="dash-card-head">
              <div><h2>API operations</h2><p>Per GraphQL operation in this period</p></div>
              <div className="dash-tabs" role="tablist">
                {([["calls", "Most called"], ["errors", "Most failures"], ["slowest", "Slowest"]] as [OpsView, string][]).map(([key, label]) => (
                  <button key={key} role="tab" aria-selected={opsView === key} className={opsView === key ? "active" : ""} onClick={() => setOpsView(key)}>{label}</button>
                ))}
              </div>
            </header>
            {operations.length === 0 ? <p className="viz-empty-text">{opsView === "errors" ? "No failed operations in this period." : "No API calls in this period."}</p> : (
              <div className="table-wrapper">
                <table className="data-table dash-table">
                  <thead><tr><th>Operation</th><th className="num">Calls</th><th className="num">Failed</th><th className="num">Success</th><th className="num">Avg</th><th className="num">p95</th><th>Last call</th></tr></thead>
                  <tbody>
                    {operations.map((o: any) => {
                      const bad = o.failed + o.errors;
                      const rate = o.calls ? (100 * (o.calls - bad)) / o.calls : 100;
                      return (
                        <tr key={`${o.operationName}-${o.operationType}`} className="clickable" onClick={() => navigate(`/admin/api-logs?operation=${encodeURIComponent(o.operationName)}&range=${range}`)}>
                          <td><span className={`op-type op-${o.operationType}`}>{o.operationType === "mutation" ? "M" : o.operationType === "query" ? "Q" : "?"}</span>{o.operationName}</td>
                          <td className="num">{formatCount(o.calls)}</td>
                          <td className="num">{bad ? <span className="text-critical">{formatCount(bad)}</span> : "—"}</td>
                          <td className="num">{formatPercent(rate, 0)}</td>
                          <td className="num">{formatMs(o.avgMs)}</td>
                          <td className="num">{formatMs(o.p95Ms)}</td>
                          <td className="muted-cell">{timeAgo(o.lastCalledAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="dash-card">
            <header className="dash-card-head">
              <div><h2>Top errors</h2><p>Most frequent failures</p></div>
              <Link to={`/admin/api-logs?status=issues&range=${range}`} className="dash-link">All →</Link>
            </header>
            {a.topErrors.length === 0 ? <p className="viz-empty-text">✓ No failed requests in this period.</p> : (
              <ul className="error-list">
                {a.topErrors.map((e: any, i: number) => (
                  <li key={i}>
                    <Link to={`/admin/api-logs?operation=${encodeURIComponent(e.operationName)}&status=${e.status}&range=${range}`}>
                      <span className={`status-pill status-${e.status}`}><span aria-hidden="true">{API_STATUS[e.status]?.icon}</span> {API_STATUS[e.status]?.label ?? e.status}</span>
                      <strong className="error-op">{e.operationName}</strong>
                      <span className="error-count">×{formatCount(e.count)}</span>
                      <span className="error-msg">{e.message}</span>
                      <span className="error-when">{timeAgo(e.lastSeenAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="dash-grid dash-grid-3">
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Top pages</h2><p>Views on public pages</p></div></header>
            <BarList items={a.topPages.map((p: any) => ({ label: p.path, count: p.views, hint: <small className="barlist-hint">{PAGE_TYPES[p.pageType] ?? p.pageType}</small> }))}
              formatLabel={(l) => <a href={l} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{l}</a>} />
          </section>
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Traffic sources</h2><p>Where visits came from</p></div></header>
            <BarList items={a.referrers} />
            <h3 className="dash-subhead">Sections</h3>
            <BarList items={a.pageTypes} formatLabel={(l) => PAGE_TYPES[l] ?? capitalize(l)} max={6} />
          </section>
          <section className="dash-card">
            <header className="dash-card-head">
              <div><h2>Audience</h2><p>Visitors' devices</p></div>
              <div className="dash-tabs" role="tablist">
                {([["devices", "Device"], ["browsers", "Browser"], ["operatingSystems", "OS"]] as [AudienceView, string][]).map(([key, label]) => (
                  <button key={key} role="tab" aria-selected={audienceView === key} className={audienceView === key ? "active" : ""} onClick={() => setAudienceView(key)}>{label}</button>
                ))}
              </div>
            </header>
            <BarList items={audience} formatLabel={capitalize} />
          </section>
        </div>

        <div className="dash-grid dash-grid-1-1">
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Busiest times</h2><p>Page views by weekday and hour</p></div></header>
            <Heatmap cells={a.busiestTimes} unit="page views" />
          </section>
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Sign-ups and sign-ins</h2><p>Accounts created and successful logins per {bucket}</p></div></header>
            <TimeChart kind="line" bucket={bucket} labels={series.labels} height={200} series={[
              { key: "signups", label: "New accounts", color: VIZ.series1, values: series.newUsers },
              { key: "logins", label: "Sign-ins", color: VIZ.series2, values: series.logins },
            ]} />
          </section>
        </div>

        <div className="dash-grid dash-grid-2-1">
          <section className="dash-card">
            <header className="dash-card-head">
              <div><h2>Recent activity</h2><p>Latest changes across the platform</p></div>
              <Link to="/admin/activity" className="dash-link">Activity log →</Link>
            </header>
            {activities.length === 0 ? <p className="viz-empty-text">No activity recorded yet.</p> : (
              <ul className="activity-feed">
                {activities.map((l) => (
                  <li key={l.id}>
                    <span className={`activity-dot status-dot-${l.status}`} aria-hidden="true" />
                    <div className="activity-main">
                      <div><strong>{l.actorEmail ?? "Visitor"}</strong> <span className="text-muted">{humanizeAction(l.action).toLowerCase()}</span>{l.target && <> · <code>{l.target}</code></>}</div>
                      <small className="text-muted">
                        {ACTIVITY_CATEGORIES[l.category] ?? l.category}
                        {l.status !== "success" && <> · <span className={`text-${l.status === "error" ? "critical" : "warning"}`}>{API_STATUS[l.status]?.label}: {l.message}</span></>}
                      </small>
                    </div>
                    <time className="activity-time" dateTime={l.createdAt}>{timeAgo(l.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="dash-card">
            <header className="dash-card-head"><div><h2>Activity by area</h2><p>Changes in this period</p></div></header>
            <BarList items={a.activityByCategory} formatLabel={(l) => ACTIVITY_CATEGORIES[l] ?? capitalize(l)}
              onSelect={(l) => navigate(`/admin/activity?category=${l}&range=${range}`)} />
            <h3 className="dash-subhead">Most active people</h3>
            <BarList items={a.topActors} max={5} emptyText="Nobody yet" />
          </section>
        </div>

        <section className="dash-card">
          <header className="dash-card-head"><div><h2>Platform</h2><p>Current totals</p></div></header>
          <div className="totals-grid">
            <Link to="/admin/users" className="total"><strong>{formatCount(t.totalUsers)}</strong><span>Users</span><small>{formatCount(t.activeAccounts)} active · {t.admins} admin{t.admins === 1 ? "" : "s"}</small></Link>
            <Link to="/admin/templates" className="total"><strong>{formatCount(t.activeTemplates)}</strong><span>Live templates</span><small>{formatCount(t.totalTemplates)} in total</small></Link>
            <Link to="/admin/approvals" className="total"><strong>{formatCount(t.publishedSites)}</strong><span>Published websites</span><small>{t.pendingApprovals} waiting for approval</small></Link>
            <div className="total"><strong>{formatCount(t.totalImages)}</strong><span>Images</span><small>Uploaded by users</small></div>
            <Link to="/admin/messages" className="total"><strong>{formatCount(t.contactMessages)}</strong><span>Contact messages</span><small>{formatCount(k.contactMessages.current)} in the last {rangeInfo.label}</small></Link>
            <Link to="/admin/masters" className="total"><strong>{formatCount(t.masterValues)}</strong><span>Master values</span><small>Lookup list entries</small></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
