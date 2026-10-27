import { Resolver, Query, Mutation, Arg, Authorized, Ctx } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { ActivityLog, ApiEvent, PageView } from "../../Entity/Analytics";
import type { AppContext } from "../../Middleware/authChecker";
import { pageTypeFor, parseUserAgent, referrerHost } from "../../Utils/analytics";
import { StatusResponse } from "../../Responses/StatusResponse";
import {
    ActivityLogFilter, ActivityLogListResponse, AnalyticsData, AnalyticsKpis, AnalyticsResponse, ApiEventFilter,
    ApiEventListResponse, LabelCount, MetricPair, PageViewInput, PlatformTotals,
} from "../../Responses/AnalyticsResponses";

// Dashboard ranges: bucket size and how many buckets (the last one is the current, partial bucket)
const RANGES: Record<string, { unit: "hour" | "day"; count: number }> = {
    "24h": { unit: "hour", count: 24 },
    "7d": { unit: "day", count: 7 },
    "30d": { unit: "day", count: 30 },
    "90d": { unit: "day", count: 90 },
};
// Look-back windows for the log screens
const LIST_RANGES: Record<string, string> = { "1h": "1 hour", "24h": "24 hours", "7d": "7 days", "30d": "30 days", "90d": "90 days" };

const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const TS = `'YYYY-MM-DD"T"HH24:MI:SS'`;
// Panel pages are app usage, not site traffic
const PUBLIC_PAGES = `page_type NOT IN ('admin', 'user')`;
const MAX_PAGE = 200;

const q = (sql: string, params: unknown[] = []): Promise<any[]> => AppDataSource.query(sql, params);
const num = (v: unknown) => Number(v ?? 0) || 0;
const pair = (current: unknown, previous: unknown): MetricPair => ({ current: num(current), previous: num(previous) });
const toCounts = (rows: any[]): LabelCount[] => rows.map((r) => ({ label: String(r.label), count: num(r.count) }));

// React StrictMode and quick re-renders can report the same page twice; ignore repeats within a few seconds
const recentViews = new Map<string, number>();
const DEDUPE_MS = 3000;

@Resolver()
export class AnalyticsResolver {

    // --- Public: page-view tracker called by the frontend on every route change ---

    @Mutation(() => StatusResponse)
    async trackPageView(@Arg("input") input: PageViewInput, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        try {
            if (!ID_PATTERN.test(input.visitorId) || !ID_PATTERN.test(input.sessionId)) return { status: 0, message: "Invalid visitor" };
            const path = (input.path || "/").split(/[?#]/)[0].slice(0, 300);
            const ua = parseUserAgent(ctx.userAgent);
            // Crawlers are not visitors
            if (ua.device === "bot") return { status: 1, message: "Ignored" };

            const key = `${input.visitorId}|${path}`;
            const now = Date.now();
            if (now - (recentViews.get(key) ?? 0) < DEDUPE_MS) return { status: 1, message: "Duplicate" };
            recentViews.set(key, now);
            if (recentViews.size > 5000) {
                for (const [k, at] of recentViews) if (now - at > DEDUPE_MS) recentViews.delete(k);
            }

            await AppDataSource.getRepository(PageView).insert({
                visitorId: input.visitorId,
                sessionId: input.sessionId,
                path,
                pageType: pageTypeFor(path),
                referrer: referrerHost(input.referrer, input.siteHost),
                ...ua,
                userUuid: ctx.user?.userUuid ?? null,
            });
            return { status: 1, message: "Tracked" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to track" };
        }
    }

    // --- Admin: dashboard ---

    @Authorized("admin")
    @Query(() => AnalyticsResponse)
    async adminAnalytics(@Arg("range", { defaultValue: "7d" }) range: string): Promise<AnalyticsResponse> {
        try {
            const { unit, count } = RANGES[range] ?? RANGES["7d"];
            const step = `1 ${unit}`;

            // Whole buckets ending with the current one; the previous period is the same length right before it
            const [w] = await q(`
                SELECT to_char(s, ${TS}) AS start, to_char(e, ${TS}) AS "end", to_char(s - (e - s), ${TS}) AS prev
                FROM (SELECT date_trunc($1, LOCALTIMESTAMP) - ($2::int - 1) * $3::interval AS s,
                             date_trunc($1, LOCALTIMESTAMP) + $3::interval AS e) x`, [unit, count, step]);
            const cur = [w.start, w.end];
            const prev = [w.prev, w.start];

            const apiSummary = (p: string[]) => q(`
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status = 'success') AS success,
                       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                       COUNT(*) FILTER (WHERE status = 'error') AS errors,
                       COUNT(*) FILTER (WHERE operation_type = 'mutation') AS mutations,
                       COALESCE(AVG(duration_ms), 0) AS avg_ms,
                       COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_ms,
                       COUNT(DISTINCT user_uuid) AS signed_in
                FROM tbl_api_events WHERE created_at >= $1::timestamp AND created_at < $2::timestamp`, p).then((r) => r[0]);

            const viewSummary = (p: string[]) => q(`
                WITH v AS (SELECT * FROM tbl_page_views WHERE created_at >= $1::timestamp AND created_at < $2::timestamp AND ${PUBLIC_PAGES}),
                     s AS (SELECT session_id, COUNT(*) AS c FROM v GROUP BY session_id)
                SELECT (SELECT COUNT(*) FROM v) AS views,
                       (SELECT COUNT(DISTINCT visitor_id) FROM v) AS visitors,
                       (SELECT COUNT(*) FROM s) AS sessions,
                       (SELECT COALESCE(100.0 * COUNT(*) FILTER (WHERE c = 1) / NULLIF(COUNT(*), 0), 0) FROM s) AS bounce,
                       (SELECT COUNT(*) FROM (SELECT visitor_id FROM tbl_page_views WHERE ${PUBLIC_PAGES} GROUP BY visitor_id
                               HAVING MIN(created_at) >= $1::timestamp AND MIN(created_at) < $2::timestamp) f) AS new_visitors`, p).then((r) => r[0]);

            const businessSummary = (p: string[]) => q(`
                SELECT (SELECT COUNT(*) FROM tbl_auth WHERE created_at >= $1::timestamp AND created_at < $2::timestamp) AS new_users,
                       (SELECT COUNT(*) FROM tbl_activity_logs WHERE action = 'login' AND status = 'success' AND created_at >= $1::timestamp AND created_at < $2::timestamp) AS logins,
                       (SELECT COUNT(*) FROM tbl_activity_logs WHERE action = 'login' AND status <> 'success' AND created_at >= $1::timestamp AND created_at < $2::timestamp) AS failed_logins,
                       (SELECT COUNT(*) FROM tbl_user_sites WHERE submitted_at >= $1::timestamp AND submitted_at < $2::timestamp) AS submissions,
                       (SELECT COUNT(*) FROM tbl_user_sites WHERE published_at >= $1::timestamp AND published_at < $2::timestamp) AS published,
                       (SELECT COUNT(*) FROM tbl_contact_us WHERE created_at >= $1::timestamp AND created_at < $2::timestamp) AS contacts`, p).then((r) => r[0]);

            const [
                apiNow, apiPrev, viewsNow, viewsPrev, bizNow, bizPrev, totalsRow,
                apiSeries, viewSeries, bizSeries, operations, topErrors, topPages,
                pageTypes, referrers, devices, browsers, operatingSystems, activityByCategory, topActors, busiestTimes,
            ] = await Promise.all([
                apiSummary(cur), apiSummary(prev), viewSummary(cur), viewSummary(prev), businessSummary(cur), businessSummary(prev),
                q(`SELECT (SELECT COUNT(*) FROM tbl_users) AS total_users,
                          (SELECT COUNT(*) FROM tbl_auth WHERE is_active) AS active_accounts,
                          (SELECT COUNT(*) FROM tbl_auth WHERE role = 'admin') AS admins,
                          (SELECT COUNT(*) FROM tbl_templates) AS total_templates,
                          (SELECT COUNT(*) FROM tbl_templates WHERE is_active) AS active_templates,
                          (SELECT COUNT(*) FROM tbl_user_sites WHERE is_published) AS published_sites,
                          (SELECT COUNT(*) FROM tbl_user_sites WHERE status = 'pending') AS pending,
                          (SELECT COUNT(*) FROM tbl_user_images) AS images,
                          (SELECT COUNT(*) FROM tbl_contact_us) AS contacts,
                          (SELECT COUNT(*) FROM tbl_master_values) AS master_values`).then((r) => r[0]),

                // Time series: every bucket is present, zero-filled
                q(`SELECT to_char(b, ${TS}) AS bucket,
                          COUNT(e.id) FILTER (WHERE e.status = 'success') AS success,
                          COUNT(e.id) FILTER (WHERE e.status = 'failed') AS failed,
                          COUNT(e.id) FILTER (WHERE e.status = 'error') AS errors,
                          COALESCE(AVG(e.duration_ms), 0) AS avg_ms,
                          COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY e.duration_ms), 0) AS p95_ms
                   FROM generate_series($1::timestamp, $2::timestamp - $3::interval, $3::interval) b
                   LEFT JOIN tbl_api_events e ON e.created_at >= b AND e.created_at < b + $3::interval
                   GROUP BY b ORDER BY b`, [...cur, step]),
                q(`SELECT to_char(b, ${TS}) AS bucket, COUNT(v.id) AS views, COUNT(DISTINCT v.visitor_id) AS visitors
                   FROM generate_series($1::timestamp, $2::timestamp - $3::interval, $3::interval) b
                   LEFT JOIN tbl_page_views v ON v.created_at >= b AND v.created_at < b + $3::interval AND v.${PUBLIC_PAGES}
                   GROUP BY b ORDER BY b`, [...cur, step]),
                q(`SELECT to_char(b, ${TS}) AS bucket,
                          (SELECT COUNT(*) FROM tbl_auth a WHERE a.created_at >= b AND a.created_at < b + $3::interval) AS new_users,
                          (SELECT COUNT(*) FROM tbl_activity_logs l WHERE l.action = 'login' AND l.status = 'success' AND l.created_at >= b AND l.created_at < b + $3::interval) AS logins
                   FROM generate_series($1::timestamp, $2::timestamp - $3::interval, $3::interval) b ORDER BY b`, [...cur, step]),

                q(`SELECT operation_name, operation_type, COUNT(*) AS calls,
                          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                          COUNT(*) FILTER (WHERE status = 'error') AS errors,
                          AVG(duration_ms) AS avg_ms,
                          percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
                          to_char(MAX(created_at), ${TS}) AS last_at
                   FROM tbl_api_events WHERE created_at >= $1::timestamp AND created_at < $2::timestamp
                   GROUP BY operation_name, operation_type ORDER BY calls DESC LIMIT 50`, cur),
                q(`SELECT operation_name, status, COALESCE(error_message, 'Unknown error') AS message, COUNT(*) AS count,
                          to_char(MAX(created_at), ${TS}) AS last_at
                   FROM tbl_api_events WHERE status <> 'success' AND created_at >= $1::timestamp AND created_at < $2::timestamp
                   GROUP BY operation_name, status, error_message ORDER BY count DESC, last_at DESC LIMIT 10`, cur),
                q(`SELECT path, page_type, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
                   FROM tbl_page_views WHERE created_at >= $1::timestamp AND created_at < $2::timestamp AND ${PUBLIC_PAGES}
                   GROUP BY path, page_type ORDER BY views DESC LIMIT 10`, cur),
                ...["page_type", "COALESCE(referrer, 'Direct')", "device", "browser", "os"].map((col) => q(`
                   SELECT ${col} AS label, COUNT(*) AS count FROM tbl_page_views
                   WHERE created_at >= $1::timestamp AND created_at < $2::timestamp AND ${PUBLIC_PAGES}
                   GROUP BY 1 ORDER BY count DESC LIMIT 8`, cur)),
                q(`SELECT category AS label, COUNT(*) AS count FROM tbl_activity_logs
                   WHERE created_at >= $1::timestamp AND created_at < $2::timestamp GROUP BY 1 ORDER BY count DESC`, cur),
                q(`SELECT actor_email AS label, COUNT(*) AS count FROM tbl_activity_logs
                   WHERE actor_email IS NOT NULL AND created_at >= $1::timestamp AND created_at < $2::timestamp
                   GROUP BY 1 ORDER BY count DESC LIMIT 5`, cur),
                q(`SELECT EXTRACT(DOW FROM created_at)::int AS weekday, EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*) AS count
                   FROM tbl_page_views WHERE created_at >= $1::timestamp AND created_at < $2::timestamp AND ${PUBLIC_PAGES}
                   GROUP BY 1, 2`, cur),
            ]);

            const successRate = (a: any) => (num(a.total) ? (100 * num(a.success)) / num(a.total) : 0);
            const kpis: AnalyticsKpis = {
                apiCalls: pair(apiNow.total, apiPrev.total),
                apiSuccess: pair(apiNow.success, apiPrev.success),
                apiFailed: pair(apiNow.failed, apiPrev.failed),
                apiErrors: pair(apiNow.errors, apiPrev.errors),
                successRate: pair(successRate(apiNow), successRate(apiPrev)),
                avgLatencyMs: pair(apiNow.avg_ms, apiPrev.avg_ms),
                p95LatencyMs: pair(apiNow.p95_ms, apiPrev.p95_ms),
                mutations: pair(apiNow.mutations, apiPrev.mutations),
                signedInUsers: pair(apiNow.signed_in, apiPrev.signed_in),
                pageViews: pair(viewsNow.views, viewsPrev.views),
                visitors: pair(viewsNow.visitors, viewsPrev.visitors),
                newVisitors: pair(viewsNow.new_visitors, viewsPrev.new_visitors),
                sessions: pair(viewsNow.sessions, viewsPrev.sessions),
                bounceRate: pair(viewsNow.bounce, viewsPrev.bounce),
                newUsers: pair(bizNow.new_users, bizPrev.new_users),
                logins: pair(bizNow.logins, bizPrev.logins),
                failedLogins: pair(bizNow.failed_logins, bizPrev.failed_logins),
                siteSubmissions: pair(bizNow.submissions, bizPrev.submissions),
                sitesPublished: pair(bizNow.published, bizPrev.published),
                contactMessages: pair(bizNow.contacts, bizPrev.contacts),
            };

            const totals: PlatformTotals = {
                totalUsers: num(totalsRow.total_users), activeAccounts: num(totalsRow.active_accounts), admins: num(totalsRow.admins),
                totalTemplates: num(totalsRow.total_templates), activeTemplates: num(totalsRow.active_templates),
                publishedSites: num(totalsRow.published_sites), pendingApprovals: num(totalsRow.pending),
                totalImages: num(totalsRow.images), contactMessages: num(totalsRow.contacts), masterValues: num(totalsRow.master_values),
            };

            const data: AnalyticsData = {
                range: RANGES[range] ? range : "7d",
                bucket: unit,
                from: w.start,
                to: w.end,
                kpis,
                totals,
                series: apiSeries.map((a, i) => ({
                    bucket: a.bucket,
                    apiSuccess: num(a.success), apiFailed: num(a.failed), apiErrors: num(a.errors),
                    avgLatencyMs: Math.round(num(a.avg_ms)), p95LatencyMs: Math.round(num(a.p95_ms)),
                    pageViews: num(viewSeries[i]?.views), visitors: num(viewSeries[i]?.visitors),
                    newUsers: num(bizSeries[i]?.new_users), logins: num(bizSeries[i]?.logins),
                })),
                operations: operations.map((o) => ({
                    operationName: o.operation_name, operationType: o.operation_type, calls: num(o.calls),
                    failed: num(o.failed), errors: num(o.errors), avgMs: Math.round(num(o.avg_ms)), p95Ms: Math.round(num(o.p95_ms)),
                    lastCalledAt: o.last_at,
                })),
                topErrors: topErrors.map((e) => ({
                    operationName: e.operation_name, status: e.status, message: e.message, count: num(e.count), lastSeenAt: e.last_at,
                })),
                topPages: topPages.map((p) => ({ path: p.path, pageType: p.page_type, views: num(p.views), visitors: num(p.visitors) })),
                pageTypes: toCounts(pageTypes),
                referrers: toCounts(referrers),
                devices: toCounts(devices),
                browsers: toCounts(browsers),
                operatingSystems: toCounts(operatingSystems),
                activityByCategory: toCounts(activityByCategory),
                topActors: toCounts(topActors),
                busiestTimes: busiestTimes.map((c) => ({ weekday: num(c.weekday), hour: num(c.hour), count: num(c.count) })),
            };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            console.error("Admin analytics error:", error);
            return { status: 0, message: error.message || "Failed to load analytics", data: null };
        }
    }

    // --- Admin: API log ---

    @Authorized("admin")
    @Query(() => ApiEventListResponse)
    async adminApiEvents(@Arg("filter", { nullable: true }) filter?: ApiEventFilter): Promise<ApiEventListResponse> {
        try {
            const f = filter ?? {};
            const repo = AppDataSource.getRepository(ApiEvent);
            const qb = repo.createQueryBuilder("e").orderBy("e.created_at", "DESC").addOrderBy("e.id", "DESC");
            const since = LIST_RANGES[f.range ?? "24h"];
            if (since) qb.andWhere("e.created_at >= LOCALTIMESTAMP - CAST(:since AS interval)", { since });
            // "issues" = everything that did not succeed
            if (f.status === "issues") qb.andWhere("e.status <> 'success'");
            else if (f.status) qb.andWhere("e.status = :status", { status: f.status });
            if (f.operationType) qb.andWhere("e.operation_type = :type", { type: f.operationType });
            if (f.operationName) qb.andWhere("e.operation_name = :name", { name: f.operationName });
            if (f.search?.trim()) {
                qb.andWhere("(e.operation_name ILIKE :s OR e.error_message ILIKE :s OR e.user_email ILIKE :s OR e.ip ILIKE :s)", { s: `%${f.search.trim()}%` });
            }

            const opsQb = repo.createQueryBuilder("e").select("DISTINCT e.operation_name", "name").orderBy("name");
            if (since) opsQb.where("e.created_at >= LOCALTIMESTAMP - CAST(:since AS interval)", { since });

            const [[data, total], ops] = await Promise.all([
                qb.take(Math.min(f.limit ?? 50, MAX_PAGE)).skip(f.offset ?? 0).getManyAndCount(),
                opsQb.getRawMany(),
            ]);
            return { status: 1, message: "Success", total, data, operations: ops.map((o) => o.name) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load API log", total: 0, data: [], operations: [] };
        }
    }

    // --- Admin: activity log ---

    @Authorized("admin")
    @Query(() => ActivityLogListResponse)
    async adminActivityLogs(@Arg("filter", { nullable: true }) filter?: ActivityLogFilter): Promise<ActivityLogListResponse> {
        try {
            const f = filter ?? {};
            const repo = AppDataSource.getRepository(ActivityLog);
            const qb = repo.createQueryBuilder("a").orderBy("a.created_at", "DESC").addOrderBy("a.id", "DESC");
            const since = LIST_RANGES[f.range ?? "7d"];
            if (since) qb.andWhere("a.created_at >= LOCALTIMESTAMP - CAST(:since AS interval)", { since });
            if (f.category) qb.andWhere("a.category = :category", { category: f.category });
            if (f.status === "issues") qb.andWhere("a.status <> 'success'");
            else if (f.status) qb.andWhere("a.status = :status", { status: f.status });
            if (f.action) qb.andWhere("a.action = :action", { action: f.action });
            if (f.actorUuid) qb.andWhere("a.actor_uuid = :actor", { actor: f.actorUuid });
            if (f.search?.trim()) {
                qb.andWhere("(a.action ILIKE :s OR a.actor_email ILIKE :s OR a.target ILIKE :s OR a.message ILIKE :s OR a.ip ILIKE :s)", { s: `%${f.search.trim()}%` });
            }

            const actionsQb = repo.createQueryBuilder("a").select("DISTINCT a.action", "action").orderBy("action");
            if (since) actionsQb.where("a.created_at >= LOCALTIMESTAMP - CAST(:since AS interval)", { since });

            const [[data, total], actions] = await Promise.all([
                qb.take(Math.min(f.limit ?? 50, MAX_PAGE)).skip(f.offset ?? 0).getManyAndCount(),
                actionsQb.getRawMany(),
            ]);
            return { status: 1, message: "Success", total, data, actions: actions.map((a) => a.action) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load activity log", total: 0, data: [], actions: [] };
        }
    }
}
