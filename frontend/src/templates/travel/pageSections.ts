import type { Lang, PortfolioContent } from "../types";
import { pick } from "../../lib/siteConfig";
import { travelText } from "./labels";

// Sections of a travel page below the hero/booking area, in their default order.
// "form:<id>" entries are added for each custom form, just before Terms.
const DEFAULT_ORDER = ["rates", "fleet", "drivers", "reviews", "careers", "services", "about", "testimonials", "gallery", "@forms", "terms", "contact"];

export function sectionIds(content: PortfolioContent): string[] {
  return DEFAULT_ORDER.flatMap((id) => (id === "@forms" ? content.forms.map((f) => `form:${f.id}`) : [id]));
}

// Saved order first (dropping sections that no longer exist), then any new sections at their default position
export function orderedSections(content: PortfolioContent): string[] {
  const all = sectionIds(content);
  const saved = content.pageLayout.order.filter((id) => all.includes(id));
  const result = [...saved];
  all.forEach((id, i) => {
    if (result.includes(id)) return;
    // insert after the nearest preceding default section that is already placed
    const before = all.slice(0, i).reverse().find((x) => result.includes(x));
    result.splice(before ? result.indexOf(before) + 1 : 0, 0, id);
  });
  return result;
}

export const isHidden = (content: PortfolioContent, id: string) => content.pageLayout.hidden.includes(id);

export function sectionLabel(id: string, content: PortfolioContent, lang: Lang): string {
  const t = travelText(lang);
  if (id.startsWith("form:")) {
    const form = content.forms.find((f) => `form:${f.id}` === id);
    return form ? pick(form.title, lang) || (lang === "ta" ? "படிவம்" : "Form") : id;
  }
  const map: Record<string, string> = {
    rates: t("rates"), fleet: t("fleet"), drivers: t("drivers"), reviews: t("reviews"), careers: t("careers"),
    services: lang === "ta" ? "சேவைகள்" : "Services", about: lang === "ta" ? "எங்களைப் பற்றி" : "About",
    testimonials: lang === "ta" ? "வாடிக்கையாளர் கருத்துகள்" : "Featured quotes", gallery: lang === "ta" ? "புகைப்படங்கள்" : "Gallery",
    terms: t("terms"), contact: lang === "ta" ? "தொடர்புக்கு" : "Contact",
  };
  return map[id] ?? id;
}
