// Owner-defined review types and custom forms, stored in the website content (shared by both languages).
// The server reads the *published* copy to validate what visitors send.

export type Bilingual = { en: string; ta: string };
export type ReviewTarget = "business" | "driver" | "vehicle";

export interface RatingCriterion { id: string; label: Bilingual }
export interface RatingType {
    id: string;
    enabled: boolean;
    label: Bilingual;
    target: ReviewTarget;
    criteria: RatingCriterion[];
}
export interface ReviewsConfig {
    enabled: boolean;
    // approve = owner approves each review first; auto = shown immediately
    moderation: "approve" | "auto";
    types: RatingType[];
}

export const FIELD_TYPES = ["text", "textarea", "number", "email", "phone", "date", "time", "select", "radio", "multiselect", "checkbox"] as const;
export type FieldType = typeof FIELD_TYPES[number];
export interface FormField {
    id: string;
    type: FieldType;
    label: Bilingual;
    placeholder: Bilingual;
    required: boolean;
    options: Bilingual[];
}
export interface SiteForm {
    id: string;
    enabled: boolean;
    title: Bilingual;
    description: Bilingual;
    submitLabel: Bilingual;
    // open WhatsApp with the answers after saving
    whatsapp: boolean;
    fields: FormField[];
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const id = (v: unknown, fallback: string) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : fallback);
const bi = (v: any, max = 200): Bilingual => ({ en: str(v?.en, max), ta: str(v?.ta, max) });
const arr = (v: unknown, max: number): any[] => (Array.isArray(v) ? v.slice(0, max) : []);

export function normalizeReviews(raw: unknown): ReviewsConfig {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    return {
        enabled: r.enabled === true,
        moderation: r.moderation === "auto" ? "auto" : "approve",
        types: arr(r.types, 20).map((t, i) => ({
            id: id(t?.id, `rt${i}`),
            enabled: t?.enabled !== false,
            label: bi(t?.label, 80),
            target: (["business", "driver", "vehicle"].includes(t?.target) ? t.target : "business") as ReviewTarget,
            criteria: arr(t?.criteria, 8).map((c, j) => ({ id: id(c?.id, `c${j}`), label: bi(c?.label, 60) })),
        })),
    };
}

export function normalizeForms(raw: unknown): SiteForm[] {
    return arr(raw, 10).map((f, i) => ({
        id: id(f?.id, `form${i}`),
        enabled: f?.enabled !== false,
        title: bi(f?.title, 120),
        description: bi(f?.description, 500),
        submitLabel: bi(f?.submitLabel, 40),
        whatsapp: f?.whatsapp !== false,
        fields: arr(f?.fields, 30).map((x, j) => ({
            id: id(x?.id, `f${j}`),
            type: (FIELD_TYPES as readonly string[]).includes(x?.type) ? x.type : "text",
            label: bi(x?.label, 120),
            placeholder: bi(x?.placeholder, 120),
            required: x?.required === true,
            options: arr(x?.options, 30).map((o) => bi(o, 120)),
        })),
    }));
}

// Default-language content of a published site (where shared settings live)
export function mainContent(content: unknown): Record<string, any> {
    const c = (content && typeof content === "object" ? content : {}) as Record<string, any>;
    const languages = c.languages && typeof c.languages === "object" ? c.languages : { en: c };
    return languages[c.defaultLang] ?? languages.en ?? Object.values(languages)[0] ?? {};
}

export const pick = (b: Bilingual, lang: string) => (lang === "ta" ? b.ta || b.en : b.en || b.ta);

// Stable ids for drivers/vehicles saved before ids existed: derived from the name
export function entityId(prefix: string, given: unknown, name: string): string {
    if (typeof given === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(given)) return given;
    let h = 0;
    for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return `${prefix}${(h >>> 0).toString(36)}`;
}
