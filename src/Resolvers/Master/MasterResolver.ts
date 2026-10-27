import { Resolver, Query, Mutation, Arg, Authorized, Int } from "type-graphql";
import { In } from "typeorm";
import { AppDataSource } from "../../Config/DataSource";
import { MasterType, MasterValue } from "../../Entity/Master";
import {
    MasterBulkResponse, MasterBundleResponse, MasterOption, MasterOrderInput, MasterTypeInput, MasterTypeListResponse,
    MasterTypeResponse, MasterTypeSummary, MasterValueInput, MasterValueListResponse, MasterValueResponse,
} from "../../Responses/MasterResponses";
import { StatusResponse } from "../../Responses/StatusResponse";

const typeRepo = AppDataSource.getRepository(MasterType);
const valueRepo = AppDataSource.getRepository(MasterValue);

const TYPE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_BUNDLE_TYPES = 20;

// "B.Tech / B.E." -> "b_tech_b_e"
export const toMasterCode = (label: string) =>
    label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);

function toOption(value: MasterValue): MasterOption {
    return {
        id: value.id,
        code: value.code,
        label: value.label,
        description: value.description,
        parentId: value.parentId,
        parentCode: value.parent?.code ?? null,
        parentLabel: value.parent?.label ?? null,
        isActive: value.isActive,
        sortOrder: value.sortOrder,
    };
}

// Active options of one type, optionally narrowed to children of a parent value code
async function loadOptions(typeId: number, parentCode?: string): Promise<MasterOption[]> {
    const qb = valueRepo.createQueryBuilder("v")
        .leftJoinAndSelect("v.parent", "p")
        .where("v.type_id = :typeId", { typeId })
        .andWhere("v.is_active = true")
        .orderBy("v.sort_order", "ASC")
        .addOrderBy("v.label", "ASC");
    if (parentCode) qb.andWhere("p.code = :parentCode", { parentCode });
    return (await qb.getMany()).map(toOption);
}

async function validateParent(type: MasterType, parentId?: number | null): Promise<string | null> {
    if (parentId === null || parentId === undefined) return null;
    if (!type.parentTypeId) return `${type.name} values cannot have a parent`;
    const parent = await valueRepo.findOne({ where: { id: parentId } });
    if (!parent || parent.typeId !== type.parentTypeId) return "Parent value does not belong to the parent master";
    return null;
}

@Resolver()
export class MasterResolver {

    // --- Public: used by every form that shows a master-driven dropdown ---

    @Query(() => MasterValueListResponse)
    async masters(
        @Arg("typeCode") typeCode: string,
        @Arg("parentCode", { nullable: true }) parentCode?: string,
    ): Promise<MasterValueListResponse> {
        try {
            const type = await typeRepo.findOne({ where: { code: typeCode, isActive: true } });
            if (!type) return { status: 0, message: "Master not found", data: [] };
            const data = await loadOptions(type.id, parentCode);
            return { status: 1, message: "Success", total: data.length, data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load master", data: [] };
        }
    }

    @Query(() => MasterBundleResponse)
    async masterBundle(@Arg("typeCodes", () => [String]) typeCodes: string[]): Promise<MasterBundleResponse> {
        try {
            const codes = [...new Set(typeCodes)].slice(0, MAX_BUNDLE_TYPES);
            if (codes.length === 0) return { status: 1, message: "Success", data: [] };
            const types = await typeRepo.find({ where: { code: In(codes), isActive: true } });
            const data = await Promise.all(types.map(async (t) => ({
                typeCode: t.code, typeName: t.name, options: await loadOptions(t.id),
            })));
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load masters", data: [] };
        }
    }

    // --- Admin: master types ---

    @Authorized("admin")
    @Query(() => MasterTypeListResponse)
    async adminMasterTypes(): Promise<MasterTypeListResponse> {
        try {
            const types = await typeRepo.find({ order: { sortOrder: "ASC", name: "ASC" } });
            const counts: { type_id: number; total: string; active: string }[] = await valueRepo.createQueryBuilder("v")
                .select("v.type_id", "type_id")
                .addSelect("COUNT(*)", "total")
                .addSelect("COUNT(*) FILTER (WHERE v.is_active)", "active")
                .groupBy("v.type_id")
                .getRawMany();
            const byType = new Map(counts.map((c) => [Number(c.type_id), c]));
            const codeById = new Map(types.map((t) => [t.id, t.code]));
            const data: MasterTypeSummary[] = types.map((t) => ({
                ...t,
                valueCount: Number(byType.get(t.id)?.total ?? 0),
                activeCount: Number(byType.get(t.id)?.active ?? 0),
                parentTypeCode: t.parentTypeId ? codeById.get(t.parentTypeId) ?? null : null,
            }));
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load masters" };
        }
    }

    @Authorized("admin")
    @Mutation(() => MasterTypeResponse)
    async adminCreateMasterType(@Arg("input") input: MasterTypeInput): Promise<MasterTypeResponse> {
        try {
            const code = input.code.trim();
            if (!TYPE_CODE_PATTERN.test(code)) return { status: 0, message: "Code must start with a letter and use only lowercase letters, numbers and underscores", data: null };
            if (!input.name.trim()) return { status: 0, message: "Name is required", data: null };
            if (await typeRepo.findOne({ where: { code } })) return { status: 0, message: "Code already in use", data: null };
            if (input.parentTypeId && !(await typeRepo.findOne({ where: { id: input.parentTypeId } }))) {
                return { status: 0, message: "Parent master not found", data: null };
            }

            const type = typeRepo.create({
                code,
                name: input.name.trim(),
                description: input.description?.trim() ?? "",
                parentTypeId: input.parentTypeId ?? null,
                isSystem: false,
                isActive: input.isActive ?? true,
                sortOrder: input.sortOrder ?? 0,
            });
            const data = await typeRepo.save(type);
            return { status: 1, message: "Master created", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to create master", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => MasterTypeResponse)
    async adminUpdateMasterType(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: MasterTypeInput,
    ): Promise<MasterTypeResponse> {
        try {
            const type = await typeRepo.findOne({ where: { id } });
            if (!type) return { status: 0, message: "Master not found", data: null };
            if (!input.name.trim()) return { status: 0, message: "Name is required", data: null };

            const code = input.code.trim();
            if (code !== type.code) {
                // The frontend asks for system masters by code, so renaming one would break its forms
                if (type.isSystem) return { status: 0, message: "The code of a system master cannot be changed", data: null };
                if (!TYPE_CODE_PATTERN.test(code)) return { status: 0, message: "Code must start with a letter and use only lowercase letters, numbers and underscores", data: null };
                if (await typeRepo.findOne({ where: { code } })) return { status: 0, message: "Code already in use", data: null };
                type.code = code;
            }

            const parentTypeId = input.parentTypeId ?? null;
            if (parentTypeId === id) return { status: 0, message: "A master cannot be its own parent", data: null };
            if (parentTypeId !== type.parentTypeId) {
                if (parentTypeId && !(await typeRepo.findOne({ where: { id: parentTypeId } }))) {
                    return { status: 0, message: "Parent master not found", data: null };
                }
                // Existing links point at the old parent master, so drop them
                await valueRepo.update({ typeId: id }, { parentId: null });
                type.parentTypeId = parentTypeId;
            }

            type.name = input.name.trim();
            type.description = input.description?.trim() ?? "";
            if (input.isActive !== undefined && input.isActive !== null) type.isActive = input.isActive;
            if (input.sortOrder !== undefined && input.sortOrder !== null) type.sortOrder = input.sortOrder;
            type.updatedAt = new Date();

            const data = await typeRepo.save(type);
            return { status: 1, message: "Master updated", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update master", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminDeleteMasterType(@Arg("id", () => Int) id: number): Promise<StatusResponse> {
        try {
            const type = await typeRepo.findOne({ where: { id } });
            if (!type) return { status: 0, message: "Master not found" };
            if (type.isSystem) return { status: 0, message: "System masters cannot be deleted. Deactivate it instead." };
            const children = await typeRepo.count({ where: { parentTypeId: id } });
            if (children > 0) return { status: 0, message: `${children} other master(s) use this as their parent` };

            // Values are removed by the ON DELETE CASCADE foreign key
            await typeRepo.delete({ id });
            return { status: 1, message: "Master deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to delete master" };
        }
    }

    // --- Admin: master values ---

    @Authorized("admin")
    @Query(() => MasterValueListResponse)
    async adminMasterValues(
        @Arg("typeId", () => Int) typeId: number,
        @Arg("search", { nullable: true }) search?: string,
        @Arg("status", { nullable: true }) status?: string,
    ): Promise<MasterValueListResponse> {
        try {
            const qb = valueRepo.createQueryBuilder("v")
                .leftJoinAndSelect("v.parent", "p")
                .where("v.type_id = :typeId", { typeId })
                .orderBy("v.sort_order", "ASC")
                .addOrderBy("v.label", "ASC");
            if (search?.trim()) qb.andWhere("(v.label ILIKE :q OR v.code ILIKE :q)", { q: `%${search.trim()}%` });
            if (status === "active") qb.andWhere("v.is_active = true");
            if (status === "inactive") qb.andWhere("v.is_active = false");

            const data = (await qb.getMany()).map(toOption);
            return { status: 1, message: "Success", total: data.length, data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to load values", data: [] };
        }
    }

    @Authorized("admin")
    @Mutation(() => MasterValueResponse)
    async adminCreateMasterValue(
        @Arg("typeId", () => Int) typeId: number,
        @Arg("input") input: MasterValueInput,
    ): Promise<MasterValueResponse> {
        try {
            const type = await typeRepo.findOne({ where: { id: typeId } });
            if (!type) return { status: 0, message: "Master not found", data: null };
            const label = input.label.trim();
            if (!label) return { status: 0, message: "Label is required", data: null };
            const code = toMasterCode(input.code || label);
            if (!code) return { status: 0, message: "Code must contain letters or numbers", data: null };
            if (await valueRepo.findOne({ where: { typeId, code } })) return { status: 0, message: `"${label}" already exists in ${type.name}`, data: null };
            const invalidParent = await validateParent(type, input.parentId);
            if (invalidParent) return { status: 0, message: invalidParent, data: null };

            let sortOrder = input.sortOrder;
            if (sortOrder === undefined || sortOrder === null) {
                const { max } = await valueRepo.createQueryBuilder("v").select("MAX(v.sort_order)", "max").where("v.type_id = :typeId", { typeId }).getRawOne();
                sortOrder = (Number(max) || 0) + 1;
            }

            const value = valueRepo.create({
                typeId, code, label,
                description: input.description?.trim() ?? "",
                parentId: input.parentId ?? null,
                isActive: input.isActive ?? true,
                sortOrder,
            });
            const data = await valueRepo.save(value);
            return { status: 1, message: "Value added", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to add value", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => MasterValueResponse)
    async adminUpdateMasterValue(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: MasterValueInput,
    ): Promise<MasterValueResponse> {
        try {
            const value = await valueRepo.findOne({ where: { id } });
            if (!value) return { status: 0, message: "Value not found", data: null };
            const type = await typeRepo.findOneOrFail({ where: { id: value.typeId } });
            const label = input.label.trim();
            if (!label) return { status: 0, message: "Label is required", data: null };

            const code = toMasterCode(input.code || value.code);
            if (!code) return { status: 0, message: "Code must contain letters or numbers", data: null };
            if (code !== value.code) {
                const clash = await valueRepo.findOne({ where: { typeId: value.typeId, code } });
                if (clash) return { status: 0, message: "Code already in use in this master", data: null };
            }
            if (input.parentId === id) return { status: 0, message: "A value cannot be its own parent", data: null };
            const invalidParent = await validateParent(type, input.parentId);
            if (invalidParent) return { status: 0, message: invalidParent, data: null };

            value.code = code;
            value.label = label;
            value.description = input.description?.trim() ?? "";
            value.parentId = input.parentId ?? null;
            if (input.isActive !== undefined && input.isActive !== null) value.isActive = input.isActive;
            if (input.sortOrder !== undefined && input.sortOrder !== null) value.sortOrder = input.sortOrder;
            value.updatedAt = new Date();

            const data = await valueRepo.save(value);
            return { status: 1, message: "Value updated", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update value", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminSetMasterValuesActive(
        @Arg("ids", () => [Int]) ids: number[],
        @Arg("isActive") isActive: boolean,
    ): Promise<StatusResponse> {
        try {
            if (ids.length === 0) return { status: 0, message: "Select at least one value" };
            const result = await valueRepo.update({ id: In(ids) }, { isActive, updatedAt: new Date() });
            return { status: 1, message: `${result.affected ?? 0} value(s) ${isActive ? "activated" : "deactivated"}` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to update values" };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminDeleteMasterValues(@Arg("ids", () => [Int]) ids: number[]): Promise<StatusResponse> {
        try {
            if (ids.length === 0) return { status: 0, message: "Select at least one value" };
            // Child values keep existing; their parent link is cleared by ON DELETE SET NULL
            const result = await valueRepo.delete({ id: In(ids) });
            return { status: 1, message: `${result.affected ?? 0} value(s) deleted` };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to delete values" };
        }
    }

    @Authorized("admin")
    @Mutation(() => MasterBulkResponse)
    async adminBulkAddMasterValues(
        @Arg("typeId", () => Int) typeId: number,
        @Arg("labels", () => [String]) labels: string[],
        @Arg("parentId", () => Int, { nullable: true }) parentId?: number,
    ): Promise<MasterBulkResponse> {
        try {
            const type = await typeRepo.findOne({ where: { id: typeId } });
            if (!type) return { status: 0, message: "Master not found", created: 0, skipped: 0 };
            const invalidParent = await validateParent(type, parentId);
            if (invalidParent) return { status: 0, message: invalidParent, created: 0, skipped: 0 };

            const existing = new Set((await valueRepo.find({ where: { typeId }, select: { code: true } })).map((v) => v.code));
            const { max } = await valueRepo.createQueryBuilder("v").select("MAX(v.sort_order)", "max").where("v.type_id = :typeId", { typeId }).getRawOne();
            let sortOrder = Number(max) || 0;

            const rows: MasterValue[] = [];
            let skipped = 0;
            for (const raw of labels) {
                const label = raw.trim();
                const code = toMasterCode(label);
                if (!label || !code || existing.has(code)) { if (label) skipped++; continue; }
                existing.add(code);
                rows.push(valueRepo.create({ typeId, code, label, description: "", parentId: parentId ?? null, isActive: true, sortOrder: ++sortOrder }));
            }
            if (rows.length) await valueRepo.save(rows);
            return { status: 1, message: `${rows.length} added, ${skipped} skipped as duplicates`, created: rows.length, skipped };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to import values", created: 0, skipped: 0 };
        }
    }

    @Authorized("admin")
    @Mutation(() => StatusResponse)
    async adminReorderMasterValues(@Arg("items", () => [MasterOrderInput]) items: MasterOrderInput[]): Promise<StatusResponse> {
        try {
            await AppDataSource.transaction(async (manager) => {
                for (const item of items) await manager.update(MasterValue, { id: item.id }, { sortOrder: item.sortOrder });
            });
            return { status: 1, message: "Order saved" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed to save order" };
        }
    }
}
