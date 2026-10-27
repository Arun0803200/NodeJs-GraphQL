import type { ApolloServerPlugin } from "apollo-server-plugin-base";
import { valueFromASTUntyped, type FieldNode, type OperationDefinitionNode } from "graphql";
import jwt from "jsonwebtoken";
import { LessThan } from "typeorm";
import { AppDataSource } from "../Config/DataSource";
import { env } from "../Config/env";
import { ActivityLog, ApiEvent, PageView } from "../Entity/Analytics";
import type { AppContext, JwtPayload } from "../Middleware/authChecker";

// The tracker and the analytics screens themselves are left out so viewing the dashboard doesn't inflate its own numbers
const UNTRACKED_FIELDS = new Set([
    "trackPageView", "adminAnalytics", "adminApiEvents", "adminActivityLogs",
]);

// Arguments whose values must never be stored
const SECRET_KEY = /pass(word)?|token|secret|authorization|otp|licen[cs]e|aadhaar|photo/i;
// Big blobs that only add noise to the audit trail
const BLOB_KEY = /^(contentJson|content|file|files|image|images|message|answers|comment)$/;
const TARGET_KEYS = ["id", "uuid", "userUuid", "slug", "code", "email", "typeId", "templateId"];
const MAX_STRING = 200;

function sanitize(value: unknown, key = "", depth = 0): unknown {
    if (SECRET_KEY.test(key)) return "[redacted]";
    if (BLOB_KEY.test(key)) return "[omitted]";
    if (value === null || value === undefined) return value;
    if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    if (typeof value !== "object") return value;
    // Uploads arrive as promises/streams
    if (typeof (value as any).then === "function" || typeof (value as any).createReadStream === "function") return "[file]";
    if (depth >= 3) return "[…]";
    if (Array.isArray(value)) {
        const items = value.slice(0, 20).map((v) => sanitize(v, "", depth + 1));
        return value.length > 20 ? [...items, `…${value.length - 20} more`] : items;
    }
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v, k, depth + 1)]));
}

// The main thing a mutation acted on, looked up in its arguments (and one level into "input")
function findTarget(vars: Record<string, any>): string | null {
    for (const source of [vars, vars.input ?? {}]) {
        for (const key of TARGET_KEYS) {
            const v = source?.[key];
            if (typeof v === "string" || typeof v === "number") return String(v).slice(0, 255);
        }
        if (Array.isArray(source?.ids) && source.ids.length) return source.ids.slice(0, 20).join(", ").slice(0, 255);
    }
    return null;
}

export function categoryFor(action: string): string {
    if (/^(login|register|forgotPassword|resetPassword|changePassword|logout)/i.test(action)) return "auth";
    if (/PlatformLead|contactPlatform/.test(action)) return "enquiries";
    if (/Review/.test(action)) return "reviews";
    if (/Form/.test(action)) return "forms";
    if (/Driver/.test(action)) return "drivers";
    if (/Trip/.test(action)) return "booking";
    if (/Message|contact/i.test(action)) return "message";
    if (/Master/.test(action)) return "master";
    if (/Template/.test(action)) return "template";
    if (/Site|publish|approve|reject/i.test(action)) return "site";
    if (/Image|Upload|Media/i.test(action)) return "media";
    if (/^admin/.test(action)) return "admin";
    if (/^(update|add|delete)My|Profile/i.test(action)) return "profile";
    if (/contact/i.test(action)) return "guest";
    return "other";
}

// Resolvers report business failures as { status: 0, message } instead of throwing; find the first one
function businessFailure(data: Record<string, any> | null | undefined): string | null {
    if (!data) return null;
    for (const value of Object.values(data)) {
        if (value && typeof value === "object" && value.status === 0) return String(value.message ?? "Failed");
    }
    return null;
}

const save = (promise: Promise<unknown>) => promise.catch((error) => console.log("Analytics write error:", error.message));

export const analyticsPlugin: ApolloServerPlugin<AppContext> = {
    async requestDidStart() {
        const startedAt = Date.now();
        return {
            async willSendResponse(rc) {
                const operation = rc.operation as OperationDefinitionNode | undefined;
                const fields = (operation?.selectionSet.selections ?? [])
                    .filter((s): s is FieldNode => s.kind === "Field")
                    .map((s) => s.name.value);

                // Skip schema introspection (GraphQL tooling) and our own analytics traffic
                if (fields.length > 0 && fields.every((f) => f.startsWith("__") || UNTRACKED_FIELDS.has(f))) return;

                const errors = rc.response.errors ?? [];
                const data = rc.response.data as Record<string, any> | null | undefined;
                const failure = errors.length ? null : businessFailure(data);
                const status = errors.length ? "error" : failure ? "failed" : "success";
                const errorMessage = errors.length ? errors.map((e) => e.message).join(" | ").slice(0, 2000) : failure;
                const errorCode = errors.length ? String(errors[0].extensions?.code ?? "INTERNAL_SERVER_ERROR").slice(0, 60) : null;
                // A sign-in or sign-up is anonymous on the way in; credit it to the account whose token it returns
                const issuedToken = Object.values(data ?? {}).find((v: any) => typeof v?.token === "string")?.token as string | undefined;
                const user = rc.context.user ?? (issuedToken ? jwt.decode(issuedToken) as JwtPayload | null : null) ?? undefined;
                const operationType = operation?.operation ?? "unknown";

                save(AppDataSource.getRepository(ApiEvent).insert({
                    operationName: (rc.operationName || fields[0] || "anonymous").slice(0, 120),
                    operationType,
                    fields,
                    status,
                    errorMessage,
                    errorCode,
                    durationMs: Date.now() - startedAt,
                    userUuid: user?.userUuid ?? null,
                    userEmail: user?.email ?? null,
                    role: user?.role ?? null,
                    ip: rc.context.ip ?? null,
                    userAgent: rc.context.userAgent ?? null,
                }));

                if (operationType !== "mutation") return;
                const variables = (rc.request.variables ?? {}) as Record<string, unknown>;
                const fieldNodes = (operation?.selectionSet.selections ?? [])
                    .filter((s): s is FieldNode => s.kind === "Field" && !UNTRACKED_FIELDS.has(s.name.value));
                for (const node of fieldNodes) {
                    const action = node.name.value;
                    // Arguments of this field, whether sent inline or as variables
                    const args = Object.fromEntries((node.arguments ?? []).map((a) => [a.name.value, valueFromASTUntyped(a.value, variables)])) as Record<string, any>;
                    const result = data?.[node.alias?.value ?? action];
                    const fieldStatus = errors.length ? "error" : result?.status === 0 ? "failed" : "success";
                    const actor = user;
                    save(AppDataSource.getRepository(ActivityLog).insert({
                        actorUuid: actor?.userUuid ?? null,
                        // Signed-out actions without a token (failed login, contact form) identify themselves by the email sent
                        actorEmail: actor?.email ?? (typeof args.email === "string" ? args.email.slice(0, 255) : null),
                        actorRole: actor?.role ?? null,
                        action,
                        category: categoryFor(action),
                        status: fieldStatus,
                        message: (errors.length ? errorMessage : result?.message)?.slice(0, 1000) ?? null,
                        target: findTarget(args),
                        metadata: (Object.keys(args).length ? sanitize(args) : null) as any,
                        ip: rc.context.ip ?? null,
                    }));
                }
            },
        };
    },
};

// Drops raw events past the retention window; runs at start-up and then daily
export function scheduleAnalyticsCleanup() {
    const run = async () => {
        const day = 24 * 60 * 60 * 1000;
        const now = Date.now();
        try {
            await AppDataSource.getRepository(ApiEvent).delete({ createdAt: LessThan(new Date(now - env.API_EVENT_RETENTION_DAYS * day)) });
            await AppDataSource.getRepository(PageView).delete({ createdAt: LessThan(new Date(now - env.PAGE_VIEW_RETENTION_DAYS * day)) });
            await AppDataSource.getRepository(ActivityLog).delete({ createdAt: LessThan(new Date(now - env.ACTIVITY_RETENTION_DAYS * day)) });
        } catch (error: any) {
            console.log("Analytics cleanup error:", error.message);
        }
    };
    run();
    setInterval(run, 24 * 60 * 60 * 1000).unref();
}

// --- Page views ---

export function parseUserAgent(ua = "") {
    const s = ua.toLowerCase();
    const device = /bot|crawl|spider|slurp|preview|headless|lighthouse/.test(s) ? "bot"
        : /ipad|tablet|(android(?!.*mobile))/.test(s) ? "tablet"
        : /mobi|iphone|android/.test(s) ? "mobile" : "desktop";
    const browser = /edg\//.test(s) ? "Edge" : /opr\/|opera/.test(s) ? "Opera" : /samsungbrowser/.test(s) ? "Samsung Internet"
        : /firefox|fxios/.test(s) ? "Firefox" : /chrome|crios/.test(s) ? "Chrome" : /safari/.test(s) ? "Safari" : "Other";
    const os = /windows/.test(s) ? "Windows" : /iphone|ipad|ipod/.test(s) ? "iOS" : /android/.test(s) ? "Android"
        : /mac os x|macintosh/.test(s) ? "macOS" : /linux/.test(s) ? "Linux" : "Other";
    return { device, browser, os };
}

export function pageTypeFor(path: string): string {
    if (path === "/" || path === "") return "home";
    if (/^\/templates\/[^/]+\/customize/.test(path)) return "customize";
    if (/^\/templates\//.test(path)) return "template";
    if (/^\/auth\//.test(path)) return "auth";
    if (/^\/admin(\/|$)/.test(path)) return "admin";
    if (/^\/user(\/|$)/.test(path)) return "user";
    if (/^\/[^/]+\/?$/.test(path)) return "portfolio";
    return "other";
}

// Only the referring host is kept (e.g. "google.com"); same-site navigation is not a referrer
export function referrerHost(referrer: string | undefined, siteHost: string | undefined): string | null {
    if (!referrer) return null;
    try {
        const host = new URL(referrer).hostname.replace(/^www\./, "");
        return host && host !== siteHost?.replace(/^www\./, "") ? host.slice(0, 255) : null;
    } catch {
        return null;
    }
}
