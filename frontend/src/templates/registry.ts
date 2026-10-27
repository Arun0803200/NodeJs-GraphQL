import type { LayoutKey, TemplateDesign, TemplateTheme } from "./types";

// Font stacks — families are loaded from Google Fonts in index.html
const F = {
  inter: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  poppins: "'Poppins', 'Inter', system-ui, -apple-system, sans-serif",
  playfair: "'Playfair Display', Georgia, 'Times New Roman', serif",
  merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
  lora: "'Lora', Georgia, 'Times New Roman', serif",
  dmSans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  spaceGrotesk: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  montserrat: "'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif",
  sourceSerif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  manrope: "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

function design(key: string, name: string, tier: TemplateDesign["tier"], layout: LayoutKey, theme: TemplateTheme): TemplateDesign {
  return { key, name, tier, layout, theme };
}

export const TEMPLATE_DESIGNS: TemplateDesign[] = [
  // ── Free ──────────────────────────────────────────────
  design("classic-clean", "Classic Clean", "free", "classic", {
    primary: "#1d4ed8", accent: "#38bdf8", bg: "#f8fafc", surface: "#ffffff",
    text: "#0f172a", muted: "#64748b", border: "#e2e8f0",
    headingFont: F.inter, bodyFont: F.inter, dark: false,
  }),
  design("minimal-mono", "Minimal Mono", "free", "minimal", {
    primary: "#111111", accent: "#8a8a8a", bg: "#ffffff", surface: "#fafafa",
    text: "#111111", muted: "#6b6b6b", border: "#e6e6e6",
    headingFont: F.playfair, bodyFont: F.inter, dark: false,
  }),

  // ── Premium ───────────────────────────────────────────
  design("executive-navy", "Executive Navy", "premium", "executive", {
    primary: "#0b2545", accent: "#8db3e2", bg: "#f4f6fa", surface: "#ffffff",
    text: "#13213a", muted: "#5b6b82", border: "#dde3ec",
    headingFont: F.sourceSerif, bodyFont: F.inter, dark: false,
  }),
  design("corporate-slate", "Corporate Slate", "premium", "sidebar", {
    primary: "#1e293b", accent: "#38bdf8", bg: "#f1f5f9", surface: "#ffffff",
    text: "#0f172a", muted: "#64748b", border: "#e2e8f0",
    headingFont: F.montserrat, bodyFont: F.inter, dark: false,
  }),
  design("consultant-emerald", "Consultant Emerald", "premium", "timeline", {
    primary: "#047857", accent: "#34d399", bg: "#f5faf7", surface: "#ffffff",
    text: "#0b2a22", muted: "#58706a", border: "#dae9e2",
    headingFont: F.lora, bodyFont: F.dmSans, dark: false,
  }),
  design("techlead-midnight", "Tech Lead Midnight", "premium", "bento", {
    primary: "#818cf8", accent: "#22d3ee", bg: "#0a0e1a", surface: "#121829",
    text: "#e6e9f5", muted: "#8b93b0", border: "#222a42",
    headingFont: F.manrope, bodyFont: F.inter, dark: true,
  }),
  design("product-aurora", "Product Aurora", "premium", "hero", {
    primary: "#5b21b6", accent: "#db2777", bg: "#f7f5fd", surface: "#ffffff",
    text: "#1c1433", muted: "#6b6485", border: "#e8e3f5",
    headingFont: F.poppins, bodyFont: F.inter, dark: false,
  }),
  design("finance-gold", "Finance Gold", "premium", "executive", {
    primary: "#1a1f2c", accent: "#c9a54c", bg: "#faf8f3", surface: "#ffffff",
    text: "#1a1f2c", muted: "#6b6558", border: "#e9e3d5",
    headingFont: F.playfair, bodyFont: F.manrope, dark: false,
  }),
  design("designer-coral", "Designer Coral", "premium", "bento", {
    primary: "#e4572e", accent: "#2b2d42", bg: "#fff5f0", surface: "#ffffff",
    text: "#2b2d42", muted: "#7a7285", border: "#f3e0d7",
    headingFont: F.poppins, bodyFont: F.dmSans, dark: false,
  }),
  design("analyst-teal", "Analyst Teal", "premium", "sidebar", {
    primary: "#0f4c5c", accent: "#2ec4b6", bg: "#f3f8f8", surface: "#ffffff",
    text: "#0d2a30", muted: "#5b7479", border: "#d9e7e9",
    headingFont: F.manrope, bodyFont: F.manrope, dark: false,
  }),
  design("architect-graphite", "Architect Graphite", "premium", "minimal", {
    primary: "#2b2b2e", accent: "#e0692c", bg: "#f4f3f1", surface: "#ffffff",
    text: "#1f1f22", muted: "#6f6d6a", border: "#dcd9d4",
    headingFont: F.spaceGrotesk, bodyFont: F.inter, dark: false,
  }),
  design("strategist-burgundy", "Strategist Burgundy", "premium", "classic", {
    primary: "#7a1f33", accent: "#c08a4b", bg: "#fbf8f6", surface: "#ffffff",
    text: "#2a1a1f", muted: "#75666a", border: "#eee2df",
    headingFont: F.merriweather, bodyFont: F.inter, dark: false,
  }),
  design("engineer-cobalt", "Engineer Cobalt", "premium", "timeline", {
    primary: "#1e4fd8", accent: "#06b6d4", bg: "#f5f8ff", surface: "#ffffff",
    text: "#0d1b3e", muted: "#5a6784", border: "#dfe6f5",
    headingFont: F.spaceGrotesk, bodyFont: F.inter, dark: false,
  }),
  design("marketing-sunset", "Marketing Sunset", "premium", "hero", {
    primary: "#d9480f", accent: "#c2255c", bg: "#fff8f3", surface: "#ffffff",
    text: "#2d1a12", muted: "#7c665b", border: "#f3e2d6",
    headingFont: F.montserrat, bodyFont: F.dmSans, dark: false,
  }),
  design("hr-lavender", "HR Lavender", "premium", "classic", {
    primary: "#6247aa", accent: "#b69cf5", bg: "#faf8ff", surface: "#ffffff",
    text: "#231c3a", muted: "#6f6889", border: "#ebe5f7",
    headingFont: F.manrope, bodyFont: F.dmSans, dark: false,
  }),
  design("datasci-cyan", "Data Science Cyan", "premium", "hero", {
    primary: "#22d3ee", accent: "#a78bfa", bg: "#07121c", surface: "#0e1c2a",
    text: "#e2f3f8", muted: "#8aa3b3", border: "#1b3142",
    headingFont: F.spaceGrotesk, bodyFont: F.inter, dark: true,
  }),
  design("founder-noir", "Founder Noir", "premium", "executive", {
    primary: "#d4b27a", accent: "#f5f5f4", bg: "#0b0b0c", surface: "#151517",
    text: "#f4f4f5", muted: "#a1a1aa", border: "#27272a",
    headingFont: F.playfair, bodyFont: F.manrope, dark: true,
  }),
  design("legal-ivory", "Legal Ivory", "premium", "minimal", {
    primary: "#3d2e22", accent: "#9a7b4f", bg: "#fbf8f0", surface: "#fffdf7",
    text: "#2a211a", muted: "#7a6e60", border: "#e6dcc8",
    headingFont: F.lora, bodyFont: F.sourceSerif, dark: false,
  }),
  design("healthcare-sage", "Healthcare Sage", "premium", "sidebar", {
    primary: "#3a6351", accent: "#9cc5a1", bg: "#f5f8f4", surface: "#ffffff",
    text: "#1f2d27", muted: "#62746b", border: "#dde7de",
    headingFont: F.dmSans, bodyFont: F.dmSans, dark: false,
  }),
  design("sales-crimson", "Sales Crimson", "premium", "timeline", {
    primary: "#b3122e", accent: "#f59e0b", bg: "#fdf7f7", surface: "#ffffff",
    text: "#2a1215", muted: "#7a6064", border: "#f1dfe1",
    headingFont: F.poppins, bodyFont: F.inter, dark: false,
  }),

  // ── Travels / taxi owners (booking with fare, tolls, drivers) ──
  design("travels-saffron", "Travels Saffron", "free", "travel", {
    primary: "#ea580c", accent: "#fbbf24", bg: "#fffaf5", surface: "#ffffff",
    text: "#1c1917", muted: "#78716c", border: "#f1e4d8",
    headingFont: F.poppins, bodyFont: F.inter, dark: false,
  }),
  design("cab-midnight", "Cab Midnight", "premium", "travel", {
    primary: "#facc15", accent: "#38bdf8", bg: "#0b1120", surface: "#111a2e",
    text: "#e2e8f0", muted: "#94a3b8", border: "#1f2b44",
    headingFont: F.montserrat, bodyFont: F.inter, dark: true,
  }),
  design("tour-emerald", "Tour Emerald", "premium", "travelsplit", {
    primary: "#047857", accent: "#f59e0b", bg: "#f6faf8", surface: "#ffffff",
    text: "#10231c", muted: "#5b7068", border: "#dce9e3",
    headingFont: F.dmSans, bodyFont: F.dmSans, dark: false,
  }),
  design("ride-royal", "Ride Royal", "premium", "travelsplit", {
    primary: "#1d4ed8", accent: "#f97316", bg: "#f5f7fc", surface: "#ffffff",
    text: "#0f1a33", muted: "#5d6b86", border: "#dfe5f2",
    headingFont: F.manrope, bodyFont: F.inter, dark: false,
  }),
];

const BY_KEY = new Map(TEMPLATE_DESIGNS.map((d) => [d.key, d]));

export function getDesign(key: string): TemplateDesign {
  return BY_KEY.get(key) ?? TEMPLATE_DESIGNS[0];
}
