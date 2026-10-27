import type { Lang } from "./types";

// Fixed words printed by templates (headings, buttons, stat labels). User content is already in the chosen language.
export interface TemplateLabels {
  about: string;
  services: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certifications: string;
  achievements: string;
  languages: string;
  gallery: string;
  testimonials: string;
  contact: string;
  getInTouch: string;
  present: string;
  yourName: string;
  call: string;
  whatsapp: string;
  email: string;
  website: string;
  location: string;
  businessHours: string;
  viewProject: string;
  verify: string;
  viewImage: string;
  close: string;
  previous: string;
  next: string;
  yearsExperience: string;
  companies: string;
  keyProjects: string;
  happyCustomers: string;
  servicesOffered: string;
  price: string;
  photoOf: string; // alt text prefix, e.g. "Photo of"
}

export const TEMPLATE_LABELS: Record<Lang, TemplateLabels> = {
  en: {
    about: "About",
    services: "Services",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    achievements: "Achievements",
    languages: "Languages",
    gallery: "Gallery",
    testimonials: "What customers say",
    contact: "Contact",
    getInTouch: "Get in touch",
    present: "Present",
    yourName: "Your Name",
    call: "Call",
    whatsapp: "WhatsApp",
    email: "Email",
    website: "Website",
    location: "Location",
    businessHours: "Business hours",
    viewProject: "View project",
    verify: "Verify",
    viewImage: "View image",
    close: "Close",
    previous: "Previous",
    next: "Next",
    yearsExperience: "Years experience",
    companies: "Companies",
    keyProjects: "Key projects",
    happyCustomers: "Reviews",
    servicesOffered: "Services offered",
    price: "Price",
    photoOf: "Photo of",
  },
  ta: {
    about: "என்னைப் பற்றி",
    services: "சேவைகள்",
    experience: "அனுபவம்",
    education: "கல்வி",
    skills: "திறன்கள்",
    projects: "திட்டங்கள்",
    certifications: "சான்றிதழ்கள்",
    achievements: "சாதனைகள்",
    languages: "மொழிகள்",
    gallery: "புகைப்படங்கள்",
    testimonials: "வாடிக்கையாளர் கருத்துகள்",
    contact: "தொடர்புக்கு",
    getInTouch: "தொடர்பு கொள்ளுங்கள்",
    present: "தற்போது",
    yourName: "உங்கள் பெயர்",
    call: "அழைக்க",
    whatsapp: "வாட்ஸ்அப்",
    email: "மின்னஞ்சல்",
    website: "இணையதளம்",
    location: "முகவரி",
    businessHours: "வேலை நேரம்",
    viewProject: "திட்டத்தைப் பார்க்க",
    verify: "சரிபார்க்க",
    viewImage: "படத்தைப் பார்க்க",
    close: "மூடு",
    previous: "முந்தைய",
    next: "அடுத்து",
    yearsExperience: "ஆண்டு அனுபவம்",
    companies: "நிறுவனங்கள்",
    keyProjects: "முக்கிய திட்டங்கள்",
    happyCustomers: "கருத்துகள்",
    servicesOffered: "வழங்கும் சேவைகள்",
    price: "விலை",
    photoOf: "புகைப்படம்:",
  },
};

export const getLabels = (lang: Lang = "en") => TEMPLATE_LABELS[lang] ?? TEMPLATE_LABELS.en;

// WhatsApp click-to-chat link from a stored number (digits only)
export const whatsappLink = (number: string) => {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
};
