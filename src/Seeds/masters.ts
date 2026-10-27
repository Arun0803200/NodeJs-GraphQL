import { AppDataSource } from "../Config/DataSource";
import { MasterType, MasterValue } from "../Entity/Master";
import { toMasterCode } from "../Resolvers/Master/MasterResolver";

interface SeedMaster {
    code: string;
    name: string;
    description: string;
    parent?: string;
    // label, or [label, parent label]
    values: (string | [string, string])[];
}

// Codes here are what the frontend asks for (see frontend/src/lib/masters.ts). Order matters: parents first.
const SEED_MASTERS: SeedMaster[] = [
    {
        code: "skill_category", name: "Skill Categories", description: "Groups shown on the Skills page",
        values: ["Frontend", "Backend", "Database", "DevOps & Cloud", "Mobile", "Data & AI", "Design", "Testing", "Soft Skills", "Tools"],
    },
    {
        code: "skill", name: "Skills", description: "Suggested skills for skills, experience and projects", parent: "skill_category",
        values: [
            ["React", "Frontend"], ["Angular", "Frontend"], ["Vue.js", "Frontend"], ["TypeScript", "Frontend"], ["JavaScript", "Frontend"], ["HTML", "Frontend"], ["CSS", "Frontend"], ["Next.js", "Frontend"],
            ["Node.js", "Backend"], ["Express", "Backend"], ["GraphQL", "Backend"], ["NestJS", "Backend"], ["Java", "Backend"], ["Spring Boot", "Backend"], ["Python", "Backend"], ["Django", "Backend"], [".NET", "Backend"], ["Go", "Backend"],
            ["PostgreSQL", "Database"], ["MySQL", "Database"], ["MongoDB", "Database"], ["Redis", "Database"],
            ["AWS", "DevOps & Cloud"], ["Azure", "DevOps & Cloud"], ["Google Cloud", "DevOps & Cloud"], ["Docker", "DevOps & Cloud"], ["Kubernetes", "DevOps & Cloud"], ["CI/CD", "DevOps & Cloud"],
            ["React Native", "Mobile"], ["Flutter", "Mobile"], ["Android", "Mobile"], ["iOS", "Mobile"],
            ["Machine Learning", "Data & AI"], ["Power BI", "Data & AI"], ["SQL", "Data & AI"],
            ["Figma", "Design"], ["UI/UX", "Design"],
            ["Jest", "Testing"], ["Cypress", "Testing"], ["Selenium", "Testing"],
            ["Leadership", "Soft Skills"], ["Communication", "Soft Skills"], ["Team Management", "Soft Skills"],
            ["Git", "Tools"], ["Jira", "Tools"],
        ],
    },
    {
        code: "degree", name: "Degrees", description: "Degree options on the Education page",
        values: ["SSLC", "HSC", "Diploma", "B.E.", "B.Tech", "B.Sc", "B.Com", "B.A.", "BCA", "BBA", "M.E.", "M.Tech", "M.Sc", "M.Com", "M.A.", "MCA", "MBA", "Ph.D"],
    },
    {
        code: "field_of_study", name: "Fields of Study", description: "Field options on the Education page",
        values: ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical & Electronics", "Mechanical", "Civil", "Mathematics", "Physics", "Commerce", "Business Administration", "Finance", "Marketing", "Human Resources"],
    },
    {
        code: "designation", name: "Designations", description: "Job titles on Profile and Experience",
        values: ["Software Engineer", "Senior Software Engineer", "Tech Lead", "Engineering Manager", "Solution Architect", "Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "QA Engineer", "Data Analyst", "Data Scientist", "Product Manager", "Project Manager", "UI/UX Designer", "Business Analyst", "HR Manager", "Marketing Manager", "Director", "Consultant"],
    },
    {
        code: "social_platform", name: "Social Platforms", description: "Platform names for social media links",
        values: ["LinkedIn", "GitHub", "Twitter / X", "Instagram", "Facebook", "YouTube", "Medium", "Dribbble", "Behance", "Stack Overflow", "Website"],
    },
    {
        code: "template_tag", name: "Template Tags", description: "Tags admins can attach to templates",
        values: ["All roles", "Single page", "Minimal", "Editorial", "Leadership", "Directors", "Corporate", "Consulting", "Strategy", "Engineering", "Developers", "Dark mode", "Product", "Modern", "Finance", "Banking", "Design", "Creative", "Analytics", "Business", "Architecture", "Marketing", "Brand", "HR", "People"],
    },
];

// Adds any seed master that does not exist yet. Masters that already exist are left alone so admin edits survive restarts.
export async function seedMasters() {
    const typeRepo = AppDataSource.getRepository(MasterType);
    const valueRepo = AppDataSource.getRepository(MasterValue);

    for (const [index, seed] of SEED_MASTERS.entries()) {
        if (await typeRepo.findOne({ where: { code: seed.code } })) continue;

        const parentType = seed.parent ? await typeRepo.findOne({ where: { code: seed.parent } }) : null;
        const type = await typeRepo.save(typeRepo.create({
            code: seed.code, name: seed.name, description: seed.description,
            parentTypeId: parentType?.id ?? null, isSystem: true, isActive: true, sortOrder: index + 1,
        }));

        const parentIds = new Map<string, number>();
        if (parentType) {
            for (const p of await valueRepo.find({ where: { typeId: parentType.id } })) parentIds.set(p.label, p.id);
        }

        await valueRepo.save(seed.values.map((entry, i) => {
            const [label, parentLabel] = Array.isArray(entry) ? entry : [entry, undefined];
            return valueRepo.create({
                typeId: type.id, code: toMasterCode(label), label, description: "",
                parentId: parentLabel ? parentIds.get(parentLabel) ?? null : null, isActive: true, sortOrder: i + 1,
            });
        }));
        console.log(`Seeded master "${seed.code}" with ${seed.values.length} values`);
    }
}
