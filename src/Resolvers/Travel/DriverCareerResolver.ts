import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int, ObjectType, InputType, Field } from "type-graphql";
import { GraphQLUpload } from "graphql-upload-ts";
import crypto from "crypto";
import type { Readable } from "stream";
import { AppDataSource } from "../../Config/DataSource";
import { env } from "../../Config/env";
import { DriverApplication } from "../../Entity/DriverApplication";
import { User } from "../../Entity/User";
import { UserSite } from "../../Entity/UserSite";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import { sendMail } from "../../Utils/mailer";
import { deletePrivateImage, InvalidImageError, signedPrivateUrl, storePrivateImage, UploadTooLargeError } from "../../Utils/storage";
import { maskLicense, travelFromSiteContent } from "../../Utils/travel";

type FileUpload = { filename: string; mimetype: string; createReadStream: () => NodeJS.ReadableStream };

const LICENSE_TYPES = ["LMV", "LMV-TR", "HMV"];
const AVAILABILITY = ["full-time", "part-time", "weekends", "on-call"];
const PREFERENCES = ["city", "outstation", "both"];
const VEHICLE_TYPES = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller", "Mini bus", "Bus", "Luxury"];
const STATUSES = ["new", "shortlisted", "hired", "rejected"];

@InputType()
export class DriverApplicationInput {
    @Field() public userName: string;
    @Field() public fullName: string;
    @Field() public phone: string;
    @Field({ nullable: true }) public email?: string;
    @Field(() => Int, { nullable: true }) public age?: number;
    @Field() public area: string;
    @Field(() => Int) public experienceYears: number;
    @Field() public licenseNumber: string;
    @Field() public licenseType: string;
    @Field() public licenseValidTill: string;
    @Field(() => [String]) public vehicleTypes: string[];
    @Field({ nullable: true }) public languages?: string;
    @Field() public availability: string;
    @Field() public tripPreference: string;
    @Field({ nullable: true }) public expectedSalary?: string;
    @Field({ nullable: true }) public ownVehicle?: string;
    @Field({ nullable: true }) public about?: string;
    @Field() public consent: boolean;
    @Field({ nullable: true }) public lang?: string;
    // Honeypot
    @Field({ nullable: true }) public company?: string;
}

@ObjectType()
export class DriverApplicationResult {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => String, { nullable: true }) public ref?: string | null;
    @Field(() => String, { nullable: true }) public whatsapp?: string | null;
}

// Owner view; document fields are signed links that expire after an hour
@ObjectType()
export class DriverApplicationView {
    @Field(() => Int) public id: number;
    @Field() public ref: string;
    @Field() public status: string;
    @Field() public fullName: string;
    @Field() public phone: string;
    @Field(() => String, { nullable: true }) public email: string | null;
    @Field(() => Int, { nullable: true }) public age: number | null;
    @Field() public area: string;
    @Field(() => Int) public experienceYears: number;
    @Field() public licenseNumber: string;
    @Field() public licenseType: string;
    @Field() public licenseValidTill: string;
    @Field(() => [String]) public vehicleTypes: string[];
    @Field() public languages: string;
    @Field() public availability: string;
    @Field() public tripPreference: string;
    @Field(() => String, { nullable: true }) public expectedSalary: string | null;
    @Field(() => String, { nullable: true }) public ownVehicle: string | null;
    @Field(() => String, { nullable: true }) public about: string | null;
    @Field(() => String, { nullable: true }) public photoUrl: string | null;
    @Field(() => String, { nullable: true }) public licenseFrontUrl: string | null;
    @Field(() => String, { nullable: true }) public licenseBackUrl: string | null;
    @Field(() => String, { nullable: true }) public ownerNote: string | null;
    @Field() public lang: string;
    @Field() public createdAt: Date;
}

@ObjectType()
export class DriverApplicationCounts {
    @Field(() => Int) public new: number;
    @Field(() => Int) public shortlisted: number;
    @Field(() => Int) public hired: number;
    @Field(() => Int) public rejected: number;
    @Field(() => Int) public all: number;
}

@ObjectType()
export class DriverApplicationListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [DriverApplicationView]) public data: DriverApplicationView[];
    @Field(() => DriverApplicationCounts, { nullable: true }) public counts?: DriverApplicationCounts | null;
}

// Per-IP throttle: a handful of applications per hour is plenty for a real person
const hits = new Map<string, number[]>();
function limited(ip: string | undefined): boolean {
    if (!ip) return false;
    const now = Date.now();
    const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
    const over = list.length >= 3;
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

function applicationRef(): string {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    return `DRV-${Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join("")}`;
}

const toView = (a: DriverApplication): DriverApplicationView => ({
    id: a.id, ref: a.ref, status: a.status, fullName: a.fullName, phone: a.phone, email: a.email, age: a.age, area: a.area,
    experienceYears: a.experienceYears, licenseNumber: a.licenseNumber, licenseType: a.licenseType, licenseValidTill: a.licenseValidTill,
    vehicleTypes: a.vehicleTypes ?? [], languages: a.languages, availability: a.availability, tripPreference: a.tripPreference,
    expectedSalary: a.expectedSalary, ownVehicle: a.ownVehicle, about: a.about,
    photoUrl: signedPrivateUrl(a.photoKey), licenseFrontUrl: signedPrivateUrl(a.licenseFrontKey), licenseBackUrl: signedPrivateUrl(a.licenseBackKey),
    ownerNote: a.ownerNote, lang: a.lang, createdAt: a.createdAt,
});

async function saveFile(file: Promise<FileUpload> | FileUpload | null | undefined, folder: string): Promise<string | null> {
    if (!file) return null;
    const { createReadStream } = await file;
    return storePrivateImage(createReadStream() as unknown as Readable, folder);
}

@Resolver()
export class DriverCareerResolver {

    // --- Public: "Drive with us" form on travels websites ---

    @Mutation(() => DriverApplicationResult)
    async applyAsDriver(
        @Arg("input") input: DriverApplicationInput,
        @Arg("photo", () => GraphQLUpload) photo: Promise<FileUpload> | FileUpload,
        @Arg("licenseFront", () => GraphQLUpload) licenseFront: Promise<FileUpload> | FileUpload,
        @Arg("licenseBack", () => GraphQLUpload, { nullable: true }) licenseBack: Promise<FileUpload> | FileUpload | null,
        @Ctx() ctx: AppContext,
    ): Promise<DriverApplicationResult> {
        const stored: string[] = [];
        try {
            if (input.company?.trim()) return { status: 1, message: "Application received" };
            const fullName = input.fullName.trim();
            const phone = normalizePhone(input.phone);
            const email = input.email?.trim().toLowerCase() || null;
            const licenseNumber = input.licenseNumber.replace(/[\s-]/g, "").toUpperCase();
            if (fullName.length < 2 || fullName.length > 120) return { status: 0, message: "Please enter your full name" };
            if (!phone) return { status: 0, message: "Please enter a valid 10-digit mobile number" };
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: 0, message: "Please enter a valid email address" };
            if (input.age !== undefined && input.age !== null && (input.age < 18 || input.age > 70)) return { status: 0, message: "Drivers must be between 18 and 70 years old" };
            if (input.area.trim().length < 2) return { status: 0, message: "Please enter your area / city" };
            if (input.experienceYears < 0 || input.experienceYears > 60) return { status: 0, message: "Please enter your driving experience" };
            // Indian DL: 2-letter state + RTO code + year + number, 13–16 characters without spaces
            if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{9,12}$/.test(licenseNumber)) return { status: 0, message: "Please enter a valid driving licence number (e.g. TN09 20150001234)" };
            if (!LICENSE_TYPES.includes(input.licenseType)) return { status: 0, message: "Choose your licence type" };
            if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(input.licenseValidTill)) return { status: 0, message: "Enter the licence validity date" };
            if (new Date(input.licenseValidTill) < new Date(new Date().toDateString())) return { status: 0, message: "Your licence has expired. Please renew it before applying." };
            if (!AVAILABILITY.includes(input.availability)) return { status: 0, message: "Choose your availability" };
            if (!PREFERENCES.includes(input.tripPreference)) return { status: 0, message: "Choose city or outstation trips" };
            const vehicleTypes = [...new Set(input.vehicleTypes.filter((v) => VEHICLE_TYPES.includes(v)))];
            if (vehicleTypes.length === 0) return { status: 0, message: "Choose the vehicles you can drive" };
            if (!input.consent) return { status: 0, message: "Please agree to share your details with the travels owner" };
            if (limited(ctx.ip)) return { status: 0, message: "Too many applications from this device. Please try again later." };

            const owner = await AppDataSource.getRepository(User).findOne({ where: { userName: input.userName.trim().toLowerCase() } });
            if (!owner) return { status: 0, message: "This website no longer exists" };
            const site = await AppDataSource.getRepository(UserSite).findOne({ where: { userUuid: owner.userUuid, isPublished: true } });
            const cfg = travelFromSiteContent(site?.liveContent);
            if (!site?.liveContent || !cfg.enabled || !cfg.driverHiring) return { status: 0, message: "This travels service is not accepting driver applications right now" };

            const repo = AppDataSource.getRepository(DriverApplication);
            if (await repo.count({ where: { ownerUuid: owner.userUuid, phone, status: "new" } })) {
                return { status: 0, message: "We already have your application. The owner will contact you soon." };
            }

            // Documents go to private storage; only the owner sees them, through expiring links
            const folder = `driver-apps/${owner.userUuid}`;
            const photoKey = await saveFile(photo, folder); if (photoKey) stored.push(photoKey);
            const frontKey = await saveFile(licenseFront, folder); if (frontKey) stored.push(frontKey);
            const backKey = await saveFile(licenseBack, folder); if (backKey) stored.push(backKey);

            const app = await repo.save(repo.create({
                ref: applicationRef(), ownerUuid: owner.userUuid, status: "new",
                fullName, phone, email, age: input.age ?? null, area: input.area.trim().slice(0, 200),
                experienceYears: Math.round(input.experienceYears), licenseNumber, licenseType: input.licenseType,
                licenseValidTill: input.licenseValidTill, vehicleTypes, languages: (input.languages ?? "").trim().slice(0, 200),
                availability: input.availability, tripPreference: input.tripPreference,
                expectedSalary: input.expectedSalary?.trim().slice(0, 60) || null, ownVehicle: input.ownVehicle?.trim().slice(0, 120) || null,
                about: input.about?.trim().slice(0, 1500) || null,
                photoKey, licenseFrontKey: frontKey, licenseBackKey: backKey, ownerNote: null,
                lang: input.lang === "ta" ? "ta" : "en", ip: ctx.ip ?? null, createdAt: new Date(), updatedAt: new Date(),
            }));

            sendMail(
                owner.email,
                `New driver application ${app.ref}: ${fullName}`,
                `<p><strong>${escapeHtml(fullName)}</strong> (${phone}) applied to drive for you.</p>
                 <p>${app.experienceYears} years experience · ${escapeHtml(app.licenseType)} licence ${escapeHtml(maskLicense(licenseNumber))} · ${escapeHtml(app.area)}</p>
                 <p><a href="${env.FRONTEND_URL}/user/drivers">Review the application and documents</a></p>`,
                `${fullName} (${phone}) applied to drive for you (${app.ref}). Review: ${env.FRONTEND_URL}/user/drivers`,
            ).catch((error) => console.log("Driver application mail failed:", error.message));

            const content: any = site.liveContent;
            const main = content.languages?.[content.defaultLang] ?? content.languages?.en ?? content;
            const whatsapp = cfg.bookingWhatsapp || String(main?.whatsapp ?? "").replace(/\D/g, "");
            return { status: 1, message: "Application received", ref: app.ref, whatsapp: whatsapp || null };
        } catch (error: any) {
            // Don't leave orphaned documents behind when the save fails
            await Promise.all(stored.map(deletePrivateImage));
            if (error instanceof UploadTooLargeError || error instanceof InvalidImageError) return { status: 0, message: error.message };
            console.error("Driver application error:", error);
            return { status: 0, message: "Could not submit your application. Please try again." };
        }
    }

    // --- Owner: applications for their travels service ---

    @Authorized()
    @Query(() => DriverApplicationListResponse)
    async myDriverApplications(
        @Arg("status", { nullable: true }) status: string,
        @Arg("search", { nullable: true }) search: string,
        @Ctx() ctx: AppContext,
    ): Promise<DriverApplicationListResponse> {
        try {
            const owner = ctx.user!.userUuid;
            const qb = AppDataSource.getRepository(DriverApplication).createQueryBuilder("a").where("a.owner_uuid = :owner", { owner });
            if (status && STATUSES.includes(status)) qb.andWhere("a.status = :status", { status });
            if (search?.trim()) qb.andWhere("(a.full_name ILIKE :s OR a.phone ILIKE :s OR a.area ILIKE :s OR a.ref ILIKE :s)", { s: `%${search.trim()}%` });
            const [[rows, total], [c]] = await Promise.all([
                qb.orderBy("a.created_at", "DESC").take(200).getManyAndCount(),
                AppDataSource.query(`SELECT COUNT(*) FILTER (WHERE status = 'new') AS new, COUNT(*) FILTER (WHERE status = 'shortlisted') AS shortlisted,
                    COUNT(*) FILTER (WHERE status = 'hired') AS hired, COUNT(*) FILTER (WHERE status = 'rejected') AS rejected, COUNT(*) AS all
                    FROM tbl_driver_applications WHERE owner_uuid = $1`, [owner]),
            ]);
            return {
                status: 1, message: "Success", total, data: rows.map(toView),
                counts: { new: +c.new, shortlisted: +c.shortlisted, hired: +c.hired, rejected: +c.rejected, all: +c.all },
            };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load applications", total: 0, data: [] };
        }
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async updateMyDriverApplication(
        @Arg("id", () => Int) id: number,
        @Arg("status", { nullable: true }) status: string,
        @Arg("ownerNote", { nullable: true }) ownerNote: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        try {
            const repo = AppDataSource.getRepository(DriverApplication);
            const app = await repo.findOne({ where: { id, ownerUuid: ctx.user!.userUuid } });
            if (!app) return { status: 0, message: "Application not found" };
            if (status !== undefined && status !== null) {
                if (!STATUSES.includes(status)) return { status: 0, message: "Unknown status" };
                app.status = status;
            }
            if (ownerNote !== undefined && ownerNote !== null) app.ownerNote = ownerNote.trim().slice(0, 2000) || null;
            app.updatedAt = new Date();
            await repo.save(app);
            return { status: 1, message: `${app.fullName}: ${app.status}` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update application" };
        }
    }

    // Removes the application and its documents for good (privacy: applicants can ask for this)
    @Authorized()
    @Mutation(() => StatusResponse)
    async deleteMyDriverApplication(@Arg("id", () => Int) id: number, @Ctx() ctx: AppContext): Promise<StatusResponse> {
        try {
            const repo = AppDataSource.getRepository(DriverApplication);
            const app = await repo.findOne({ where: { id, ownerUuid: ctx.user!.userUuid } });
            if (!app) return { status: 0, message: "Application not found" };
            await Promise.all([app.photoKey, app.licenseFrontKey, app.licenseBackKey].map(deletePrivateImage));
            await repo.delete({ id });
            return { status: 1, message: `Application ${app.ref} and its documents deleted` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to delete application" };
        }
    }
}
