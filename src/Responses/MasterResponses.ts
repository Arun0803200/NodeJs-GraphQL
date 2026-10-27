import { ObjectType, InputType, Field, Int } from "type-graphql";
import { MasterType, MasterValue } from "../Entity/Master";

// Admin list row: the type plus how many values it holds
@ObjectType()
export class MasterTypeSummary extends MasterType {
    @Field(() => Int)
    public valueCount: number;

    @Field(() => Int)
    public activeCount: number;

    @Field(() => String, { nullable: true })
    public parentTypeCode?: string | null;
}

@ObjectType()
export class MasterTypeListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [MasterTypeSummary], { nullable: true })
    public data?: MasterTypeSummary[];
}

@ObjectType()
export class MasterTypeResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => MasterType, { nullable: true })
    public data?: MasterType | null;
}

// Value as sent to forms: includes the parent's code/label so the client never needs a second lookup
@ObjectType()
export class MasterOption {
    @Field(() => Int)
    public id: number;
    @Field()
    public code: string;
    @Field()
    public label: string;
    @Field()
    public description: string;
    @Field(() => Int, { nullable: true })
    public parentId?: number | null;
    @Field(() => String, { nullable: true })
    public parentCode?: string | null;
    @Field(() => String, { nullable: true })
    public parentLabel?: string | null;
    @Field()
    public isActive: boolean;
    @Field(() => Int)
    public sortOrder: number;
}

@ObjectType()
export class MasterValueListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => Int, { nullable: true })
    public total?: number;
    @Field(() => [MasterOption], { nullable: true })
    public data?: MasterOption[];
}

@ObjectType()
export class MasterValueResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => MasterValue, { nullable: true })
    public data?: MasterValue | null;
}

// One list per requested type code, for loading every dropdown on a form in one request
@ObjectType()
export class MasterGroup {
    @Field()
    public typeCode: string;
    @Field()
    public typeName: string;
    @Field(() => [MasterOption])
    public options: MasterOption[];
}

@ObjectType()
export class MasterBundleResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [MasterGroup], { nullable: true })
    public data?: MasterGroup[];
}

@ObjectType()
export class MasterBulkResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => Int)
    public created: number;
    @Field(() => Int)
    public skipped: number;
}

@InputType()
export class MasterTypeInput {
    @Field()
    public code: string;
    @Field()
    public name: string;
    @Field({ nullable: true })
    public description?: string;
    @Field(() => Int, { nullable: true })
    public parentTypeId?: number | null;
    @Field({ nullable: true })
    public isActive?: boolean;
    @Field(() => Int, { nullable: true })
    public sortOrder?: number;
}

@InputType()
export class MasterValueInput {
    @Field({ nullable: true })
    public code?: string;
    @Field()
    public label: string;
    @Field({ nullable: true })
    public description?: string;
    @Field(() => Int, { nullable: true })
    public parentId?: number | null;
    @Field({ nullable: true })
    public isActive?: boolean;
    @Field(() => Int, { nullable: true })
    public sortOrder?: number;
}

@InputType()
export class MasterOrderInput {
    @Field(() => Int)
    public id: number;
    @Field(() => Int)
    public sortOrder: number;
}
