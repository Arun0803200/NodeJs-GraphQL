import type { Lang, PortfolioContent, SiteContent } from "../templates/types";
import { EMPTY_CONTENT } from "../templates/sampleContent";
import { normalizeTravel } from "./travel";
import { normalizeForms, normalizePageLayout, normalizeReviews } from "./siteConfig";

export interface TemplateItem {
  id: number;
  name: string;
  slug: string;
  designKey: string;
  category: "free" | "premium";
  description: string;
  tags: string[];
  originalPrice: number;
  discountPrice: number | null;
  isActive: boolean;
  sortOrder: number;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatPrice = (value: number) => inr.format(value);

export const isFree = (t: Pick<TemplateItem, "category" | "originalPrice">) => t.category === "free" || t.originalPrice <= 0;

export const hasDiscount = (t: Pick<TemplateItem, "originalPrice" | "discountPrice">) =>
  t.discountPrice !== null && t.discountPrice !== undefined && t.discountPrice < t.originalPrice;

export const discountPercent = (t: Pick<TemplateItem, "originalPrice" | "discountPrice">) =>
  hasDiscount(t) ? Math.round(((t.originalPrice - t.discountPrice!) / t.originalPrice) * 100) : 0;

// ─── Draft content (kept in the browser until the visitor publishes) ───
const DRAFT_KEY = "portfolioDraft";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

// Fills missing fields from EMPTY_CONTENT and upgrades older shapes (e.g. certificates saved as plain text)
export function normalizeContent(raw: unknown): PortfolioContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  return {
    ...EMPTY_CONTENT,
    ...Object.fromEntries(Object.entries(c).filter(([k, v]) => typeof v === "string" && typeof (EMPTY_CONTENT as any)[k] === "string")),
    experience: arr(c.experience).map((x) => ({ role: str(x?.role), company: str(x?.company), location: str(x?.location), start: str(x?.start), end: str(x?.end), highlights: str(x?.highlights) })),
    education: arr(c.education).map((x) => ({ degree: str(x?.degree), school: str(x?.school), start: str(x?.start), end: str(x?.end), details: str(x?.details) })),
    projects: arr(c.projects).map((x) => ({ name: str(x?.name), description: str(x?.description), link: str(x?.link), tech: str(x?.tech), imageUrl: str(x?.imageUrl) })),
    certifications: arr(c.certifications).map((x) =>
      typeof x === "string"
        ? { name: x, issuer: "", year: "", link: "", imageUrl: "" }
        : { name: str(x?.name), issuer: str(x?.issuer), year: str(x?.year), link: str(x?.link), imageUrl: str(x?.imageUrl) }),
    album: arr(c.album).map((x) => ({ url: str(x?.url), caption: str(x?.caption) })),
    services: arr(c.services).map((x) => ({ name: str(x?.name), description: str(x?.description), price: str(x?.price), imageUrl: str(x?.imageUrl) })),
    testimonials: arr(c.testimonials).map((x) => ({ name: str(x?.name), role: str(x?.role), text: str(x?.text) })),
    skills: arr(c.skills).filter((x) => typeof x === "string"),
    achievements: arr(c.achievements).filter((x) => typeof x === "string"),
    languages: arr(c.languages).filter((x) => typeof x === "string"),
    travel: normalizeTravel(c.travel),
    reviews: normalizeReviews(c.reviews),
    forms: normalizeForms(c.forms),
    pageLayout: normalizePageLayout(c.pageLayout),
  };
}

export const LANGS: Lang[] = ["en", "ta"];
export const LANG_NAMES: Record<Lang, string> = { en: "English", ta: "தமிழ்" };

// Site content is stored per language; older saves were a single PortfolioContent (English)
export function normalizeSite(raw: unknown): SiteContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  if (!r.languages || typeof r.languages !== "object") {
    return { defaultLang: "en", languages: { en: normalizeContent(r) } };
  }
  const languages: SiteContent["languages"] = {};
  for (const lang of LANGS) if (r.languages[lang]) languages[lang] = normalizeContent(r.languages[lang]);
  if (!languages.en && !languages.ta) languages.en = normalizeContent({});
  const defaultLang: Lang = LANGS.includes(r.defaultLang) && languages[r.defaultLang as Lang] ? r.defaultLang : (languages.en ? "en" : "ta");
  return { defaultLang, languages };
}

export function parseSite(json: string): SiteContent {
  try {
    return normalizeSite(JSON.parse(json));
  } catch {
    return normalizeSite({});
  }
}

// Content to show for a language, falling back to the site's default language
export function siteContentFor(site: SiteContent, lang?: Lang | null): { lang: Lang; content: PortfolioContent } {
  const chosen = lang && site.languages[lang] ? lang : site.defaultLang;
  return { lang: chosen, content: site.languages[chosen] ?? EMPTY_CONTENT };
}

export function serializeSite(site: SiteContent): string {
  const languages: SiteContent["languages"] = {};
  for (const lang of LANGS) if (site.languages[lang]) languages[lang] = cleanContent(site.languages[lang]!);
  return JSON.stringify({ version: 2, defaultLang: site.defaultLang, languages });
}

// Kept for single-language callers (thumbnails, admin preview)
export function parseContent(json: string): PortfolioContent {
  return siteContentFor(parseSite(json)).content;
}

export function loadDraft(): SiteContent | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? normalizeSite(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(site: SiteContent) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(site));
  } catch {
    // storage full or blocked: the editor still works, the draft just isn't remembered
  }
}

// Editor keeps raw input (e.g. half-filled rows); templates get trimmed, non-empty values
export function cleanContent(c: PortfolioContent): PortfolioContent {
  const list = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
  const hasText = (o: object) => Object.values(o).some((v) => typeof v === "string" && v.trim());
  return {
    ...c,
    skills: list(c.skills),
    achievements: list(c.achievements),
    languages: list(c.languages),
    certifications: c.certifications.filter((x) => x.name.trim() || x.imageUrl),
    album: c.album.filter((x) => x.url.trim()),
    services: c.services.filter((x) => x.name.trim()),
    testimonials: c.testimonials.filter((x) => x.text.trim()),
    whatsapp: c.whatsapp.replace(/\D/g, ""),
    experience: c.experience.filter(hasText),
    education: c.education.filter(hasText),
    projects: c.projects.filter(hasText),
  };
}
