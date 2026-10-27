import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
export class ImageVariant {
    @Field(() => Int)
    public width: number;
    @Field()
    public url: string;
}

@ObjectType()
export class UploadedImage {
    @Field(() => Int)
    public id: number;
    @Field()
    public fileName: string;
    // Largest variant (1600px wide, or the original width if smaller); store this in content
    @Field()
    public url: string;
    @Field(() => Int)
    public width: number;
    @Field(() => Int)
    public height: number;
    @Field(() => [ImageVariant])
    public variants: ImageVariant[];
    // Ready-to-use value for <img srcset>
    @Field()
    public srcSet: string;
}

@ObjectType()
export class ImageUploadResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    // Same as data.url; kept at the top level for simple clients
    @Field({ nullable: true })
    public url?: string;
    @Field(() => UploadedImage, { nullable: true })
    public data?: UploadedImage | null;
}

@ObjectType()
export class ImageUploadResult {
    @Field()
    public fileName: string;
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => UploadedImage, { nullable: true })
    public data?: UploadedImage | null;
}

@ObjectType()
export class MultiImageUploadResponse {
    // 1 when every file uploaded, 0 when some or all failed (see results)
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => Int)
    public uploaded: number;
    @Field(() => Int)
    public failed: number;
    // One entry per file, in the order sent
    @Field(() => [ImageUploadResult])
    public results: ImageUploadResult[];
}
