import { ObjectType, InputType, Field, Int, Float } from "type-graphql";
import { Template } from "../Entity/Template";

@ObjectType()
export class TemplateResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => Template, { nullable: true })
    public data?: Template | null;
}

@ObjectType()
export class TemplateListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [Template], { nullable: true })
    public data?: Template[];
}

@InputType()
export class TemplateInput {
    @Field()
    public name: string;
    @Field()
    public slug: string;
    @Field()
    public designKey: string;
    @Field()
    public category: string;
    @Field({ nullable: true })
    public description?: string;
    @Field(() => [String], { nullable: true })
    public tags?: string[];
    @Field(() => Float)
    public originalPrice: number;
    @Field(() => Float, { nullable: true })
    public discountPrice?: number | null;
    @Field({ nullable: true })
    public isActive?: boolean;
    @Field(() => Int, { nullable: true })
    public sortOrder?: number;
}

// Site data sent to the browser; content is a JSON string to keep the schema small
@ObjectType()
export class SiteData {
    @Field(() => Int)
    public templateId: number;
    @Field()
    public templateSlug: string;
    @Field()
    public templateName: string;
    @Field()
    public designKey: string;
    @Field()
    public contentJson: string;
    @Field()
    public isPublished: boolean;
    @Field(() => Date, { nullable: true })
    public publishedAt?: Date | null;
    @Field()
    public userName: string;
    @Field()
    public status: string;
    @Field(() => String, { nullable: true })
    public reviewNote?: string | null;
    @Field(() => Date, { nullable: true })
    public submittedAt?: Date | null;
    @Field(() => Date, { nullable: true })
    public reviewedAt?: Date | null;
}

// Row in the admin approval queue
@ObjectType()
export class SiteReview extends SiteData {
    @Field()
    public userUuid: string;
    @Field()
    public fullName: string;
    @Field()
    public email: string;
    @Field()
    public templateCategory: string;
}

@ObjectType()
export class SiteReviewListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [SiteReview], { nullable: true })
    public data?: SiteReview[];
}

@ObjectType()
export class SiteReviewResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => SiteReview, { nullable: true })
    public data?: SiteReview | null;
}

@ObjectType()
export class SiteResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => SiteData, { nullable: true })
    public data?: SiteData | null;
}
