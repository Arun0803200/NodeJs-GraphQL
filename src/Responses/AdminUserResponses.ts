import { ObjectType, InputType, Field, Int } from "type-graphql";

// One row of the admin user list: profile + account + website + usage, joined server-side
@ObjectType()
export class AdminUserRow {
    @Field(() => Int) public id: number;
    @Field() public userUuid: string;
    @Field() public fullName: string;
    @Field() public userName: string;
    @Field() public designation: string;
    @Field() public email: string;
    @Field(() => String, { nullable: true }) public mobileNo: string | null;
    @Field() public role: string;
    @Field() public isActive: boolean;
    // none | draft | pending | approved | rejected
    @Field() public siteStatus: string;
    @Field() public isPublished: boolean;
    @Field(() => String, { nullable: true }) public templateName: string | null;
    @Field(() => Int) public imageCount: number;
    // How many of the 7 portfolio sections have content (about, experience, projects, skills, education, awards, images)
    @Field(() => Int) public sectionsFilled: number;
    @Field(() => String, { nullable: true }) public lastActiveAt: string | null;
    @Field() public createdAt: string;
}

@ObjectType()
export class AdminUserSummary {
    @Field(() => Int) public total: number;
    @Field(() => Int) public active: number;
    @Field(() => Int) public inactive: number;
    @Field(() => Int) public admins: number;
    @Field(() => Int) public newLast30Days: number;
    @Field(() => Int) public published: number;
    @Field(() => Int) public pendingApproval: number;
    @Field(() => Int) public activeLast7Days: number;
}

@ObjectType()
export class AdminUserListResponse {
    @Field(() => Int) public status: number;
    @Field() public message: string;
    @Field(() => Int) public total: number;
    @Field(() => [AdminUserRow]) public data: AdminUserRow[];
    @Field(() => AdminUserSummary, { nullable: true }) public summary?: AdminUserSummary | null;
}

@InputType()
export class AdminUserFilter {
    @Field({ nullable: true }) public search?: string;
    // user | admin
    @Field({ nullable: true }) public role?: string;
    // active | inactive
    @Field({ nullable: true }) public status?: string;
    // none | draft | pending | approved | rejected | published
    @Field({ nullable: true }) public website?: string;
    // 7d | 30d | 90d | 365d
    @Field({ nullable: true }) public joined?: string;
    // incomplete = fewer than 4 sections filled
    @Field({ nullable: true }) public profile?: string;
    // name | joined | lastActive | email | completeness
    @Field({ nullable: true }) public sort?: string;
    @Field({ nullable: true }) public direction?: string;
    @Field(() => Int, { nullable: true }) public limit?: number;
    @Field(() => Int, { nullable: true }) public offset?: number;
}
