import { Resolver, Mutation, Arg, Query } from "type-graphql";
import { UserExperience } from "../Entity/UserExperience";
import { User } from "../Entity/User";
import { AppDataSource } from "../Config/DataSource";
import { UserExperienceResponse, UserExperienceListResponse } from "../Config/SettingsTypes";

const userRepo = AppDataSource.getRepository(User);
const experienceRepo = AppDataSource.getRepository(UserExperience);

@Resolver()
export class UserExperienceResolver {

    @Mutation(() => UserExperienceResponse)
    public async addExperience(
        @Arg("userUuid") userUuid: string,
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

            const newUserExperience = experienceRepo.create({
                userUuid,
                companyName,
                companyUrl,
                companyLocation,
                designation,
                startDate,
                endDate,
                isCurrentlyWorking,
                jobDescription,
                skills
            });

            const savedExperience = await experienceRepo.save(newUserExperience);

            return {
                status: 1,
                message: "Successfully added the user experience!",
                data: savedExperience
            };

        } catch (error) {
            return {
                status: 0,
                message: "An error occurred while adding user experience."
            };
        }
    }

    @Query(() => UserExperienceListResponse)
    public async getUserExperiences(
        @Arg('userUuid') userUuid: string,
        @Arg('limit', () => Number) limit: number = 10,
        @Arg('offset', () => Number) offset: number = 0,
    ): Promise<UserExperienceListResponse> {
        try {
            const experiences = await experienceRepo.find(
                {
                    where: { userUuid },
                    select:
                        [
                            'id',
                            'companyName',
                            'companyUrl',
                            'companyLocation',
                            'designation',
                            'startDate',
                            'endDate',
                            'isCurrentlyWorking',
                            'jobDescription',
                            'skills'
                        ],
                    take: limit,
                    skip: offset
                });

            return {
                status: 1,
                message: "Successfully retrieved user experiences!",
                data: experiences
            };
        } catch (error) {
            return {
                status: 0,
                message: "An error occurred while retrieving user experiences."
            };
        }
    }
}
