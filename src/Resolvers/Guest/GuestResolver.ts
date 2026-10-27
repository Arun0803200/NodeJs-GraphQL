import { Resolver, Arg, Query } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { User } from "../../Entity/User";
import { About } from "../../Entity/About";
import { UserExperience } from "../../Entity/UserExperience";
import { UserProjects } from "../../Entity/UserProjects";
import { UserSkills } from "../../Entity/UserSkills";
import { UserAwards } from "../../Entity/UserAwards";
import { UserEducation } from "../../Entity/UserEducation";
import { UserImages } from "../../Entity/UserImages";
import { ContactUs } from "../../Entity/ContactUs";
import { Auth } from "../../Entity/Auth";
import { UserSite } from "../../Entity/UserSite";
import { UserFindOneResponse } from "../../Responses/UserFindOneResponse";
import {
    AboutResponse,
    UserExperienceListResponse,
    UserProjectListResponse,
    UserSkillsListResponse,
    UserAwardsListResponse,
    UserEducationListResponse,
    UserImagesResponse,
    ContactUsResponse,
} from "../../Config/SettingsTypes";

const userRepo = AppDataSource.getRepository(User);
const aboutRepo = AppDataSource.getRepository(About);
const experienceRepo = AppDataSource.getRepository(UserExperience);
const projectsRepo = AppDataSource.getRepository(UserProjects);
const skillsRepo = AppDataSource.getRepository(UserSkills);
const awardsRepo = AppDataSource.getRepository(UserAwards);
const educationRepo = AppDataSource.getRepository(UserEducation);
const userImagesRepo = AppDataSource.getRepository(UserImages);
const contactUsRepo = AppDataSource.getRepository(ContactUs);

export type PublicState = "visible" | "under_review" | "unavailable";

// Visitors only see active accounts, and once someone has started a website, only after an admin approved it.
// Without this, a site waiting for review leaked through the section-based fallback page.
export async function publicState(userUuid: string): Promise<PublicState> {
    const auth = await AppDataSource.getRepository(Auth).findOne({ where: { userUuid }, select: ["isActive"] });
    if (!auth?.isActive) return "unavailable";
    const site = await AppDataSource.getRepository(UserSite).findOne({ where: { userUuid }, select: ["isPublished", "liveTemplateId"] });
    if (site && !(site.isPublished && site.liveTemplateId)) return "under_review";
    return "visible";
}

const HIDDEN = { status: 0, message: "Portfolio not available" };

@Resolver()
export class GuestResolver {

    @Query(() => UserFindOneResponse)
    async getPublicProfile(
        @Arg("uuid") uuid: string,
    ): Promise<UserFindOneResponse> {
        try {
            const user = await userRepo.findOne({
                where: { userUuid: uuid },
                select: ['id', 'fullName', 'designation', 'contactUsDescription', 'email', 'mobileNo', 'address', 'socialMedia'],
            });
            if (!user) return { status: 0, message: "User not found", data: null };
            if (await publicState(uuid) !== "visible") return { ...HIDDEN, data: null };
            return { status: 1, message: "Success", data: user };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed", data: null };
        }
    }

    @Query(() => UserFindOneResponse)
    async getPublicProfileByUserName(
        @Arg("userName") userName: string,
    ): Promise<UserFindOneResponse> {
        try {
            const user = await userRepo.findOne({
                where: { userName: userName.trim().toLowerCase() },
                select: ['id', 'userUuid', 'userName', 'fullName', 'designation', 'contactUsDescription', 'email', 'mobileNo', 'address', 'socialMedia'],
            });
            if (!user) return { status: 0, message: "Portfolio not found", data: null };
            const state = await publicState(user.userUuid);
            // "under_review" lets the page show a friendly coming-soon message instead of "not found"
            if (state !== "visible") return { status: 0, message: state, data: null };
            return { status: 1, message: "Success", data: user };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed", data: null };
        }
    }

    @Query(() => AboutResponse)
    async getPublicAbout(@Arg("userUuid") userUuid: string): Promise<AboutResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await aboutRepo.findOne({ where: { userUuid } });
            if (!data) return { status: 0, message: "About not found" };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserExperienceListResponse)
    async getPublicExperiences(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserExperienceListResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await experienceRepo.find({
                where: { userUuid },
                take: limit, skip: offset,
                order: { startDate: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserProjectListResponse)
    async getPublicProjects(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserProjectListResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await projectsRepo.find({
                where: { userUuid },
                take: limit, skip: offset,
                order: { projectStartDate: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserSkillsListResponse)
    async getPublicSkills(@Arg("userUuid") userUuid: string): Promise<UserSkillsListResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await skillsRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserAwardsListResponse)
    async getPublicAwards(@Arg("userUuid") userUuid: string): Promise<UserAwardsListResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await awardsRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserEducationListResponse)
    async getPublicEducation(@Arg("userUuid") userUuid: string): Promise<UserEducationListResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await educationRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Query(() => UserImagesResponse)
    async getPublicImages(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 6,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserImagesResponse> {
        try {
            if (await publicState(userUuid) !== "visible") return HIDDEN;
            const data = await userImagesRepo.find({
                where: { userUuid },
                select: ['id', 'imageUrl', 'imageOriginalName'],
                take: limit, skip: offset,
                order: { createdAt: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // Contact form submission (public, no auth needed)
    @Query(() => ContactUsResponse)
    async submitContactMessage(
        @Arg("userUuid") userUuid: string,
        @Arg("senderName") senderName: string,
        @Arg("senderEmail") senderEmail: string,
        @Arg("message") message: string,
    ): Promise<ContactUsResponse> {
        try {
            const user = await userRepo.findOne({ where: { userUuid } });
            if (!user) return { status: 0, message: "Portfolio owner not found" };

            const contact = new ContactUs();
            contact.userUuid = userUuid;
            contact.senderName = senderName;
            contact.senderEmail = senderEmail;
            contact.message = message;
            contact.createdAt = new Date();
            contact.updatedAt = new Date();

            const saved = await contactUsRepo.save(contact);
            return { status: 1, message: "Message sent successfully", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }
}
