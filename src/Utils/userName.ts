import { Repository, Not } from "typeorm";
import { User } from "../Entity/User";

// Paths already used by the frontend router; a username must not shadow them
const RESERVED = ["admin", "user", "auth", "api", "graphql", "login", "register", "templates", "template", "pricing", "about", "contact", "help"];
const USER_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyUserName(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

export function validateUserName(userName: string): string | null {
    if (userName.length < 3 || userName.length > 50) return "Username must be 3-50 characters";
    if (!USER_NAME_PATTERN.test(userName)) return "Username may contain only lowercase letters, numbers and single hyphens";
    if (RESERVED.includes(userName)) return "This username is reserved";
    return null;
}

export async function isUserNameTaken(userRepo: Repository<User>, userName: string, exceptUserUuid?: string): Promise<boolean> {
    const where = exceptUserUuid ? { userName, userUuid: Not(exceptUserUuid) } : { userName };
    return (await userRepo.count({ where })) > 0;
}

// Builds a unique username from the full name: "Arun Palani" -> "arun-palani", "arun-palani-2", ...
export async function generateUniqueUserName(userRepo: Repository<User>, fullName: string): Promise<string> {
    let base = slugifyUserName(fullName);
    if (base.length < 3 || RESERVED.includes(base)) base = `${base || "user"}-portfolio`;

    let candidate = base;
    let suffix = 2;
    while (await isUserNameTaken(userRepo, candidate)) {
        candidate = `${base}-${suffix++}`;
    }
    return candidate;
}

// Uses the requested username when given (validated), otherwise generates one from the full name
export async function resolveNewUserName(
    userRepo: Repository<User>,
    fullName: string,
    requested?: string | null,
): Promise<{ userName?: string; error?: string }> {
    if (!requested) return { userName: await generateUniqueUserName(userRepo, fullName) };
    const userName = requested.trim().toLowerCase();
    const error = validateUserName(userName);
    if (error) return { error };
    if (await isUserNameTaken(userRepo, userName)) return { error: "Username already taken" };
    return { userName };
}
