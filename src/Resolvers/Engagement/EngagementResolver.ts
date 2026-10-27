import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int, Float, ObjectType, InputType, Field } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";
import crypto from "crypto";
import { AppDataSource } from "../../Config/DataSource";
import { env } from "../../Config/env";
import { FormSubmission, Review } from "../../Entity/Engagement";
import { User } from "../../Entity/User";
import { UserSite } from "../../Entity/UserSite";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import { publicState } from "../Guest/GuestResolver";
import { sendMail } from "../../Utils/mailer";
import { mainContent, normalizeForms, normalizeReviews, pick, type SiteForm } from "../../Utils/siteConfig";
import { travelFromSiteContent } from "../../Utils/travel";

// ─── GraphQL types ───

@ObjectType()
class CriterionAverage {
    @Field() public id: string;
    @Field(() => Float) public avg: number;
}

@ObjectType()
class RatingSummary {
    @Field() public typeId: string;
    @Field() public target: string;
    @Field(() => String, { nullable: true }) public targetId: string | null;
    @Field(() => Float) public avg: number;
    @Field(() => Int) public count: number;
    @Field(() => [CriterionAverage]) public criteria: CriterionAverage[];
}

@ObjectType()
class PublicReview {
    @Field(() => Int) public id: number;
    @Field() public typeId: string;
    @Field() public target: string;
    @Field(() => String, { nullable: true }) public targetId: string | null;
    @Field(() => Int) public rating: number;
    @Field(() => GraphQLJSONObject) public criteria: Record<string, number>;
    @Field(() => String, { nullable: true }) public comment: string | null;
    @Field() public reviewerName: string;
    @Field(() => String, { nullable: true }) public ownerReply: string | null;
    @Field() public createdAt: Date;
}

@ObjectType()
class PublicReviewsResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => [RatingSummary]) public summary: RatingSummary[];
    @Field(() => [PublicReview]) public reviews: PublicReview[];
}

@InputType()
class ReviewInput {
    @Field() public userName: string;
    @Field() public typeId: string;
    @Field(() => String, { nullable: true }) public targetId?: string | null;
    @Field(() => Int) public rating: number;
    @Field(() => GraphQLJSONObject, { nullable: true }) public criteria?: Record<string, number>;
    @Field({ nullable: true }) public comment?: string;
    @Field() public reviewerName: string;
    @Field({ nullable: true }) public reviewerPhone?: string;
    @Field({ nullable: true }) public lang?: string;
    @Field({ nullable: true }) public company?: string;
}

@ObjectType()
class OwnerReview extends PublicReview {
    @Field() public status: string;
    @Field(() => String, { nullable: true }) public targetName: string | null;
    @Field(() => String, { nullable: true }) public reviewerPhone: string | null;
    @Field() public typeLabel: string;
}

@ObjectType()
class ReviewCounts {
    @Field(() => Int) public pending: number;
    @Field(() => Int) public approved: number;
    @Field(() => Int) public hidden: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
class OwnerReviewsResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => [OwnerReview]) public data: OwnerReview[];
    @Field(() => ReviewCounts, { nullable: true }) public counts?: ReviewCounts | null;
    @Field(() => Float, { nullable: true }) public average?: number | null;
}

@InputType()
class FormAnswerInput {
    @Field() public fieldId: string;
    // Text value, or option indexes for choice fields ("0", "2"), or "true"/"false" for yes/no
    @Field(() => [String]) public values: string[];
}

@InputType()
class FormSubmissionInput {
    @Field() public userName: string;
    @Field() public formId: string;
    @Field(() => [FormAnswerInput]) public answers: FormAnswerInput[];
    @Field({ nullable: true }) public lang?: string;
    @Field({ nullable: true }) public company?: string;
}

@ObjectType()
class FormAnswer {
    @Field() public fieldId: string;
    @Field() public label: string;
    @Field() public value: string;
}

@ObjectType()
class FormSubmissionResult {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => String, { nullable: true }) public ref?: string | null;
    @Field(() => String, { nullable: true }) public whatsapp?: string | null;
    @Field(() => [FormAnswer], { nullable: true }) public answers?: FormAnswer[] | null;
}

@ObjectType()
class OwnerFormSubmission {
    @Field(() => Int) public id: number;
    @Field() public ref: string;
    @Field() public formId: string;
    @Field() public formTitle: string;
    @Field(() => [FormAnswer]) public answers: FormAnswer[];
    @Field() public status: string;
    @Field(() => String, { nullable: true }) public ownerNote: string | null;
    @Field() public lang: string;
    @Field() public createdAt: Date;
}

@ObjectType()
class FormSubmissionCounts {
    @Field(() => Int) public new: number;
    @Field(() => Int) public done: number;
    @Field(() => Int) public archived: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
class OwnerFormSubmissionsResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => [OwnerFormSubmission]) public data: OwnerFormSubmission[];
    @Field(() => FormSubmissionCounts, { nullable: true }) public counts?: FormSubmissionCounts | null;
    // Forms that have submissions (for the filter), id + title
    @Field(() => [FormAnswer]) public forms: FormAnswer[];
}

// ─── Helpers ───

const hits = new Map<string, number[]>();
function limited(bucket: string, ip: string | undefined, max: number, windowMs: number): boolean {
    if (!ip) return false;
    const key = `${bucket}|${ip}`;
    const now = Date.now();
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const over = list.length >= max;
    if (!over) list.push(now);
    hits.set(key, list);
    return over;
}

const normalizePhone = (raw: string) => {
    let d = raw.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function loadPublished(userName: string) {
    const owner = await AppDataSource.getRepository(User).findOne({ where: { userName: userName.trim().toLowerCase() } });
    if (!owner) return null;
    if (await publicState(owner.userUuid) !== "visible") return null;
    const site = await AppDataSource.getRepository(UserSite).findOne({ where: { userUuid: owner.userUuid, isPublished: true } });
    if (!site?.liveContent) return null;
    const main = mainContent(site.liveContent);
    const travel = travelFromSiteContent(site.liveContent);
    return {
        owner, main, travel,
        reviews: normalizeReviews(main.reviews),
        forms: normalizeForms(main.forms),
        whatsapp: travel.bookingWhatsapp || String(main.whatsapp ?? "").replace(/\D/g, ""),
    };
}

// Validates one answer against its field; returns the readable value or an error message
function readAnswer(field: SiteForm["fields"][number], values: string[], lang: string): { value: string } | { error: string } {
    const label = pick(field.label, lang) || "This field";
    const raw = (values[0] ?? "").trim();
    const empty = field.type === "multiselect" ? values.length === 0 : field.type === "checkbox" ? raw !== "true" : raw === "";
    if (empty) return field.required ? { error: `${label} is required` } : { value: field.type === "checkbox" ? "No" : "" };
    const option = (i: string) => {
        const o = field.options[Number(i)];
        return /^\d+$/.test(i) && o ? pick(o, lang) : null;
    };
    switch (field.type) {
        case "text": return raw.length > 300 ? { error: `${label} is too long` } : { value: raw };
        case "textarea": return raw.length > 3000 ? { error: `${label} is too long` } : { value: raw };
        case "number": return /^-?\d+(\.\d+)?$/.test(raw) && raw.length <= 15 ? { value: raw } : { error: `${label} must be a number` };
        case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw) && raw.length <= 255 ? { value: raw.toLowerCase() } : { error: `${label} must be a valid email` };
        case "phone": { const p = normalizePhone(raw); return p ? { value: p } : { error: `${label} must be a 10-digit mobile number` }; }
        case "date": return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? { value: raw } : { error: `${label} must be a date` };
        case "time": return /^\d{2}:\d{2}$/.test(raw) ? { value: raw } : { error: `${label} must be a time` };
        case "select":
        case "radio": { const o = option(raw); return o !== null ? { value: o } : { error: `Choose a valid option for ${label}` }; }
        case "multiselect": {
            const chosen = [...new Set(values)].map(option);
            return chosen.every((x) => x !== null) ? { value: chosen.join(", ") } : { error: `Choose valid options for ${label}` };
        }
        case "checkbox": return { value: "Yes" };
    }
}

const ref = () => `FRM-${Array.from(crypto.randomBytes(6), (b) => "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[b % 32]).join("")}`;

@Resolver()
export class EngagementResolver {

    // ─── Ratings & reviews (public) ───

    @Query(() => PublicReviewsResponse)
    async publicReviews(@Arg("userName") userName: string): Promise<PublicReviewsResponse> {
        try {
            const site = await loadPublished(userName);
            if (!site || !site.reviews.enabled) return { status: 0, message: "Reviews are not enabled", summary: [], reviews: [] };
            const typeIds = site.reviews.types.filter((t) => t.enabled).map((t) => t.id);
            if (typeIds.length === 0) return { status: 1, message: "Success", summary: [], reviews: [] };
            const params = [site.owner.userUuid, typeIds];
            const [summaryRows, criteriaRows, reviews] = await Promise.all([
                AppDataSource.query(`SELECT type_id, target, target_id, AVG(rating)::float AS avg, COUNT(*)::int AS count
                    FROM tbl_reviews WHERE owner_uuid = $1 AND status = 'approved' AND type_id = ANY($2) GROUP BY 1, 2, 3`, params),
                AppDataSource.query(`SELECT r.type_id, r.target_id, c.key AS id, AVG(c.value::numeric)::float AS avg
                    FROM tbl_reviews r, jsonb_each_text(r.criteria) c
                    WHERE r.owner_uuid = $1 AND r.status = 'approved' AND r.type_id = ANY($2) GROUP BY 1, 2, 3`, params),
                AppDataSource.getRepository(Review).createQueryBuilder("r")
                    .where("r.owner_uuid = :o AND r.status = 'approved' AND r.type_id IN (:...t)", { o: site.owner.userUuid, t: typeIds })
                    .orderBy("r.created_at", "DESC").take(300).getMany(),
            ]);
            const summary: RatingSummary[] = summaryRows.map((s: any) => ({
                typeId: s.type_id, target: s.target, targetId: s.target_id, avg: Math.round(s.avg * 10) / 10, count: s.count,
                criteria: criteriaRows.filter((c: any) => c.type_id === s.type_id && c.target_id === s.target_id)
                    .map((c: any) => ({ id: c.id, avg: Math.round(c.avg * 10) / 10 })),
            }));
            return {
                status: 1, message: "Success", summary,
                reviews: reviews.map((r) => ({
                    id: r.id, typeId: r.typeId, target: r.target, targetId: r.targetId, rating: r.rating, criteria: r.criteria ?? {},
                    comment: r.comment, reviewerName: r.reviewerName, ownerReply: r.ownerReply, createdAt: r.createdAt,
                })),
            };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load reviews", summary: [], reviews: [] };
        }
    }

    @Mutation(() => StatusResponse)
    async submitReview(@Arg("input") input: ReviewInput, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        try {
            if (input.company?.trim()) return { status: 1, message: "Thank you for your review" };
            const name = input.reviewerName.trim();
            if (name.length < 2 || name.length > 80) return { status: 0, message: "Please enter your name" };
            if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { status: 0, message: "Choose a rating from 1 to 5 stars" };
            const comment = input.comment?.trim() || null;
            if (comment && comment.length > 2000) return { status: 0, message: "Review is too long (max 2000 characters)" };
            const phone = input.reviewerPhone?.trim() ? normalizePhone(input.reviewerPhone) : null;
            if (input.reviewerPhone?.trim() && !phone) return { status: 0, message: "Enter a valid 10-digit mobile number, or leave it empty" };
            if (limited("review", ctx.ip, 5, 3600_000)) return { status: 0, message: "Too many reviews from this device. Please try again later." };

            const site = await loadPublished(input.userName);
            if (!site || !site.reviews.enabled) return { status: 0, message: "Reviews are not open on this website" };
            const type = site.reviews.types.find((t) => t.id === input.typeId && t.enabled);
            if (!type) return { status: 0, message: "This rating is no longer available" };

            // Driver / vehicle reviews must point at one that exists on the published site
            let targetId: string | null = null, targetName: string | null = null;
            if (type.target !== "business") {
                const list = type.target === "driver" ? site.travel.drivers : site.travel.vehicles;
                const item = list.find((x) => x.id === input.targetId && x.name);
                if (!item) return { status: 0, message: `Choose the ${type.target} you are reviewing` };
                targetId = item.id;
                targetName = item.name;
            }
            const criteria: Record<string, number> = {};
            for (const c of type.criteria) {
                const v = input.criteria?.[c.id];
                if (v !== undefined && v !== null) {
                    if (!Number.isInteger(v) || v < 1 || v > 5) return { status: 0, message: "Sub-ratings must be 1 to 5 stars" };
                    criteria[c.id] = v;
                }
            }
            if (phone && await AppDataSource.getRepository(Review).count({ where: { ownerUuid: site.owner.userUuid, typeId: type.id, targetId: targetId ?? undefined, reviewerPhone: phone } })) {
                return { status: 0, message: "You have already reviewed this. Thank you!" };
            }

            const status = site.reviews.moderation === "auto" ? "approved" : "pending";
            const repo = AppDataSource.getRepository(Review);
            await repo.save(repo.create({
                ownerUuid: site.owner.userUuid, typeId: type.id, target: type.target, targetId, targetName,
                rating: input.rating, criteria, comment, reviewerName: name, reviewerPhone: phone, status, ownerReply: null,
                lang: input.lang === "ta" ? "ta" : "en", ip: ctx.ip ?? null, createdAt: new Date(), updatedAt: new Date(),
            }));
            sendMail(site.owner.email, `New ${input.rating}★ review on your website`,
                `<p><strong>${escapeHtml(name)}</strong> rated ${escapeHtml(pick(type.label, "en"))}${targetName ? ` (${escapeHtml(targetName)})` : ""}: ${input.rating}/5</p>${comment ? `<blockquote>${escapeHtml(comment)}</blockquote>` : ""}<p><a href="${env.FRONTEND_URL}/user/reviews">Open your reviews</a></p>`,
                `${name} rated ${input.rating}/5. ${env.FRONTEND_URL}/user/reviews`,
            ).catch(() => undefined);
            return { status: 1, message: status === "approved" ? "Thank you! Your review is now live." : "Thank you! Your review will appear after the owner approves it." };
        } catch (error: any) {
            return { status: 0, message: error.message || "Could not save your review" };
        }
    }

    // ─── Ratings & reviews (owner) ───

    @Authorized()
    @Query(() => OwnerReviewsResponse)
    async myReviews(@Arg("status", { nullable: true }) status: string, @Ctx() ctx: AppContext): Promise<OwnerReviewsResponse> {
        try {
            const owner = ctx.user!.userUuid;
            const site = await AppDataSource.getRepository(UserSite).findOne({ where: { userUuid: owner } });
            const types = normalizeReviews(mainContent(site?.content).reviews).types;
            const qb = AppDataSource.getRepository(Review).createQueryBuilder("r").where("r.owner_uuid = :owner", { owner });
            if (status && ["pending", "approved", "hidden"].includes(status)) qb.andWhere("r.status = :status", { status });
            const [rows, [c]] = await Promise.all([
                qb.orderBy("r.created_at", "DESC").take(300).getMany(),
                AppDataSource.query(`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending, COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
                    COUNT(*) FILTER (WHERE status = 'hidden')::int AS hidden, COUNT(*)::int AS all,
                    AVG(rating) FILTER (WHERE status = 'approved')::float AS average FROM tbl_reviews WHERE owner_uuid = $1`, [owner]),
            ]);
            return {
                status: 1, message: "Success", counts: c, average: c.average ? Math.round(c.average * 10) / 10 : null,
                data: rows.map((r) => ({
                    id: r.id, typeId: r.typeId, target: r.target, targetId: r.targetId, rating: r.rating, criteria: r.criteria ?? {},
                    comment: r.comment, reviewerName: r.reviewerName, ownerReply: r.ownerReply, createdAt: r.createdAt,
                    status: r.status, targetName: r.targetName, reviewerPhone: r.reviewerPhone,
                    typeLabel: pick(types.find((t) => t.id === r.typeId)?.label ?? { en: r.typeId, ta: "" }, "en") || r.typeId,
                })),
            };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load reviews", data: [] };
        }
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async moderateMyReview(
        @Arg("id", () => Int) id: number,
        @Arg("status", { nullable: true }) status: string,
        @Arg("ownerReply", { nullable: true }) ownerReply: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        const repo = AppDataSource.getRepository(Review);
        const r = await repo.findOne({ where: { id, ownerUuid: ctx.user!.userUuid } });
        if (!r) return { status: 0, message: "Review not found" };
        if (status) {
            if (!["pending", "approved", "hidden"].includes(status)) return { status: 0, message: "Unknown status" };
            r.status = status;
        }
        if (ownerReply !== undefined && ownerReply !== null) r.ownerReply = ownerReply.trim().slice(0, 1000) || null;
        r.updatedAt = new Date();
        await repo.save(r);
        return { status: 1, message: status === "approved" ? "Review published" : status === "hidden" ? "Review hidden" : "Review updated" };
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async deleteMyReview(@Arg("id", () => Int) id: number, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        const result = await AppDataSource.getRepository(Review).delete({ id, ownerUuid: ctx.user!.userUuid });
        return result.affected ? { status: 1, message: "Review deleted" } : { status: 0, message: "Review not found" };
    }

    // ─── Custom forms (public) ───

    @Mutation(() => FormSubmissionResult)
    async submitSiteForm(@Arg("input") input: FormSubmissionInput, @Ctx() ctx: AppContext): Promise<FormSubmissionResult> {
        try {
            if (input.company?.trim()) return { status: 1, message: "Thank you" };
            if (limited("form", ctx.ip, 10, 3600_000)) return { status: 0, message: "Too many submissions from this device. Please try again later." };
            const site = await loadPublished(input.userName);
            const form = site?.forms.find((f) => f.id === input.formId && f.enabled);
            if (!site || !form) return { status: 0, message: "This form is not available" };
            const lang = input.lang === "ta" ? "ta" : "en";

            const byId = new Map(input.answers.map((a) => [a.fieldId, a.values.slice(0, 30).map((v) => String(v).slice(0, 3000))]));
            const answers: FormAnswer[] = [];
            for (const field of form.fields) {
                const result = readAnswer(field, byId.get(field.id) ?? [], lang);
                if ("error" in result) return { status: 0, message: result.error };
                if (result.value) answers.push({ fieldId: field.id, label: pick(field.label, lang) || field.id, value: result.value });
            }
            if (answers.length === 0) return { status: 0, message: "Please fill in the form" };

            const repo = AppDataSource.getRepository(FormSubmission);
            const saved = await repo.save(repo.create({
                ref: ref(), ownerUuid: site.owner.userUuid, formId: form.id, formTitle: pick(form.title, "en") || pick(form.title, "ta") || "Form",
                answers, status: "new", ownerNote: null, lang, ip: ctx.ip ?? null, createdAt: new Date(), updatedAt: new Date(),
            }));
            sendMail(site.owner.email, `New "${saved.formTitle}" submission ${saved.ref}`,
                `<p>New submission for <strong>${escapeHtml(saved.formTitle)}</strong>:</p><ul>${answers.map((a) => `<li><strong>${escapeHtml(a.label)}:</strong> ${escapeHtml(a.value)}</li>`).join("")}</ul><p><a href="${env.FRONTEND_URL}/user/forms">Open submissions</a></p>`,
                `${saved.formTitle} ${saved.ref}\n${answers.map((a) => `${a.label}: ${a.value}`).join("\n")}`,
            ).catch(() => undefined);
            return { status: 1, message: "Submitted", ref: saved.ref, whatsapp: form.whatsapp && site.whatsapp ? site.whatsapp : null, answers };
        } catch (error: any) {
            return { status: 0, message: error.message || "Could not submit the form" };
        }
    }

    // ─── Custom forms (owner) ───

    @Authorized()
    @Query(() => OwnerFormSubmissionsResponse)
    async myFormSubmissions(
        @Arg("formId", { nullable: true }) formId: string,
        @Arg("status", { nullable: true }) status: string,
        @Ctx() ctx: AppContext,
    ): Promise<OwnerFormSubmissionsResponse> {
        try {
            const owner = ctx.user!.userUuid;
            const qb = AppDataSource.getRepository(FormSubmission).createQueryBuilder("s").where("s.owner_uuid = :owner", { owner });
            if (formId) qb.andWhere("s.form_id = :formId", { formId });
            if (status && ["new", "done", "archived"].includes(status)) qb.andWhere("s.status = :status", { status });
            const [rows, [c], forms] = await Promise.all([
                qb.orderBy("s.created_at", "DESC").take(300).getMany(),
                AppDataSource.query(`SELECT COUNT(*) FILTER (WHERE status = 'new')::int AS new, COUNT(*) FILTER (WHERE status = 'done')::int AS done,
                    COUNT(*) FILTER (WHERE status = 'archived')::int AS archived, COUNT(*)::int AS all FROM tbl_form_submissions WHERE owner_uuid = $1`, [owner]),
                AppDataSource.query(`SELECT form_id, MAX(form_title) AS title FROM tbl_form_submissions WHERE owner_uuid = $1 GROUP BY form_id ORDER BY title`, [owner]),
            ]);
            return {
                status: 1, message: "Success", counts: c,
                forms: forms.map((f: any) => ({ fieldId: f.form_id, label: f.title, value: "" })),
                data: rows.map((s) => ({ id: s.id, ref: s.ref, formId: s.formId, formTitle: s.formTitle, answers: s.answers, status: s.status, ownerNote: s.ownerNote, lang: s.lang, createdAt: s.createdAt })),
            };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load submissions", data: [], forms: [] };
        }
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async updateMyFormSubmission(
        @Arg("id", () => Int) id: number,
        @Arg("status", { nullable: true }) status: string,
        @Arg("ownerNote", { nullable: true }) ownerNote: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        const repo = AppDataSource.getRepository(FormSubmission);
        const s = await repo.findOne({ where: { id, ownerUuid: ctx.user!.userUuid } });
        if (!s) return { status: 0, message: "Submission not found" };
        if (status) {
            if (!["new", "done", "archived"].includes(status)) return { status: 0, message: "Unknown status" };
            s.status = status;
        }
        if (ownerNote !== undefined && ownerNote !== null) s.ownerNote = ownerNote.trim().slice(0, 2000) || null;
        s.updatedAt = new Date();
        await repo.save(s);
        return { status: 1, message: `${s.ref} updated` };
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async deleteMyFormSubmission(@Arg("id", () => Int) id: number, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        const result = await AppDataSource.getRepository(FormSubmission).delete({ id, ownerUuid: ctx.user!.userUuid });
        return result.affected ? { status: 1, message: "Submission deleted" } : { status: 0, message: "Submission not found" };
    }
}
