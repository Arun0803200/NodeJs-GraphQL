import { ObjectType, InputType, Field, Int, Float } from "type-graphql";
import { ActivityLog, ApiEvent } from "../Entity/Analytics";

@InputType()
export class PageViewInput {
    @Field()
    public visitorId: string;
    @Field()
    public sessionId: string;
    @Field()
    public path: string;
    @Field({ nullable: true })
    public referrer?: string;
    // The site's own host, so internal navigation isn't counted as a referrer
    @Field({ nullable: true })
    public siteHost?: string;
}

// A KPI for the selected period next to the same KPI for the period before it
@ObjectType()
export class MetricPair {
    @Field(() => Float)
    public current: number;
    @Field(() => Float)
    public previous: number;
}

@ObjectType()
export class AnalyticsKpis {
    @Field(() => MetricPair) public apiCalls: MetricPair;
    @Field(() => MetricPair) public apiSuccess: MetricPair;
    @Field(() => MetricPair) public apiFailed: MetricPair;
    @Field(() => MetricPair) public apiErrors: MetricPair;
    // Share of calls that succeeded, 0-100
    @Field(() => MetricPair) public successRate: MetricPair;
    @Field(() => MetricPair) public avgLatencyMs: MetricPair;
    @Field(() => MetricPair) public p95LatencyMs: MetricPair;
    @Field(() => MetricPair) public pageViews: MetricPair;
    @Field(() => MetricPair) public visitors: MetricPair;
    @Field(() => MetricPair) public newVisitors: MetricPair;
    @Field(() => MetricPair) public sessions: MetricPair;
    // Share of sessions that viewed a single page, 0-100
    @Field(() => MetricPair) public bounceRate: MetricPair;
    @Field(() => MetricPair) public signedInUsers: MetricPair;
    @Field(() => MetricPair) public newUsers: MetricPair;
    @Field(() => MetricPair) public logins: MetricPair;
    @Field(() => MetricPair) public failedLogins: MetricPair;
    @Field(() => MetricPair) public siteSubmissions: MetricPair;
    @Field(() => MetricPair) public sitesPublished: MetricPair;
    @Field(() => MetricPair) public contactMessages: MetricPair;
    @Field(() => MetricPair) public mutations: MetricPair;
}

// Current platform state, independent of the selected range
@ObjectType()
export class PlatformTotals {
    @Field(() => Int) public totalUsers: number;
    @Field(() => Int) public activeAccounts: number;
    @Field(() => Int) public admins: number;
    @Field(() => Int) public totalTemplates: number;
    @Field(() => Int) public activeTemplates: number;
    @Field(() => Int) public publishedSites: number;
    @Field(() => Int) public pendingApprovals: number;
    @Field(() => Int) public totalImages: number;
    @Field(() => Int) public contactMessages: number;
    @Field(() => Int) public masterValues: number;
}

@ObjectType()
export class AnalyticsPoint {
    // Local timestamp of the bucket start, e.g. 2026-10-19T14:00:00
    @Field() public bucket: string;
    @Field(() => Int) public apiSuccess: number;
    @Field(() => Int) public apiFailed: number;
    @Field(() => Int) public apiErrors: number;
    @Field(() => Float) public avgLatencyMs: number;
    @Field(() => Float) public p95LatencyMs: number;
    @Field(() => Int) public pageViews: number;
    @Field(() => Int) public visitors: number;
    @Field(() => Int) public newUsers: number;
    @Field(() => Int) public logins: number;
}

@ObjectType()
export class OperationStat {
    @Field() public operationName: string;
    @Field() public operationType: string;
    @Field(() => Int) public calls: number;
    @Field(() => Int) public failed: number;
    @Field(() => Int) public errors: number;
    @Field(() => Float) public avgMs: number;
    @Field(() => Float) public p95Ms: number;
    @Field() public lastCalledAt: string;
}

@ObjectType()
export class ErrorGroup {
    @Field() public operationName: string;
    @Field() public status: string;
    @Field() public message: string;
    @Field(() => Int) public count: number;
    @Field() public lastSeenAt: string;
}

@ObjectType()
export class PageStat {
    @Field() public path: string;
    @Field() public pageType: string;
    @Field(() => Int) public views: number;
    @Field(() => Int) public visitors: number;
}

@ObjectType()
export class LabelCount {
    @Field() public label: string;
    @Field(() => Int) public count: number;
}

// Page views by weekday (0 = Sunday) and hour, for the "busiest times" heatmap
@ObjectType()
export class HeatCell {
    @Field(() => Int) public weekday: number;
    @Field(() => Int) public hour: number;
    @Field(() => Int) public count: number;
}

@ObjectType()
export class AnalyticsData {
    @Field() public range: string;
    // hour | day
    @Field() public bucket: string;
    @Field() public from: string;
    @Field() public to: string;
    @Field(() => AnalyticsKpis) public kpis: AnalyticsKpis;
    @Field(() => PlatformTotals) public totals: PlatformTotals;
    @Field(() => [AnalyticsPoint]) public series: AnalyticsPoint[];
    @Field(() => [OperationStat]) public operations: OperationStat[];
    @Field(() => [ErrorGroup]) public topErrors: ErrorGroup[];
    @Field(() => [PageStat]) public topPages: PageStat[];
    @Field(() => [LabelCount]) public pageTypes: LabelCount[];
    @Field(() => [LabelCount]) public referrers: LabelCount[];
    @Field(() => [LabelCount]) public devices: LabelCount[];
    @Field(() => [LabelCount]) public browsers: LabelCount[];
    @Field(() => [LabelCount]) public operatingSystems: LabelCount[];
    @Field(() => [LabelCount]) public activityByCategory: LabelCount[];
    @Field(() => [LabelCount]) public topActors: LabelCount[];
    @Field(() => [HeatCell]) public busiestTimes: HeatCell[];
}

@ObjectType()
export class AnalyticsResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => AnalyticsData, { nullable: true }) public data?: AnalyticsData | null;
}

@ObjectType()
export class ApiEventListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [ApiEvent]) public data: ApiEvent[];
    // Operation names seen in the range, for the filter dropdown
    @Field(() => [String]) public operations: string[];
}

@ObjectType()
export class ActivityLogListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [ActivityLog]) public data: ActivityLog[];
    @Field(() => [String]) public actions: string[];
}

@InputType()
export class ApiEventFilter {
    @Field({ nullable: true }) public range?: string;
    @Field({ nullable: true }) public status?: string;
    @Field({ nullable: true }) public operationType?: string;
    @Field({ nullable: true }) public operationName?: string;
    @Field({ nullable: true }) public search?: string;
    @Field(() => Int, { nullable: true }) public limit?: number;
    @Field(() => Int, { nullable: true }) public offset?: number;
}

@InputType()
export class ActivityLogFilter {
    @Field({ nullable: true }) public range?: string;
    @Field({ nullable: true }) public category?: string;
    @Field({ nullable: true }) public status?: string;
    @Field({ nullable: true }) public action?: string;
    @Field({ nullable: true }) public actorUuid?: string;
    @Field({ nullable: true }) public search?: string;
    @Field(() => Int, { nullable: true }) public limit?: number;
    @Field(() => Int, { nullable: true }) public offset?: number;
}
