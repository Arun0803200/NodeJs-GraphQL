import type { PageLayout, PortfolioContent, ReviewsConfig, TravelConfig } from "./types";

export const DEFAULT_REVIEWS: ReviewsConfig = { enabled: false, moderation: "approve", types: [] };
export const DEFAULT_PAGE_LAYOUT: PageLayout = { order: [], hidden: [] };

export const DEFAULT_TRAVEL: TravelConfig = {
  enabled: false,
  cityPerKm: 20,
  longPerKm: 15,
  cityLimitKm: 40,
  cityMinFare: 300,
  cityDriverBata: 0,
  oneWayMinKm: 130,
  minKmPerDay: 250,
  driverBataPerDay: 400,
  tollPerPlaza: 120,
  maxTripKm: 0,
  bookingWhatsapp: "",
  showDrivers: true,
  allowDriverChoice: true,
  driverHiring: true,
  vehicles: [],
  drivers: [],
};


// Demo persona shown in template previews until the visitor enters their own details
export const SAMPLE_CONTENT: PortfolioContent = {
  fullName: "Priya Raghavan",
  headline: "Senior Product Manager · Enterprise SaaS",
  summary:
    "Product leader with 9+ years building B2B platforms used by Fortune 500 teams. I turn ambiguous business problems into measurable outcomes — shipping analytics, payments and workflow products that grew ARR by $40M. Known for data-driven roadmaps, calm stakeholder management and mentoring high-performing teams.",
  email: "priya.raghavan@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  website: "https://priyaraghavan.dev",
  linkedin: "https://linkedin.com/in/priyaraghavan",
  github: "https://github.com/priyaraghavan",
  photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=480&h=480&q=75&auto=format&fit=crop",
  coverUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=700&q=75&auto=format&fit=crop",
  whatsapp: "",
  businessHours: "",
  services: [],
  testimonials: [
    { name: "Rahul Menon", role: "VP Product, Infosys Digital", text: "Priya brings clarity to the messiest problems. Her roadmaps are data-driven and her teams love working with her." },
    { name: "Anita Desai", role: "Director, Accenture", text: "One of the most dependable product managers I have worked with — calm under pressure and obsessed with customers." },
  ],
  experience: [
    {
      role: "Senior Product Manager",
      company: "Infosys Digital",
      location: "Bengaluru",
      start: "Apr 2021",
      end: "",
      highlights:
        "Own the analytics platform roadmap serving 1,200+ enterprise clients\nLaunched self-serve dashboards that cut report turnaround by 65%\nLead a cross-functional team of 18 engineers, designers and analysts",
    },
    {
      role: "Product Manager",
      company: "Accenture",
      location: "Hyderabad",
      start: "Jun 2018",
      end: "Mar 2021",
      highlights:
        "Shipped a payments reconciliation suite adopted by 40 banking clients\nIntroduced OKR-based planning, improving delivery predictability by 30%",
    },
    {
      role: "Business Analyst",
      company: "Tata Consultancy Services",
      location: "Chennai",
      start: "Jul 2015",
      end: "May 2018",
      highlights: "Translated requirements for a retail supply-chain platform across 6 countries\nBuilt KPI models that saved ₹3.2 Cr in annual inventory costs",
    },
  ],
  education: [
    { degree: "MBA, Strategy & Operations", school: "Indian Institute of Management, Bangalore", start: "2013", end: "2015", details: "Gold medalist · Product Club lead" },
    { degree: "B.E., Computer Science", school: "Anna University, Chennai", start: "2009", end: "2013", details: "First class with distinction" },
  ],
  skills: ["Product Strategy", "Roadmapping", "Stakeholder Management", "Data Analytics", "SQL", "A/B Testing", "Agile / Scrum", "UX Research", "Go-to-Market", "Team Leadership"],
  projects: [
    { name: "Insight Studio", description: "Self-serve BI workspace with natural-language queries and scheduled executive reports.", link: "https://example.com/insight", tech: "React, Snowflake, dbt", imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=600&q=75&auto=format&fit=crop" },
    { name: "PayMatch", description: "Automated reconciliation engine matching 2M+ transactions a day with 99.7% accuracy.", link: "https://example.com/paymatch", tech: "Kafka, Python, PostgreSQL", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&h=600&q=75&auto=format&fit=crop" },
    { name: "Vendor 360", description: "Supplier performance portal giving procurement teams real-time risk scores.", link: "", tech: "Angular, Node.js, AWS", imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&h=600&q=75&auto=format&fit=crop" },
  ],
  certifications: [
    { name: "Certified Scrum Product Owner (CSPO)", issuer: "Scrum Alliance", year: "2022", link: "https://example.com/cspo", imageUrl: "" },
    { name: "Google Data Analytics Professional", issuer: "Google", year: "2021", link: "", imageUrl: "" },
    { name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", year: "2020", link: "", imageUrl: "" },
  ],
  achievements: ["Infosys Award for Excellence 2023", "Speaker — ProductCon Bengaluru 2022", "Mentored 25+ associate PMs"],
  languages: ["English", "Tamil", "Hindi"],
  album: [
    { url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&h=650&q=75&auto=format&fit=crop", caption: "Quarterly roadmap review with leadership" },
    { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&h=650&q=75&auto=format&fit=crop", caption: "Hackathon with the analytics squad" },
    { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&h=650&q=75&auto=format&fit=crop", caption: "Speaking at ProductCon Bengaluru" },
    { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&h=650&q=75&auto=format&fit=crop", caption: "Customer discovery workshop" },
    { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&h=650&q=75&auto=format&fit=crop", caption: "Launch day for Insight Studio" },
    { url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&h=650&q=75&auto=format&fit=crop", caption: "Mentoring associate PMs" },
  ],
  travel: DEFAULT_TRAVEL,
  travelTerms: "",
  hiringText: "",
  reviews: DEFAULT_REVIEWS,
  forms: [],
  pageLayout: DEFAULT_PAGE_LAYOUT,
};

export const EMPTY_CONTENT: PortfolioContent = {
  fullName: "",
  headline: "",
  summary: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  github: "",
  photoUrl: "",
  coverUrl: "",
  whatsapp: "",
  businessHours: "",
  services: [],
  testimonials: [],
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
  album: [],
  travel: DEFAULT_TRAVEL,
  travelTerms: "",
  hiringText: "",
  reviews: DEFAULT_REVIEWS,
  forms: [],
  pageLayout: DEFAULT_PAGE_LAYOUT,
};
