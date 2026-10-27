import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { env } from "../../Config/env";
import { ContactUs } from "../../Entity/ContactUs";
import { User } from "../../Entity/User";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import { ContactMessageInput, InboxCounts, InboxFilter, InboxMessage, InboxResponse, NavCounts } from "../../Responses/MessageResponses";
import { sendMail } from "../../Utils/mailer";

const TS = `'YYYY-MM-DD"T"HH24:MI:SS'`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 5000;
const ACTIONS = ["read", "unread", "star", "unstar", "archive", "unarchive", "delete"] as const;

// Simple per-IP throttle for the public form: at most 5 messages per 10 minutes
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const recentSends = new Map<string, number[]>();
function rateLimited(ip: string | undefined): boolean {
    if (!ip) return false;
    const now = Date.now();
    const hits = (recentSends.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (hits.length >= RATE_MAX) { recentSends.set(ip, hits); return true; }
    hits.push(now);
    recentSends.set(ip, hits);
    if (recentSends.size > 5000) for (const [k, v] of recentSends) if (!v.some((t) => now - t < RATE_WINDOW_MS)) recentSends.delete(k);
    return false;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const FOLDERS: Record<string, string> = {
    inbox: "NOT m.is_archived",
    unread: "NOT m.is_read AND NOT m.is_archived",
    starred: "m.is_starred",
    archived: "m.is_archived",
    all: "TRUE",
};

// Shared by the admin inbox (every owner) and a user's own inbox (owner = them)
async function loadInbox(filter: InboxFilter, ownerUuid: string | null): Promise<InboxResponse> {
    const params: unknown[] = [];
    const param = (v: unknown) => { params.push(v); return `$${params.length}`; };
    const scope: string[] = [];
    if (ownerUuid) scope.push(`m.user_uuid = ${param(ownerUuid)}`);
    else if (filter.recipientUuid) scope.push(`m.user_uuid = ${param(filter.recipientUuid)}`);
    if (filter.search?.trim()) {
        const p = param(`%${filter.search.trim()}%`);
        scope.push(`(m.sender_name ILIKE ${p} OR m.sender_email ILIKE ${p} OR m.message ILIKE ${p} OR u.full_name ILIKE ${p} OR u.user_name ILIKE ${p})`);
    }
    const base = `FROM tbl_contact_us m LEFT JOIN tbl_users u ON u.user_uuid = m.user_uuid WHERE ${scope.length ? scope.join(" AND ") : "TRUE"}`;
    const folder = FOLDERS[filter.folder ?? "inbox"] ?? FOLDERS.inbox;
    const limit = Math.min(Math.max(filter.limit ?? 30, 1), 200);
    const offset = Math.max(filter.offset ?? 0, 0);

    const [rows, [c]] = await Promise.all([
        AppDataSource.query(`
            SELECT m.id, m.sender_name, m.sender_email, m.message, m.is_read, m.is_starred, m.is_archived, m.source,
                   to_char(m.created_at, ${TS}) AS created_at, to_char(m.read_at, ${TS}) AS read_at,
                   m.user_uuid, u.full_name, u.user_name, u.email AS owner_email
            ${base} AND ${folder} ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit} OFFSET ${offset}`, params),
        AppDataSource.query(`
            SELECT COUNT(*) FILTER (WHERE ${folder}) AS total,
                   COUNT(*) FILTER (WHERE NOT m.is_archived) AS inbox,
                   COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_archived) AS unread,
                   COUNT(*) FILTER (WHERE m.is_starred) AS starred,
                   COUNT(*) FILTER (WHERE m.is_archived) AS archived,
                   COUNT(*) AS all
            ${base}`, params),
    ]);

    const data: InboxMessage[] = rows.map((r: any) => ({
        id: r.id, senderName: r.sender_name, senderEmail: r.sender_email, message: r.message ?? "",
        isRead: r.is_read, isStarred: r.is_starred, isArchived: r.is_archived, source: r.source,
        createdAt: r.created_at, readAt: r.read_at,
        recipientUuid: r.user_uuid, recipientName: r.full_name ?? "Deleted user", recipientUserName: r.user_name ?? "", recipientEmail: r.owner_email ?? "",
    }));
    const counts: InboxCounts = { inbox: +c.inbox, unread: +c.unread, starred: +c.starred, archived: +c.archived, all: +c.all };
    return { status: 1, message: "Success", total: +c.total, data, counts };
}

async function applyAction(ids: number[], action: string, ownerUuid: string | null): Promise<StatusResponse> {
    if (ids.length === 0) return { status: 0, message: "Select at least one message" };
    if (!(ACTIONS as readonly string[]).includes(action)) return { status: 0, message: "Unknown action" };
    const qb = AppDataSource.createQueryBuilder().where("id IN (:...ids)", { ids });
    // Users can only touch messages sent to their own portfolio
    if (ownerUuid) qb.andWhere("user_uuid = :owner", { owner: ownerUuid });

    let affected = 0;
    if (action === "delete") {
        affected = (await qb.delete().from(ContactUs).execute()).affected ?? 0;
    } else {
        const set: Partial<ContactUs> = {
            read: { isRead: true, readAt: new Date() }, unread: { isRead: false, readAt: null },
            star: { isStarred: true }, unstar: { isStarred: false },
            archive: { isArchived: true, isRead: true }, unarchive: { isArchived: false },
        }[action as Exclude<typeof ACTIONS[number], "delete">];
        affected = (await qb.update(ContactUs).set({ ...set, updatedAt: new Date() }).execute()).affected ?? 0;
    }
    const verb = { read: "marked read", unread: "marked unread", star: "starred", unstar: "unstarred", archive: "archived", unarchive: "moved to inbox", delete: "deleted" }[action];
    return { status: 1, message: `${affected} message${affected === 1 ? "" : "s"} ${verb}` };
}

@Resolver()
export class MessageResolver {

    // --- Public: contact form on published websites and portfolio pages ---

    @Mutation(() => StatusResponse)
    async sendContactMessage(@Arg("input") input: ContactMessageInput, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        try {
            // Bots fill every field; pretend success so they don't retry
            if (input.company?.trim()) return { status: 1, message: "Message sent" };

            const senderName = input.senderName.trim();
            const senderEmail = input.senderEmail.trim().toLowerCase();
            const message = input.message.trim();
            if (senderName.length < 2 || senderName.length > 120) return { status: 0, message: "Please enter your name" };
            if (!EMAIL.test(senderEmail) || senderEmail.length > 255) return { status: 0, message: "Please enter a valid email address" };
            if (message.length < 10) return { status: 0, message: "Message is too short (at least 10 characters)" };
            if (message.length > MAX_MESSAGE) return { status: 0, message: `Message is too long (max ${MAX_MESSAGE} characters)` };
            if (rateLimited(ctx.ip)) return { status: 0, message: "Too many messages. Please try again in a few minutes." };

            const owner = await AppDataSource.getRepository(User).findOne({ where: { userName: input.userName.trim().toLowerCase() } });
            if (!owner) return { status: 0, message: "This portfolio no longer exists" };

            await AppDataSource.getRepository(ContactUs).insert({
                userUuid: owner.userUuid, senderName, senderEmail, message,
                source: input.source === "website" ? "website" : "portfolio",
                senderIp: ctx.ip ?? null, isRead: false, isStarred: false, isArchived: false,
                createdAt: new Date(), updatedAt: new Date(),
            });

            // Let the owner know; a mail failure must not lose the message
            const inboxUrl = `${env.FRONTEND_URL}/user/messages`;
            sendMail(
                owner.email,
                `New message from ${senderName} via your portfolio`,
                `<p><strong>${escapeHtml(senderName)}</strong> (${escapeHtml(senderEmail)}) wrote:</p><blockquote style="border-left:3px solid #ddd;padding-left:12px;white-space:pre-wrap">${escapeHtml(message)}</blockquote><p>Reply directly to this person by email, or <a href="${inboxUrl}">open your inbox</a>.</p>`,
                `${senderName} (${senderEmail}) wrote:\n\n${message}\n\nOpen your inbox: ${inboxUrl}`,
            ).catch((error) => console.log("Contact notification mail failed:", error.message));

            return { status: 1, message: "Message sent" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Could not send your message" };
        }
    }

    // --- Signed-in user: messages sent to their own portfolio ---

    @Authorized()
    @Query(() => InboxResponse)
    async myMessages(@Arg("filter", { nullable: true }) filter: InboxFilter = {}, @Ctx() ctx: AppContext): Promise<InboxResponse> {
        try {
            return await loadInbox(filter, ctx.user!.userUuid);
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load messages", total: 0, data: [] };
        }
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async updateMyMessages(
        @Arg("ids", () => [Int]) ids: number[],
        @Arg("action") action: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        try {
            return await applyAction(ids, action, ctx.user!.userUuid);
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update messages" };
        }
    }

    // --- Admin: oversight of every message on the platform ---
    // Read/star/archive belong to the portfolio owner, so admins can browse and remove spam without changing the owner's inbox

    @Authorized("admin")
    @Query(() => InboxResponse)
    async adminMessages(@Arg("filter", { nullable: true }) filter: InboxFilter = {}): Promise<InboxResponse> {
        try {
            return await loadInbox(filter, null);
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load messages", total: 0, data: [] };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminUpdateMessages(@Arg("ids", () => [Int]) ids: number[], @Arg("action") action: string): Promise<StatusResponse> {
        try {
            if (action !== "delete") return { status: 0, message: "Admins can only delete messages; read state belongs to the recipient" };
            return await applyAction(ids, action, null);
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update messages" };
        }
    }

    // --- Sidebar badges ---

    // scope "admin" adds platform-wide counts (admins only); otherwise counts are the caller's own
    @Authorized()
    @Query(() => NavCounts)
    async navCounts(@Arg("scope", { defaultValue: "user" }) scope: string, @Ctx() ctx: AppContext): Promise<NavCounts> {
        const admin = scope === "admin" && ctx.user!.role === "admin";
        const [[mine], [pending], [recent], [bookings], [applications], [reviews], [submissions], [leads]] = await Promise.all([
            AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_contact_us WHERE user_uuid = $1 AND NOT is_read AND NOT is_archived`, [ctx.user!.userUuid]),
            admin ? AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_user_sites WHERE status = 'pending'`) : Promise.resolve([{ n: 0 }]),
            admin ? AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_contact_us WHERE created_at >= LOCALTIMESTAMP - interval '24 hours'`) : Promise.resolve([{ n: 0 }]),
            AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_trip_bookings WHERE owner_uuid = $1 AND status = 'new'`, [ctx.user!.userUuid]),
            AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_driver_applications WHERE owner_uuid = $1 AND status = 'new'`, [ctx.user!.userUuid]),
            AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_reviews WHERE owner_uuid = $1 AND status = 'pending'`, [ctx.user!.userUuid]),
            AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_form_submissions WHERE owner_uuid = $1 AND status = 'new'`, [ctx.user!.userUuid]),
            admin ? AppDataSource.query(`SELECT COUNT(*) AS n FROM tbl_platform_leads WHERE status = 'new'`) : Promise.resolve([{ n: 0 }]),
        ]);
        return { unreadMessages: +mine.n, pendingApprovals: +pending.n, newMessages: +recent.n, newBookings: +bookings.n, newDriverApplications: +applications.n, pendingReviews: +reviews.n, newFormSubmissions: +submissions.n, newLeads: +leads.n };
    }
}
