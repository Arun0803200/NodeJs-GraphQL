import type { Bilingual, FieldType, FormField, PageLayout, RatingType, ReviewsConfig, SiteForm } from "../templates/types";
import { DEFAULT_PAGE_LAYOUT } from "../templates/sampleContent";

// Client-side mirror of src/Utils/siteConfig.ts (the server validates against the published copy)

export const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "email", "phone", "date", "time", "select", "radio", "multiselect", "checkbox"];
export const CHOICE_TYPES: FieldType[] = ["select", "radio", "multiselect"];

export const uid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;
export const emptyBi = (): Bilingual => ({ en: "", ta: "" });
export const pick = (b: Bilingual | undefined, lang: string) => (!b ? "" : lang === "ta" ? b.ta || b.en : b.en || b.ta);

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bi = (v: any): Bilingual => ({ en: str(v?.en), ta: str(v?.ta) });
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const okId = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v);

// Same derivation as the server, so drivers/vehicles saved before ids existed keep matching their reviews
export function entityId(prefix: string, given: unknown, name: string): string {
  if (okId(given)) return given as string;
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `${prefix}${(h >>> 0).toString(36)}`;
}

export function normalizeReviews(raw: unknown): ReviewsConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  return {
    enabled: r.enabled === true,
    moderation: r.moderation === "auto" ? "auto" : "approve",
    types: arr(r.types).map((t, i): RatingType => ({
      id: okId(t?.id) ? t.id : `rt${i}`,
      enabled: t?.enabled !== false,
      label: bi(t?.label),
      target: ["business", "driver", "vehicle"].includes(t?.target) ? t.target : "business",
      criteria: arr(t?.criteria).map((c, j) => ({ id: okId(c?.id) ? c.id : `c${j}`, label: bi(c?.label) })),
    })),
  };
}

export function normalizeForms(raw: unknown): SiteForm[] {
  return arr(raw).map((f, i): SiteForm => ({
    id: okId(f?.id) ? f.id : `form${i}`,
    enabled: f?.enabled !== false,
    title: bi(f?.title),
    description: bi(f?.description),
    submitLabel: bi(f?.submitLabel),
    whatsapp: f?.whatsapp !== false,
    fields: arr(f?.fields).map((x, j): FormField => ({
      id: okId(x?.id) ? x.id : `f${j}`,
      type: FIELD_TYPES.includes(x?.type) ? x.type : "text",
      label: bi(x?.label),
      placeholder: bi(x?.placeholder),
      required: x?.required === true,
      options: arr(x?.options).map(bi),
    })),
  }));
}

export function normalizePageLayout(raw: unknown): PageLayout {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const ids = (v: unknown) => arr(v).filter((x): x is string => typeof x === "string" && x.length <= 60);
  return { ...DEFAULT_PAGE_LAYOUT, order: ids(p.order), hidden: ids(p.hidden) };
}
