import { getDesign } from "./registry";
import type { LayoutKey } from "./types";

// Builder sections, and which ones each layout actually renders.
// Keep in sync with templates/layouts/*: the builder only offers sections the chosen template shows.
export type BuilderSection =
  | "basics" | "travel" | "contact" | "services" | "album" | "experience"
  | "certificates" | "testimonials" | "education" | "skills" | "projects" | "more"
  | "reviews" | "forms" | "layout";

export type ContactField = "phone" | "whatsapp" | "email" | "location" | "hours" | "website" | "linkedin" | "github";

const PORTFOLIO_SECTIONS: BuilderSection[] = [
  "basics", "contact", "services", "album", "experience", "certificates", "testimonials", "education", "skills", "projects", "more",
];
// Travel layouts: business page with booking, fleet, drivers, packages, reviews, gallery and contact
const TRAVEL_SECTIONS: BuilderSection[] = ["basics", "travel", "reviews", "forms", "layout", "contact", "services", "album", "testimonials"];

const ALL_CONTACT: ContactField[] = ["phone", "whatsapp", "email", "location", "hours", "website", "linkedin", "github"];
const TRAVEL_CONTACT: ContactField[] = ["phone", "whatsapp", "email", "location", "hours", "website"];

const isTravel = (layout: LayoutKey) => layout === "travel" || layout === "travelsplit";

export function sectionsFor(designKey: string | undefined): Set<BuilderSection> {
  if (!designKey) return new Set(PORTFOLIO_SECTIONS);
  return new Set(isTravel(getDesign(designKey).layout) ? TRAVEL_SECTIONS : PORTFOLIO_SECTIONS);
}

export function contactFieldsFor(designKey: string | undefined): Set<ContactField> {
  if (!designKey) return new Set(ALL_CONTACT);
  return new Set(isTravel(getDesign(designKey).layout) ? TRAVEL_CONTACT : ALL_CONTACT);
}
