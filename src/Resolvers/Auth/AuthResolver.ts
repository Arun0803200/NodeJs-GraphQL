import { Resolver, Mutation, Arg, Ctx, Query, Authorized } from "type-graphql";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { MoreThan } from "typeorm";
import { env } from "../../Config/env";
import { AppDataSource } from "../../Config/DataSource";
import { Auth } from "../../Entity/Auth";
import { User } from "../../Entity/User";
import { AuthResponse } from "../../Config/SettingsTypes";
import { SocialMediaInput } from "../../Config/SettingsTypes";
import { AppContext } from "../../Middleware/authChecker";
import { validateUserName, isUserNameTaken } from "../../Utils/userName";
import { sendPasswordResetMail } from "../../Utils/mailer";
import { StatusResponse } from "../../Responses/StatusResponse";

const authRepo = AppDataSource.getRepository(Auth);
const userRepo = AppDataSource.getRepository(User);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function validatePassword(password: string, confirmPassword?: string | null): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Password must contain letters and numbers";
    if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) return "Passwords do not match";
    return null;
}

function signToken(user: User, auth: Auth): string {
    return jwt.sign(
        { userId: user.id, userUuid: auth.userUuid, email: auth.email, role: auth.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
    );
}

@Resolver()
export class AuthResolver {

    // Sign-up needs only email, username and password; profile details are filled in later
    @Mutation(() => AuthResponse)
    async register(
        @Arg("email") rawEmail: string,
        @Arg("userName") rawUserName: string,
        @Arg("password") password: string,
        @Arg("confirmPassword", { nullable: true }) confirmPassword?: string,
        @Arg("fullName", { nullable: true }) fullName?: string,
        @Arg("designation", { nullable: true }) designation: string = "",
        @Arg("contactUsDescription", { nullable: true }) contactUsDescription: string = "",
        @Arg("mobileNo", { nullable: true }) mobileNo?: string,
        @Arg("address", { nullable: true }) address: string = "",
        @Arg("socialMedia", () => [SocialMediaInput], { nullable: true }) socialMedia: SocialMediaInput[] = [],
    ): Promise<AuthResponse> {
        try {
            const email = rawEmail.trim().toLowerCase();
            const userName = rawUserName.trim().toLowerCase();

            if (!EMAIL_PATTERN.test(email)) return { status: 0, message: "Enter a valid email address" };
            const userNameError = validateUserName(userName);
            if (userNameError) return { status: 0, message: userNameError };
            const passwordError = validatePassword(password, confirmPassword);
            if (passwordError) return { status: 0, message: passwordError };

            if (await authRepo.findOne({ where: { email } })) {
                return { status: 0, message: "Email already registered" };
            }
            if (await isUserNameTaken(userRepo, userName)) {
                return { status: 0, message: "Username already taken" };
            }

            // Create user profile
            const newUser = new User();
            newUser.fullName = fullName?.trim() || userName;
            newUser.userName = userName;
            newUser.designation = designation;
            newUser.contactUsDescription = contactUsDescription;
            newUser.email = email;
            newUser.mobileNo = mobileNo || null;
            newUser.address = address;
            newUser.socialMedia = socialMedia as any;
            newUser.createdAt = new Date();
            newUser.updatedAt = new Date();

            const savedUser = await userRepo.save(newUser);

            // Create auth record
            const newAuth = new Auth();
            newAuth.userUuid = savedUser.userUuid;
            newAuth.email = email;
            newAuth.password = await bcrypt.hash(password, 12);
            newAuth.role = "user";
            newAuth.isActive = true;
            newAuth.createdAt = new Date();
            newAuth.updatedAt = new Date();

            const savedAuth = await authRepo.save(newAuth);

            return { status: 1, message: "Registration successful", token: signToken(savedUser, savedAuth), data: savedUser };
        } catch (error: any) {
            console.error("Register Error:", error);
            return { status: 0, message: error.message || "Registration failed" };
        }
    }

    // `email` accepts either the email address or the username
    @Mutation(() => AuthResponse)
    async login(
        @Arg("email") identifier: string,
        @Arg("password") password: string,
    ): Promise<AuthResponse> {
        try {
            const value = identifier.trim().toLowerCase();
            let authRecord: Auth | null = null;
            if (value.includes("@")) {
                authRecord = await authRepo.findOne({ where: { email: value } });
            } else {
                const byUserName = await userRepo.findOne({ where: { userName: value } });
                if (byUserName) authRecord = await authRepo.findOne({ where: { userUuid: byUserName.userUuid } });
            }

            if (!authRecord || !(await bcrypt.compare(password, authRecord.password))) {
                return { status: 0, message: "Invalid email/username or password" };
            }

            if (!authRecord.isActive) {
                return { status: 0, message: "Account is deactivated. Contact admin." };
            }

            const user = await userRepo.findOne({ where: { userUuid: authRecord.userUuid } });
            if (!user) return { status: 0, message: "User profile not found" };

            return { status: 1, message: "Login successful", token: signToken(user, authRecord), data: user };
        } catch (error: any) {
            console.error("Login Error:", error);
            return { status: 0, message: error.message || "Login failed" };
        }
    }

    // Always answers the same way so the endpoint can't be used to discover registered emails
    @Mutation(() => StatusResponse)
    async forgotPassword(@Arg("email") rawEmail: string): Promise<StatusResponse> {
        const genericReply = { status: 1, message: "If an account exists for that email, a reset link has been sent." };
        try {
            const email = rawEmail.trim().toLowerCase();
            const authRecord = await authRepo.findOne({ where: { email } });
            if (!authRecord || !authRecord.isActive) return genericReply;

            const token = crypto.randomBytes(32).toString("hex");
            authRecord.resetTokenHash = hashToken(token);
            authRecord.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
            authRecord.updatedAt = new Date();
            await authRepo.save(authRecord);

            await sendPasswordResetMail(email, `${env.FRONTEND_URL}/auth/reset-password?token=${token}`);
            return genericReply;
        } catch (error: any) {
            console.error("Forgot Password Error:", error);
            return { status: 0, message: "Could not send reset email. Please try again later." };
        }
    }

    @Mutation(() => StatusResponse)
    async resetPassword(
        @Arg("token") token: string,
        @Arg("password") password: string,
        @Arg("confirmPassword") confirmPassword: string,
    ): Promise<StatusResponse> {
        try {
            const passwordError = validatePassword(password, confirmPassword);
            if (passwordError) return { status: 0, message: passwordError };

            const authRecord = await authRepo.findOne({
                where: { resetTokenHash: hashToken(token), resetTokenExpiresAt: MoreThan(new Date()) },
            });
            if (!authRecord) return { status: 0, message: "This reset link is invalid or has expired" };

            authRecord.password = await bcrypt.hash(password, 12);
            authRecord.resetTokenHash = null;
            authRecord.resetTokenExpiresAt = null;
            authRecord.updatedAt = new Date();
            await authRepo.save(authRecord);

            return { status: 1, message: "Password updated. You can now log in." };
        } catch (error: any) {
            console.error("Reset Password Error:", error);
            return { status: 0, message: error.message || "Password reset failed" };
        }
    }

    @Authorized()
    @Query(() => AuthResponse)
    async me(@Ctx() ctx: AppContext): Promise<AuthResponse> {
        try {
            if (!ctx.user) {
                return { status: 0, message: "Not authenticated" };
            }

            const user = await userRepo.findOne({ where: { userUuid: ctx.user.userUuid } });
            if (!user) {
                return { status: 0, message: "User not found" };
            }

            return { status: 1, message: "Success", data: user };
        } catch (error: any) {
            console.error("Me Query Error:", error);
            return { status: 0, message: error.message || "Failed to fetch user" };
        }
    }
}
