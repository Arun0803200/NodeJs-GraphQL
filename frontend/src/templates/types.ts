// Content a user fills in once; every template design renders the same shape.
export interface ExperienceItem {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string; // empty = "Present"
  highlights: string; // one bullet per line
}

export interface EducationItem {
  degree: string;
  school: string;
  start: string;
  end: string;
  details: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  link: string;
  tech: string; // comma separated
  imageUrl: string; // optional screenshot / cover
}

export interface CertificateItem {
  name: string;
  issuer: string;
  year: string;
  link: string; // verification URL, optional
  imageUrl: string; // uploaded certificate image, optional
}

// Offerings of a small business (mechanic, electrician, caterer, shop…)
export interface ServiceItem {
  name: string;
  description: string;
  price: string; // free text, e.g. "₹450 onwards"
  imageUrl: string;
}

export interface TestimonialItem {
  name: string;
  role: string; // e.g. "Royal Enfield owner"
  text: string;
}

export interface AlbumItem {
  url: string;
  caption: string;
}

// ─── Travels / taxi booking (used by the travel layouts) ───
export interface TravelVehicle {
  id: string; // stable id: reviews of this vehicle point at it
  name: string; // e.g. "Toyota Innova Crysta"
  type: string; // e.g. "SUV", "Sedan", "Tempo Traveller"
  seats: number;
  ac: boolean;
  imageUrl: string;
  features: string; // comma separated, e.g. "Music system, Carrier, Charging port"
  // Per-vehicle rates; 0 = use the site-wide rate
  cityPerKm: number;
  longPerKm: number;
  tollPerPlaza: number;
}

export interface TravelDriver {
  id: string; // stable id: reviews of this driver point at it
  name: string;
  phone: string;
  photoUrl: string;
  experienceYears: number;
  languages: string;
  licenseNumber: string;
  licenseValidTill: string;
  licenseImageUrl: string;
  showLicenseImage: boolean; // licence photo is private unless the owner opts in
}

// Fare rules and booking options. The server prices trips from the published copy of these settings.
export interface TravelConfig {
  enabled: boolean;
  cityPerKm: number; // ₹ per km inside the city
  longPerKm: number; // ₹ per km for outstation / long drive
  cityLimitKm: number; // trips longer than this are priced as outstation
  cityMinFare: number;
  cityDriverBata: number;
  oneWayMinKm: number; // minimum billed km for a one-way drop
  minKmPerDay: number; // minimum billed km per day on round trips
  driverBataPerDay: number; // driver allowance (padi) per day outstation
  tollPerPlaza: number; // average toll per plaza crossed
  maxTripKm: number; // 0 = no limit
  bookingWhatsapp: string; // digits with country code; falls back to the WhatsApp number
  showDrivers: boolean;
  allowDriverChoice: boolean;
  driverHiring: boolean; // "Drive with us" section + application form
  vehicles: TravelVehicle[];
  drivers: TravelDriver[];
}

// ─── Ratings & reviews, custom forms, page layout (shared by both languages; labels are bilingual) ───
export type Bilingual = { en: string; ta: string };
export type ReviewTarget = "business" | "driver" | "vehicle";

export interface RatingCriterion { id: string; label: Bilingual }
export interface RatingType {
  id: string;
  enabled: boolean;
  label: Bilingual; // e.g. "Overall experience", "Driver", "Car comfort"
  target: ReviewTarget; // business = common reviews section; driver / vehicle = shown on that card
  criteria: RatingCriterion[]; // optional sub-ratings, e.g. Punctuality, Cleanliness
}
export interface ReviewsConfig {
  enabled: boolean;
  moderation: "approve" | "auto";
  types: RatingType[];
}

export type FieldType = "text" | "textarea" | "number" | "email" | "phone" | "date" | "time" | "select" | "radio" | "multiselect" | "checkbox";
export interface FormField {
  id: string;
  type: FieldType;
  label: Bilingual;
  placeholder: Bilingual;
  required: boolean;
  options: Bilingual[]; // select / radio / multiselect
}
export interface SiteForm {
  id: string;
  enabled: boolean;
  title: Bilingual;
  description: Bilingual;
  submitLabel: Bilingual;
  whatsapp: boolean; // open WhatsApp with the answers after saving
  fields: FormField[];
}

// Order and visibility of page sections (ids like "fleet", "reviews", "form:<id>")
export interface PageLayout {
  order: string[];
  hidden: string[];
}

export interface PortfolioContent {
  fullName: string;
  headline: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  photoUrl: string;
  coverUrl: string; // wide banner image for the hero, optional
  whatsapp: string; // phone number with country code, digits only (e.g. 919840012345)
  businessHours: string;
  services: ServiceItem[];
  testimonials: TestimonialItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificateItem[];
  achievements: string[];
  languages: string[];
  album: AlbumItem[]; // photo gallery
  travel: TravelConfig; // same in every language
  travelTerms: string; // per language, e.g. "Parking and permit charges extra"
  hiringText: string; // per language: what drivers get, one point per line
  reviews: ReviewsConfig;
  forms: SiteForm[];
  pageLayout: PageLayout;
}

export type Lang = "en" | "ta";

// What a user's website stores: one PortfolioContent per language
export interface SiteContent {
  defaultLang: Lang;
  languages: Partial<Record<Lang, PortfolioContent>>;
}

export type LayoutKey = "classic" | "minimal" | "sidebar" | "hero" | "timeline" | "executive" | "bento" | "travel" | "travelsplit";

export interface TemplateTheme {
  primary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  dark: boolean;
}

export interface TemplateDesign {
  key: string;
  name: string;
  tier: "free" | "premium";
  layout: LayoutKey;
  theme: TemplateTheme;
}

export interface LayoutProps {
  content: PortfolioContent;
  theme: TemplateTheme;
  tier: "free" | "premium";
  lang: Lang;
  // Username of the published website; without it booking forms run in preview mode
  owner?: string;
}
