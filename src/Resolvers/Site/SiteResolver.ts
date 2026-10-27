import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int } from "type-graphql";
import { publicSiteContent } from "../../Utils/travel";
import { publicState } from "../Guest/GuestResolver";
import { In } from "typeorm";
import { AppDataSource } from "../../Config/DataSource";
import { Template } from "../../Entity/Template";
import { UserSite } from "../../Entity/UserSite";
import { User } from "../../Entity/User";
import { AppContext } from "../../Middleware/authChecker";
import { SiteData, SiteResponse, SiteReview, SiteReviewListResponse, SiteReviewResponse } from "../../Responses/TemplateResponses";
import { StatusResponse } from "../../Responses/StatusResponse";
import { sendSiteReviewMail } from "../../Utils/mailer";

const templateRepo = AppDataSource.getRepository(Template);
const siteRepo = AppDataSource.getRepository(UserSite);
const userRepo = AppDataSource.getRepository(User);

const MAX_CONTENT_BYTES = 600_000; // two languages of content
const SITE_STATUSES = ["draft", "pending", "approved", "rejected"];

// Only http(s) links may reach a public page; anything else (e.g. javascript:) is dropped
const safeUrl = (value: unknown) => (typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "");
const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const LANGS = ["en", "ta"];
const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

// Cleans one language's content: http(s)-only links/images, bounded lists
function sanitizeLanguage(content: any): Record<string, any> {
    if (!content || typeof content !== "object" || Array.isArray(content)) return {};
    for (const field of ["website", "linkedin", "github", "photoUrl", "coverUrl"]) {
        if (field in content) content[field] = safeUrl(content[field]);
    }
    content.whatsapp = text(content.whatsapp, 20).replace(/\D/g, "");
    content.projects = asArray(content.projects).map((p) => ({ ...p, link: safeUrl(p?.link), imageUrl: safeUrl(p?.imageUrl) }));
    content.services = asArray(content.services).slice(0, 40).map((sv) => ({
        name: text(sv?.name, 200), description: text(sv?.description), price: text(sv?.price, 100), imageUrl: safeUrl(sv?.imageUrl),
    }));
    content.testimonials = asArray(content.testimonials).slice(0, 30).map((t) => ({
        name: text(t?.name, 120), role: text(t?.role, 120), text: text(t?.text),
    }));
    content.certifications = asArray(content.certifications).map((c) =>
        typeof c === "string" ? { name: c, issuer: "", year: "", link: "", imageUrl: "" } : { ...c, link: safeUrl(c?.link), imageUrl: safeUrl(c?.imageUrl) });
    content.album = asArray(content.album)
        .map((a) => ({ url: safeUrl(a?.url), caption: text(a?.caption, 200) }))
        .filter((a) => a.url)
        .slice(0, 60);
    return content;
}

// Accepts the bilingual shape { defaultLang, languages: { en, ta } } or a legacy single-language object
function sanitizeContent(raw: string): { content?: Record<string, any>; error?: string } {
    if (Buffer.byteLength(raw, "utf8") > MAX_CONTENT_BYTES) return { error: "Content is too large" };
    let content: any;
    try {
        content = JSON.parse(raw);
    } catch {
        return { error: "Content is not valid JSON" };
    }
    if (!content || typeof content !== "object" || Array.isArray(content)) return { error: "Content must be an object" };

    if (!content.languages) return { content: sanitizeLanguage(content) };

    const languages: Record<string, any> = {};
    for (const lang of LANGS) {
        if (content.languages[lang]) languages[lang] = sanitizeLanguage(content.languages[lang]);
    }
    if (Object.keys(languages).length === 0) return { error: "Add your details in at least one language" };
    const defaultLang = LANGS.includes(content.defaultLang) && languages[content.defaultLang] ? content.defaultLang : Object.keys(languages)[0];
    return { content: { version: 2, defaultLang, languages } };
}

function toSiteData(site: UserSite, template: Template, userName: string, content: Record<string, unknown> | null = site.content): SiteData {
    return {
        templateId: template.id,
        templateSlug: template.slug,
        templateName: template.name,
        designKey: template.designKey,
        contentJson: JSON.stringify(content ?? {}),
        isPublished: site.isPublished,
        publishedAt: site.publishedAt,
        userName,
        status: site.status,
        reviewNote: site.reviewNote,
        submittedAt: site.submittedAt,
        reviewedAt: site.reviewedAt,
    };
}

function toReview(site: UserSite, template: Template, user: User): SiteReview {
    return {
        ...toSiteData(site, template, user.userName),
        userUuid: user.userUuid,
        fullName: user.fullName,
        email: user.email,
        templateCategory: template.category,
    };
}

@Resolver()
export class SiteResolver {

    // --- User ---

    // Latest (possibly unapproved) content plus review status
    @Authorized("user", "admin")
    @Query(() => SiteResponse)
    async mySite(@Ctx() ctx: AppContext): Promise<SiteResponse> {
        try {
            const userUuid = ctx.user!.userUuid;
            const site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) return { status: 0, message: "No site yet", data: null };
            const [template, user] = await Promise.all([
                templateRepo.findOne({ where: { id: site.templateId } }),
                userRepo.findOne({ where: { userUuid } }),
            ]);
            if (!template || !user) return { status: 0, message: "Site template is unavailable", data: null };
            return { status: 1, message: "Success", data: toSiteData(site, template, user.userName) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load site", data: null };
        }
    }

    // Saves the chosen template + content. publish=true submits it for admin approval;
    // the currently approved version (if any) stays online until the new one is approved.
    @Authorized("user", "admin")
    @Mutation(() => SiteResponse)
    async saveMySite(
        @Ctx() ctx: AppContext,
        @Arg("templateId", () => Int) templateId: number,
        @Arg("contentJson") contentJson: string,
        @Arg("publish", { defaultValue: false }) publish: boolean,
    ): Promise<SiteResponse> {
        try {
            const userUuid = ctx.user!.userUuid;
            const template = await templateRepo.findOne({ where: { id: templateId, isActive: true } });
            if (!template) return { status: 0, message: "Template not found", data: null };

            const { content, error } = sanitizeContent(contentJson);
            if (error) return { status: 0, message: error, data: null };

            const user = await userRepo.findOne({ where: { userUuid } });
            if (!user) return { status: 0, message: "User not found", data: null };

            let site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) {
                site = new UserSite();
                site.userUuid = userUuid;
                site.isPublished = false;
                site.publishedAt = null;
                site.liveTemplateId = null;
                site.liveContent = null;
                site.reviewNote = null;
                site.reviewedAt = null;
                site.createdAt = new Date();
            }
            site.templateId = template.id;
            site.content = content!;
            if (publish) {
                site.status = "pending";
                site.submittedAt = new Date();
                site.reviewNote = null;
            } else if (site.status !== "pending") {
                site.status = "draft";
            }
            site.updatedAt = new Date();
            const saved = await siteRepo.save(site);

            return {
                status: 1,
                message: publish ? "Submitted for approval. We'll email you once it's live." : "Draft saved",
                data: toSiteData(saved, template, user.userName),
            };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to save site", data: null };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => SiteResponse)
    async unpublishMySite(@Ctx() ctx: AppContext): Promise<SiteResponse> {
        try {
            const site = await siteRepo.findOne({ where: { userUuid: ctx.user!.userUuid } });
            if (!site) return { status: 0, message: "No site yet", data: null };
            site.isPublished = false;
            if (site.status === "pending") site.status = "draft";
            site.updatedAt = new Date();
            await siteRepo.save(site);
            return { status: 1, message: "Website taken offline", data: null };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to unpublish", data: null };
        }
    }

    // --- Admin approval queue ---

    @Authorized("admin")
    @Query(() => SiteReviewListResponse)
    async adminSiteReviews(@Arg("status", { nullable: true }) status?: string): Promise<SiteReviewListResponse> {
        try {
            if (status && status !== "live" && !SITE_STATUSES.includes(status)) return { status: 0, message: "Unknown status" };
            const where = status === "live" ? { isPublished: true } : status ? { status } : {};
            const sites = await siteRepo.find({ where, order: { submittedAt: "DESC", updatedAt: "DESC" } });
            if (sites.length === 0) return { status: 1, message: "Success", data: [] };

            const [templates, users] = await Promise.all([
                templateRepo.find({ where: { id: In([...new Set(sites.map((s) => s.templateId))]) } }),
                userRepo.find({ where: { userUuid: In(sites.map((s) => s.userUuid)) } }),
            ]);
            const templateById = new Map(templates.map((t) => [t.id, t]));
            const userByUuid = new Map(users.map((u) => [u.userUuid, u]));

            const data = sites.flatMap((site) => {
                const template = templateById.get(site.templateId);
                const user = userByUuid.get(site.userUuid);
                return template && user ? [toReview(site, template, user)] : [];
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load reviews" };
        }
    }

    @Authorized("admin")
    @Query(() => SiteReviewResponse)
    async adminSiteReview(@Arg("userUuid") userUuid: string): Promise<SiteReviewResponse> {
        try {
            const site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) return { status: 0, message: "Site not found", data: null };
            const [template, user] = await Promise.all([
                templateRepo.findOne({ where: { id: site.templateId } }),
                userRepo.findOne({ where: { userUuid } }),
            ]);
            if (!template || !user) return { status: 0, message: "Site data is incomplete", data: null };
            return { status: 1, message: "Success", data: toReview(site, template, user) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load site", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminApproveSite(
        @Arg("userUuid") userUuid: string,
        @Arg("note", { nullable: true }) note?: string,
    ): Promise<StatusResponse> {
        try {
            const site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) return { status: 0, message: "Site not found" };
            const user = await userRepo.findOne({ where: { userUuid } });
            if (!user) return { status: 0, message: "User not found" };

            site.liveTemplateId = site.templateId;
            site.liveContent = site.content;
            site.isPublished = true;
            site.status = "approved";
            site.reviewNote = note?.trim() || null;
            site.reviewedAt = new Date();
            site.publishedAt = new Date();
            site.updatedAt = new Date();
            await siteRepo.save(site);

            await sendSiteReviewMail(user.email, true, user.userName, site.reviewNote).catch((e) => console.error("Review mail error:", e));
            return { status: 1, message: `Approved. ${user.userName}'s website is now live.` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Approval failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminRejectSite(
        @Arg("userUuid") userUuid: string,
        @Arg("note") note: string,
    ): Promise<StatusResponse> {
        try {
            if (!note.trim()) return { status: 0, message: "Please give a reason so the user can fix it" };
            const site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) return { status: 0, message: "Site not found" };
            const user = await userRepo.findOne({ where: { userUuid } });
            if (!user) return { status: 0, message: "User not found" };

            site.status = "rejected";
            site.reviewNote = note.trim();
            site.reviewedAt = new Date();
            site.updatedAt = new Date();
            await siteRepo.save(site);

            await sendSiteReviewMail(user.email, false, user.userName, site.reviewNote).catch((e) => console.error("Review mail error:", e));
            return { status: 1, message: "Changes rejected. The user has been notified." };
        } catch (error: any) {
            return { status: 0, message: error.message || "Rejection failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminTakeDownSite(@Arg("userUuid") userUuid: string): Promise<StatusResponse> {
        try {
            const site = await siteRepo.findOne({ where: { userUuid } });
            if (!site) return { status: 0, message: "Site not found" };
            site.isPublished = false;
            site.updatedAt = new Date();
            await siteRepo.save(site);
            return { status: 1, message: "Website taken offline" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Guest (public): only the admin-approved snapshot is ever served ---

    @Query(() => SiteResponse)
    async publishedSite(@Arg("userName") userName: string): Promise<SiteResponse> {
        try {
            const user = await userRepo.findOne({ where: { userName: userName.trim().toLowerCase() } });
            if (!user) return { status: 0, message: "Site not found", data: null };
            const state = await publicState(user.userUuid);
            if (state !== "visible") return { status: 0, message: state, data: null };
            const site = await siteRepo.findOne({ where: { userUuid: user.userUuid, isPublished: true } });
            if (!site || !site.liveTemplateId || !site.liveContent) return { status: 0, message: "Site not published", data: null };
            const template = await templateRepo.findOne({ where: { id: site.liveTemplateId } });
            if (!template) return { status: 0, message: "Site template is unavailable", data: null };
            // Review details are private to the owner and admins
            // Visitors get a scrubbed copy: driver licence numbers masked, licence photos only if the owner chose to show them
            const data = { ...toSiteData(site, template, user.userName, publicSiteContent(site.liveContent) as Record<string, unknown>), status: "approved", reviewNote: null, submittedAt: null, reviewedAt: null };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load site", data: null };
        }
    }
}
