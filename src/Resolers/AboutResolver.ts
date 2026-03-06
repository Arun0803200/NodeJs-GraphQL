import { Resolver, Mutation, Arg, Query } from "type-graphql";
import { AboutResponse, UserImagesResponse } from "../Config/SettingsTypes";
import { User } from "../Entity/User";
import { About } from "../Entity/About";
import { AppDataSource } from '../Config/DataSource';
import { UserImages } from "../Entity/UserImages";

const userService = AppDataSource.getRepository(User);
const aboutService = AppDataSource.getRepository(About);
const userImagesService = AppDataSource.getRepository(UserImages);
@Resolver()
export class AboutResolver {

    // Create About details
    @Mutation(() => AboutResponse)
    public async createAbout(
        @Arg('userUuid') userUuid: string,
        @Arg('title') title: string,
        @Arg('description') description: string,
        @Arg('longDescription') longDescription: string,
        @Arg('totalExperience') totalExperience: number,
        @Arg('totalProjects') totalProjects: number,
        @Arg('totalAwards') totalAwards: number,
    ): Promise<AboutResponse> {
        try {
            const findUser = await userService.findOne({ where: { userUuid }, select: ['id'] });
            if (!findUser) {
                return {
                    status: 0,
                    message: 'UUID not found',
                };
            }

            const newAbout = new About();
            newAbout.userUuid = userUuid;
            newAbout.title = title;
            newAbout.description = description;
            newAbout.longDescription = longDescription;
            newAbout.totalExperience = totalExperience;
            newAbout.totalProjects = totalProjects;
            newAbout.totalAwards = totalAwards;

            const saveAbout = await aboutService.save(newAbout);
            return {
                status: 1,
                message: 'Successfully created the about data!',
                data: saveAbout,
            };

        } catch (error) {
            return {
                status: 0,
                message: 'An error occurred while creating about data.',
            };
        }
    }

    @Query(() => AboutResponse)
    public async getAbout(
        @Arg('userUuid') userUuid: string
    ): Promise<AboutResponse> {
        try {
            const findAbout = await aboutService.findOne({ where: { userUuid } });
            if (findAbout) {
                return {
                    status: 1,
                    message: 'Successfully got the about data!',
                    data: findAbout,
                };
            }
            return {
                status: 0,
                message: 'No about data found for the provided UUID.',
            };
        } catch (error) {
            return {
                status: 0,
                message: 'An error occurred while fetching about data.',
            };
        }
    }

    @Query(() => UserImagesResponse)
    public async getUserImages(
        @Arg('userUuid') userUuid: string,
        @Arg('limit', () => Number) limit: number = 6,
        @Arg('offset', () => Number) offset: number = 0,
    ): Promise<UserImagesResponse> {
        try {
            const findUserImages = await userImagesService.find({ where: { userUuid }, select: ['imageUrl'], take: limit, skip: offset });
            return {
                status: 1,
                message: 'Successfully got the user images!',
                data: findUserImages,
            };
        } catch (error) {
            return {
                status: 0,
                message: 'An error occurred while fetching user images.',
            };
        }
    }
}
