import { Resolver, Query, Mutation, Arg, Authorized, Int } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { Template, TEMPLATE_CATEGORIES } from "../../Entity/Template";
import { UserSite } from "../../Entity/UserSite";
import { TemplateInput, TemplateListResponse, TemplateResponse } from "../../Responses/TemplateResponses";
import { StatusResponse } from "../../Responses/StatusResponse";

const templateRepo = AppDataSource.getRepository(Template);
const siteRepo = AppDataSource.getRepository(UserSite);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateTemplateInput(input: TemplateInput): string | null {
    if (!input.name.trim()) return "Name is required";
    if (!SLUG_PATTERN.test(input.slug)) return "Slug may contain only lowercase letters, numbers and single hyphens";
    if (!input.designKey.trim()) return "Design is required";
    if (!(TEMPLATE_CATEGORIES as readonly string[]).includes(input.category)) return "Category must be free or premium";
    if (input.originalPrice < 0) return "Original price cannot be negative";
    if (input.discountPrice !== null && input.discountPrice !== undefined) {
        if (input.discountPrice < 0) return "Discount price cannot be negative";
        if (input.discountPrice >= input.originalPrice) return "Discount price must be lower than the original price";
    }
    return null;
}

function applyInput(template: Template, input: TemplateInput) {
    template.name = input.name.trim();
    template.slug = input.slug;
    template.designKey = input.designKey.trim();
    template.category = input.category;
    template.description = input.description?.trim() ?? "";
    template.tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
    // Free templates never carry a price
    template.originalPrice = input.category === "free" ? 0 : input.originalPrice;
    template.discountPrice = input.category === "free" ? null : input.discountPrice ?? null;
    if (input.isActive !== undefined) template.isActive = input.isActive;
    if (input.sortOrder !== undefined) template.sortOrder = input.sortOrder;
    template.updatedAt = new Date();
}

@Resolver()
export class TemplateResolver {

    // --- Guest (public) ---

    @Query(() => TemplateListResponse)
    async templates(@Arg("category", { nullable: true }) category?: string): Promise<TemplateListResponse> {
        try {
            const data = await templateRepo.find({
                where: category ? { isActive: true, category } : { isActive: true },
                order: { sortOrder: "ASC", id: "ASC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load templates" };
        }
    }

    @Query(() => TemplateResponse)
    async template(@Arg("slug") slug: string): Promise<TemplateResponse> {
        try {
            const data = await templateRepo.findOne({ where: { slug, isActive: true } });
            if (!data) return { status: 0, message: "Template not found", data: null };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load template", data: null };
        }
    }

    // --- Admin ---

    @Authorized("admin")
    @Query(() => TemplateListResponse)
    async adminTemplates(): Promise<TemplateListResponse> {
        try {
            const data = await templateRepo.find({ order: { sortOrder: "ASC", id: "ASC" } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load templates" };
        }
    }

    @Authorized("admin")
    @Mutation(() => TemplateResponse)
    async adminCreateTemplate(@Arg("input") input: TemplateInput): Promise<TemplateResponse> {
        try {
            const invalid = validateTemplateInput(input);
            if (invalid) return { status: 0, message: invalid, data: null };
            if (await templateRepo.findOne({ where: { slug: input.slug } })) {
                return { status: 0, message: "Slug already in use", data: null };
            }

            const template = new Template();
            template.isActive = true;
            template.sortOrder = 0;
            template.createdAt = new Date();
            applyInput(template, input);

            const data = await templateRepo.save(template);
            return { status: 1, message: "Template created", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to create template", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => TemplateResponse)
    async adminUpdateTemplate(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: TemplateInput,
    ): Promise<TemplateResponse> {
        try {
            const template = await templateRepo.findOne({ where: { id } });
            if (!template) return { status: 0, message: "Template not found", data: null };

            const invalid = validateTemplateInput(input);
            if (invalid) return { status: 0, message: invalid, data: null };
            const clash = await templateRepo.findOne({ where: { slug: input.slug } });
            if (clash && clash.id !== id) return { status: 0, message: "Slug already in use", data: null };

            applyInput(template, input);
            const data = await templateRepo.save(template);
            return { status: 1, message: "Template updated", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update template", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminDeleteTemplate(@Arg("id", () => Int) id: number): Promise<StatusResponse> {
        try {
            const inUse = await siteRepo.count({ where: [{ templateId: id }, { liveTemplateId: id }] });
            if (inUse > 0) {
                return { status: 0, message: `Template is used by ${inUse} site(s). Deactivate it instead.` };
            }
            const result = await templateRepo.delete({ id });
            if (!result.affected) return { status: 0, message: "Template not found" };
            return { status: 1, message: "Template deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to delete template" };
        }
    }
}
