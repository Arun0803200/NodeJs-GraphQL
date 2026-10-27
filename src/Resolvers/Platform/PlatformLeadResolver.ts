import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int, ObjectType, InputType, Field } from "type-graphql";
import crypto from "crypto";
import { AppDataSource } from "../../Config/DataSource";
import { env } from "../../Config/env";
import { PlatformLead } from "../../Entity/PlatformLead";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import { sendMail } from "../../Utils/mailer";

const PURPOSES = ["new-website", "pricing", "support", "partnership", "other"];
const STATUSES = ["new", "contacted", "converted", "closed"];

@ObjectType()
class PlatformContactInfo {
    // Whether a WhatsApp number is configured (ADMIN_WHATSAPP); the form still saves enquiries without it
    @Field() public whatsappEnabled: boolean;
}

@InputType()
class PlatformLeadInput {
    @Field() public name: string;
    @Field() public phone: string;
    @Field({ nullable: true }) public email?: string;
    @Field() public purpose: string;
    @Field() public message: string;
    @Field() public source: string;
    @Field({ nullable: true }) public pageUrl?: string;
    @Field({ nullable: true }) public lang?: string;
    @Field({ nullable: true }) public company?: string;
}

@ObjectType()
class PlatformLeadResult {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => String, { nullable: true }) public ref?: string | null;
    // Platform WhatsApp number the browser opens with the enquiry
    @Field(() => String, { nullable: true }) public whatsapp?: string | null;
}

@ObjectType()
class PlatformLeadView {
    @Field(() => Int) public id: number;
    @Field() public ref: string;
    @Field() public name: string;
    @Field() public phone: string;
    @Field(() => String, { nullable: true }) public email: string | null;
    @Field() public purpose: string;
    @Field() public message: string;
    @Field() public source: string;
    @Field(() => String, { nullable: true }) public pageUrl: string | null;
    @Field() public status: string;
    @Field(() => String, { nullable: true }) public adminNote: string | null;
    @Field() public lang: string;
    @Field() public createdAt: Date;
}

@ObjectType()
class PlatformLeadCounts {
    @Field(() => Int) public new: number;
    @Field(() => Int) public contacted: number;
    @Field(() => Int) public converted: number;
    @Field(() => Int) public closed: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
class PlatformLeadListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [PlatformLeadView]) public data: PlatformLeadView[];
    @Field(() => PlatformLeadCounts, { nullable: true }) public counts?: PlatformLeadCounts | null;
}

const hits = new Map<string, number[]>();
function limited(ip: string | undefined): boolean {
    if (!ip) return false;
    const now = Date.now();
    const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
    const over = list.length >= 5;
    if (!over) list.push(now);
    hits.set(ip, list);
    return over;
}

function normalizePhone(raw: string): string | null {
    let d = raw.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const leadRef = () => `ENQ-${Array.from(crypto.randomBytes(6), (b) => "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[b % 32]).join("")}`;

@Resolver()
export class PlatformLeadResolver {

    @Query(() => PlatformContactInfo)
    platformContact(): PlatformContactInfo {
        return { whatsappEnabled: Boolean(env.ADMIN_WHATSAPP) };
    }

    // Public: "Contact us" form on every website and the storefront
    @Mutation(() => PlatformLeadResult)
    async contactPlatform(@Arg("input") input: PlatformLeadInput, @Ctx() ctx: AppContext): Promise<PlatformLeadResult> {
        try {
            if (input.company?.trim()) return { status: 1, message: "Thank you" };
            const name = input.name.trim();
            const phone = normalizePhone(input.phone);
            const email = input.email?.trim().toLowerCase() || null;
            const message = input.message.trim();
            if (name.length < 2 || name.length > 120) return { status: 0, message: "Please enter your name" };
            if (!phone) return { status: 0, message: "Please enter a valid 10-digit mobile number" };
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: 0, message: "Please enter a valid email address" };
            if (!PURPOSES.includes(input.purpose)) return { status: 0, message: "Choose what you need help with" };
            if (message.length < 5) return { status: 0, message: "Please write a short message" };
            if (message.length > 2000) return { status: 0, message: "Message is too long (max 2000 characters)" };
            if (limited(ctx.ip)) return { status: 0, message: "Too many enquiries from this device. Please try again later." };

            const repo = AppDataSource.getRepository(PlatformLead);
            const lead = await repo.save(repo.create({
                ref: leadRef(), name, phone, email, purpose: input.purpose, message,
                source: input.source.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80) || "storefront",
                pageUrl: input.pageUrl?.slice(0, 300) || null, status: "new", adminNote: null,
                lang: input.lang === "ta" ? "ta" : "en", ip: ctx.ip ?? null, createdAt: new Date(), updatedAt: new Date(),
            }));

            if (env.ADMIN_EMAIL) {
                sendMail(env.ADMIN_EMAIL, `New enquiry ${lead.ref} from ${name}`,
                    `<p><strong>${escapeHtml(name)}</strong> (${phone}${email ? `, ${escapeHtml(email)}` : ""}) — ${escapeHtml(input.purpose)} — from ${escapeHtml(lead.source)}</p><blockquote style="white-space:pre-wrap">${escapeHtml(message)}</blockquote><p><a href="${env.FRONTEND_URL}/admin/enquiries">Open enquiries</a></p>`,
                    `${name} (${phone}) ${input.purpose} from ${lead.source}:\n${message}\n${env.FRONTEND_URL}/admin/enquiries`,
                ).catch(() => undefined);
            }
            return { status: 1, message: "Enquiry received", ref: lead.ref, whatsapp: env.ADMIN_WHATSAPP || null };
        } catch (error: any) {
            return { status: 0, message: error.message || "Could not send your enquiry" };
        }
    }

    // Admin: list and follow up
    @Authorized("admin")
    @Query(() => PlatformLeadListResponse)
    async adminPlatformLeads(
        @Arg("status", { nullable: true }) status: string,
        @Arg("search", { nullable: true }) search: string,
    ): Promise<PlatformLeadListResponse> {
        try {
            const qb = AppDataSource.getRepository(PlatformLead).createQueryBuilder("l");
            if (status && STATUSES.includes(status)) qb.andWhere("l.status = :status", { status });
            if (search?.trim()) qb.andWhere("(l.name ILIKE :s OR l.phone ILIKE :s OR l.email ILIKE :s OR l.message ILIKE :s OR l.ref ILIKE :s OR l.source ILIKE :s)", { s: `%${search.trim()}%` });
            const [[rows, total], [c]] = await Promise.all([
                qb.orderBy("l.created_at", "DESC").take(300).getManyAndCount(),
                AppDataSource.query(`SELECT COUNT(*) FILTER (WHERE status = 'new')::int AS new, COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted,
                    COUNT(*) FILTER (WHERE status = 'converted')::int AS converted, COUNT(*) FILTER (WHERE status = 'closed')::int AS closed, COUNT(*)::int AS all
                    FROM tbl_platform_leads`),
            ]);
            return { status: 1, message: "Success", total, data: rows, counts: c };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load enquiries", total: 0, data: [] };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminUpdatePlatformLead(
        @Arg("id", () => Int) id: number,
        @Arg("status", { nullable: true }) status: string,
        @Arg("adminNote", { nullable: true }) adminNote: string,
    ): Promise<StatusResponse> {
        const repo = AppDataSource.getRepository(PlatformLead);
        const lead = await repo.findOne({ where: { id } });
        if (!lead) return { status: 0, message: "Enquiry not found" };
        if (status) {
            if (!STATUSES.includes(status)) return { status: 0, message: "Unknown status" };
            lead.status = status;
        }
        if (adminNote !== undefined && adminNote !== null) lead.adminNote = adminNote.trim().slice(0, 2000) || null;
        lead.updatedAt = new Date();
        await repo.save(lead);
        return { status: 1, message: `${lead.ref} updated` };
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminDeletePlatformLead(@Arg("id", () => Int) id: number): Promise<StatusResponse> {
        const result = await AppDataSource.getRepository(PlatformLead).delete({ id });
        return result.affected ? { status: 1, message: "Enquiry deleted" } : { status: 0, message: "Enquiry not found" };
    }
}
