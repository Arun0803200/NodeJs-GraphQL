import { Resolver, Mutation, Arg, Query, Authorized, Ctx, Int } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { User } from "../../Entity/User";
import { About } from "../../Entity/About";
import { UserExperience } from "../../Entity/UserExperience";
import { UserProjects } from "../../Entity/UserProjects";
import { UserSkills } from "../../Entity/UserSkills";
import { UserAwards } from "../../Entity/UserAwards";
import { UserEducation } from "../../Entity/UserEducation";
import { UserImages } from "../../Entity/UserImages";
import { UserResponse } from "../../Responses/UserResponse";
import { AppContext } from "../../Middleware/authChecker";
import { validateUserName, isUserNameTaken } from "../../Utils/userName";
import {
    SocialMediaInput,
    AboutResponse,
    UserExperienceResponse,
    UserExperienceListResponse,
    UserProjectResponse,
    UserProjectListResponse,
    UserSkillsResponse,
    UserSkillsListResponse,
    UserAwardsResponse,
    UserAwardsListResponse,
    UserEducationResponse,
    UserEducationListResponse,
    UserImagesResponse,
    DeleteFileResponse,
} from "../../Config/SettingsTypes";

const userRepo = AppDataSource.getRepository(User);
const aboutRepo = AppDataSource.getRepository(About);
const experienceRepo = AppDataSource.getRepository(UserExperience);
const projectsRepo = AppDataSource.getRepository(UserProjects);
const skillsRepo = AppDataSource.getRepository(UserSkills);
const awardsRepo = AppDataSource.getRepository(UserAwards);
const educationRepo = AppDataSource.getRepository(UserEducation);
const userImagesRepo = AppDataSource.getRepository(UserImages);

@Resolver()
export class UserProfileResolver {

    // --- Profile ---

    @Authorized("user", "admin")
    @Query(() => UserResponse)
    async myProfile(@Ctx() ctx: AppContext): Promise<UserResponse> {
        try {
            const user = await userRepo.findOne({ where: { userUuid: ctx.user!.userUuid } });
            if (!user) return { status: 0, message: "User not found", data: null };
            return { status: 1, message: "Success", data: user };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed", data: null };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserResponse)
    async updateMyProfile(
        @Ctx() ctx: AppContext,
        @Arg("fullName", { nullable: true }) fullName?: string,
        @Arg("designation", { nullable: true }) designation?: string,
        @Arg("contactUsDescription", { nullable: true }) contactUsDescription?: string,
        @Arg("mobileNo", { nullable: true }) mobileNo?: string,
        @Arg("address", { nullable: true }) address?: string,
        @Arg("socialMedia", () => [SocialMediaInput], { nullable: true }) socialMedia?: SocialMediaInput[],
        @Arg("userName", { nullable: true }) userName?: string,
    ): Promise<UserResponse> {
        try {
            const user = await userRepo.findOne({ where: { userUuid: ctx.user!.userUuid } });
            if (!user) return { status: 0, message: "User not found", data: null };

            if (userName) {
                const normalized = userName.trim().toLowerCase();
                const invalid = validateUserName(normalized);
                if (invalid) return { status: 0, message: invalid, data: null };
                if (await isUserNameTaken(userRepo, normalized, user.userUuid)) return { status: 0, message: "Username already taken", data: null };
                user.userName = normalized;
            }

            if (fullName) user.fullName = fullName;
            if (designation) user.designation = designation;
            if (contactUsDescription) user.contactUsDescription = contactUsDescription;
            if (mobileNo) user.mobileNo = mobileNo;
            if (address) user.address = address;
            if (socialMedia) user.socialMedia = socialMedia as any;
            user.updatedAt = new Date();

            const updated = await userRepo.save(user);
            return { status: 1, message: "Profile updated", data: updated };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed", data: null };
        }
    }

    // --- About ---

    @Authorized("user", "admin")
    @Query(() => AboutResponse)
    async myAbout(@Ctx() ctx: AppContext): Promise<AboutResponse> {
        try {
            const data = await aboutRepo.findOne({ where: { userUuid: ctx.user!.userUuid } });
            if (!data) return { status: 0, message: "About not found" };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => AboutResponse)
    async upsertMyAbout(
        @Ctx() ctx: AppContext,
        @Arg("title") title: string,
        @Arg("description") description: string,
        @Arg("longDescription") longDescription: string,
        @Arg("totalExperience", () => Int) totalExperience: number,
        @Arg("totalProjects", () => Int) totalProjects: number,
        @Arg("totalAwards", () => Int) totalAwards: number,
    ): Promise<AboutResponse> {
        try {
            const userUuid = ctx.user!.userUuid;
            let about = await aboutRepo.findOne({ where: { userUuid } });

            if (!about) {
                about = new About();
                about.userUuid = userUuid;
                about.createdAt = new Date();
            }

            about.title = title;
            about.description = description;
            about.longDescription = longDescription;
            about.totalExperience = totalExperience;
            about.totalProjects = totalProjects;
            about.totalAwards = totalAwards;
            about.updatedAt = new Date();

            const saved = await aboutRepo.save(about);
            return { status: 1, message: "About saved", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Experience ---

    @Authorized("user", "admin")
    @Query(() => UserExperienceListResponse)
    async myExperiences(
        @Ctx() ctx: AppContext,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserExperienceListResponse> {
        try {
            const data = await experienceRepo.find({
                where: { userUuid: ctx.user!.userUuid },
                take: limit, skip: offset,
                order: { startDate: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserExperienceResponse)
    async addMyExperience(
        @Ctx() ctx: AppContext,
        @Arg("companyName") companyName: string,
        @Arg("companyUrl") companyUrl: string,
        @Arg("companyLocation") companyLocation: string,
        @Arg("designation") designation: string,
        @Arg("startDate") startDate: Date,
        @Arg("isCurrentlyWorking") isCurrentlyWorking: boolean,
        @Arg("jobDescription") jobDescription: string,
        @Arg("skills", () => [String]) skills: string[],
        @Arg("endDate", { nullable: true }) endDate?: Date,
    ): Promise<UserExperienceResponse> {
        try {
            const exp = new UserExperience();
            exp.userUuid = ctx.user!.userUuid;
            exp.companyName = companyName;
            exp.companyUrl = companyUrl;
            exp.companyLocation = companyLocation;
            exp.designation = designation;
            exp.startDate = startDate;
            exp.isCurrentlyWorking = isCurrentlyWorking;
            exp.jobDescription = jobDescription;
            exp.skills = skills;
            if (endDate) exp.endDate = endDate;
            exp.createdAt = new Date();
            exp.updatedAt = new Date();

            const saved = await experienceRepo.save(exp);
            return { status: 1, message: "Experience added", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserExperienceResponse)
    async updateMyExperience(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
        @Arg("companyName", { nullable: true }) companyName?: string,
        @Arg("companyUrl", { nullable: true }) companyUrl?: string,
        @Arg("companyLocation", { nullable: true }) companyLocation?: string,
        @Arg("designation", { nullable: true }) designation?: string,
        @Arg("startDate", { nullable: true }) startDate?: Date,
        @Arg("endDate", { nullable: true }) endDate?: Date,
        @Arg("isCurrentlyWorking", { nullable: true }) isCurrentlyWorking?: boolean,
        @Arg("jobDescription", { nullable: true }) jobDescription?: string,
        @Arg("skills", () => [String], { nullable: true }) skills?: string[],
    ): Promise<UserExperienceResponse> {
        try {
            const exp = await experienceRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!exp) return { status: 0, message: "Experience not found or not yours" };

            if (companyName) exp.companyName = companyName;
            if (companyUrl) exp.companyUrl = companyUrl;
            if (companyLocation) exp.companyLocation = companyLocation;
            if (designation) exp.designation = designation;
            if (startDate) exp.startDate = startDate;
            if (endDate) exp.endDate = endDate;
            if (isCurrentlyWorking !== undefined) exp.isCurrentlyWorking = isCurrentlyWorking;
            if (jobDescription) exp.jobDescription = jobDescription;
            if (skills) exp.skills = skills;
            exp.updatedAt = new Date();

            const saved = await experienceRepo.save(exp);
            return { status: 1, message: "Experience updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => DeleteFileResponse)
    async deleteMyExperience(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
    ): Promise<DeleteFileResponse> {
        try {
            const exp = await experienceRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!exp) return { status: 0, message: "Experience not found or not yours" };
            await experienceRepo.delete({ id });
            return { status: 1, message: "Experience deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Projects ---

    @Authorized("user", "admin")
    @Query(() => UserProjectListResponse)
    async myProjects(
        @Ctx() ctx: AppContext,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserProjectListResponse> {
        try {
            const data = await projectsRepo.find({
                where: { userUuid: ctx.user!.userUuid },
                take: limit, skip: offset,
                order: { projectStartDate: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserProjectResponse)
    async addMyProject(
        @Ctx() ctx: AppContext,
        @Arg("projectName") projectName: string,
        @Arg("projectDescription") projectDescription: string,
        @Arg("projectUrl") projectUrl: string,
        @Arg("projectStartDate") projectStartDate: Date,
        @Arg("projectLongDescription") projectLongDescription: string,
        @Arg("keyFeatures", () => [String]) keyFeatures: string[],
        @Arg("technologiesSkills", () => [String]) technologiesSkills: string[],
        @Arg("projectEndDate", { nullable: true }) projectEndDate?: Date,
        @Arg("isCurrentProject", { nullable: true }) isCurrentProject?: boolean,
    ): Promise<UserProjectResponse> {
        try {
            const project = new UserProjects();
            project.userUuid = ctx.user!.userUuid;
            project.projectName = projectName;
            project.projectDescription = projectDescription;
            project.projectUrl = projectUrl;
            project.projectStartDate = projectStartDate;
            project.projectLongDescription = projectLongDescription;
            project.keyFeatures = keyFeatures;
            project.technologiesSkills = technologiesSkills;
            if (projectEndDate) project.projectEndDate = projectEndDate;
            project.isCurrentProject = isCurrentProject || false;
            project.createdAt = new Date();
            project.updatedAt = new Date();

            const saved = await projectsRepo.save(project);
            return { status: 1, message: "Project added", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserProjectResponse)
    async updateMyProject(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
        @Arg("projectName", { nullable: true }) projectName?: string,
        @Arg("projectDescription", { nullable: true }) projectDescription?: string,
        @Arg("projectUrl", { nullable: true }) projectUrl?: string,
        @Arg("projectStartDate", { nullable: true }) projectStartDate?: Date,
        @Arg("projectEndDate", { nullable: true }) projectEndDate?: Date,
        @Arg("isCurrentProject", { nullable: true }) isCurrentProject?: boolean,
        @Arg("projectLongDescription", { nullable: true }) projectLongDescription?: string,
        @Arg("keyFeatures", () => [String], { nullable: true }) keyFeatures?: string[],
        @Arg("technologiesSkills", () => [String], { nullable: true }) technologiesSkills?: string[],
    ): Promise<UserProjectResponse> {
        try {
            const project = await projectsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!project) return { status: 0, message: "Project not found or not yours" };

            if (projectName) project.projectName = projectName;
            if (projectDescription) project.projectDescription = projectDescription;
            if (projectUrl) project.projectUrl = projectUrl;
            if (projectStartDate) project.projectStartDate = projectStartDate;
            if (projectEndDate) project.projectEndDate = projectEndDate;
            if (isCurrentProject !== undefined) project.isCurrentProject = isCurrentProject;
            if (projectLongDescription) project.projectLongDescription = projectLongDescription;
            if (keyFeatures) project.keyFeatures = keyFeatures;
            if (technologiesSkills) project.technologiesSkills = technologiesSkills;
            project.updatedAt = new Date();

            const saved = await projectsRepo.save(project);
            return { status: 1, message: "Project updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => DeleteFileResponse)
    async deleteMyProject(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
    ): Promise<DeleteFileResponse> {
        try {
            const project = await projectsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!project) return { status: 0, message: "Project not found or not yours" };
            await projectsRepo.delete({ id });
            return { status: 1, message: "Project deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Skills ---

    @Authorized("user", "admin")
    @Query(() => UserSkillsListResponse)
    async mySkills(@Ctx() ctx: AppContext): Promise<UserSkillsListResponse> {
        try {
            const data = await skillsRepo.find({ where: { userUuid: ctx.user!.userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserSkillsResponse)
    async addMySkills(
        @Ctx() ctx: AppContext,
        @Arg("tittle") tittle: string,
        @Arg("skills", () => [String]) skills: string[],
    ): Promise<UserSkillsResponse> {
        try {
            const skill = new UserSkills();
            skill.userUuid = ctx.user!.userUuid;
            skill.tittle = tittle;
            skill.skills = skills;
            skill.createdAt = new Date();
            skill.updatedAt = new Date();

            const saved = await skillsRepo.save(skill);
            return { status: 1, message: "Skills added", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserSkillsResponse)
    async updateMySkills(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
        @Arg("tittle", { nullable: true }) tittle?: string,
        @Arg("skills", () => [String], { nullable: true }) skills?: string[],
    ): Promise<UserSkillsResponse> {
        try {
            const skill = await skillsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!skill) return { status: 0, message: "Skills not found or not yours" };

            if (tittle) skill.tittle = tittle;
            if (skills) skill.skills = skills;
            skill.updatedAt = new Date();

            const saved = await skillsRepo.save(skill);
            return { status: 1, message: "Skills updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => DeleteFileResponse)
    async deleteMySkills(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
    ): Promise<DeleteFileResponse> {
        try {
            const skill = await skillsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!skill) return { status: 0, message: "Skills not found or not yours" };
            await skillsRepo.delete({ id });
            return { status: 1, message: "Skills deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Awards ---

    @Authorized("user", "admin")
    @Query(() => UserAwardsListResponse)
    async myAwards(@Ctx() ctx: AppContext): Promise<UserAwardsListResponse> {
        try {
            const data = await awardsRepo.find({ where: { userUuid: ctx.user!.userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserAwardsResponse)
    async addMyAward(
        @Ctx() ctx: AppContext,
        @Arg("title") title: string,
        @Arg("description") description: string,
        @Arg("companyId") companyId: number,
        @Arg("eventDate") eventDate: string,
    ): Promise<UserAwardsResponse> {
        try {
            const award = new UserAwards();
            award.userUuid = ctx.user!.userUuid;
            award.title = title;
            award.description = description;
            award.companyId = companyId;
            award.eventDate = eventDate;
            award.createdAt = new Date();
            award.updatedAt = new Date();

            const saved = await awardsRepo.save(award);
            return { status: 1, message: "Award added", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserAwardsResponse)
    async updateMyAward(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("description", { nullable: true }) description?: string,
        @Arg("companyId", { nullable: true }) companyId?: number,
        @Arg("eventDate", { nullable: true }) eventDate?: string,
    ): Promise<UserAwardsResponse> {
        try {
            const award = await awardsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!award) return { status: 0, message: "Award not found or not yours" };

            if (title) award.title = title;
            if (description) award.description = description;
            if (companyId !== undefined) award.companyId = companyId;
            if (eventDate) award.eventDate = eventDate;
            award.updatedAt = new Date();

            const saved = await awardsRepo.save(award);
            return { status: 1, message: "Award updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => DeleteFileResponse)
    async deleteMyAward(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
    ): Promise<DeleteFileResponse> {
        try {
            const award = await awardsRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!award) return { status: 0, message: "Award not found or not yours" };
            await awardsRepo.delete({ id });
            return { status: 1, message: "Award deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Education ---

    @Authorized("user", "admin")
    @Query(() => UserEducationListResponse)
    async myEducation(@Ctx() ctx: AppContext): Promise<UserEducationListResponse> {
        try {
            const data = await educationRepo.find({ where: { userUuid: ctx.user!.userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserEducationResponse)
    async addMyEducation(
        @Ctx() ctx: AppContext,
        @Arg("degree") degree: string,
        @Arg("fieldOfStudy") fieldOfStudy: string,
        @Arg("institution") institution: string,
        @Arg("institutionLocation") institutionLocation: string,
        @Arg("startYear") startYear: string,
        @Arg("endYear", { nullable: true }) endYear?: string,
    ): Promise<UserEducationResponse> {
        try {
            const edu = new UserEducation();
            edu.userUuid = ctx.user!.userUuid;
            edu.degree = degree;
            edu.fieldOfStudy = fieldOfStudy;
            edu.institution = institution;
            edu.institutionLocation = institutionLocation;
            edu.startYear = startYear;
            if (endYear) edu.endYear = endYear;
            edu.createdAt = new Date();
            edu.updatedAt = new Date();

            const saved = await educationRepo.save(edu);
            return { status: 1, message: "Education added", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => UserEducationResponse)
    async updateMyEducation(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
        @Arg("degree", { nullable: true }) degree?: string,
        @Arg("fieldOfStudy", { nullable: true }) fieldOfStudy?: string,
        @Arg("institution", { nullable: true }) institution?: string,
        @Arg("institutionLocation", { nullable: true }) institutionLocation?: string,
        @Arg("startYear", { nullable: true }) startYear?: string,
        @Arg("endYear", { nullable: true }) endYear?: string,
    ): Promise<UserEducationResponse> {
        try {
            const edu = await educationRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!edu) return { status: 0, message: "Education not found or not yours" };

            if (degree) edu.degree = degree;
            if (fieldOfStudy) edu.fieldOfStudy = fieldOfStudy;
            if (institution) edu.institution = institution;
            if (institutionLocation) edu.institutionLocation = institutionLocation;
            if (startYear) edu.startYear = startYear;
            if (endYear) edu.endYear = endYear;
            edu.updatedAt = new Date();

            const saved = await educationRepo.save(edu);
            return { status: 1, message: "Education updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("user", "admin")
    @Mutation(() => DeleteFileResponse)
    async deleteMyEducation(
        @Ctx() ctx: AppContext,
        @Arg("id") id: number,
    ): Promise<DeleteFileResponse> {
        try {
            const edu = await educationRepo.findOne({ where: { id, userUuid: ctx.user!.userUuid } });
            if (!edu) return { status: 0, message: "Education not found or not yours" };
            await educationRepo.delete({ id });
            return { status: 1, message: "Education deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Images ---

    @Authorized("user", "admin")
    @Query(() => UserImagesResponse)
    async myImages(
        @Ctx() ctx: AppContext,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 10,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserImagesResponse> {
        try {
            const data = await userImagesRepo.find({
                where: { userUuid: ctx.user!.userUuid },
                take: limit, skip: offset,
                order: { createdAt: "DESC" },
            });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }
}
