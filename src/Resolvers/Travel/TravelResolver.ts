import { Resolver, Query, Mutation, Arg, Authorized, Ctx, Int, Float } from "type-graphql";
import crypto from "crypto";
import { AppDataSource } from "../../Config/DataSource";
import { env } from "../../Config/env";
import { TripBooking } from "../../Entity/TripBooking";
import { User } from "../../Entity/User";
import { UserSite } from "../../Entity/UserSite";
import type { AppContext } from "../../Middleware/authChecker";
import { StatusResponse } from "../../Responses/StatusResponse";
import {
    PlaceListResponse, TripBookingCounts, TripBookingFilter, TripBookingInput, TripBookingListResponse, TripBookingResult,
    TripQuote, TripQuoteInput, TripQuoteResponse,
} from "../../Responses/TravelResponses";
import { sendMail } from "../../Utils/mailer";
import {
    computeFare, getRoute, maskLicense, normalizeTravel, reversePlace, searchPlaces, travelFromSiteContent,
    type FareQuote, type RouteInfo, type TravelConfig, type TripType,
} from "../../Utils/travel";

const TRIP_TYPES: TripType[] = ["city", "oneway", "round"];
const STATUSES = ["new", "confirmed", "completed", "cancelled"];
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

// Per-IP throttles for the public endpoints
const hits = new Map<string, number[]>();
function limited(bucket: string, ip: string | undefined, max: number, windowMs: number): boolean {
    if (!ip) return false;
    const key = `${bucket}|${ip}`;
    const now = Date.now();
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const over = list.length >= max;
    if (!over) list.push(now);
    hits.set(key, list);
    if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return over;
}

const validCoord = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const parseLocal = (s?: string | null) => (s && LOCAL_DT.test(s) ? new Date(s.length === 10 ? `${s}T00:00` : s) : null);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// 10-digit Indian mobile, accepting +91 / 0 prefixes and spaces
function normalizePhone(raw: string): string | null {
    let d = raw.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
}

// Owner + their published travel settings
async function loadPublishedTravel(userName: string): Promise<{ owner: User; cfg: TravelConfig; whatsapp: string } | string> {
    const owner = await AppDataSource.getRepository(User).findOne({ where: { userName: userName.trim().toLowerCase() } });
    if (!owner) return "This website no longer exists";
    const site = await AppDataSource.getRepository(UserSite).findOne({ where: { userUuid: owner.userUuid, isPublished: true } });
    if (!site?.liveContent) return "This website is not published";
    const cfg = travelFromSiteContent(site.liveContent);
    if (!cfg.enabled) return "Online booking is not enabled on this website";
    const content: any = site.liveContent;
    const main = content.languages?.[content.defaultLang] ?? content.languages?.en ?? content;
    const whatsapp = cfg.bookingWhatsapp || String(main?.whatsapp ?? "").replace(/\D/g, "");
    return { owner, cfg, whatsapp };
}

function toQuote(q: FareQuote, route: RouteInfo): TripQuote {
    return { ...q, tolls: route.tolls, path: route.path };
}

function bookingRef(): string {
    // Unambiguous characters only (no 0/O, 1/I)
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const bytes = crypto.randomBytes(6);
    return `TRP-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

@Resolver()
export class TravelResolver {

    // --- Public: location search for the booking form ---

    @Query(() => PlaceListResponse)
    async placeSearch(
        @Arg("query") query: string,
        @Arg("lang", { defaultValue: "en" }) lang: string,
        @Ctx() ctx: AppContext,
    ): Promise<PlaceListResponse> {
        try {
            if (limited("place", ctx.ip, 60, 60_000)) return { status: 0, message: "Too many searches, please slow down", data: [] };
            return { status: 1, message: "Success", data: await searchPlaces(query, lang) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Search failed", data: [] };
        }
    }

    @Query(() => PlaceListResponse)
    async placeReverse(
        @Arg("lat", () => Float) lat: number,
        @Arg("lon", () => Float) lon: number,
        @Arg("lang", { defaultValue: "en" }) lang: string,
        @Ctx() ctx: AppContext,
    ): Promise<PlaceListResponse> {
        try {
            if (!validCoord(lat, lon)) return { status: 0, message: "Invalid location", data: [] };
            if (limited("place", ctx.ip, 60, 60_000)) return { status: 0, message: "Too many searches, please slow down", data: [] };
            const place = await reversePlace(lat, lon, lang);
            return { status: 1, message: "Success", data: place ? [place] : [] };
        } catch (error: any) {
            return { status: 0, message: error.message || "Lookup failed", data: [] };
        }
    }

    // --- Public: fare estimate ---

    @Query(() => TripQuoteResponse)
    async tripQuote(@Arg("input") input: TripQuoteInput, @Ctx() ctx: AppContext): Promise<TripQuoteResponse> {
        try {
            if (limited("quote", ctx.ip, 120, 10 * 60_000)) return { status: 0, message: "Too many requests, please try again shortly", data: null };
            if (!TRIP_TYPES.includes(input.tripType as TripType)) return { status: 0, message: "Choose a trip type", data: null };
            if (!validCoord(input.fromLat, input.fromLon) || !validCoord(input.toLat, input.toLon)) return { status: 0, message: "Choose both locations", data: null };

            let cfg: TravelConfig;
            if (input.userName) {
                const loaded = await loadPublishedTravel(input.userName);
                if (typeof loaded === "string") return { status: 0, message: loaded, data: null };
                cfg = loaded.cfg;
            } else if (input.configJson && input.configJson.length < 100_000) {
                // Builder and storefront previews quote with the rates being edited
                cfg = normalizeTravel(JSON.parse(input.configJson));
            } else {
                return { status: 0, message: "Missing fare settings", data: null };
            }

            const route = await getRoute([input.fromLat, input.fromLon], [input.toLat, input.toLon]);
            if (route.distanceKm < 0.3) return { status: 0, message: "Pickup and drop are the same place", data: null };
            const fare = computeFare(cfg, {
                tripType: input.tripType as TripType, route, vehicleIndex: input.vehicleIndex ?? null,
                pickupAt: parseLocal(input.pickupAt), returnAt: parseLocal(input.returnAt),
            });
            if (!fare.ok) return { status: 0, message: fare.message, data: null };
            return { status: 1, message: "Success", data: toQuote(fare.quote, route) };
        } catch (error: any) {
            return { status: 0, message: error.message || "Could not calculate the fare", data: null };
        }
    }

    // --- Public: booking ---

    @Mutation(() => TripBookingResult)
    async createTripBooking(@Arg("input") input: TripBookingInput, @Ctx() ctx: AppContext): Promise<TripBookingResult> {
        try {
            if (input.company?.trim()) return { status: 1, message: "Booking received" };
            const customerName = input.customerName.trim();
            const phone = normalizePhone(input.customerPhone);
            const email = input.customerEmail?.trim().toLowerCase() || null;
            if (customerName.length < 2 || customerName.length > 120) return { status: 0, message: "Please enter your name" };
            if (!phone) return { status: 0, message: "Please enter a valid 10-digit mobile number" };
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: 0, message: "Please enter a valid email address" };
            if (!TRIP_TYPES.includes(input.tripType as TripType)) return { status: 0, message: "Choose a trip type" };
            if (!validCoord(input.fromLat, input.fromLon) || !validCoord(input.toLat, input.toLon)) return { status: 0, message: "Choose pickup and drop locations" };

            const pickupAt = parseLocal(input.pickupAt);
            const returnAt = input.tripType === "round" ? parseLocal(input.returnAt) : null;
            if (!pickupAt) return { status: 0, message: "Choose the pickup date and time" };
            if (pickupAt.getTime() < Date.now() - 30 * 60_000) return { status: 0, message: "Pickup time is in the past" };
            if (pickupAt.getTime() > Date.now() + 366 * 86_400_000) return { status: 0, message: "Bookings can be made up to a year ahead" };
            if (input.tripType === "round" && !returnAt) return { status: 0, message: "Choose the return date" };
            const passengers = Math.min(Math.max(input.passengers ?? 1, 1), 60);

            if (limited("booking", ctx.ip, 5, 10 * 60_000)) return { status: 0, message: "Too many bookings from this device. Please call us instead." };

            const loaded = await loadPublishedTravel(input.userName);
            if (typeof loaded === "string") return { status: 0, message: loaded };
            const { owner, cfg, whatsapp } = loaded;

            const vehicleIndex = input.vehicleIndex ?? null;
            const vehicle = vehicleIndex !== null ? cfg.vehicles[vehicleIndex] : undefined;
            if (vehicle && passengers > vehicle.seats) return { status: 0, message: `${vehicle.name} seats ${vehicle.seats}. Please pick a bigger vehicle.` };
            const driver = cfg.showDrivers && cfg.allowDriverChoice && input.driverIndex !== null && input.driverIndex !== undefined
                ? cfg.drivers[input.driverIndex] : undefined;

            // Never trust a fare from the browser: recompute from the owner's published rates
            const route = await getRoute([input.fromLat, input.fromLon], [input.toLat, input.toLon]);
            const fare = computeFare(cfg, { tripType: input.tripType as TripType, route, vehicleIndex, pickupAt, returnAt });
            if (!fare.ok) return { status: 0, message: fare.message };
            const q = fare.quote;

            const repo = AppDataSource.getRepository(TripBooking);
            const booking = repo.create({
                bookingRef: bookingRef(), ownerUuid: owner.userUuid, status: "new",
                customerName, customerPhone: phone, customerEmail: email,
                tripType: q.tripType,
                fromLabel: input.fromLabel.trim().slice(0, 300) || "Pickup", fromLat: input.fromLat, fromLon: input.fromLon,
                toLabel: input.toLabel.trim().slice(0, 300) || "Drop", toLat: input.toLat, toLon: input.toLon,
                pickupAt, returnAt, passengers,
                vehicleName: vehicle?.name || null, driverName: driver?.name || null, driverPhone: driver?.phone || null,
                distanceKm: q.distanceKm, durationMin: q.durationMin, tollCount: q.tollCount, tollAmount: q.tollAmount,
                chargeableKm: q.chargeableKm, ratePerKm: q.ratePerKm, kmFare: q.kmFare, driverBata: q.driverBata, days: q.days,
                totalFare: q.totalFare, notes: input.notes?.trim().slice(0, 1000) || null, ownerNote: null,
                lang: input.lang === "ta" ? "ta" : "en", ip: ctx.ip ?? null, createdAt: new Date(), updatedAt: new Date(),
            });
            const saved = await repo.save(booking);

            const when = pickupAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
            const fareText = `₹${q.totalFare.toLocaleString("en-IN")}`;
            sendMail(
                owner.email,
                `New trip booking ${saved.bookingRef}: ${saved.fromLabel} → ${saved.toLabel}`,
                `<p><strong>${escapeHtml(customerName)}</strong> (${phone}${email ? `, ${escapeHtml(email)}` : ""}) booked a ${q.tripType} trip.</p>
                 <p>${escapeHtml(saved.fromLabel)} → ${escapeHtml(saved.toLabel)}<br>Pickup: ${when}<br>${q.distanceKm} km · estimate ${fareText}</p>
                 <p><a href="${env.FRONTEND_URL}/user/bookings">Open your bookings</a></p>`,
                `${customerName} (${phone}) booked ${saved.bookingRef}: ${saved.fromLabel} -> ${saved.toLabel}, ${when}, ${q.distanceKm} km, estimate ${fareText}.\n${env.FRONTEND_URL}/user/bookings`,
            ).catch((error) => console.log("Booking notification mail failed:", error.message));

            return {
                status: 1, message: "Booking received", bookingRef: saved.bookingRef, whatsapp: whatsapp || null,
                quote: toQuote(q, route),
                driver: driver ? { name: driver.name, phone: driver.phone, licenseNumber: maskLicense(driver.licenseNumber), licenseValidTill: driver.licenseValidTill, experienceYears: driver.experienceYears } : null,
            };
        } catch (error: any) {
            console.error("Create trip booking error:", error);
            return { status: 0, message: error.message || "Could not save your booking" };
        }
    }

    // --- Owner: bookings for their website ---

    @Authorized()
    @Query(() => TripBookingListResponse)
    async myTripBookings(@Arg("filter", { nullable: true }) filter: TripBookingFilter = {}, @Ctx() ctx: AppContext): Promise<TripBookingListResponse> {
        try {
            const owner = ctx.user!.userUuid;
            const qb = AppDataSource.getRepository(TripBooking).createQueryBuilder("b").where("b.owner_uuid = :owner", { owner });
            if (filter.status && STATUSES.includes(filter.status)) qb.andWhere("b.status = :status", { status: filter.status });
            if (filter.search?.trim()) {
                qb.andWhere("(b.booking_ref ILIKE :s OR b.customer_name ILIKE :s OR b.customer_phone ILIKE :s OR b.from_label ILIKE :s OR b.to_label ILIKE :s)", { s: `%${filter.search.trim()}%` });
            }
            const [[data, total], [c]] = await Promise.all([
                qb.orderBy("b.created_at", "DESC").take(Math.min(filter.limit ?? 30, 200)).skip(filter.offset ?? 0).getManyAndCount(),
                AppDataSource.query(`SELECT COUNT(*) FILTER (WHERE status = 'new') AS new, COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed, COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled, COUNT(*) AS all
                    FROM tbl_trip_bookings WHERE owner_uuid = $1`, [owner]),
            ]);
            const counts: TripBookingCounts = { new: +c.new, confirmed: +c.confirmed, completed: +c.completed, cancelled: +c.cancelled, all: +c.all };
            return { status: 1, message: "Success", total, data, counts };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load bookings", total: 0, data: [] };
        }
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async updateMyTripBooking(
        @Arg("id", () => Int) id: number,
        @Arg("status", { nullable: true }) status: string,
        @Arg("ownerNote", { nullable: true }) ownerNote: string,
        @Ctx() ctx: AppContext,
    ): Promise<StatusResponse> {
        try {
            const repo = AppDataSource.getRepository(TripBooking);
            const booking = await repo.findOne({ where: { id, ownerUuid: ctx.user!.userUuid } });
            if (!booking) return { status: 0, message: "Booking not found" };
            if (status !== undefined && status !== null) {
                if (!STATUSES.includes(status)) return { status: 0, message: "Unknown status" };
                booking.status = status;
            }
            if (ownerNote !== undefined && ownerNote !== null) booking.ownerNote = ownerNote.trim().slice(0, 2000) || null;
            booking.updatedAt = new Date();
            await repo.save(booking);
            return { status: 1, message: `Booking ${booking.bookingRef} updated` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update booking" };
        }
    }
}
