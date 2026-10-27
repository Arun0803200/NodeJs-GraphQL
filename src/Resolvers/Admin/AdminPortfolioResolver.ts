import { Resolver, Mutation, Arg, Query, Authorized } from "type-graphql";
import { AppDataSource } from "../../Config/DataSource";
import { User } from "../../Entity/User";
import { About } from "../../Entity/About";
import { UserExperience } from "../../Entity/UserExperience";
import { UserProjects } from "../../Entity/UserProjects";
import { UserSkills } from "../../Entity/UserSkills";
import { UserAwards } from "../../Entity/UserAwards";
import { UserEducation } from "../../Entity/UserEducation";
import { ContactUs } from "../../Entity/ContactUs";
import { UserImages } from "../../Entity/UserImages";
import {
    AboutResponse,
    UserExperienceListResponse,
    UserExperienceResponse,
    UserProjectListResponse,
    UserProjectResponse,
    UserSkillsListResponse,
    UserSkillsResponse,
    UserAwardsListResponse,
    UserAwardsResponse,
    UserEducationListResponse,
    UserEducationResponse,
    ContactUsListResponse,
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
const contactUsRepo = AppDataSource.getRepository(ContactUs);
const userImagesRepo = AppDataSource.getRepository(UserImages);

@Resolver()
export class AdminPortfolioResolver {

    // --- About ---

    @Authorized("admin")
    @Query(() => AboutResponse)
    async adminGetAbout(@Arg("userUuid") userUuid: string): Promise<AboutResponse> {
        try {
            const data = await aboutRepo.findOne({ where: { userUuid } });
            if (!data) return { status: 0, message: "About section not found" };
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => AboutResponse)
    async adminUpdateAbout(
        @Arg("userUuid") userUuid: string,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("description", { nullable: true }) description?: string,
        @Arg("longDescription", { nullable: true }) longDescription?: string,
        @Arg("totalExperience", { nullable: true }) totalExperience?: number,
        @Arg("totalProjects", { nullable: true }) totalProjects?: number,
        @Arg("totalAwards", { nullable: true }) totalAwards?: number,
    ): Promise<AboutResponse> {
        try {
            let about = await aboutRepo.findOne({ where: { userUuid } });
            if (!about) {
                about = new About();
                about.userUuid = userUuid;
            }
            if (title) about.title = title;
            if (description) about.description = description;
            if (longDescription) about.longDescription = longDescription;
            if (totalExperience !== undefined) about.totalExperience = totalExperience;
            if (totalProjects !== undefined) about.totalProjects = totalProjects;
            if (totalAwards !== undefined) about.totalAwards = totalAwards;
            about.updatedAt = new Date();

            const saved = await aboutRepo.save(about);
            return { status: 1, message: "About updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteAbout(@Arg("userUuid") userUuid: string): Promise<DeleteFileResponse> {
        try {
            await aboutRepo.delete({ userUuid });
            return { status: 1, message: "About deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Experience ---

    @Authorized("admin")
    @Query(() => UserExperienceListResponse)
    async adminGetExperiences(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 20,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserExperienceListResponse> {
        try {
            const data = await experienceRepo.find({ where: { userUuid }, take: limit, skip: offset, order: { startDate: "DESC" } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserExperienceResponse)
    async adminUpdateExperience(
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
            const exp = await experienceRepo.findOne({ where: { id } });
            if (!exp) return { status: 0, message: "Experience not found" };

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

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteExperience(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await experienceRepo.delete({ id });
            return { status: 1, message: "Experience deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Projects ---

    @Authorized("admin")
    @Query(() => UserProjectListResponse)
    async adminGetProjects(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 20,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserProjectListResponse> {
        try {
            const data = await projectsRepo.find({ where: { userUuid }, take: limit, skip: offset, order: { projectStartDate: "DESC" } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserProjectResponse)
    async adminUpdateProject(
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
            const project = await projectsRepo.findOne({ where: { id } });
            if (!project) return { status: 0, message: "Project not found" };

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

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteProject(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await projectsRepo.delete({ id });
            return { status: 1, message: "Project deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Skills ---

    @Authorized("admin")
    @Query(() => UserSkillsListResponse)
    async adminGetSkills(@Arg("userUuid") userUuid: string): Promise<UserSkillsListResponse> {
        try {
            const data = await skillsRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserSkillsResponse)
    async adminUpdateSkills(
        @Arg("id") id: number,
        @Arg("tittle", { nullable: true }) tittle?: string,
        @Arg("skills", () => [String], { nullable: true }) skills?: string[],
    ): Promise<UserSkillsResponse> {
        try {
            const skill = await skillsRepo.findOne({ where: { id } });
            if (!skill) return { status: 0, message: "Skills not found" };

            if (tittle) skill.tittle = tittle;
            if (skills) skill.skills = skills;
            skill.updatedAt = new Date();

            const saved = await skillsRepo.save(skill);
            return { status: 1, message: "Skills updated", data: saved };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteSkills(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await skillsRepo.delete({ id });
            return { status: 1, message: "Skills deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Awards ---

    @Authorized("admin")
    @Query(() => UserAwardsListResponse)
    async adminGetAwards(@Arg("userUuid") userUuid: string): Promise<UserAwardsListResponse> {
        try {
            const data = await awardsRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserAwardsResponse)
    async adminUpdateAward(
        @Arg("id") id: number,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("description", { nullable: true }) description?: string,
        @Arg("companyId", { nullable: true }) companyId?: number,
        @Arg("eventDate", { nullable: true }) eventDate?: string,
    ): Promise<UserAwardsResponse> {
        try {
            const award = await awardsRepo.findOne({ where: { id } });
            if (!award) return { status: 0, message: "Award not found" };

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

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteAward(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await awardsRepo.delete({ id });
            return { status: 1, message: "Award deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Education ---

    @Authorized("admin")
    @Query(() => UserEducationListResponse)
    async adminGetEducation(@Arg("userUuid") userUuid: string): Promise<UserEducationListResponse> {
        try {
            const data = await educationRepo.find({ where: { userUuid } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserEducationResponse)
    async adminUpdateEducation(
        @Arg("id") id: number,
        @Arg("degree", { nullable: true }) degree?: string,
        @Arg("fieldOfStudy", { nullable: true }) fieldOfStudy?: string,
        @Arg("institution", { nullable: true }) institution?: string,
        @Arg("institutionLocation", { nullable: true }) institutionLocation?: string,
        @Arg("startYear", { nullable: true }) startYear?: string,
        @Arg("endYear", { nullable: true }) endYear?: string,
    ): Promise<UserEducationResponse> {
        try {
            const edu = await educationRepo.findOne({ where: { id } });
            if (!edu) return { status: 0, message: "Education not found" };

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

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteEducation(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await educationRepo.delete({ id });
            return { status: 1, message: "Education deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Contact Us ---

    @Authorized("admin")
    @Query(() => ContactUsListResponse)
    async adminGetContactMessages(
        @Arg("userUuid", { nullable: true }) userUuid?: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 20,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<ContactUsListResponse> {
        try {
            const where = userUuid ? { userUuid } : {};
            const data = await contactUsRepo.find({ where, take: limit, skip: offset, order: { createdAt: "DESC" } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    @Authorized("admin")
    @Mutation(() => DeleteFileResponse)
    async adminDeleteContactMessage(@Arg("id") id: number): Promise<DeleteFileResponse> {
        try {
            await contactUsRepo.delete({ id });
            return { status: 1, message: "Contact message deleted" };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }

    // --- Images ---

    @Authorized("admin")
    @Query(() => UserImagesResponse)
    async adminGetUserImages(
        @Arg("userUuid") userUuid: string,
        @Arg("limit", () => Number, { nullable: true }) limit: number = 20,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserImagesResponse> {
        try {
            const data = await userImagesRepo.find({ where: { userUuid }, take: limit, skip: offset, order: { createdAt: "DESC" } });
            return { status: 1, message: "Success", data };
        } catch (error: any) {
            return { status: 0, message: error.message || "Failed" };
        }
    }
}
