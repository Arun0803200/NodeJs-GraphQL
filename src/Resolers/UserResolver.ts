import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { UserResponse } from "../Responses/UserResponse";
import { User } from "../Entity/User";
import { AppDataSource } from '../Config/DataSource';
import { UserFindOneResponse } from "../Responses/UserFindOneResponse";
import { SocialMediaInput } from "../Config/SettingsTypes";
@Resolver()
export class UserResolver {

    @Mutation(() => UserResponse)
    public async createUser(
        @Arg('fullName') fullName: string,
        @Arg('designation') designation: string,
        @Arg('contactUsDescription') contactUsDescription: string,
        @Arg('email') email: string,
        @Arg('mobileNo') mobileNo: string,
        @Arg('address') address: string,
        @Arg('socialMedia', () => [SocialMediaInput]) socialMedia: SocialMediaInput[],
    ): Promise<UserResponse> {
        const newUser = new User();
        newUser.fullName = fullName;
        newUser.designation = designation;
        newUser.contactUsDescription = contactUsDescription;
        newUser.email = email;
        newUser.mobileNo = mobileNo;
        newUser.address = address;
        newUser.socialMedia = socialMedia;

        const userRepo = AppDataSource.getRepository(User);
        const saveUser = await userRepo.save(newUser);
        console.log(saveUser, 'saveUsersaveUser');
        
        if (saveUser) {
            return {
                status: 1,
                message: 'Successfully created the user data!',
                data: saveUser,
            };
        }
        return {
            status: 0,
            message: 'Unable to create the user data!',
            data: null,
        };
    }

    @Query(() => UserFindOneResponse)
    public async getUser(
        @Arg('uuid') uuid: string
    ): Promise<UserFindOneResponse> {
        const userRepo = AppDataSource.getRepository(User);
        const findUser = await userRepo.findOne({ where: { userUuid: uuid }, select: ['id', 'fullName', 'designation', 'contactUsDescription', 'email', 'mobileNo', 'address', 'socialMedia'] });
        if (findUser) {
            return {
                status: 1,
                message: 'Successfully got the user data!',
                data: findUser,
            };
        }
        return {
            status: 0,
            message: 'Unable to get the user data!',
            data: null,
        };
    }
}
