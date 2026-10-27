import type { TravelConfig, TravelDriver, TravelVehicle } from "../templates/types";
import { DEFAULT_TRAVEL } from "../templates/sampleContent";
import { entityId, uid } from "./siteConfig";

const num = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const str = (v: unknown) => (typeof v === "string" ? v : "");

export const NEW_VEHICLE = (): TravelVehicle => ({ id: uid("v"), name: "", type: "", seats: 4, ac: true, imageUrl: "", features: "", cityPerKm: 0, longPerKm: 0, tollPerPlaza: 0 });
export const NEW_DRIVER = (): TravelDriver => ({
  id: uid("d"),
  name: "", phone: "", photoUrl: "", experienceYears: 0, languages: "", licenseNumber: "", licenseValidTill: "", licenseImageUrl: "", showLicenseImage: false,
});

// Fills gaps in saved settings (older sites have none) — the server applies the same rules when pricing
export function normalizeTravel(raw: unknown): TravelConfig {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const d = DEFAULT_TRAVEL;
  return {
    enabled: t.enabled === true,
    cityPerKm: num(t.cityPerKm, d.cityPerKm),
    longPerKm: num(t.longPerKm, d.longPerKm),
    cityLimitKm: num(t.cityLimitKm, d.cityLimitKm),
    cityMinFare: num(t.cityMinFare, d.cityMinFare),
    cityDriverBata: num(t.cityDriverBata, d.cityDriverBata),
    oneWayMinKm: num(t.oneWayMinKm, d.oneWayMinKm),
    minKmPerDay: num(t.minKmPerDay, d.minKmPerDay),
    driverBataPerDay: num(t.driverBataPerDay, d.driverBataPerDay),
    tollPerPlaza: num(t.tollPerPlaza, d.tollPerPlaza),
    maxTripKm: num(t.maxTripKm, d.maxTripKm),
    bookingWhatsapp: str(t.bookingWhatsapp),
    showDrivers: t.showDrivers !== false,
    allowDriverChoice: t.allowDriverChoice !== false,
    driverHiring: t.driverHiring !== false,
    vehicles: (Array.isArray(t.vehicles) ? t.vehicles : []).map((v: any) => ({
      id: entityId("v", v?.id, str(v?.name)),
      name: str(v?.name), type: str(v?.type), seats: num(v?.seats, 4), ac: v?.ac !== false, imageUrl: str(v?.imageUrl), features: str(v?.features),
      cityPerKm: num(v?.cityPerKm, 0), longPerKm: num(v?.longPerKm, 0), tollPerPlaza: num(v?.tollPerPlaza, 0),
    })),
    drivers: (Array.isArray(t.drivers) ? t.drivers : []).map((x: any) => ({
      id: entityId("d", x?.id, str(x?.name)),
      name: str(x?.name), phone: str(x?.phone), photoUrl: str(x?.photoUrl), experienceYears: num(x?.experienceYears, 0),
      languages: str(x?.languages), licenseNumber: str(x?.licenseNumber), licenseValidTill: str(x?.licenseValidTill),
      licenseImageUrl: str(x?.licenseImageUrl), showLicenseImage: x?.showLicenseImage === true,
    })),
  };
}

// "TN0920150001234" -> "TN09 •••••• 1234": enough to recognise, not enough to misuse
export function maskLicense(n: string): string {
  const s = n.replace(/\s+/g, "").toUpperCase();
  if (s.length <= 6) return s;
  return `${s.slice(0, 4)} •••••• ${s.slice(-4)}`;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function formatDuration(min: number, lang: "en" | "ta") {
  const h = Math.floor(min / 60), m = min % 60;
  if (lang === "ta") return h ? `${h} மணி ${m} நிமி` : `${m} நிமி`;
  return h ? `${h} h ${m} min` : `${m} min`;
}
