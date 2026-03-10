import { Arg, Mutation, Resolver } from "type-graphql";
import { UserProjectResponse } from "../Config/SettingsTypes";
import { UserProjects } from "../Entity/UserProjects";
import { User } from "../Entity/User";
import { AppDataSource } from "../Config/DataSource";

const userRepo = AppDataSource.getRepository(User);
const projectRepo = AppDataSource.getRepository(UserProjects);

@Resolver()
export class UserProjectResolver {
    @Mutation(() => UserProjectResponse)
    public async addProject(
        @Arg("userUuid") userUuid: string,
        @Arg("projectName") projectName: string,
        @Arg("projectDescription") projectDescription: string,
        @Arg("projectUrl") projectUrl: string,
        @Arg("projectStartDate") projectStartDate: Date,
        @Arg("projectEndDate", { nullable: true }) projectEndDate: Date,
        @Arg("projectLongDescription") projectLongDescription: string,
        @Arg("keyFeatures", () => [String]) keyFeatures: string[],
        @Arg("technologiesSkills", () => [String]) technologiesSkills: string[],
        @Arg("isCurrentProject") isCurrentProject?: boolean,
    ): Promise<UserProjectResponse> {
        try {
            const findUser = await userRepo.findOne({
                where: { userUuid },
                select: ["id"]
            });

            if (!findUser) {
                return {
                    status: 0,
                    message: "User UUID not found"
                };
            }

            const newUserProject = projectRepo.create({
                userUuid,
                projectName,
                projectDescription,
                projectUrl,
                projectStartDate,
                projectEndDate,
                isCurrentProject: isCurrentProject || false,
                projectLongDescription,
                keyFeatures,
                technologiesSkills
            });

            const savedProject = await projectRepo.save(newUserProject);

            return {
                status: 1,
                message: "Successfully added the user project!",
                data: savedProject
            };
        } catch (error) {
            return {
                status: 0,
                message: "An error occurred while adding user project."
            };
        }
    }
}