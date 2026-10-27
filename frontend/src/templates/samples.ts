import type { Lang, PortfolioContent, ReviewsConfig, SiteForm, TravelConfig } from "./types";
import { DEFAULT_TRAVEL, EMPTY_CONTENT, SAMPLE_CONTENT } from "./sampleContent";
import { getDesign } from "./registry";

export type PersonaKey = "corporate" | "mechanic" | "electrician" | "ac-technician" | "caterer" | "shop" | "travels";

export interface SamplePersona {
  key: PersonaKey;
  icon: string;
  label: Record<Lang, string>;
  content: Record<Lang, PortfolioContent>;
}

const unsplash = (id: string, w: number, h: number) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&q=75&auto=format&fit=crop`;
const pexels = (id: number, w: number, h: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
const photo = (url: string) => url; // readability in the persona tables below

// Tamil versions reuse the English images; only text differs
function withSharedMedia(ta: PortfolioContent, en: PortfolioContent): PortfolioContent {
  return {
    ...ta,
    photoUrl: en.photoUrl,
    coverUrl: en.coverUrl,
    whatsapp: en.whatsapp,
    phone: en.phone,
    email: en.email,
    website: en.website,
    linkedin: en.linkedin,
    github: en.github,
    album: ta.album.map((a, i) => ({ ...a, url: en.album[i]?.url ?? a.url })),
    services: ta.services.map((s, i) => ({ ...s, imageUrl: en.services[i]?.imageUrl ?? s.imageUrl })),
    projects: ta.projects.map((p, i) => ({ ...p, link: en.projects[i]?.link ?? p.link, imageUrl: en.projects[i]?.imageUrl ?? p.imageUrl })),
    certifications: ta.certifications.map((c, i) => ({ ...c, link: en.certifications[i]?.link ?? c.link, imageUrl: en.certifications[i]?.imageUrl ?? c.imageUrl })),
  };
}

const base = (overrides: Partial<PortfolioContent>): PortfolioContent => ({ ...EMPTY_CONTENT, ...overrides });

// ─── Corporate professional ───────────────────────────
const corporateEn = SAMPLE_CONTENT;
const corporateTa = withSharedMedia(base({
  fullName: "பிரியா ராகவன்",
  headline: "மூத்த தயாரிப்பு மேலாளர் · நிறுவன SaaS",
  summary: "Fortune 500 நிறுவனங்கள் பயன்படுத்தும் B2B தளங்களை உருவாக்குவதில் 9+ ஆண்டுகள் அனுபவம் கொண்ட தயாரிப்புத் தலைவர். சிக்கலான வணிகப் பிரச்சினைகளை அளவிடக்கூடிய முடிவுகளாக மாற்றுகிறேன் — அனலிட்டிக்ஸ், பணப்பரிவர்த்தனை மற்றும் பணிச்சூழல் தயாரிப்புகள் மூலம் $40M ஆண்டு வருவாய் வளர்ச்சிக்கு உதவியுள்ளேன்.",
  location: "பெங்களூரு, இந்தியா",
  experience: [
    { role: "மூத்த தயாரிப்பு மேலாளர்", company: "Infosys Digital", location: "பெங்களூரு", start: "ஏப்ரல் 2021", end: "", highlights: "1,200+ நிறுவன வாடிக்கையாளர்கள் பயன்படுத்தும் அனலிட்டிக்ஸ் தளத்தின் திட்டமிடல் பொறுப்பு\nசுயசேவை டாஷ்போர்டுகள் மூலம் அறிக்கை நேரத்தை 65% குறைத்தேன்\n18 பேர் கொண்ட பல்துறை அணியை வழிநடத்துகிறேன்" },
    { role: "தயாரிப்பு மேலாளர்", company: "Accenture", location: "ஹைதராபாத்", start: "ஜூன் 2018", end: "மார்ச் 2021", highlights: "40 வங்கி வாடிக்கையாளர்கள் பயன்படுத்தும் பணப்பரிவர்த்தனை சரிபார்ப்பு தொகுப்பை வெளியிட்டேன்\nOKR திட்டமிடல் மூலம் டெலிவரி துல்லியத்தை 30% உயர்த்தினேன்" },
    { role: "வணிக ஆய்வாளர்", company: "Tata Consultancy Services", location: "சென்னை", start: "ஜூலை 2015", end: "மே 2018", highlights: "6 நாடுகளில் செயல்படும் சில்லறை விநியோகச் சங்கிலி தளத்துக்கான தேவைகளை வடிவமைத்தேன்\nஆண்டுக்கு ₹3.2 கோடி சரக்குச் செலவைச் சேமித்த KPI மாதிரிகளை உருவாக்கினேன்" },
  ],
  education: [
    { degree: "MBA, உத்தி மற்றும் செயல்பாடுகள்", school: "இந்திய மேலாண்மை நிறுவனம், பெங்களூரு", start: "2013", end: "2015", details: "தங்கப் பதக்கம் · தயாரிப்பு மன்றத் தலைவர்" },
    { degree: "B.E., கணினி அறிவியல்", school: "அண்ணா பல்கலைக்கழகம், சென்னை", start: "2009", end: "2013", details: "சிறப்புத் தகுதியுடன் முதல் வகுப்பு" },
  ],
  skills: ["தயாரிப்பு உத்தி", "திட்ட வரைபடம்", "பங்குதாரர் மேலாண்மை", "தரவு பகுப்பாய்வு", "SQL", "A/B சோதனை", "Agile / Scrum", "பயனர் ஆய்வு", "சந்தை அறிமுகம்", "அணித் தலைமை"],
  projects: [
    { name: "Insight Studio", description: "இயல்பான மொழியில் கேள்விகள் கேட்கும் வசதியுடன் கூடிய சுயசேவை BI தளம்.", link: "", tech: "React, Snowflake, dbt", imageUrl: "" },
    { name: "PayMatch", description: "தினமும் 20 லட்சம்+ பரிவர்த்தனைகளை 99.7% துல்லியத்துடன் பொருத்தும் தானியங்கி அமைப்பு.", link: "", tech: "Kafka, Python, PostgreSQL", imageUrl: "" },
    { name: "Vendor 360", description: "கொள்முதல் அணிகளுக்கு நேரடி அபாய மதிப்பெண்களை வழங்கும் விற்பனையாளர் செயல்திறன் தளம்.", link: "", tech: "Angular, Node.js, AWS", imageUrl: "" },
  ],
  certifications: [
    { name: "சான்றளிக்கப்பட்ட ஸ்க்ரம் தயாரிப்பு உரிமையாளர் (CSPO)", issuer: "Scrum Alliance", year: "2022", link: "", imageUrl: "" },
    { name: "Google தரவு பகுப்பாய்வு நிபுணர்", issuer: "Google", year: "2021", link: "", imageUrl: "" },
    { name: "AWS கிளவுட் பிராக்டிஷனர்", issuer: "Amazon Web Services", year: "2020", link: "", imageUrl: "" },
  ],
  achievements: ["Infosys சிறப்பு விருது 2023", "ProductCon பெங்களூரு 2022 பேச்சாளர்", "25+ இளம் தயாரிப்பு மேலாளர்களுக்கு வழிகாட்டி"],
  languages: ["ஆங்கிலம்", "தமிழ்", "இந்தி"],
  testimonials: [
    { name: "ராகுல் மேனன்", role: "துணைத் தலைவர், Infosys Digital", text: "சிக்கலான பிரச்சினைகளுக்கும் பிரியா தெளிவைக் கொண்டு வருகிறார். அவரது திட்டங்கள் தரவு அடிப்படையிலானவை." },
    { name: "அனிதா தேசாய்", role: "இயக்குநர், Accenture", text: "நான் பணியாற்றியவர்களில் மிக நம்பகமான தயாரிப்பு மேலாளர்களில் ஒருவர் — அழுத்தத்திலும் அமைதியானவர்." },
  ],
  album: [
    { url: "", caption: "தலைமையுடன் காலாண்டு திட்ட ஆய்வு" },
    { url: "", caption: "அனலிட்டிக்ஸ் அணியுடன் ஹேக்கத்தான்" },
    { url: "", caption: "ProductCon பெங்களூருவில் உரை" },
    { url: "", caption: "வாடிக்கையாளர் கண்டறிதல் பயிலரங்கு" },
    { url: "", caption: "Insight Studio வெளியீட்டு நாள்" },
    { url: "", caption: "இளம் மேலாளர்களுக்கு வழிகாட்டுதல்" },
  ],
}), corporateEn);

// ─── Bike & car mechanic ─────────────────────────────
const mechanicEn = base({
  fullName: "R. Murugan",
  headline: "Bike & Car Mechanic · Murugan Auto Works",
  summary: "22 years of hands-on experience repairing two-wheelers and cars in Chennai. Honest pricing, genuine spare parts and same-day service for most repairs. Free pickup and drop within 5 km of Perambur.",
  email: "muruganautoworks@gmail.com",
  phone: "+91 98400 12345",
  whatsapp: "919840012345",
  location: "Perambur, Chennai",
  businessHours: "Mon–Sat 8:30 AM – 8:30 PM · Sun 9 AM – 1 PM",
  photoUrl: photo(pexels(2379005, 480, 480)),
  coverUrl: photo(unsplash("photo-1530046339160-ce3e530c7d2f", 1600, 700)),
  services: [
    { name: "General service", description: "Oil change, brake check, chain adjustment and water wash.", price: "₹450 onwards", imageUrl: unsplash("photo-1558981403-c5f9899a28bc", 900, 600) },
    { name: "Engine repair & overhaul", description: "Complete engine inspection, repair and tuning for bikes and cars.", price: "Quote after inspection", imageUrl: unsplash("photo-1486262715619-67b85e0b08d3", 900, 600) },
    { name: "Brake & clutch work", description: "Pads, cables, clutch plates — replaced with genuine parts.", price: "₹250 onwards", imageUrl: unsplash("photo-1619642751034-765dfdf7c58e", 900, 600) },
    { name: "Tyres & puncture", description: "Tubeless puncture, wheel alignment and new tyres.", price: "₹80 onwards", imageUrl: pexels(4489734, 900, 600) },
  ],
  experience: [
    { role: "Owner & Chief Mechanic", company: "Murugan Auto Works", location: "Perambur, Chennai", start: "2010", end: "", highlights: "Serviced 15,000+ bikes and cars\nTeam of 4 trained mechanics\n4.8★ rating from 600+ Google reviews" },
    { role: "Senior Mechanic", company: "TVS Authorised Service Centre", location: "Kolathur, Chennai", start: "2003", end: "2010", highlights: "Specialised in engine overhaul and electrical faults" },
  ],
  education: [{ degree: "ITI – Motor Vehicle Mechanic", school: "Government ITI, Guindy", start: "2001", end: "2003", details: "" }],
  skills: ["Engine overhaul", "Two-wheeler service", "Car diagnostics", "Brakes & clutch", "Electrical wiring", "Welding"],
  certifications: [
    { name: "Maruti Suzuki Certified Technician", issuer: "Maruti Suzuki Training Academy", year: "2015", link: "", imageUrl: "" },
    { name: "Hero MotoCorp Service Training", issuer: "Hero MotoCorp", year: "2012", link: "", imageUrl: "" },
  ],
  achievements: ["Best Service Partner – Perambur Traders Association 2022"],
  languages: ["Tamil", "English", "Telugu"],
  testimonials: [
    { name: "Karthik S", role: "Royal Enfield owner", text: "Fixed my bike the same day at a fair price. Very honest mechanic!" },
    { name: "Lakshmi R", role: "Maruti Swift owner", text: "Pickup and drop service saved me a full day. Highly recommended." },
  ],
  album: [
    { url: pexels(4489702, 900, 650), caption: "Our workshop with car lift" },
    { url: unsplash("photo-1558981403-c5f9899a28bc", 900, 650), caption: "Bike ready after full service" },
    { url: unsplash("photo-1486262715619-67b85e0b08d3", 900, 650), caption: "Engine overhaul in progress" },
    { url: unsplash("photo-1609630875171-b1321377ee65", 900, 650), caption: "Sports bike tune-up" },
    { url: unsplash("photo-1619642751034-765dfdf7c58e", 900, 650), caption: "Careful work with the right tools" },
    { url: pexels(4489734, 900, 650), caption: "Wheel and tyre service" },
  ],
});
const mechanicTa = withSharedMedia(base({
  fullName: "ரா. முருகன்",
  headline: "பைக் & கார் மெக்கானிக் · முருகன் ஆட்டோ ஒர்க்ஸ்",
  summary: "சென்னையில் இருசக்கர வாகனங்கள் மற்றும் கார்களை பழுது பார்ப்பதில் 22 ஆண்டுகள் அனுபவம். நியாயமான கட்டணம், அசல் உதிரி பாகங்கள், பெரும்பாலான பழுதுகளுக்கு அதே நாளில் சேவை. பெரம்பூரிலிருந்து 5 கி.மீ. வரை இலவச பிக்அப் & டிராப்.",
  location: "பெரம்பூர், சென்னை",
  businessHours: "திங்கள்–சனி காலை 8:30 – இரவு 8:30 · ஞாயிறு காலை 9 – மதியம் 1",
  services: [
    { name: "பொது சர்வீஸ்", description: "ஆயில் மாற்றம், பிரேக் சரிபார்ப்பு, செயின் அட்ஜஸ்ட்மெண்ட் மற்றும் வாட்டர் வாஷ்.", price: "₹450 முதல்", imageUrl: "" },
    { name: "இன்ஜின் பழுது & ஓவர்ஹால்", description: "பைக் மற்றும் கார்களுக்கு முழு இன்ஜின் பரிசோதனை, பழுது நீக்கம் மற்றும் டியூனிங்.", price: "பரிசோதனைக்குப் பின் விலை", imageUrl: "" },
    { name: "பிரேக் & கிளட்ச் வேலை", description: "பேட், கேபிள், கிளட்ச் பிளேட் — அசல் பாகங்களுடன் மாற்றம்.", price: "₹250 முதல்", imageUrl: "" },
    { name: "டயர் & பஞ்சர்", description: "டியூப்லெஸ் பஞ்சர், வீல் அலைன்மெண்ட் மற்றும் புதிய டயர்கள்.", price: "₹80 முதல்", imageUrl: "" },
  ],
  experience: [
    { role: "உரிமையாளர் & தலைமை மெக்கானிக்", company: "முருகன் ஆட்டோ ஒர்க்ஸ்", location: "பெரம்பூர், சென்னை", start: "2010", end: "", highlights: "15,000+ பைக் மற்றும் கார்களுக்கு சர்வீஸ் செய்துள்ளோம்\nபயிற்சி பெற்ற 4 மெக்கானிக்குகள் கொண்ட குழு\n600+ Google மதிப்புரைகளில் 4.8★ மதிப்பீடு" },
    { role: "மூத்த மெக்கானிக்", company: "TVS அங்கீகரிக்கப்பட்ட சர்வீஸ் சென்டர்", location: "கொளத்தூர், சென்னை", start: "2003", end: "2010", highlights: "இன்ஜின் ஓவர்ஹால் மற்றும் மின் கோளாறுகளில் நிபுணத்துவம்" },
  ],
  education: [{ degree: "ஐடிஐ – மோட்டார் வாகன மெக்கானிக்", school: "அரசு ஐடிஐ, கிண்டி", start: "2001", end: "2003", details: "" }],
  skills: ["இன்ஜின் ஓவர்ஹால்", "இருசக்கர வாகன சர்வீஸ்", "கார் டயக்னாஸ்டிக்ஸ்", "பிரேக் & கிளட்ச்", "மின் வயரிங்", "வெல்டிங்"],
  certifications: [
    { name: "மாருதி சுசுகி சான்றிதழ் பெற்ற டெக்னீஷியன்", issuer: "மாருதி சுசுகி பயிற்சி மையம்", year: "2015", link: "", imageUrl: "" },
    { name: "ஹீரோ மோட்டோகார்ப் சர்வீஸ் பயிற்சி", issuer: "ஹீரோ மோட்டோகார்ப்", year: "2012", link: "", imageUrl: "" },
  ],
  achievements: ["சிறந்த சர்வீஸ் பார்ட்னர் – பெரம்பூர் வணிகர் சங்கம் 2022"],
  languages: ["தமிழ்", "ஆங்கிலம்", "தெலுங்கு"],
  testimonials: [
    { name: "கார்த்திக் எஸ்", role: "ராயல் என்ஃபீல்ட் உரிமையாளர்", text: "அதே நாளில் நியாயமான விலையில் என் பைக்கை சரி செய்தார். மிகவும் நேர்மையான மெக்கானிக்!" },
    { name: "லக்ஷ்மி ஆர்", role: "மாருதி ஸ்விஃப்ட் உரிமையாளர்", text: "பிக்அப் & டிராப் சேவையால் ஒரு முழு நாள் மிச்சமானது. நிச்சயமாக பரிந்துரைக்கிறேன்." },
  ],
  album: [
    { url: "", caption: "கார் லிஃப்ட் கொண்ட எங்கள் பணிமனை" },
    { url: "", caption: "முழு சர்வீஸுக்குப் பின் தயாரான பைக்" },
    { url: "", caption: "இன்ஜின் ஓவர்ஹால் பணி" },
    { url: "", caption: "ஸ்போர்ட்ஸ் பைக் டியூன்-அப்" },
    { url: "", caption: "சரியான கருவிகளுடன் கவனமான வேலை" },
    { url: "", caption: "வீல் மற்றும் டயர் சர்வீஸ்" },
  ],
}), mechanicEn);

// ─── Electrician ─────────────────────────────────────
const electricianEn = base({
  fullName: "S. Senthil Kumar",
  headline: "Licensed Electrician · Senthil Electricals",
  summary: "Government-licensed electrician serving homes, shops and offices across South Chennai for 15 years. Safe, neat wiring with ISI-marked materials and a 6-month workmanship guarantee. Emergency repairs available 24×7.",
  email: "senthilelectricals@gmail.com",
  phone: "+91 94440 56789",
  whatsapp: "919444056789",
  location: "Tambaram, Chennai",
  businessHours: "Every day 8 AM – 9 PM · Emergency 24×7",
  photoUrl: pexels(8005400, 480, 480),
  coverUrl: unsplash("photo-1565608438257-fac3c27beb36", 1600, 700),
  services: [
    { name: "House wiring", description: "New wiring, rewiring and concealed conduit work for flats and independent houses.", price: "₹25 per point onwards", imageUrl: pexels(8005368, 900, 600) },
    { name: "Switch, socket & MCB repair", description: "Replacement of faulty switches, sockets, MCBs and distribution boards.", price: "₹150 onwards", imageUrl: unsplash("photo-1621905252507-b35492cc74b4", 900, 600) },
    { name: "Fan, light & geyser installation", description: "Ceiling fans, LED lights, geysers and exhaust fans fitted safely.", price: "₹200 onwards", imageUrl: unsplash("photo-1545259741-2ea3ebf61fa3", 900, 600) },
    { name: "Inverter & UPS setup", description: "Inverter installation, battery replacement and load balancing.", price: "₹500 onwards", imageUrl: unsplash("photo-1581092918056-0c4c3acd3789", 900, 600) },
  ],
  experience: [
    { role: "Owner & Licensed Electrician", company: "Senthil Electricals", location: "Tambaram, Chennai", start: "2012", end: "", highlights: "Wired 350+ homes and 60+ shops\nAMC for 12 apartment complexes\nZero safety incidents in 12 years" },
    { role: "Electrician", company: "L&T Construction (contract)", location: "Chennai", start: "2009", end: "2012", highlights: "Commercial building wiring and panel work" },
  ],
  education: [{ degree: "ITI – Electrician", school: "Government ITI, Ambattur", start: "2007", end: "2009", details: "" }],
  skills: ["House wiring", "Panel boards", "Earthing", "Inverter & UPS", "Fault finding", "LED lighting"],
  certifications: [
    { name: "Electrical Wireman Licence (Grade B)", issuer: "TN Electrical Licensing Board", year: "2012", link: "", imageUrl: "" },
    { name: "Electrical Safety Training", issuer: "NSDC – Skill India", year: "2019", link: "", imageUrl: "" },
  ],
  achievements: ["Trusted partner for 12 apartment associations"],
  languages: ["Tamil", "English"],
  testimonials: [
    { name: "Ramesh K", role: "Home owner, Chromepet", text: "Rewired our 25-year-old house neatly in 3 days. Very professional and clean work." },
    { name: "Priya Stores", role: "Shop owner, Tambaram", text: "Came within 30 minutes at night when our MCB tripped. Lifesaver!" },
  ],
  album: [
    { url: pexels(8005368, 900, 650), caption: "Panel board maintenance" },
    { url: pexels(8005397, 900, 650), caption: "Safe wiring with protective gear" },
    { url: unsplash("photo-1565608438257-fac3c27beb36", 900, 650), caption: "Fault finding with multimeter" },
    { url: unsplash("photo-1581092918056-0c4c3acd3789", 900, 650), caption: "Inverter board repair" },
    { url: unsplash("photo-1581244277943-fe4a9c777189", 900, 650), caption: "Professional tools" },
    { url: unsplash("photo-1545259741-2ea3ebf61fa3", 900, 650), caption: "Smart switch installation" },
  ],
});
const electricianTa = withSharedMedia(base({
  fullName: "எஸ். செந்தில் குமார்",
  headline: "உரிமம் பெற்ற எலக்ட்ரீஷியன் · செந்தில் எலக்ட்ரிகல்ஸ்",
  summary: "தென் சென்னை முழுவதும் வீடுகள், கடைகள் மற்றும் அலுவலகங்களுக்கு 15 ஆண்டுகளாக சேவை செய்யும் அரசு உரிமம் பெற்ற எலக்ட்ரீஷியன். ISI தரமுள்ள பொருட்களுடன் பாதுகாப்பான, நேர்த்தியான வயரிங் மற்றும் 6 மாத வேலை உத்தரவாதம். அவசர பழுது 24×7 கிடைக்கும்.",
  location: "தாம்பரம், சென்னை",
  businessHours: "தினமும் காலை 8 – இரவு 9 · அவசரம் 24×7",
  services: [
    { name: "வீட்டு வயரிங்", description: "அடுக்குமாடி மற்றும் தனி வீடுகளுக்கு புதிய வயரிங், மறு வயரிங் மற்றும் கன்சீல்டு கண்டியூட் வேலை.", price: "ஒரு பாயிண்டுக்கு ₹25 முதல்", imageUrl: "" },
    { name: "சுவிட்ச், சாக்கெட் & MCB பழுது", description: "பழுதான சுவிட்ச், சாக்கெட், MCB மற்றும் டிஸ்ட்ரிபியூஷன் போர்டு மாற்றம்.", price: "₹150 முதல்", imageUrl: "" },
    { name: "ஃபேன், லைட் & கீசர் பொருத்துதல்", description: "சீலிங் ஃபேன், LED லைட், கீசர் மற்றும் எக்ஸாஸ்ட் ஃபேன் பாதுகாப்பாகப் பொருத்துதல்.", price: "₹200 முதல்", imageUrl: "" },
    { name: "இன்வெர்ட்டர் & UPS அமைப்பு", description: "இன்வெர்ட்டர் பொருத்துதல், பேட்டரி மாற்றம் மற்றும் லோட் பேலன்சிங்.", price: "₹500 முதல்", imageUrl: "" },
  ],
  experience: [
    { role: "உரிமையாளர் & உரிமம் பெற்ற எலக்ட்ரீஷியன்", company: "செந்தில் எலக்ட்ரிகல்ஸ்", location: "தாம்பரம், சென்னை", start: "2012", end: "", highlights: "350+ வீடுகள் மற்றும் 60+ கடைகளுக்கு வயரிங்\n12 அடுக்குமாடி குடியிருப்புகளுக்கு ஆண்டு பராமரிப்பு ஒப்பந்தம்\n12 ஆண்டுகளில் ஒரு பாதுகாப்பு விபத்தும் இல்லை" },
    { role: "எலக்ட்ரீஷியன்", company: "L&T கன்ஸ்ட்ரக்ஷன் (ஒப்பந்தம்)", location: "சென்னை", start: "2009", end: "2012", highlights: "வணிகக் கட்டட வயரிங் மற்றும் பேனல் வேலை" },
  ],
  education: [{ degree: "ஐடிஐ – எலக்ட்ரீஷியன்", school: "அரசு ஐடிஐ, அம்பத்தூர்", start: "2007", end: "2009", details: "" }],
  skills: ["வீட்டு வயரிங்", "பேனல் போர்டு", "எர்த்திங்", "இன்வெர்ட்டர் & UPS", "கோளாறு கண்டறிதல்", "LED விளக்குகள்"],
  certifications: [
    { name: "மின் வயர்மேன் உரிமம் (கிரேடு B)", issuer: "தமிழ்நாடு மின் உரிம வாரியம்", year: "2012", link: "", imageUrl: "" },
    { name: "மின் பாதுகாப்பு பயிற்சி", issuer: "NSDC – ஸ்கில் இந்தியா", year: "2019", link: "", imageUrl: "" },
  ],
  achievements: ["12 குடியிருப்போர் சங்கங்களின் நம்பகமான பங்குதாரர்"],
  languages: ["தமிழ்", "ஆங்கிலம்"],
  testimonials: [
    { name: "ரமேஷ் கே", role: "வீட்டு உரிமையாளர், குரோம்பேட்டை", text: "எங்கள் 25 ஆண்டு பழைய வீட்டை 3 நாட்களில் நேர்த்தியாக மறு வயரிங் செய்தார். மிகவும் சிறப்பான வேலை." },
    { name: "பிரியா ஸ்டோர்ஸ்", role: "கடை உரிமையாளர், தாம்பரம்", text: "இரவில் MCB டிரிப் ஆனபோது 30 நிமிடத்தில் வந்து சரி செய்தார். மிக்க நன்றி!" },
  ],
  album: [
    { url: "", caption: "பேனல் போர்டு பராமரிப்பு" },
    { url: "", caption: "பாதுகாப்பு உபகரணங்களுடன் வயரிங்" },
    { url: "", caption: "மல்டிமீட்டர் மூலம் கோளாறு கண்டறிதல்" },
    { url: "", caption: "இன்வெர்ட்டர் போர்டு பழுது" },
    { url: "", caption: "தொழில்முறை கருவிகள்" },
    { url: "", caption: "ஸ்மார்ட் சுவிட்ச் பொருத்துதல்" },
  ],
}), electricianEn);

// ─── AC service technician ───────────────────────────
const acEn = base({
  fullName: "J. Arun Prakash",
  headline: "AC Service & Repair Expert · Cool Care AC Services",
  summary: "Authorised technician for split and window ACs of all major brands. Doorstep service across Velachery, Adyar and OMR with transparent pricing, genuine gas and a 30-day service warranty.",
  email: "coolcareac@gmail.com",
  phone: "+91 90030 24680",
  whatsapp: "919003024680",
  location: "Velachery, Chennai",
  businessHours: "Mon–Sun 9 AM – 8 PM",
  photoUrl: pexels(6474475, 480, 480),
  coverUrl: pexels(7019023, 1600, 700),
  services: [
    { name: "AC general service", description: "Jet-pump cleaning of indoor and outdoor units, filter wash and cooling check.", price: "₹499", imageUrl: pexels(5463576, 900, 600) },
    { name: "Gas refilling", description: "Leak test, leak fixing and gas top-up or full refill (R32 / R410A / R22).", price: "₹2,200 onwards", imageUrl: unsplash("photo-1545259741-2ea3ebf61fa3", 900, 600) },
    { name: "Installation & uninstallation", description: "New AC fitting with copper piping, stand and drain line.", price: "₹1,200 onwards", imageUrl: pexels(7019023, 900, 600) },
    { name: "Annual maintenance (AMC)", description: "3 services a year, priority visits and 10% off on spare parts.", price: "₹1,999 / year", imageUrl: pexels(5691629, 900, 600) },
  ],
  experience: [
    { role: "Founder & Senior Technician", company: "Cool Care AC Services", location: "Velachery, Chennai", start: "2016", end: "", highlights: "8,000+ AC services completed\nAMC partner for 40 offices and clinics\nSame-day visit for 90% of bookings" },
    { role: "Service Technician", company: "Voltas Authorised Service", location: "Chennai", start: "2011", end: "2016", highlights: "Split, window and cassette AC repairs" },
  ],
  education: [{ degree: "ITI – Refrigeration & Air Conditioning", school: "Government ITI, Guindy", start: "2009", end: "2011", details: "" }],
  skills: ["Split & window AC", "Gas charging", "PCB repair", "Compressor replacement", "Copper piping", "Leak detection"],
  certifications: [
    { name: "Voltas Authorised Service Technician", issuer: "Voltas Ltd", year: "2014", link: "", imageUrl: "" },
    { name: "Daikin Inverter AC Training", issuer: "Daikin India", year: "2019", link: "", imageUrl: "" },
  ],
  achievements: ["4.9★ on Google from 450+ customers"],
  languages: ["Tamil", "English", "Hindi"],
  testimonials: [
    { name: "Deepa N", role: "Home owner, Adyar", text: "Cooling is like new after the service. On time and explained everything clearly." },
    { name: "Dr. Suresh's Clinic", role: "AMC customer", text: "Reliable AMC — they come before summer every year without us calling." },
  ],
  album: [
    { url: pexels(5463576, 900, 650), caption: "Outdoor unit servicing" },
    { url: pexels(7019023, 900, 650), caption: "Split AC installed in a new flat" },
    { url: unsplash("photo-1545259741-2ea3ebf61fa3", 900, 650), caption: "Smart thermostat setup" },
    { url: pexels(5691629, 900, 650), caption: "Right tools for every job" },
    { url: pexels(4483610, 900, 650), caption: "Genuine spare parts in stock" },
    { url: pexels(8005368, 900, 650), caption: "Electrical check before installation" },
  ],
});
const acTa = withSharedMedia(base({
  fullName: "ஜே. அருண் பிரகாஷ்",
  headline: "ஏசி சர்வீஸ் & பழுது நிபுணர் · கூல் கேர் ஏசி சர்வீசஸ்",
  summary: "அனைத்து முன்னணி பிராண்டுகளின் ஸ்பிளிட் மற்றும் விண்டோ ஏசிகளுக்கான அங்கீகரிக்கப்பட்ட டெக்னீஷியன். வேளச்சேரி, அடையாறு, OMR பகுதிகளில் வீட்டிற்கே வந்து சேவை — தெளிவான கட்டணம், அசல் கேஸ் மற்றும் 30 நாள் சர்வீஸ் உத்தரவாதம்.",
  location: "வேளச்சேரி, சென்னை",
  businessHours: "திங்கள்–ஞாயிறு காலை 9 – இரவு 8",
  services: [
    { name: "ஏசி பொது சர்வீஸ்", description: "இண்டோர் மற்றும் அவுட்டோர் யூனிட் ஜெட் பம்ப் சுத்தம், ஃபில்டர் வாஷ் மற்றும் கூலிங் சரிபார்ப்பு.", price: "₹499", imageUrl: "" },
    { name: "கேஸ் நிரப்புதல்", description: "லீக் டெஸ்ட், லீக் சரிசெய்தல் மற்றும் கேஸ் டாப்-அப் அல்லது முழு நிரப்புதல்.", price: "₹2,200 முதல்", imageUrl: "" },
    { name: "பொருத்துதல் & கழற்றுதல்", description: "காப்பர் பைப், ஸ்டாண்ட் மற்றும் டிரெயின் லைனுடன் புதிய ஏசி பொருத்துதல்.", price: "₹1,200 முதல்", imageUrl: "" },
    { name: "ஆண்டு பராமரிப்பு (AMC)", description: "ஆண்டுக்கு 3 சர்வீஸ், முன்னுரிமை வருகை மற்றும் உதிரி பாகங்களில் 10% தள்ளுபடி.", price: "₹1,999 / ஆண்டு", imageUrl: "" },
  ],
  experience: [
    { role: "நிறுவனர் & மூத்த டெக்னீஷியன்", company: "கூல் கேர் ஏசி சர்வீசஸ்", location: "வேளச்சேரி, சென்னை", start: "2016", end: "", highlights: "8,000+ ஏசி சர்வீஸ்கள் நிறைவு\n40 அலுவலகங்கள் மற்றும் கிளினிக்குகளுக்கு AMC\n90% முன்பதிவுகளுக்கு அதே நாளில் வருகை" },
    { role: "சர்வீஸ் டெக்னீஷியன்", company: "வோல்டாஸ் அங்கீகரிக்கப்பட்ட சர்வீஸ்", location: "சென்னை", start: "2011", end: "2016", highlights: "ஸ்பிளிட், விண்டோ மற்றும் கேசட் ஏசி பழுது" },
  ],
  education: [{ degree: "ஐடிஐ – குளிர்பதனம் & ஏர் கண்டிஷனிங்", school: "அரசு ஐடிஐ, கிண்டி", start: "2009", end: "2011", details: "" }],
  skills: ["ஸ்பிளிட் & விண்டோ ஏசி", "கேஸ் சார்ஜிங்", "PCB பழுது", "கம்ப்ரசர் மாற்றம்", "காப்பர் பைப்பிங்", "லீக் கண்டறிதல்"],
  certifications: [
    { name: "வோல்டாஸ் அங்கீகரிக்கப்பட்ட சர்வீஸ் டெக்னீஷியன்", issuer: "வோல்டாஸ் லிமிடெட்", year: "2014", link: "", imageUrl: "" },
    { name: "டைகின் இன்வெர்ட்டர் ஏசி பயிற்சி", issuer: "டைகின் இந்தியா", year: "2019", link: "", imageUrl: "" },
  ],
  achievements: ["450+ வாடிக்கையாளர்களிடமிருந்து Google-ல் 4.9★"],
  languages: ["தமிழ்", "ஆங்கிலம்", "இந்தி"],
  testimonials: [
    { name: "தீபா என்", role: "வீட்டு உரிமையாளர், அடையாறு", text: "சர்வீஸுக்குப் பிறகு கூலிங் புதியது போல் உள்ளது. நேரத்திற்கு வந்து எல்லாவற்றையும் தெளிவாக விளக்கினார்." },
    { name: "டாக்டர் சுரேஷ் கிளினிக்", role: "AMC வாடிக்கையாளர்", text: "நம்பகமான AMC — ஒவ்வொரு ஆண்டும் கோடைக்கு முன் நாங்கள் அழைக்காமலே வருகிறார்கள்." },
  ],
  album: [
    { url: "", caption: "அவுட்டோர் யூனிட் சர்வீஸ்" },
    { url: "", caption: "புதிய வீட்டில் பொருத்திய ஸ்பிளிட் ஏசி" },
    { url: "", caption: "ஸ்மார்ட் தெர்மோஸ்டாட் அமைப்பு" },
    { url: "", caption: "ஒவ்வொரு வேலைக்கும் சரியான கருவிகள்" },
    { url: "", caption: "கையிருப்பில் அசல் உதிரி பாகங்கள்" },
    { url: "", caption: "பொருத்தும் முன் மின் சரிபார்ப்பு" },
  ],
}), acEn);

// ─── Home caterer ────────────────────────────────────
const catererEn = base({
  fullName: "Meena Sundaram",
  headline: "Home Chef · Amma's Kitchen Catering",
  summary: "Authentic home-style South Indian food cooked fresh every day in Anna Nagar. Daily lunch boxes for offices, tiffin orders and full catering for birthdays, poojas and weddings up to 500 guests. FSSAI-registered kitchen.",
  email: "ammaskitchen.chennai@gmail.com",
  phone: "+91 98410 11223",
  whatsapp: "919841011223",
  location: "Anna Nagar, Chennai",
  businessHours: "Orders: 7 AM – 9 PM · Lunch delivery 12 – 2 PM",
  photoUrl: unsplash("photo-1617627143750-d86bc21e42bb", 480, 480),
  coverUrl: unsplash("photo-1567337710282-00832b415979", 1600, 700),
  services: [
    { name: "Daily lunch box", description: "Rice, sambar, rasam, two poriyal, curd and pickle — delivered hot to offices.", price: "₹90 per meal", imageUrl: unsplash("photo-1567337710282-00832b415979", 900, 600) },
    { name: "Tiffin orders", description: "Idli, dosa, pongal and vada with fresh chutneys for breakfast or evening parties.", price: "₹60 per plate onwards", imageUrl: unsplash("photo-1630383249896-424e482df921", 900, 600) },
    { name: "Function catering", description: "Veg and non-veg menus for birthdays, poojas and weddings, with serving staff.", price: "₹250 per plate onwards", imageUrl: unsplash("photo-1589302168068-964664d93dc0", 900, 600) },
    { name: "Snacks & sweets", description: "Samosa, bajji, murukku and traditional sweets for festivals and events.", price: "₹20 per piece onwards", imageUrl: unsplash("photo-1601050690597-df0568f70950", 900, 600) },
  ],
  experience: [
    { role: "Founder & Head Chef", company: "Amma's Kitchen", location: "Anna Nagar, Chennai", start: "2016", end: "", highlights: "Serving 300+ lunch boxes every day\nCatered 400+ family functions\nTeam of 8 cooks and delivery staff" },
  ],
  skills: ["South Indian cuisine", "Chettinad dishes", "Bulk cooking", "Menu planning", "Hygiene & food safety"],
  certifications: [{ name: "FSSAI Registration", issuer: "Food Safety and Standards Authority of India", year: "2021", link: "", imageUrl: "" }],
  achievements: ["Featured in 'Chennai Home Chefs' – The Hindu MetroPlus 2023"],
  languages: ["Tamil", "English"],
  testimonials: [
    { name: "Anand R", role: "Office manager, Guindy", text: "Our team has lunch from Amma's Kitchen every day. Tastes like home and always on time." },
    { name: "Kavitha S", role: "Birthday party host", text: "Catered 150 guests for my son's birthday — everyone loved the biryani!" },
  ],
  album: [
    { url: unsplash("photo-1589302168068-964664d93dc0", 900, 650), caption: "Chicken biryani for a wedding order" },
    { url: unsplash("photo-1630383249896-424e482df921", 900, 650), caption: "Soft idli, vada and sambar" },
    { url: unsplash("photo-1567337710282-00832b415979", 900, 650), caption: "Full meals thali" },
    { url: unsplash("photo-1601050690597-df0568f70950", 900, 650), caption: "Evening snacks – samosa" },
    { url: unsplash("photo-1610192244261-3f33de3f55e4", 900, 650), caption: "Chaat counter for parties" },
  ],
});
const catererTa = withSharedMedia(base({
  fullName: "மீனா சுந்தரம்",
  headline: "வீட்டுச் சமையல் நிபுணர் · அம்மா'ஸ் கிச்சன் கேட்டரிங்",
  summary: "அண்ணா நகரில் தினமும் புதிதாகச் சமைக்கப்படும் உண்மையான வீட்டுச் சுவை தென்னிந்திய உணவு. அலுவலகங்களுக்கு தினசரி மதிய உணவு, டிபன் ஆர்டர்கள் மற்றும் பிறந்தநாள், பூஜை, திருமணம் போன்ற நிகழ்ச்சிகளுக்கு 500 பேர் வரை கேட்டரிங். FSSAI பதிவு பெற்ற சமையலறை.",
  location: "அண்ணா நகர், சென்னை",
  businessHours: "ஆர்டர்கள்: காலை 7 – இரவு 9 · மதிய உணவு டெலிவரி 12 – 2",
  services: [
    { name: "தினசரி மதிய உணவு", description: "சாதம், சாம்பார், ரசம், இரண்டு பொரியல், தயிர் மற்றும் ஊறுகாய் — அலுவலகங்களுக்கு சூடாக டெலிவரி.", price: "ஒரு சாப்பாடு ₹90", imageUrl: "" },
    { name: "டிபன் ஆர்டர்கள்", description: "காலை அல்லது மாலை நிகழ்ச்சிகளுக்கு இட்லி, தோசை, பொங்கல், வடை மற்றும் சட்னிகள்.", price: "ஒரு பிளேட் ₹60 முதல்", imageUrl: "" },
    { name: "நிகழ்ச்சி கேட்டரிங்", description: "பிறந்தநாள், பூஜை மற்றும் திருமணங்களுக்கு சைவ, அசைவ மெனுக்கள் — பரிமாறும் பணியாளர்களுடன்.", price: "ஒரு பிளேட் ₹250 முதல்", imageUrl: "" },
    { name: "சிற்றுண்டி & இனிப்புகள்", description: "பண்டிகைகள் மற்றும் நிகழ்ச்சிகளுக்கு சமோசா, பஜ்ஜி, முறுக்கு மற்றும் பாரம்பரிய இனிப்புகள்.", price: "ஒன்று ₹20 முதல்", imageUrl: "" },
  ],
  experience: [
    { role: "நிறுவனர் & தலைமைச் சமையலர்", company: "அம்மா'ஸ் கிச்சன்", location: "அண்ணா நகர், சென்னை", start: "2016", end: "", highlights: "தினமும் 300+ மதிய உணவுப் பெட்டிகள்\n400+ குடும்ப நிகழ்ச்சிகளுக்கு கேட்டரிங்\n8 சமையலர்கள் மற்றும் டெலிவரி பணியாளர்கள் கொண்ட குழு" },
  ],
  skills: ["தென்னிந்திய சமையல்", "செட்டிநாடு உணவுகள்", "மொத்த சமையல்", "மெனு திட்டமிடல்", "சுகாதாரம் & உணவுப் பாதுகாப்பு"],
  certifications: [{ name: "FSSAI பதிவு", issuer: "இந்திய உணவுப் பாதுகாப்பு மற்றும் தர நிர்ணய ஆணையம்", year: "2021", link: "", imageUrl: "" }],
  achievements: ["'சென்னை வீட்டுச் சமையல் நிபுணர்கள்' – தி இந்து மெட்ரோபிளஸ் 2023-ல் இடம்பெற்றது"],
  languages: ["தமிழ்", "ஆங்கிலம்"],
  testimonials: [
    { name: "ஆனந்த் ஆர்", role: "அலுவலக மேலாளர், கிண்டி", text: "எங்கள் அணி தினமும் அம்மா'ஸ் கிச்சன் உணவைச் சாப்பிடுகிறது. வீட்டுச் சுவை, எப்போதும் சரியான நேரத்தில்." },
    { name: "கவிதா எஸ்", role: "பிறந்தநாள் விழா", text: "என் மகனின் பிறந்தநாளுக்கு 150 பேருக்கு கேட்டரிங் — பிரியாணி எல்லோருக்கும் பிடித்தது!" },
  ],
  album: [
    { url: "", caption: "திருமண ஆர்டருக்கான சிக்கன் பிரியாணி" },
    { url: "", caption: "மென்மையான இட்லி, வடை, சாம்பார்" },
    { url: "", caption: "முழு சாப்பாடு தாளி" },
    { url: "", caption: "மாலை சிற்றுண்டி – சமோசா" },
    { url: "", caption: "விழாக்களுக்கான சாட் கவுண்டர்" },
  ],
}), catererEn);

// ─── Grocery / general store ─────────────────────────
const shopEn = base({
  fullName: "V. Balaji",
  headline: "Groceries & Daily Needs · Sri Balaji Stores",
  summary: "Your neighbourhood grocery store in Mylapore since 1998. Fresh vegetables every morning, quality rice and dals, pooja items and household essentials at fair prices — with free home delivery on orders above ₹500.",
  email: "sribalajistores.mylapore@gmail.com",
  phone: "+91 98844 33221",
  whatsapp: "919884433221",
  location: "Mylapore, Chennai",
  businessHours: "Every day 6:30 AM – 10 PM",
  photoUrl: unsplash("photo-1618077360395-f3068be8e001", 480, 480),
  coverUrl: unsplash("photo-1578916171728-46686eac8d58", 1600, 700),
  services: [
    { name: "Free home delivery", description: "Order on WhatsApp and get delivery within 2 hours in Mylapore and Mandaveli.", price: "Free above ₹500", imageUrl: pexels(4483610, 900, 600) },
    { name: "Fresh vegetables & fruits", description: "Sourced from Koyambedu market every morning.", price: "Daily market price", imageUrl: unsplash("photo-1542838132-92c53300491e", 900, 600) },
    { name: "Monthly grocery packs", description: "Rice, dal, oil, spices and essentials packed for your family every month.", price: "₹2,500 onwards", imageUrl: unsplash("photo-1604719312566-8912e9227c6a", 900, 600) },
    { name: "Pooja items", description: "Flowers, camphor, agarbatti, ghee lamps and festival specials.", price: "₹10 onwards", imageUrl: unsplash("photo-1578916171728-46686eac8d58", 900, 600) },
  ],
  experience: [
    { role: "Owner", company: "Sri Balaji Stores", location: "Mylapore, Chennai", start: "1998", end: "", highlights: "Serving 1,500+ families for 25 years\nSecond branch opened in Mandaveli in 2019\nUPI, card and credit accounts for regular customers" },
  ],
  skills: ["Customer service", "Inventory management", "Supplier network", "Home delivery"],
  certifications: [{ name: "GST Registered Business", issuer: "Government of India", year: "2017", link: "", imageUrl: "" }],
  achievements: ["25 years of trusted service in Mylapore"],
  languages: ["Tamil", "English", "Telugu"],
  testimonials: [
    { name: "Sarala V", role: "Customer for 20 years", text: "Always fresh vegetables and honest weighing. Balaji anna knows every family by name." },
    { name: "Mohammed I", role: "Regular customer", text: "WhatsApp order in the morning, delivery before lunch. Very convenient." },
  ],
  album: [
    { url: unsplash("photo-1578916171728-46686eac8d58", 900, 650), caption: "Well-stocked aisles" },
    { url: unsplash("photo-1542838132-92c53300491e", 900, 650), caption: "Fresh vegetables every morning" },
    { url: unsplash("photo-1604719312566-8912e9227c6a", 900, 650), caption: "Packaged foods and essentials" },
    { url: pexels(4483610, 900, 650), caption: "Our stock room" },
  ],
});
const shopTa = withSharedMedia(base({
  fullName: "வி. பாலாஜி",
  headline: "மளிகை & அன்றாடத் தேவைகள் · ஸ்ரீ பாலாஜி ஸ்டோர்ஸ்",
  summary: "1998 முதல் மயிலாப்பூரில் உங்கள் அருகிலுள்ள மளிகைக் கடை. தினமும் காலையில் புதிய காய்கறிகள், தரமான அரிசி மற்றும் பருப்பு வகைகள், பூஜைப் பொருட்கள் மற்றும் வீட்டுத் தேவைகள் நியாயமான விலையில் — ₹500-க்கு மேல் ஆர்டர்களுக்கு இலவச வீட்டு டெலிவரி.",
  location: "மயிலாப்பூர், சென்னை",
  businessHours: "தினமும் காலை 6:30 – இரவு 10",
  services: [
    { name: "இலவச வீட்டு டெலிவரி", description: "வாட்ஸ்அப்பில் ஆர்டர் செய்யுங்கள் — மயிலாப்பூர், மந்தைவெளியில் 2 மணி நேரத்தில் டெலிவரி.", price: "₹500-க்கு மேல் இலவசம்", imageUrl: "" },
    { name: "புதிய காய்கறிகள் & பழங்கள்", description: "தினமும் காலையில் கோயம்பேடு சந்தையிலிருந்து.", price: "அன்றைய சந்தை விலை", imageUrl: "" },
    { name: "மாதாந்திர மளிகைத் தொகுப்பு", description: "அரிசி, பருப்பு, எண்ணெய், மசாலா மற்றும் அத்தியாவசியப் பொருட்கள் — ஒவ்வொரு மாதமும் உங்கள் குடும்பத்திற்காக.", price: "₹2,500 முதல்", imageUrl: "" },
    { name: "பூஜைப் பொருட்கள்", description: "பூக்கள், கற்பூரம், ஊதுபத்தி, நெய் விளக்கு மற்றும் பண்டிகை சிறப்புகள்.", price: "₹10 முதல்", imageUrl: "" },
  ],
  experience: [
    { role: "உரிமையாளர்", company: "ஸ்ரீ பாலாஜி ஸ்டோர்ஸ்", location: "மயிலாப்பூர், சென்னை", start: "1998", end: "", highlights: "25 ஆண்டுகளாக 1,500+ குடும்பங்களுக்கு சேவை\n2019-ல் மந்தைவெளியில் இரண்டாவது கிளை\nவழக்கமான வாடிக்கையாளர்களுக்கு UPI, கார்டு மற்றும் கடன் கணக்கு" },
  ],
  skills: ["வாடிக்கையாளர் சேவை", "சரக்கு மேலாண்மை", "விநியோகஸ்தர் தொடர்பு", "வீட்டு டெலிவரி"],
  certifications: [{ name: "GST பதிவு பெற்ற வணிகம்", issuer: "இந்திய அரசு", year: "2017", link: "", imageUrl: "" }],
  achievements: ["மயிலாப்பூரில் 25 ஆண்டு நம்பகமான சேவை"],
  languages: ["தமிழ்", "ஆங்கிலம்", "தெலுங்கு"],
  testimonials: [
    { name: "சரளா வி", role: "20 ஆண்டு வாடிக்கையாளர்", text: "எப்போதும் புதிய காய்கறிகள், நேர்மையான எடை. பாலாஜி அண்ணாவுக்கு ஒவ்வொரு குடும்பத்தையும் பெயர் சொல்லித் தெரியும்." },
    { name: "முகமது ஐ", role: "வழக்கமான வாடிக்கையாளர்", text: "காலையில் வாட்ஸ்அப் ஆர்டர், மதியத்திற்குள் டெலிவரி. மிகவும் வசதியானது." },
  ],
  album: [
    { url: "", caption: "நிறைவான பொருட்களுடன் அலமாரிகள்" },
    { url: "", caption: "தினமும் காலையில் புதிய காய்கறிகள்" },
    { url: "", caption: "பேக் செய்யப்பட்ட உணவுகள் & அத்தியாவசியங்கள்" },
    { url: "", caption: "எங்கள் சரக்கு அறை" },
  ],
}), shopEn);

// ─── Travels / taxi owner ─────────────────────────────
const travelsTravel: TravelConfig = {
  ...DEFAULT_TRAVEL,
  enabled: true,
  cityPerKm: 20,
  longPerKm: 15,
  cityLimitKm: 40,
  cityMinFare: 300,
  cityDriverBata: 0,
  oneWayMinKm: 130,
  minKmPerDay: 250,
  driverBataPerDay: 400,
  tollPerPlaza: 120,
  bookingWhatsapp: "919840056789",
  vehicles: [
    { id: "v-dzire", name: "Swift Dzire", type: "Sedan", seats: 4, ac: true, imageUrl: photo(unsplash("photo-1502877338535-766e1452684a", 800, 500)), features: "Music system, 2 bags, Charging port", cityPerKm: 18, longPerKm: 13, tollPerPlaza: 0 },
    { id: "v-innova", name: "Toyota Innova Crysta", type: "SUV", seats: 7, ac: true, imageUrl: photo(unsplash("photo-1533473359331-0135ef1b58bf", 800, 500)), features: "Captain seats, Roof carrier, Dual AC", cityPerKm: 24, longPerKm: 18, tollPerPlaza: 0 },
    { id: "v-xuv700", name: "Mahindra XUV700", type: "SUV", seats: 6, ac: true, imageUrl: photo(unsplash("photo-1617469767053-d3b523a0b982", 800, 500)), features: "Sunroof, 4 bags, Premium audio", cityPerKm: 22, longPerKm: 17, tollPerPlaza: 0 },
    { id: "v-tempo", name: "Tempo Traveller", type: "12-seater", seats: 12, ac: true, imageUrl: photo(unsplash("photo-1469854523086-cc02fe5d8800", 800, 500)), features: "Push-back seats, Music system, Large boot", cityPerKm: 30, longPerKm: 24, tollPerPlaza: 200 },
  ],
  drivers: [
    { id: "d-murugan", name: "Murugan K", phone: "+91 98400 11223", photoUrl: photo(unsplash("photo-1618077360395-f3068be8e001", 300, 300)), experienceYears: 14, languages: "Tamil, English, Telugu", licenseNumber: "TN0920090012345", licenseValidTill: "2031", licenseImageUrl: "", showLicenseImage: false },
    { id: "d-senthil", name: "Senthil Kumar R", phone: "+91 98400 44556", photoUrl: photo(unsplash("photo-1507003211169-0a1dd7228f2d", 300, 300)), experienceYears: 9, languages: "Tamil, Malayalam, English", licenseNumber: "TN1020140056789", licenseValidTill: "2029", licenseImageUrl: "", showLicenseImage: false },
    { id: "d-arjun", name: "Arjun S", phone: "+91 98400 77889", photoUrl: photo(unsplash("photo-1595152452543-e5fc28ebc2b8", 300, 300)), experienceYears: 5, languages: "Tamil, Hindi, English", licenseNumber: "TN2220180098765", licenseValidTill: "2033", licenseImageUrl: "", showLicenseImage: false },
  ],
};

const travelsReviews: ReviewsConfig = {
  enabled: true,
  moderation: "approve",
  types: [
    { id: "overall", enabled: true, target: "business", label: { en: "Overall experience", ta: "ஒட்டுமொத்த அனுபவம்" },
      criteria: [
        { id: "value", label: { en: "Value for money", ta: "கட்டணத்திற்கேற்ற மதிப்பு" } },
        { id: "booking", label: { en: "Booking & support", ta: "முன்பதிவு & உதவி" } },
      ] },
    { id: "driver", enabled: true, target: "driver", label: { en: "Driver", ta: "டிரைவர்" },
      criteria: [
        { id: "safety", label: { en: "Safe driving", ta: "பாதுகாப்பான ஓட்டுதல்" } },
        { id: "punctual", label: { en: "Punctuality", ta: "நேரந்தவறாமை" } },
        { id: "behaviour", label: { en: "Behaviour", ta: "நடத்தை" } },
      ] },
    { id: "vehicle", enabled: true, target: "vehicle", label: { en: "Vehicle", ta: "வாகனம்" },
      criteria: [
        { id: "clean", label: { en: "Cleanliness", ta: "சுத்தம்" } },
        { id: "comfort", label: { en: "Comfort", ta: "வசதி" } },
      ] },
  ],
};

const travelsForms: SiteForm[] = [
  {
    id: "corporate", enabled: true, whatsapp: true,
    title: { en: "Corporate & event enquiry", ta: "நிறுவன & நிகழ்வு விசாரணை" },
    description: { en: "Monthly office cabs, weddings, group tours — tell us what you need and we'll send a quote.", ta: "அலுவலக மாதாந்திர கார்கள், திருமணங்கள், குழுப் பயணங்கள் — உங்கள் தேவையைச் சொல்லுங்கள், விலைப்பட்டியல் அனுப்புகிறோம்." },
    submitLabel: { en: "Request a quote", ta: "விலைப்பட்டியல் கேளுங்கள்" },
    fields: [
      { id: "name", type: "text", required: true, label: { en: "Your name", ta: "உங்கள் பெயர்" }, placeholder: { en: "", ta: "" }, options: [] },
      { id: "phone", type: "phone", required: true, label: { en: "Mobile number", ta: "மொபைல் எண்" }, placeholder: { en: "98765 43210", ta: "98765 43210" }, options: [] },
      { id: "company", type: "text", required: false, label: { en: "Company / event", ta: "நிறுவனம் / நிகழ்வு" }, placeholder: { en: "e.g. ABC Pvt Ltd, wedding", ta: "எ.கா. ABC நிறுவனம், திருமணம்" }, options: [] },
      { id: "kind", type: "select", required: true, label: { en: "Requirement", ta: "தேவை" }, placeholder: { en: "", ta: "" }, options: [
        { en: "Monthly office cab", ta: "மாதாந்திர அலுவலக கார்" }, { en: "Wedding / event", ta: "திருமணம் / நிகழ்வு" },
        { en: "Group tour", ta: "குழுச் சுற்றுலா" }, { en: "Airport transfers", ta: "விமான நிலைய பயணங்கள்" },
      ] },
      { id: "vehicles", type: "multiselect", required: false, label: { en: "Vehicles needed", ta: "தேவையான வாகனங்கள்" }, placeholder: { en: "", ta: "" }, options: [
        { en: "Sedan", ta: "செடான்" }, { en: "SUV", ta: "SUV" }, { en: "Tempo Traveller", ta: "டெம்போ டிராவலர்" },
      ] },
      { id: "date", type: "date", required: false, label: { en: "Start date", ta: "தொடக்க தேதி" }, placeholder: { en: "", ta: "" }, options: [] },
      { id: "details", type: "textarea", required: false, label: { en: "Details", ta: "விவரங்கள்" }, placeholder: { en: "Number of people, timings, pickup points…", ta: "நபர்கள் எண்ணிக்கை, நேரம், ஏறும் இடங்கள்…" }, options: [] },
    ],
  },
];

const travelsEn = base({
  fullName: "Sri Murugan Travels",
  headline: "Taxi, outstation trips & tour packages from Chennai — 24 × 7",
  summary: "Family-run since 2008. Clean AC cars, verified drivers who know every highway in South India, and honest per-km fares with no hidden charges. Airport drops, weekend getaways, temple tours and corporate trips — book in a minute and confirm on WhatsApp.",
  email: "bookings@srimurugantravels.in",
  phone: "+91 98400 56789",
  whatsapp: "919840056789",
  location: "Koyambedu, Chennai",
  businessHours: "Open 24 × 7",
  coverUrl: photo(unsplash("photo-1449965408869-eaa3f722e40d", 1600, 900)),
  services: [
    { name: "Madurai temple tour · 2 days", description: "Meenakshi Amman temple, Thiruparankundram and Alagar Kovil with an experienced local driver.", price: "₹7,999 onwards", imageUrl: photo(unsplash("photo-1582510003544-4d00b7f74220", 800, 500)) },
    { name: "Kerala backwaters · 3 days", description: "Munnar tea gardens and an Alleppey houseboat stay. Hotel booking on request.", price: "₹14,999 onwards", imageUrl: photo(unsplash("photo-1590050752117-238cb0fb12b1", 800, 500)) },
    { name: "Ooty & Kodaikanal hills · 3 days", description: "Ghat-road experts, sightseeing at your own pace, sedan or SUV.", price: "₹12,499 onwards", imageUrl: photo(unsplash("photo-1544620347-c4fd4a3d5957", 800, 500)) },
    { name: "Airport pickup & drop", description: "Flight tracking, name board pickup and free 45-minute waiting.", price: "₹699 onwards", imageUrl: "" },
  ],
  testimonials: [
    { name: "Lakshmi Narayanan", role: "Chennai → Madurai round trip", text: "Murugan anna drove us safely through the night. Fare was exactly what the website showed, tolls as per receipt." },
    { name: "Rahul Mehta", role: "Corporate client", text: "We use them for all airport transfers. Always on time, cars are spotless and billing is transparent." },
    { name: "Fathima B", role: "Kerala family trip", text: "Booked on WhatsApp in two minutes. The Innova was very comfortable for our family of six." },
  ],
  album: [
    { url: photo(unsplash("photo-1533473359331-0135ef1b58bf", 1200, 800)), caption: "Innova Crysta ready for a long drive" },
    { url: photo(unsplash("photo-1617469767053-d3b523a0b982", 1200, 800)), caption: "XUV700 for premium trips" },
    { url: photo(unsplash("photo-1502877338535-766e1452684a", 1200, 800)), caption: "Sedans for city rides" },
    { url: photo(unsplash("photo-1590050752117-238cb0fb12b1", 1200, 800)), caption: "Kerala backwaters tour" },
  ],
  languages: ["Tamil", "English", "Telugu", "Hindi"],
  travel: travelsTravel,
  reviews: travelsReviews,
  forms: travelsForms,
  travelTerms: "Toll, parking and state permit charges are as per actual receipts.\nNight driving allowance of ₹250 between 10 PM and 6 AM.\nRound trips are billed per calendar day.\nFree cancellation up to 6 hours before pickup.",
  hiringText: "Monthly salary ₹18,000 – ₹28,000 plus daily bata\nFull-time, part-time and weekend shifts\nWell-maintained AC cars, fuel and tolls paid by us\nAccident insurance and paid leave\nWeekly payment for part-time drivers",
});

const travelsTa = withSharedMedia(base({
  fullName: "ஸ்ரீ முருகன் டிராவல்ஸ்",
  headline: "சென்னையிலிருந்து டாக்ஸி, வெளியூர் பயணம் & சுற்றுலா — 24 × 7",
  summary: "2008 முதல் குடும்ப நிறுவனம். சுத்தமான ஏசி கார்கள், தென்னிந்தியாவின் ஒவ்வொரு நெடுஞ்சாலையும் அறிந்த சரிபார்க்கப்பட்ட டிரைவர்கள், மறைமுக கட்டணம் இல்லாத நேர்மையான கி.மீ கட்டணம். விமான நிலைய டிராப், வார இறுதிப் பயணம், கோயில் சுற்றுலா, அலுவலகப் பயணம் — ஒரு நிமிடத்தில் முன்பதிவு செய்து வாட்ஸ்அப்பில் உறுதிசெய்யுங்கள்.",
  location: "கோயம்பேடு, சென்னை",
  businessHours: "24 × 7 திறந்திருக்கும்",
  services: [
    { name: "மதுரை கோயில் சுற்றுலா · 2 நாட்கள்", description: "மீனாட்சி அம்மன் கோயில், திருப்பரங்குன்றம், அழகர் கோவில் — அனுபவமிக்க உள்ளூர் டிரைவருடன்.", price: "₹7,999 முதல்", imageUrl: "" },
    { name: "கேரள காயல் பயணம் · 3 நாட்கள்", description: "மூணாறு தேயிலைத் தோட்டங்கள், ஆலப்புழா படகு வீடு. ஹோட்டல் முன்பதிவு தேவைக்கேற்ப.", price: "₹14,999 முதல்", imageUrl: "" },
    { name: "ஊட்டி & கொடைக்கானல் மலைப் பயணம் · 3 நாட்கள்", description: "மலைச்சாலை நிபுணர்கள், உங்கள் வேகத்தில் சுற்றிப் பார்க்கலாம், செடான் அல்லது SUV.", price: "₹12,499 முதல்", imageUrl: "" },
    { name: "விமான நிலைய பிக்கப் & டிராப்", description: "விமான நேரக் கண்காணிப்பு, பெயர் பலகையுடன் வரவேற்பு, 45 நிமிடம் இலவச காத்திருப்பு.", price: "₹699 முதல்", imageUrl: "" },
  ],
  testimonials: [
    { name: "லட்சுமி நாராயணன்", role: "சென்னை → மதுரை சுற்றுப் பயணம்", text: "முருகன் அண்ணா இரவு முழுவதும் பாதுகாப்பாக ஓட்டினார். இணையதளத்தில் காட்டிய கட்டணமே, சுங்கம் ரசீதுப்படி." },
    { name: "ராகுல் மேத்தா", role: "நிறுவன வாடிக்கையாளர்", text: "எல்லா விமான நிலைய பயணங்களுக்கும் இவர்களையே பயன்படுத்துகிறோம். எப்போதும் சரியான நேரம், சுத்தமான கார்கள்." },
    { name: "பாத்திமா பி", role: "கேரள குடும்பப் பயணம்", text: "வாட்ஸ்அப்பில் இரண்டு நிமிடத்தில் முன்பதிவு. ஆறு பேர் கொண்ட எங்கள் குடும்பத்திற்கு இன்னோவா மிகவும் வசதியாக இருந்தது." },
  ],
  album: [
    { url: "", caption: "நீண்ட பயணத்திற்குத் தயாரான இன்னோவா கிரிஸ்டா" },
    { url: "", caption: "பிரீமியம் பயணங்களுக்கு XUV700" },
    { url: "", caption: "நகர பயணங்களுக்கு செடான் கார்கள்" },
    { url: "", caption: "கேரள காயல் சுற்றுலா" },
  ],
  languages: ["தமிழ்", "ஆங்கிலம்", "தெலுங்கு", "இந்தி"],
  travel: travelsTravel,
  reviews: travelsReviews,
  forms: travelsForms,
  travelTerms: "சுங்கம், பார்க்கிங், மாநில அனுமதிக் கட்டணங்கள் உண்மையான ரசீதுப்படி.\nஇரவு 10 மணி முதல் காலை 6 மணி வரை இரவு ஓட்டுநர் படி ₹250.\nசுற்றுப் பயணம் நாட்காட்டி நாள் கணக்கில்.\nபயணத்திற்கு 6 மணி நேரம் முன்பு வரை இலவச ரத்து.",
  hiringText: "மாத சம்பளம் ₹18,000 – ₹28,000 மற்றும் தினசரி படி\nமுழுநேரம், பகுதிநேரம், வார இறுதி ஷிப்ட்கள்\nநன்கு பராமரிக்கப்பட்ட ஏசி கார்கள், எரிபொருள் & சுங்கம் எங்கள் செலவு\nவிபத்துக் காப்பீடு மற்றும் ஊதியத்துடன் விடுப்பு\nபகுதிநேர டிரைவர்களுக்கு வாரந்தோறும் ஊதியம்",
}), travelsEn);

export const SAMPLE_PERSONAS: SamplePersona[] = [
  { key: "corporate", icon: "💼", label: { en: "Corporate professional", ta: "கார்ப்பரேட் பணியாளர்" }, content: { en: corporateEn, ta: corporateTa } },
  { key: "mechanic", icon: "🔧", label: { en: "Bike & car mechanic", ta: "பைக் & கார் மெக்கானிக்" }, content: { en: mechanicEn, ta: mechanicTa } },
  { key: "electrician", icon: "💡", label: { en: "Electrician", ta: "எலக்ட்ரீஷியன்" }, content: { en: electricianEn, ta: electricianTa } },
  { key: "ac-technician", icon: "❄️", label: { en: "AC technician", ta: "ஏசி மெக்கானிக்" }, content: { en: acEn, ta: acTa } },
  { key: "caterer", icon: "🍛", label: { en: "Home caterer", ta: "கேட்டரிங்" }, content: { en: catererEn, ta: catererTa } },
  { key: "shop", icon: "🛒", label: { en: "Shop owner", ta: "கடை உரிமையாளர்" }, content: { en: shopEn, ta: shopTa } },
  { key: "travels", icon: "🚕", label: { en: "Travels & taxi owner", ta: "டிராவல்ஸ் / டாக்ஸி உரிமையாளர்" }, content: { en: travelsEn, ta: travelsTa } },
];

export const DEFAULT_PERSONA: PersonaKey = "corporate";

// Travel designs preview best with the travels sample; everything else with the corporate one
export function defaultPersonaFor(designKey: string | undefined): PersonaKey {
  const layout = designKey ? getDesign(designKey).layout : "classic";
  return layout === "travel" || layout === "travelsplit" ? "travels" : DEFAULT_PERSONA;
}

export function getPersona(key: string | null | undefined): SamplePersona {
  return SAMPLE_PERSONAS.find((p) => p.key === key) ?? SAMPLE_PERSONAS[0];
}

export function getSampleContent(key: string | null | undefined, lang: Lang = "en"): PortfolioContent {
  return getPersona(key).content[lang];
}
