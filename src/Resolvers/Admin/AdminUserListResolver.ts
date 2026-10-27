import { Resolver, Query, Mutation, Arg, Authorized, Ctx } from "type-graphql";
import { In } from "typeorm";
import { AppDataSource } from "../../Config/DataSource";
import { Auth } from "../../Entity/Auth";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import { AdminUserFilter, AdminUserListResponse, AdminUserRow, AdminUserSummary } from "../../Responses/AdminUserResponses";

const TS = `'YYYY-MM-DD"T"HH24:MI:SS'`;
const MAX_LIMIT = 1000;
const ROLES = ["user", "admin"];
const JOINED: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "365d": "365 days" };
// Whitelisted ORDER BY expressions over the columns of BASE (column names never come from the client)
const SORTS: Record<string, string> = {
    name: "lower(full_name)",
    email: "lower(email)",
    joined: "joined_at",
    lastActive: "last_active_at",
    completeness: "sections_filled",
};

// Everything the list shows, one row per user. Section counts use EXISTS so each is a cheap index probe.
const BASE = `
    SELECT u.id, u.user_uuid, u.full_name, u.user_name, u.designation, u.email, u.mobile_no,
           u.created_at AS joined_at, to_char(u.created_at, ${TS}) AS created_at,
           COALESCE(a.role, 'user') AS role, COALESCE(a.is_active, false) AS is_active,
           COALESCE(s.status, 'none') AS site_status, COALESCE(s.is_published, false) AS is_published,
           t.name AS template_name,
           COALESCE(img.n, 0) AS image_count,
           (EXISTS (SELECT 1 FROM tbl_about x WHERE x.user_uuid = u.user_uuid))::int
         + (EXISTS (SELECT 1 FROM tbl_user_experience x WHERE x.user_uuid = u.user_uuid))::int
         + (EXISTS (SELECT 1 FROM tbl_user_projects x WHERE x.user_uuid = u.user_uuid))::int
         + (EXISTS (SELECT 1 FROM tbl_user_skills x WHERE x.user_uuid = u.user_uuid))::int
         + (EXISTS (SELECT 1 FROM tbl_user_education x WHERE x.user_uuid = u.user_uuid))::int
         + (EXISTS (SELECT 1 FROM tbl_users_awards x WHERE x.user_uuid = u.user_uuid))::int
         + (COALESCE(img.n, 0) > 0)::int AS sections_filled,
           act.last_active_at
    FROM tbl_users u
    LEFT JOIN tbl_auth a ON a.user_uuid = u.user_uuid
    LEFT JOIN tbl_user_sites s ON s.user_uuid = u.user_uuid
    LEFT JOIN tbl_templates t ON t.id = COALESCE(s.live_template_id, s.template_id)
    LEFT JOIN (SELECT user_uuid, COUNT(*) AS n FROM tbl_user_images GROUP BY user_uuid) img ON img.user_uuid = u.user_uuid
    LEFT JOIN (SELECT user_uuid, MAX(created_at) AS last_active_at FROM tbl_api_events WHERE user_uuid IS NOT NULL GROUP BY user_uuid) act
           ON act.user_uuid = u.user_uuid`;

const toRow = (r: any): AdminUserRow => ({
    id: Number(r.id), userUuid: r.user_uuid, fullName: r.full_name, userName: r.user_name ?? "", designation: r.designation ?? "",
    email: r.email, mobileNo: r.mobile_no, role: r.role, isActive: r.is_active, siteStatus: r.site_status, isPublished: r.is_published,
    templateName: r.template_name, imageCount: Number(r.image_count), sectionsFilled: Number(r.sections_filled),
    lastActiveAt: r.last_active_at ? new Date(r.last_active_at).toISOString() : null,
    createdAt: r.created_at,
});

@Resolver()
export class AdminUserListResolver {

    @Authorized("admin")
    @Query(() => AdminUserListResponse)
    async adminUsers(@Arg("filter", { nullable: true }) filter?: AdminUserFilter): Promise<AdminUserListResponse> {
        try {
            const f = filter ?? {};
            const where: string[] = [];
            const params: unknown[] = [];
            const param = (v: unknown) => { params.push(v); return `$${params.length}`; };

            if (f.search?.trim()) {
                const p = param(`%${f.search.trim()}%`);
                where.push(`(u.full_name ILIKE ${p} OR u.user_name ILIKE ${p} OR u.email ILIKE ${p} OR u.mobile_no ILIKE ${p} OR u.designation ILIKE ${p})`);
            }
            if (f.role && ROLES.includes(f.role)) where.push(`role = ${param(f.role)}`);
            if (f.status === "active") where.push("is_active");
            if (f.status === "inactive") where.push("NOT is_active");
            if (f.website === "published") where.push("is_published");
            else if (f.website && ["none", "draft", "pending", "approved", "rejected"].includes(f.website)) where.push(`site_status = ${param(f.website)}`);
            if (f.joined && JOINED[f.joined]) where.push(`joined_at >= LOCALTIMESTAMP - ${param(JOINED[f.joined])}::interval`);
            if (f.profile === "incomplete") where.push("sections_filled < 4");
            if (f.profile === "complete") where.push("sections_filled >= 4");

            // Computed columns can't be referenced in WHERE of the same SELECT, so filter on a wrapping query
            const filtered = `SELECT * FROM (${BASE}) u ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
            const sortExpr = SORTS[f.sort ?? "joined"] ?? SORTS.joined;
            const dir = f.direction === "asc" ? "ASC" : "DESC";
            const limit = Math.min(Math.max(f.limit ?? 20, 1), MAX_LIMIT);
            const offset = Math.max(f.offset ?? 0, 0);

            const [rows, [{ count }], [s]] = await Promise.all([
                AppDataSource.query(`${filtered} ORDER BY ${sortExpr} ${dir} NULLS LAST, id DESC LIMIT ${limit} OFFSET ${offset}`, params),
                AppDataSource.query(`SELECT COUNT(*) AS count FROM (${filtered}) c`, params),
                AppDataSource.query(`
                    SELECT COUNT(*) AS total,
                           COUNT(*) FILTER (WHERE is_active) AS active,
                           COUNT(*) FILTER (WHERE NOT is_active) AS inactive,
                           COUNT(*) FILTER (WHERE role = 'admin') AS admins,
                           COUNT(*) FILTER (WHERE joined_at >= LOCALTIMESTAMP - interval '30 days') AS new30,
                           COUNT(*) FILTER (WHERE is_published) AS published,
                           COUNT(*) FILTER (WHERE site_status = 'pending') AS pending,
                           COUNT(*) FILTER (WHERE last_active_at >= LOCALTIMESTAMP - interval '7 days') AS active7
                    FROM (${BASE}) b`),
            ]);

            const summary: AdminUserSummary = {
                total: Number(s.total), active: Number(s.active), inactive: Number(s.inactive), admins: Number(s.admins),
                newLast30Days: Number(s.new30), published: Number(s.published), pendingApproval: Number(s.pending), activeLast7Days: Number(s.active7),
            };
            return { status: 1, message: "Success", total: Number(count), data: rows.map(toRow), summary };
        } catch (error: any) {
            console.error("Admin users error:", error);
            return { status: 0, message: error.message || "Failed to load users", total: 0, data: [] };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminSetUsersActive(
        @Arg("uuids", () => [String]) uuids: string[],
        @Arg("isActive") isActive: boolean,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        try {
            if (uuids.length === 0) return { status: 0, message: "Select at least one user" };
            // An admin locking themselves out would leave nobody to undo it
            if (!isActive && uuids.includes(ctx.user!.userUuid)) return { status: 0, message: "You cannot deactivate your own account" };
            const result = await AppDataSource.getRepository(Auth).update({ userUuid: In(uuids) }, { isActive, updatedAt: new Date() });
            return { status: 1, message: `${result.affected ?? 0} user(s) ${isActive ? "activated" : "deactivated"}` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update users" };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminSetUserRole(
        @Arg("uuid") uuid: string,
        @Arg("role") role: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        try {
            if (!ROLES.includes(role)) return { status: 0, message: "Role must be user or admin" };
            const authRepo = AppDataSource.getRepository(Auth);
            const auth = await authRepo.findOne({ where: { userUuid: uuid } });
            if (!auth) return { status: 0, message: "User not found" };
            if (auth.role === role) return { status: 1, message: `Already ${role}` };
            if (role === "user") {
                if (uuid === ctx.user!.userUuid) return { status: 0, message: "You cannot remove your own admin access" };
                if (await authRepo.count({ where: { role: "admin", isActive: true } }) <= 1 && auth.isActive) {
                    return { status: 0, message: "At least one active admin is required" };
                }
            }
            auth.role = role;
            auth.updatedAt = new Date();
            await authRepo.save(auth);
            return { status: 1, message: role === "admin" ? "User is now an admin" : "Admin access removed" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to change role" };
        }
    }
}
