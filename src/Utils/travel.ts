import fs from "fs";
import path from "path";
import { env } from "../Config/env";
import { entityId } from "./siteConfig";

// Trip pricing for travels/taxi websites: place search (Nominatim), road routes (OSRM),
// toll plazas along the route (OpenStreetMap snapshot, refreshed weekly) and the fare rules.

// ─── Owner configuration (stored in the website content, shared by all languages) ───

export interface TravelVehicle {
    id: string;
    name: string;
    type: string;
    seats: number;
    ac: boolean;
    imageUrl: string;
    features: string;
    // Optional per-vehicle overrides of the site-wide rates (0 = use site rate)
    cityPerKm: number;
    longPerKm: number;
    tollPerPlaza: number;
}

export interface TravelDriver {
    id: string;
    name: string;
    phone: string;
    photoUrl: string;
    experienceYears: number;
    languages: string;
    licenseNumber: string;
    licenseValidTill: string;
    licenseImageUrl: string;
    showLicenseImage: boolean;
}

export interface TravelConfig {
    enabled: boolean;
    cityPerKm: number;
    longPerKm: number;
    cityLimitKm: number;
    cityMinFare: number;
    cityDriverBata: number;
    oneWayMinKm: number;
    minKmPerDay: number;
    driverBataPerDay: number;
    tollPerPlaza: number;
    maxTripKm: number;
    bookingWhatsapp: string;
    showDrivers: boolean;
    allowDriverChoice: boolean;
    // "Drive with us" section and application form
    driverHiring: boolean;
    vehicles: TravelVehicle[];
    drivers: TravelDriver[];
}

export const DEFAULT_TRAVEL: TravelConfig = {
    enabled: false, cityPerKm: 20, longPerKm: 15, cityLimitKm: 40, cityMinFare: 300, cityDriverBata: 0,
    oneWayMinKm: 130, minKmPerDay: 250, driverBataPerDay: 400, tollPerPlaza: 120, maxTripKm: 0,
    bookingWhatsapp: "", showDrivers: true, allowDriverChoice: true, driverHiring: true, vehicles: [], drivers: [],
};

const num = (v: unknown, fallback: number, max = 1_000_000) => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
};
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");

// Accepts untrusted JSON (site content or a builder preview) and returns clamped, complete settings
export function normalizeTravel(raw: unknown): TravelConfig {
    const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const d = DEFAULT_TRAVEL;
    return {
        enabled: t.enabled === true,
        cityPerKm: num(t.cityPerKm, d.cityPerKm, 10_000),
        longPerKm: num(t.longPerKm, d.longPerKm, 10_000),
        cityLimitKm: num(t.cityLimitKm, d.cityLimitKm, 1000),
        cityMinFare: num(t.cityMinFare, d.cityMinFare),
        cityDriverBata: num(t.cityDriverBata, d.cityDriverBata),
        oneWayMinKm: num(t.oneWayMinKm, d.oneWayMinKm, 2000),
        minKmPerDay: num(t.minKmPerDay, d.minKmPerDay, 2000),
        driverBataPerDay: num(t.driverBataPerDay, d.driverBataPerDay),
        tollPerPlaza: num(t.tollPerPlaza, d.tollPerPlaza, 10_000),
        maxTripKm: num(t.maxTripKm, d.maxTripKm, 10_000),
        bookingWhatsapp: str(t.bookingWhatsapp, 20).replace(/\D/g, ""),
        showDrivers: t.showDrivers !== false,
        allowDriverChoice: t.allowDriverChoice !== false,
        driverHiring: t.driverHiring !== false,
        vehicles: (Array.isArray(t.vehicles) ? t.vehicles : []).slice(0, 30).map((v: any) => ({
            id: entityId("v", v?.id, str(v?.name, 120)),
            name: str(v?.name, 120), type: str(v?.type, 60), seats: num(v?.seats, 4, 60), ac: v?.ac !== false,
            imageUrl: str(v?.imageUrl, 1000), features: str(v?.features, 500),
            cityPerKm: num(v?.cityPerKm, 0, 10_000), longPerKm: num(v?.longPerKm, 0, 10_000), tollPerPlaza: num(v?.tollPerPlaza, 0, 10_000),
        })),
        drivers: (Array.isArray(t.drivers) ? t.drivers : []).slice(0, 30).map((x: any) => ({
            id: entityId("d", x?.id, str(x?.name, 120)),
            name: str(x?.name, 120), phone: str(x?.phone, 20), photoUrl: str(x?.photoUrl, 1000),
            experienceYears: num(x?.experienceYears, 0, 70), languages: str(x?.languages, 200),
            licenseNumber: str(x?.licenseNumber, 40), licenseValidTill: str(x?.licenseValidTill, 20),
            licenseImageUrl: str(x?.licenseImageUrl, 1000), showLicenseImage: x?.showLicenseImage === true,
        })),
    };
}

// The travel settings live on the default-language content of a published site
export function travelFromSiteContent(content: unknown): TravelConfig {
    const c = (content && typeof content === "object" ? content : {}) as Record<string, any>;
    const languages = c.languages && typeof c.languages === "object" ? c.languages : { en: c };
    const main = languages[c.defaultLang] ?? languages.en ?? Object.values(languages)[0];
    return normalizeTravel(main?.travel);
}

// "TN0920090012345" -> "TN09 •••••• 2345"
export function maskLicense(n: string): string {
    const s = n.replace(/\s+/g, "").toUpperCase();
    return s.length <= 6 ? s : `${s.slice(0, 4)} •••••• ${s.slice(-4)}`;
}

// What visitors' browsers receive: licence numbers masked, licence photos only when the owner opted in
export function publicSiteContent(content: unknown): unknown {
    if (!content || typeof content !== "object") return content;
    const c = content as Record<string, any>;
    const scrub = (lang: any) => {
        if (!lang || typeof lang !== "object" || !lang.travel || !Array.isArray(lang.travel.drivers)) return lang;
        return {
            ...lang,
            travel: {
                ...lang.travel,
                drivers: lang.travel.drivers.map((d: any) => ({
                    ...d,
                    licenseNumber: typeof d?.licenseNumber === "string" ? maskLicense(d.licenseNumber) : "",
                    licenseImageUrl: d?.showLicenseImage === true ? d.licenseImageUrl ?? "" : "",
                })),
            },
        };
    };
    if (c.languages && typeof c.languages === "object") {
        return { ...c, languages: Object.fromEntries(Object.entries(c.languages).map(([k, v]) => [k, scrub(v)])) };
    }
    return scrub(c);
}

// ─── Geometry ───

type LatLon = [number, number];
const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLon, b: LatLon): number {
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Distance (km) from p to segment ab, on a local flat projection (accurate at plaza scale)
function pointSegmentKm(p: LatLon, a: LatLon, b: LatLon): number {
    const kx = Math.cos(rad(p[0])) * 111.32;
    const ky = 110.57;
    const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky;
    const bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const x = ax + t * dx, y = ay + t * dy;
    return Math.sqrt(x * x + y * y);
}

// ─── Toll plazas ───

interface Plaza { lat: number; lon: number; name: string }
const SNAPSHOT = path.join(__dirname, "../Data/toll-plazas-in.json");
const CACHE_DIR = path.resolve(env.UPLOAD_DIR, "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "toll-plazas-in.json");
const REFRESH_DAYS = 7;
let plazas: Plaza[] = [];
let plazasUpdatedAt = "";

function loadPlazaFile(file: string): boolean {
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        plazas = (data.items as any[]).map(([lat, lon, name]) => ({ lat, lon, name: name ?? "" }));
        plazasUpdatedAt = data.generatedAt ?? "";
        return plazas.length > 0;
    } catch {
        return false;
    }
}

async function refreshPlazas() {
    try {
        const query = `[out:json][timeout:170];area["ISO3166-1"="IN"][admin_level=2]->.in;nwr["barrier"="toll_booth"](area.in);out center tags qt;`;
        const res = await fetch(env.OVERPASS_URL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": env.GEO_USER_AGENT },
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
        const json: any = await res.json();
        const items = (json.elements as any[])
            .map((e) => {
                const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
                if (lat === undefined) return null;
                const name = e.tags?.name ?? e.tags?.["name:en"] ?? "";
                return name ? [+lat.toFixed(5), +lon.toFixed(5), name] : [+lat.toFixed(5), +lon.toFixed(5)];
            })
            .filter(Boolean);
        // Guard against a truncated answer wiping good data
        if (items.length < 500) throw new Error(`Only ${items.length} toll booths returned`);
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ source: "OpenStreetMap contributors (ODbL)", generatedAt: new Date().toISOString().slice(0, 10), items }));
        loadPlazaFile(CACHE_FILE);
        console.log(`Toll plazas refreshed: ${plazas.length}`);
    } catch (error: any) {
        console.log("Toll plaza refresh failed (keeping existing data):", error.message);
    }
}

// Loads the freshest data available, then refreshes in the background when it is a week old
export function initTollData() {
    if (!loadPlazaFile(CACHE_FILE)) loadPlazaFile(SNAPSHOT);
    const ageDays = plazasUpdatedAt ? (Date.now() - new Date(plazasUpdatedAt).getTime()) / 86_400_000 : Infinity;
    if (ageDays >= REFRESH_DAYS) refreshPlazas();
    setInterval(refreshPlazas, REFRESH_DAYS * 86_400_000).unref();
}

// Plazas the route passes through. A plaza is several booth points, so points close together count once.
function tollsOnRoute(route: LatLon[]): { name: string; lat: number; lon: number }[] {
    if (route.length < 2 || plazas.length === 0) return [];
    const NEAR_KM = 0.12;
    const MERGE_KM = 1.5;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const [la, lo] of route) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo); }
    const pad = 0.01;
    const candidates = plazas.filter((p) => p.lat >= minLat - pad && p.lat <= maxLat + pad && p.lon >= minLon - pad && p.lon <= maxLon + pad);
    if (candidates.length === 0) return [];

    // Index route segments by ~5 km grid cell so each plaza only checks nearby segments
    const CELL = 0.05;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < route.length - 1; i++) {
        const [a, b] = [route[i], route[i + 1]];
        for (let la = Math.floor(Math.min(a[0], b[0]) / CELL); la <= Math.floor(Math.max(a[0], b[0]) / CELL); la++) {
            for (let lo = Math.floor(Math.min(a[1], b[1]) / CELL); lo <= Math.floor(Math.max(a[1], b[1]) / CELL); lo++) {
                const k = `${la}:${lo}`;
                (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
            }
        }
    }

    const hits: { plaza: Plaza; seg: number }[] = [];
    for (const p of candidates) {
        const cellLa = Math.floor(p.lat / CELL), cellLo = Math.floor(p.lon / CELL);
        let best = Infinity, bestSeg = -1;
        for (let dl = -1; dl <= 1; dl++) for (let dn = -1; dn <= 1; dn++) {
            for (const i of grid.get(`${cellLa + dl}:${cellLo + dn}`) ?? []) {
                const d = pointSegmentKm([p.lat, p.lon], route[i], route[i + 1]);
                if (d < best) { best = d; bestSeg = i; }
            }
        }
        if (best <= NEAR_KM) hits.push({ plaza: p, seg: bestSeg });
    }

    // In travel order, merging booths of the same plaza
    hits.sort((a, b) => a.seg - b.seg);
    const merged: { name: string; lat: number; lon: number }[] = [];
    for (const h of hits) {
        const last = merged[merged.length - 1];
        if (last && haversineKm([last.lat, last.lon], [h.plaza.lat, h.plaza.lon]) < MERGE_KM) {
            if (!last.name && h.plaza.name) last.name = h.plaza.name;
            continue;
        }
        merged.push({ name: h.plaza.name, lat: h.plaza.lat, lon: h.plaza.lon });
    }
    return merged;
}

// ─── External lookups (cached, throttled) ───

class TtlCache<V> {
    private map = new Map<string, { at: number; value: V }>();
    constructor(private ttlMs: number, private max = 2000) {}
    get(k: string): V | undefined {
        const hit = this.map.get(k);
        if (!hit || Date.now() - hit.at > this.ttlMs) { this.map.delete(k); return undefined; }
        return hit.value;
    }
    set(k: string, value: V) {
        if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value!);
        this.map.set(k, { at: Date.now(), value });
    }
}

// Nominatim's policy is at most one request per second, so requests queue up behind each other
let geoQueue: Promise<unknown> = Promise.resolve();
let lastGeoAt = 0;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
    const run = geoQueue.then(async () => {
        const wait = 1100 - (Date.now() - lastGeoAt);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastGeoAt = Date.now();
        return fn();
    });
    geoQueue = run.catch(() => undefined);
    return run;
}

export interface Place { label: string; detail: string; lat: number; lon: number }
const placeCache = new TtlCache<Place[]>(24 * 3600_000);

function toPlace(r: any): Place {
    const a = r.address ?? {};
    const primary = r.name || a.road || a.suburb || a.village || a.town || a.city || r.display_name?.split(",")[0] || "";
    const parts = [a.suburb, a.city || a.town || a.village, a.state_district, a.state].filter((x: string) => x && x !== primary);
    return { label: primary, detail: [...new Set(parts)].join(", "), lat: +(+r.lat).toFixed(6), lon: +(+r.lon).toFixed(6) };
}

export async function searchPlaces(query: string, lang: string): Promise<Place[]> {
    const q = query.trim().slice(0, 120);
    if (q.length < 2) return [];
    const key = `${lang}|${q.toLowerCase()}`;
    const cached = placeCache.get(key);
    if (cached) return cached;
    const url = `${env.NOMINATIM_URL}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&accept-language=${lang === "ta" ? "ta,en" : "en"}&q=${encodeURIComponent(q)}`;
    const places = await throttled(async () => {
        const res = await fetch(url, { headers: { "user-agent": env.GEO_USER_AGENT }, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`Place search failed (${res.status})`);
        const all = ((await res.json()) as any[]).map(toPlace).filter((p) => p.label);
        // The same place often comes back as several OSM objects a few metres apart
        return all.filter((p, i) => !all.slice(0, i).some((q) => q.label === p.label && haversineKm([q.lat, q.lon], [p.lat, p.lon]) < 1));
    });
    placeCache.set(key, places);
    return places;
}

export async function reversePlace(lat: number, lon: number, lang: string): Promise<Place | null> {
    const key = `rev|${lang}|${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = placeCache.get(key);
    if (cached) return cached[0] ?? null;
    const url = `${env.NOMINATIM_URL}/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=${lang === "ta" ? "ta,en" : "en"}&lat=${lat}&lon=${lon}`;
    const place = await throttled(async () => {
        const res = await fetch(url, { headers: { "user-agent": env.GEO_USER_AGENT }, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`Location lookup failed (${res.status})`);
        const r: any = await res.json();
        return r?.lat ? { ...toPlace(r), lat, lon } : null;
    });
    placeCache.set(key, place ? [place] : []);
    return place;
}

export interface RouteInfo {
    distanceKm: number;
    durationMin: number;
    tolls: { name: string; lat: number; lon: number }[];
    // Simplified line for drawing the map
    path: LatLon[];
    // true when the road route was unavailable and the distance is a straight-line estimate
    approximate: boolean;
}
const routeCache = new TtlCache<RouteInfo>(6 * 3600_000);

function simplify(points: LatLon[], maxPoints: number): LatLon[] {
    if (points.length <= maxPoints) return points;
    const step = (points.length - 1) / (maxPoints - 1);
    return Array.from({ length: maxPoints }, (_, i) => points[Math.round(i * step)]);
}

export async function getRoute(from: LatLon, to: LatLon): Promise<RouteInfo> {
    const key = `${from[0].toFixed(4)},${from[1].toFixed(4)};${to[0].toFixed(4)},${to[1].toFixed(4)}`;
    const cached = routeCache.get(key);
    if (cached) return cached;
    let info: RouteInfo;
    try {
        const url = `${env.OSRM_URL}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url, { headers: { "user-agent": env.GEO_USER_AGENT }, signal: AbortSignal.timeout(15_000) });
        const json: any = await res.json();
        const route = json?.routes?.[0];
        if (!res.ok || json.code !== "Ok" || !route) throw new Error(json?.message || `Routing failed (${res.status})`);
        const line: LatLon[] = route.geometry.coordinates.map(([lo, la]: number[]) => [la, lo]);
        info = {
            distanceKm: Math.round(route.distance / 100) / 10,
            durationMin: Math.round(route.duration / 60),
            tolls: tollsOnRoute(line),
            path: simplify(line, 400).map(([la, lo]) => [+la.toFixed(5), +lo.toFixed(5)]),
            approximate: false,
        };
    } catch (error: any) {
        // Keep quoting when the routing service is down: straight line x typical road factor, ~45 km/h
        console.log("Route lookup failed, using estimate:", error.message);
        const km = haversineKm(from, to) * 1.3;
        info = { distanceKm: Math.round(km * 10) / 10, durationMin: Math.round((km / 45) * 60), tolls: [], path: [from, to], approximate: true };
    }
    routeCache.set(key, info);
    return info;
}

// ─── Fare rules ───

export type TripType = "city" | "oneway" | "round";

export interface FareInput {
    tripType: TripType;
    route: RouteInfo;
    vehicleIndex: number | null;
    pickupAt: Date | null;
    returnAt: Date | null;
}

export interface FareQuote {
    tripType: TripType;
    requestedType: TripType;
    distanceKm: number;
    durationMin: number;
    tollCount: number;
    tollNames: string[];
    tollPerPlaza: number;
    tollAmount: number;
    days: number;
    chargeableKm: number;
    ratePerKm: number;
    kmFare: number;
    driverBata: number;
    totalFare: number;
    vehicleName: string;
    // Machine-readable notes; the website translates them
    notes: string[];
    approximate: boolean;
}

const dayDiff = (a: Date, b: Date) => {
    const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((end - start) / 86_400_000);
};

export function computeFare(cfg: TravelConfig, input: FareInput): { ok: true; quote: FareQuote } | { ok: false; message: string } {
    const { route } = input;
    const vehicle = input.vehicleIndex !== null ? cfg.vehicles[input.vehicleIndex] : undefined;
    if (input.vehicleIndex !== null && !vehicle) return { ok: false, message: "Selected vehicle is not available" };
    if (cfg.maxTripKm > 0 && route.distanceKm > cfg.maxTripKm) {
        return { ok: false, message: `Trips up to ${cfg.maxTripKm} km only. This trip is ${route.distanceKm} km.` };
    }

    const notes: string[] = [];
    let type = input.tripType;
    // A "city" ride beyond the owner's city limit is priced as an outstation drop
    if (type === "city" && route.distanceKm > cfg.cityLimitKm) {
        type = "oneway";
        notes.push(`beyond_city_limit:${cfg.cityLimitKm}`);
    }

    const cityRate = vehicle?.cityPerKm || cfg.cityPerKm;
    const longRate = vehicle?.longPerKm || cfg.longPerKm;
    const perPlaza = vehicle?.tollPerPlaza || cfg.tollPerPlaza;
    const tollCount = route.tolls.length * (type === "round" ? 2 : 1);
    const tollAmount = tollCount * perPlaza;

    let days = 1, chargeableKm: number, ratePerKm: number, kmFare: number, driverBata: number;
    if (type === "city") {
        chargeableKm = route.distanceKm;
        ratePerKm = cityRate;
        kmFare = Math.max(Math.round(chargeableKm * ratePerKm), cfg.cityMinFare);
        if (kmFare === cfg.cityMinFare && cfg.cityMinFare > 0) notes.push(`city_min_fare:${cfg.cityMinFare}`);
        driverBata = cfg.cityDriverBata;
    } else if (type === "oneway") {
        // Drives over ~12 hours need the driver for another day
        days = Math.max(1, Math.ceil(route.durationMin / 720));
        chargeableKm = Math.max(route.distanceKm, cfg.oneWayMinKm);
        if (chargeableKm > route.distanceKm) notes.push(`oneway_min_km:${cfg.oneWayMinKm}`);
        ratePerKm = longRate;
        kmFare = Math.round(chargeableKm * ratePerKm);
        driverBata = days * cfg.driverBataPerDay;
    } else {
        if (input.pickupAt && input.returnAt) {
            const diff = dayDiff(input.pickupAt, input.returnAt);
            if (diff < 0) return { ok: false, message: "Return date must be on or after the pickup date" };
            days = diff + 1;
        }
        const travelled = route.distanceKm * 2;
        chargeableKm = Math.max(travelled, cfg.minKmPerDay * days);
        if (chargeableKm > travelled) notes.push(`min_km_per_day:${cfg.minKmPerDay}`);
        ratePerKm = longRate;
        kmFare = Math.round(chargeableKm * ratePerKm);
        driverBata = days * cfg.driverBataPerDay;
    }
    if (route.approximate) notes.push("approximate_distance");

    return {
        ok: true,
        quote: {
            tripType: type, requestedType: input.tripType,
            distanceKm: route.distanceKm, durationMin: route.durationMin,
            tollCount, tollNames: route.tolls.map((t) => t.name).filter(Boolean), tollPerPlaza: perPlaza, tollAmount,
            days, chargeableKm: Math.round(chargeableKm * 10) / 10, ratePerKm, kmFare, driverBata,
            totalFare: kmFare + driverBata + tollAmount,
            vehicleName: vehicle?.name ?? "", notes, approximate: route.approximate,
        },
    };
}
