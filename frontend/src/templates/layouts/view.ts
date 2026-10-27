import type { CSSProperties } from "react";
import type { Lang, PortfolioContent, TemplateTheme } from "../types";
import { getLabels, whatsappLink } from "../i18n";
import type { TemplateLabels } from "../i18n";
import type { IconName } from "./shared";

// Pure view-model helpers shared by all layouts (kept out of shared.tsx so that file only exports components).

export type Tier = "free" | "premium";

/* ───────────────────────── Normalised view model ───────────────────────── */

export type ContactKind = "email" | "phone" | "whatsapp" | "hours" | "location" | "website" | "linkedin" | "github";

export interface ContactEntry {
  kind: ContactKind;
  label: string;
  href: string; // empty = not a link
  external: boolean;
}

export interface JobView {
  role: string;
  company: string;
  location: string;
  dates: string;
  current: boolean;
  bullets: string[];
}

export interface EduView {
  degree: string;
  school: string;
  dates: string;
  details: string;
}

export interface ProjectView {
  name: string;
  description: string;
  href: string;
  linkLabel: string;
  tech: string[];
  imageUrl: string;
}

export interface CertView {
  name: string;
  issuer: string;
  year: string;
  meta: string; // "issuer · year"
  href: string;
  imageUrl: string;
}

export interface AlbumView {
  url: string;
  caption: string;
}

export interface ServiceView {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
}

export interface TestimonialView {
  name: string;
  role: string;
  text: string;
}

export interface StatView {
  value: string;
  label: string;
  icon: IconName;
}

export interface PortfolioView {
  name: string;
  hasName: boolean;
  initials: string;
  headline: string;
  summary: string;
  photoUrl: string;
  coverUrl: string;
  location: string;
  email: string;
  phone: string;
  callHref: string; // tel: link, empty when no phone
  whatsappHref: string; // wa.me link, empty when no WhatsApp number
  hours: string;
  services: ServiceView[];
  testimonials: TestimonialView[];
  contacts: ContactEntry[];
  links: ContactEntry[]; // website / linkedin / github only
  experience: JobView[];
  education: EduView[];
  projects: ProjectView[];
  skills: string[];
  certifications: CertView[];
  achievements: string[];
  languages: string[];
  album: AlbumView[];
  stats: StatView[];
  labels: TemplateLabels;
  lang: Lang;
}

const clean = (s: string | null | undefined): string => (s ?? "").trim();

const cleanList = (items: string[] | null | undefined): string[] =>
  (items ?? []).map((s) => clean(s)).filter(Boolean);

export function initials(name: string): string {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function toHref(url: string): string {
  const u = clean(url);
  if (!u) return "";
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  return `https://${u}`;
}

export function linkLabel(url: string): string {
  return clean(url)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[/?#]+$/, "");
}

export function splitLines(text: string): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[•\-*·–—▪►]+\s*/, "").trim())
    .filter(Boolean);
}

export function splitTech(text: string): string[] {
  return (text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function range(start: string, end: string, present: string | null): string {
  const s = clean(start);
  const e = clean(end);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  if (s) return present ? `${s} – ${present}` : s;
  return e;
}

function computeStats(
  c: PortfolioContent,
  L: TemplateLabels,
  jobs: JobView[],
  projects: ProjectView[],
  certs: CertView[],
  services: ServiceView[],
  testimonials: TestimonialView[],
): StatView[] {
  const stats: StatView[] = [];
  const years = (c.experience ?? [])
    .map((x) => clean(x.start).match(/(19|20)\d{2}/)?.[0])
    .filter((y): y is string => Boolean(y))
    .map(Number);
  if (years.length) {
    const span = new Date().getFullYear() - Math.min(...years);
    if (span >= 1) stats.push({ value: `${span}+`, label: L.yearsExperience, icon: "briefcase" });
  }
  const companies = new Set(jobs.map((j) => j.company.toLowerCase()).filter(Boolean));
  const business = services.length > 0 && companies.size <= 1;
  if (business) {
    stats.push({ value: String(services.length), label: L.servicesOffered, icon: "wrench" });
    if (testimonials.length > 0) stats.push({ value: String(testimonials.length), label: L.happyCustomers, icon: "star" });
  } else if (companies.size > 0) {
    stats.push({ value: String(companies.size), label: L.companies, icon: "building" });
  }
  if (projects.length > 0) stats.push({ value: String(projects.length), label: L.keyProjects, icon: "layers" });
  if (certs.length > 0) stats.push({ value: String(certs.length), label: L.certifications, icon: "award" });
  return stats.slice(0, 4);
}

export function buildView(c: PortfolioContent, lang: Lang = "en"): PortfolioView {
  const L = getLabels(lang);
  const name = clean(c.fullName);
  const email = clean(c.email);
  const phone = clean(c.phone);
  const location = clean(c.location);
  const hours = clean(c.businessHours);
  const callHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
  const waDigits = clean(c.whatsapp).replace(/\D/g, "");
  const whatsappHref = waDigits ? whatsappLink(waDigits) : "";

  const contacts: ContactEntry[] = [];
  if (phone) contacts.push({ kind: "phone", label: phone, href: callHref, external: false });
  if (whatsappHref) contacts.push({ kind: "whatsapp", label: `+${waDigits}`, href: whatsappHref, external: true });
  if (email) contacts.push({ kind: "email", label: email, href: `mailto:${email}`, external: false });
  if (location) contacts.push({ kind: "location", label: location, href: "", external: false });
  if (hours) contacts.push({ kind: "hours", label: hours, href: "", external: false });
  const links: ContactEntry[] = [];
  (
    [
      ["website", c.website],
      ["linkedin", c.linkedin],
      ["github", c.github],
    ] as const
  ).forEach(([kind, url]) => {
    const u = clean(url);
    if (u) links.push({ kind, label: linkLabel(u), href: toHref(u), external: true });
  });

  const experience: JobView[] = (c.experience ?? [])
    .map((x) => ({
      role: clean(x.role),
      company: clean(x.company),
      location: clean(x.location),
      dates: clean(x.start) || clean(x.end) ? range(x.start, x.end, L.present) : "",
      current: Boolean(clean(x.start)) && !clean(x.end),
      bullets: splitLines(x.highlights),
    }))
    .filter((j) => j.role || j.company || j.bullets.length > 0);

  const education: EduView[] = (c.education ?? [])
    .map((x) => ({
      degree: clean(x.degree),
      school: clean(x.school),
      dates: range(x.start, x.end, null),
      details: clean(x.details),
    }))
    .filter((e) => e.degree || e.school || e.details);

  const projects: ProjectView[] = (c.projects ?? [])
    .map((p) => ({
      name: clean(p.name),
      description: clean(p.description),
      href: toHref(p.link),
      linkLabel: linkLabel(p.link),
      tech: splitTech(p.tech),
      imageUrl: clean(p.imageUrl),
    }))
    .filter((p) => p.name || p.description);

  // Tolerate legacy string[] certifications saved before the CertificateItem shape existed
  const certifications: CertView[] = ((c.certifications ?? []) as unknown[])
    .map((raw): CertView => {
      const x = (typeof raw === "string" ? { name: raw } : (raw ?? {})) as Partial<Record<"name" | "issuer" | "year" | "link" | "imageUrl", string>>;
      const issuer = clean(x.issuer);
      const year = clean(x.year);
      return {
        name: clean(x.name),
        issuer,
        year,
        meta: [issuer, year].filter(Boolean).join(" · "),
        href: toHref(x.link ?? ""),
        imageUrl: clean(x.imageUrl),
      };
    })
    .filter((x) => x.name || x.issuer || x.imageUrl);

  const services: ServiceView[] = (c.services ?? [])
    .map((x) => ({ name: clean(x?.name), description: clean(x?.description), price: clean(x?.price), imageUrl: clean(x?.imageUrl) }))
    .filter((x) => x.name || x.description);

  const testimonials: TestimonialView[] = (c.testimonials ?? [])
    .map((x) => ({ name: clean(x?.name), role: clean(x?.role), text: clean(x?.text) }))
    .filter((x) => x.text);

  const album: AlbumView[] = (c.album ?? [])
    .map((a) => ({ url: clean(a?.url), caption: clean(a?.caption) }))
    .filter((a) => a.url);

  return {
    name: name || L.yourName,
    hasName: Boolean(name),
    initials: initials(name),
    headline: clean(c.headline),
    summary: clean(c.summary),
    photoUrl: clean(c.photoUrl),
    coverUrl: clean(c.coverUrl),
    location,
    email,
    phone,
    callHref,
    whatsappHref,
    hours,
    services,
    testimonials,
    contacts: [...contacts, ...links],
    links,
    experience,
    education,
    projects,
    skills: cleanList(c.skills),
    certifications,
    achievements: cleanList(c.achievements),
    languages: cleanList(c.languages),
    album,
    stats: computeStats(c, L, experience, projects, certifications, services, testimonials),
    labels: L,
    lang,
  };
}

/* ───────────────────────── Theme → CSS variables ───────────────────────── */

function luminance(hex: string): number | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Readable foreground for text placed on top of `color`. Prefers white when it reaches 3:1. */
export function onColor(color: string): string {
  const l = luminance(color);
  if (l === null) return "#ffffff";
  return 1.05 / (l + 0.05) >= 3 ? "#ffffff" : "#0b0f19";
}

const GENERIC_FAMILY = /,\s*(serif|sans-serif|monospace|system-ui)\s*$/i;

/** Insert a Tamil-capable family right before the generic fallback of a font stack. */
function withTamil(stack: string, tamilFamily: string): string {
  const m = stack.match(GENERIC_FAMILY);
  return m ? `${stack.slice(0, m.index)}, ${tamilFamily}${m[0]}` : `${stack}, ${tamilFamily}`;
}

export function themeStyle(theme: TemplateTheme, lang: Lang = "en"): CSSProperties {
  const serifHeading = /,\s*serif\s*$/i.test(theme.headingFont);
  const headingFont = lang === "ta" ? withTamil(theme.headingFont, serifHeading ? "'Noto Serif Tamil'" : "'Noto Sans Tamil'") : theme.headingFont;
  const bodyFont = lang === "ta" ? withTamil(theme.bodyFont, "'Noto Sans Tamil'") : theme.bodyFont;
  return {
    "--tpl-primary": theme.primary,
    "--tpl-accent": theme.accent,
    "--tpl-bg": theme.bg,
    "--tpl-surface": theme.surface,
    "--tpl-text": theme.text,
    "--tpl-muted": theme.muted,
    "--tpl-border": theme.border,
    "--tpl-heading": headingFont,
    "--tpl-body": bodyFont,
    "--tpl-on-primary": onColor(theme.primary),
    "--tpl-on-accent": onColor(theme.accent),
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
}

/** Contact rows minus the ones already rendered as CTA buttons / hours badge. */
export function infoContacts(view: PortfolioView): ContactEntry[] {
  return view.contacts.filter((c) => c.kind !== "hours" && c.kind !== "whatsapp");
}
