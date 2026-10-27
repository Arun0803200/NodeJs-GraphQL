import { Resolver, Mutation, Arg, Query, Authorized } from "type-graphql";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../../Config/DataSource";
import { User } from "../../Entity/User";
import { Auth } from "../../Entity/Auth";
import { UserListResponse, AuthResponse, SocialMediaInput } from "../../Config/SettingsTypes";
import { UserResponse } from "../../Responses/UserResponse";
import { AdminStatsResponse } from "../../Config/SettingsTypes";
import { UserImages } from "../../Entity/UserImages";
import { resolveNewUserName, validateUserName, isUserNameTaken } from "../../Utils/userName";

const userRepo = AppDataSource.getRepository(User);
const authRepo = AppDataSource.getRepository(Auth);
const userImagesRepo = AppDataSource.getRepository(UserImages);

@Resolver()
export class AdminUserResolver {

    @Authorized("admin")
    @Query(() => UserListResponse)
    async adminGetAllUsers(
        @Arg("limit", () => Number, { nullable: true }) limit: number = 20,
        @Arg("offset", () => Number, { nullable: true }) offset: number = 0,
    ): Promise<UserListResponse> {
        try {
            const [users, total] = await userRepo.findAndCount({
                take: limit,
                skip: offset,
                order: { createdAt: "DESC" },
            });
            return { status: 1, message: "Success", data: users, total };
        } catch (error: any) {
            console.error("Admin GetAllUsers Error:", error);
            return { status: 0, message: error.message || "Failed to fetch users" };
        }
    }

    @Authorized("admin")
    @Query(() => UserResponse)
    async adminGetUser(
        @Arg("uuid") uuid: string,
    ): Promise<UserResponse> {
        try {
            const user = await userRepo.findOne({ where: { userUuid: uuid } });
            if (!user) {
                return { status: 0, message: "User not found", data: null };
            }
            return { status: 1, message: "Success", data: user };
        } catch (error: any) {
            console.error("Admin GetUser Error:", error);
            return { status: 0, message: error.message || "Failed to fetch user", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => AuthResponse)
    async adminCreateUser(
        @Arg("fullName") fullName: string,
        @Arg("designation") designation: string,
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Arg("role", { nullable: true }) role: string = "user",
        @Arg("contactUsDescription", { nullable: true }) contactUsDescription: string = "",
        @Arg("mobileNo", { nullable: true }) mobileNo: string = "",
        @Arg("address", { nullable: true }) address: string = "",
        @Arg("socialMedia", () => [SocialMediaInput], { nullable: true }) socialMedia: SocialMediaInput[] = [],
        @Arg("userName", { nullable: true }) requestedUserName?: string,
    ): Promise<AuthResponse> {
        try {
            if (!["user", "admin"].includes(role)) return { status: 0, message: "Role must be user or admin" };
            if (password.length < 8) return { status: 0, message: "Password must be at least 8 characters" };
            const existing = await authRepo.findOne({ where: { email } });
            if (existing) {
                return { status: 0, message: "Email already registered" };
            }

            const { userName, error } = await resolveNewUserName(userRepo, fullName, requestedUserName);
            if (error) return { status: 0, message: error };

            const newUser = new User();
            newUser.fullName = fullName;
            newUser.userName = userName!;
            newUser.designation = designation;
            newUser.contactUsDescription = contactUsDescription;
            newUser.email = email;
            newUser.mobileNo = mobileNo || null;
            newUser.address = address;
            newUser.socialMedia = socialMedia as any;
            newUser.createdAt = new Date();
            newUser.updatedAt = new Date();

            const savedUser = await userRepo.save(newUser);

            const hashedPassword = await bcrypt.hash(password, 12);
            const newAuth = new Auth();
            newAuth.userUuid = savedUser.userUuid;
            newAuth.email = email;
            newAuth.password = hashedPassword;
            newAuth.role = role;
            newAuth.isActive = true;
            newAuth.createdAt = new Date();
            newAuth.updatedAt = new Date();

            await authRepo.save(newAuth);

            return { status: 1, message: "User created successfully", data: savedUser };
        } catch (error: any) {
            console.error("Admin CreateUser Error:", error);
            return { status: 0, message: error.message || "Failed to create user" };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserResponse)
    async adminUpdateUser(
        @Arg("uuid") uuid: string,
        @Arg("fullName", { nullable: true }) fullName?: string,
        @Arg("designation", { nullable: true }) designation?: string,
        @Arg("contactUsDescription", { nullable: true }) contactUsDescription?: string,
        @Arg("email", { nullable: true }) email?: string,
        @Arg("mobileNo", { nullable: true }) mobileNo?: string,
        @Arg("address", { nullable: true }) address?: string,
        @Arg("socialMedia", () => [SocialMediaInput], { nullable: true }) socialMedia?: SocialMediaInput[],
        @Arg("userName", { nullable: true }) userName?: string,
    ): Promise<UserResponse> {
        try {
            const user = await userRepo.findOne({ where: { userUuid: uuid } });
            if (!user) {
                return { status: 0, message: "User not found", data: null };
            }

            if (userName) {
                const normalized = userName.trim().toLowerCase();
                const invalid = validateUserName(normalized);
                if (invalid) return { status: 0, message: invalid, data: null };
                if (await isUserNameTaken(userRepo, normalized, uuid)) return { status: 0, message: "Username already taken", data: null };
                user.userName = normalized;
            }

            if (fullName) user.fullName = fullName;
            if (designation) user.designation = designation;
            if (contactUsDescription) user.contactUsDescription = contactUsDescription;
            if (email) user.email = email;
            if (mobileNo) user.mobileNo = mobileNo;
            if (address) user.address = address;
            if (socialMedia) user.socialMedia = socialMedia as any;
            user.updatedAt = new Date();

            const updated = await userRepo.save(user);
            return { status: 1, message: "User updated successfully", data: updated };
        } catch (error: any) {
            console.error("Admin UpdateUser Error:", error);
            return { status: 0, message: error.message || "Failed to update user", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserResponse)
    async adminDeactivateUser(
        @Arg("uuid") uuid: string,
    ): Promise<UserResponse> {
        try {
            const auth = await authRepo.findOne({ where: { userUuid: uuid } });
            if (!auth) {
                return { status: 0, message: "User not found", data: null };
            }

            auth.isActive = false;
            auth.updatedAt = new Date();
            await authRepo.save(auth);

            const user = await userRepo.findOne({ where: { userUuid: uuid } });
            return { status: 1, message: "User deactivated successfully", data: user };
        } catch (error: any) {
            console.error("Admin DeactivateUser Error:", error);
            return { status: 0, message: error.message || "Failed to deactivate user", data: null };
        }
    }

    @Authorized("admin")
    @Mutation(() => UserResponse)
    async adminActivateUser(
        @Arg("uuid") uuid: string,
    ): Promise<UserResponse> {
        try {
            const auth = await authRepo.findOne({ where: { userUuid: uuid } });
            if (!auth) {
                return { status: 0, message: "User not found", data: null };
            }

            auth.isActive = true;
            auth.updatedAt = new Date();
            await authRepo.save(auth);

            const user = await userRepo.findOne({ where: { userUuid: uuid } });
            return { status: 1, message: "User activated successfully", data: user };
        } catch (error: any) {
            console.error("Admin ActivateUser Error:", error);
            return { status: 0, message: error.message || "Failed to activate user", data: null };
        }
    }

    @Authorized("admin")
    @Query(() => AdminStatsResponse)
    async adminGetStats(): Promise<AdminStatsResponse> {
        try {
            const totalUsers = await userRepo.count();
            const totalActiveUsers = await authRepo.count({ where: { isActive: true } });
            const totalImages = await userImagesRepo.count();

            return {
                status: 1,
                message: "Success",
                totalUsers,
                totalActiveUsers,
                totalImages,
            };
        } catch (error: any) {
            console.error("Admin GetStats Error:", error);
            return { status: 0, message: error.message || "Failed to fetch stats" };
        }
    }
}
