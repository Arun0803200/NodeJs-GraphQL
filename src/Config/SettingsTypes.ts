import { InputType, Field, ObjectType, Int } from "type-graphql";
import { About } from "../Entity/About";
import { UserImages } from "../Entity/UserImages";
import { UserExperience } from "../Entity/UserExperience";
import { UserProjects } from "../Entity/UserProjects";
import { UserSkills } from "../Entity/UserSkills";
import { UserAwards } from "../Entity/UserAwards";
import { UserEducation } from "../Entity/UserEducation";
import { ContactUs } from "../Entity/ContactUs";
import { User } from "../Entity/User";

// --- Input Types ---

@InputType()
export class SocialMediaInput {
    @Field()
    public name: string;
    @Field()
    public url: string;
}

// --- Object Types ---

@ObjectType()
export class SocialMediaTypes {
    @Field()
    public name: string;
    @Field()
    public url: string;
}

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

// --- New Response Types for Multi-Person Platform ---

@ObjectType()
export class AuthResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field({ nullable: true })
    public token?: string;
    @Field(() => User, { nullable: true })
    public data?: User | null;
}

@ObjectType()
export class UserSkillsResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => UserSkills, { nullable: true })
    public data?: UserSkills | null;
}

@ObjectType()
export class UserSkillsListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [UserSkills], { nullable: true })
    public data?: UserSkills[] | null;
}

@ObjectType()
export class UserAwardsResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => UserAwards, { nullable: true })
    public data?: UserAwards | null;
}

@ObjectType()
export class UserAwardsListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [UserAwards], { nullable: true })
    public data?: UserAwards[] | null;
}

@ObjectType()
export class UserEducationResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => UserEducation, { nullable: true })
    public data?: UserEducation | null;
}

@ObjectType()
export class UserEducationListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [UserEducation], { nullable: true })
    public data?: UserEducation[] | null;
}

@ObjectType()
export class ContactUsResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => ContactUs, { nullable: true })
    public data?: ContactUs | null;
}

@ObjectType()
export class ContactUsListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [ContactUs], { nullable: true })
    public data?: ContactUs[] | null;
}

@ObjectType()
export class UserListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [User], { nullable: true })
    public data?: User[] | null;
    @Field(() => Int, { nullable: true })
    public total?: number;
}

@ObjectType()
export class UserProjectListResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => [UserProjects], { nullable: true })
    public data?: UserProjects[] | null;
}

@ObjectType()
export class AdminStatsResponse {
    @Field(() => Int)
    public status: number;
    @Field()
    public message: string;
    @Field(() => Int, { nullable: true })
    public totalUsers?: number;
    @Field(() => Int, { nullable: true })
    public totalActiveUsers?: number;
    @Field(() => Int, { nullable: true })
    public totalImages?: number;
}
