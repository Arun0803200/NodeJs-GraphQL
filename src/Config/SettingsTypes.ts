import { InputType, Field, ObjectType, Int } from "type-graphql";
import { About } from "../Entity/About";
import { UserImages } from "../Entity/UserImages";
import { UserExperience } from "../Entity/UserExperience";
import { UserProjects } from "../Entity/UserProjects";
// InputType for SocialMediaInput to be used in UserResolver
@InputType()
export class SocialMediaInput {

    @Field()
    public name: string;

    @Field()
    public url: string;
}

// ObjectType for SocialMediaTypes to be used in User entity
@ObjectType()
export class SocialMediaTypes {

    @Field()
    public name: string;

    @Field()
    public url: string;
}

// FileResponse type for file upload response
@ObjectType()
export class FileResponse {

  @Field()
  status: number;

  @Field()
  message: string;

  @Field({ nullable: true })
  url?: string;
}

@ObjectType()
export class DeleteFileResponse {
    @Field()
    status: number;

    @Field()
    message: string;
}

@ObjectType()
export class AboutResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => About, { nullable: true })
    public data?: About | UserImages | null;
}

@ObjectType()
export class UserImagesResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => [UserImages], { nullable: true })
    public data?: UserImages[] | null;
}

@ObjectType()
export class UserExperienceResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => UserExperience, { nullable: true })
    public data?: UserExperience | null;
}

@ObjectType()
export class UserExperienceListResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => [UserExperience], { nullable: true })
    public data?: UserExperience[] | null;
}

@ObjectType()
export class UserProjectResponse {
    @Field(() => Int)
    public status: number;

    @Field()
    public message: string;

    @Field(() => UserProjects, { nullable: true })
    public data?: UserProjects | null;
}