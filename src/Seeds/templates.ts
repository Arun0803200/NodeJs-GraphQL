import { AppDataSource } from "../Config/DataSource";
import { Template } from "../Entity/Template";

type SeedTemplate = Pick<Template, "name" | "slug" | "designKey" | "category" | "description" | "tags" | "originalPrice" | "discountPrice">;

// designKey must match a design in frontend/src/templates/registry.ts
const SEED_TEMPLATES: SeedTemplate[] = [
    // Free
    { name: "Classic Clean", slug: "classic-clean", designKey: "classic-clean", category: "free", originalPrice: 0, discountPrice: null,
      tags: ["All roles", "Single page"], description: "A timeless, recruiter-friendly single-column site. Crisp typography and clear sections that put your experience first." },
    { name: "Minimal Mono", slug: "minimal-mono", designKey: "minimal-mono", category: "free", originalPrice: 0, discountPrice: null,
      tags: ["Minimal", "Editorial"], description: "Editorial layout with elegant serif headings and generous whitespace — understated, confident and easy to read." },

    // Premium
    { name: "Executive Navy", slug: "executive-navy", designKey: "executive-navy", category: "premium", originalPrice: 1499, discountPrice: 799,
      tags: ["Leadership", "Directors"], description: "A commanding top band with headline stats and a two-column body, built for senior managers and directors." },
    { name: "Corporate Slate", slug: "corporate-slate", designKey: "corporate-slate", category: "premium", originalPrice: 999, discountPrice: 599,
      tags: ["Corporate", "All roles"], description: "Structured sidebar design in cool slate tones. Contact, skills and languages sit beside a focused career story." },
    { name: "Consultant Emerald", slug: "consultant-emerald", designKey: "consultant-emerald", category: "premium", originalPrice: 1199, discountPrice: 699,
      tags: ["Consulting", "Strategy"], description: "Polished and client-ready. A career timeline that makes engagements and impact easy to scan." },
    { name: "Tech Lead Midnight", slug: "techlead-midnight", designKey: "techlead-midnight", category: "premium", originalPrice: 1299, discountPrice: 749,
      tags: ["Engineering", "Dark mode"], description: "A sleek dark theme with a bold hero and project cards — made for engineering leads and architects." },
    { name: "Product Aurora", slug: "product-aurora", designKey: "product-aurora", category: "premium", originalPrice: 1299, discountPrice: null,
      tags: ["Product", "Modern"], description: "Vibrant gradient hero with card sections that showcase launches, metrics and product thinking." },
    { name: "Finance Gold", slug: "finance-gold", designKey: "finance-gold", category: "premium", originalPrice: 1499, discountPrice: 899,
      tags: ["Finance", "Banking"], description: "Refined navy-and-gold palette with executive stats. Trustworthy and premium for finance professionals." },
    { name: "Designer Coral", slug: "designer-coral", designKey: "designer-coral", category: "premium", originalPrice: 999, discountPrice: null,
      tags: ["Design", "Creative"], description: "A playful bento grid in warm coral that lets projects and skills shine without losing professionalism." },
    { name: "Analyst Teal", slug: "analyst-teal", designKey: "analyst-teal", category: "premium", originalPrice: 899, discountPrice: 499,
      tags: ["Analytics", "Business"], description: "Clean, data-minded layout in calm teal. Highlights, certifications and tools are front and centre." },
    { name: "Architect Graphite", slug: "architect-graphite", designKey: "architect-graphite", category: "premium", originalPrice: 1199, discountPrice: null,
      tags: ["Architecture", "Engineering"], description: "Precise graphite sidebar design with strong hierarchy — ideal for solution and enterprise architects." },
    { name: "Strategist Burgundy", slug: "strategist-burgundy", designKey: "strategist-burgundy", category: "premium", originalPrice: 1399, discountPrice: 849,
      tags: ["Strategy", "Leadership"], description: "Sophisticated editorial styling in deep burgundy for strategists, advisors and senior consultants." },
    { name: "Engineer Cobalt", slug: "engineer-cobalt", designKey: "engineer-cobalt", category: "premium", originalPrice: 999, discountPrice: 549,
      tags: ["Engineering", "Developers"], description: "Crisp cobalt timeline that walks recruiters through your stack, projects and progression." },
    { name: "Marketing Sunset", slug: "marketing-sunset", designKey: "marketing-sunset", category: "premium", originalPrice: 1099, discountPrice: 649,
      tags: ["Marketing", "Brand"], description: "Warm sunset gradients and bold typography for marketers who want their brand to stand out." },
    { name: "HR Lavender", slug: "hr-lavender", designKey: "hr-lavender", category: "premium", originalPrice: 899, discountPrice: null,
      tags: ["HR", "People"], description: "Friendly, approachable lavender design that highlights people impact, programmes and certifications." },
    { name: "Data Science Cyan", slug: "datasci-cyan", designKey: "datasci-cyan", category: "premium", originalPrice: 1299, discountPrice: 699,
      tags: ["Data science", "Dark mode"], description: "Modern dark bento grid with cyan accents — perfect for data scientists and ML engineers." },
    { name: "Founder Noir", slug: "founder-noir", designKey: "founder-noir", category: "premium", originalPrice: 1999, discountPrice: 1199,
      tags: ["Founders", "Dark mode"], description: "High-contrast noir hero with cinematic typography for founders, CXOs and leaders with a story to tell." },
    { name: "Legal Ivory", slug: "legal-ivory", designKey: "legal-ivory", category: "premium", originalPrice: 1199, discountPrice: null,
      tags: ["Legal", "Compliance"], description: "Classic ivory-and-ink styling with serif headings. Formal, precise and quietly authoritative." },
    { name: "Healthcare Sage", slug: "healthcare-sage", designKey: "healthcare-sage", category: "premium", originalPrice: 999, discountPrice: 599,
      tags: ["Healthcare", "Pharma"], description: "Calm sage palette with a clear timeline for clinicians, researchers and healthcare managers." },
    { name: "Sales Crimson", slug: "sales-crimson", designKey: "sales-crimson", category: "premium", originalPrice: 1099, discountPrice: 699,
      tags: ["Sales", "Business development"], description: "Energetic executive layout in crimson that puts quotas, wins and key accounts in the spotlight." },

    // Travels / taxi owners: online booking with distance, tolls, driver bata and WhatsApp hand-off
    { name: "Travels Saffron", slug: "travels-saffron", designKey: "travels-saffron", category: "free", originalPrice: 0, discountPrice: null,
      tags: ["Travels", "Taxi", "Booking"], description: "Warm, trustworthy travels site with a cover-photo hero and an instant fare calculator: distance, toll plazas, driver bata and WhatsApp booking." },
    { name: "Cab Midnight", slug: "cab-midnight", designKey: "cab-midnight", category: "premium", originalPrice: 1499, discountPrice: 899,
      tags: ["Travels", "Taxi", "Dark mode"], description: "Bold dark design in taxi yellow. Customers get a live fare with route map and tolls, pick a vehicle and driver, and book on WhatsApp." },
    { name: "Tour Emerald", slug: "tour-emerald", designKey: "tour-emerald", category: "premium", originalPrice: 1299, discountPrice: 799,
      tags: ["Travels", "Tours", "Booking"], description: "Split-screen layout with the booking panel always in view, fleet and driver profiles alongside — ideal for tour and outstation operators." },
    { name: "Ride Royal", slug: "ride-royal", designKey: "ride-royal", category: "premium", originalPrice: 1199, discountPrice: 699,
      tags: ["Travels", "Taxi", "Corporate"], description: "Crisp royal-blue split design for cab services and corporate travel desks, with transparent per-km rates and verified driver details." },
];

// Inserts any seed template whose slug doesn't exist yet; existing rows (and admin edits) are left alone
export async function seedTemplates(): Promise<void> {
    const repo = AppDataSource.getRepository(Template);
    const existing = new Set((await repo.find({ select: ["slug"] })).map((t) => t.slug));
    const missing = SEED_TEMPLATES
        .map((t, index) => ({ ...t, sortOrder: index + 1 }))
        .filter((t) => !existing.has(t.slug));
    if (missing.length === 0) return;

    const now = new Date();
    await repo.save(missing.map((t) => repo.create({ ...t, isActive: true, createdAt: now, updatedAt: now })));
    console.log(`Seeded ${missing.length} template(s)`);
}
