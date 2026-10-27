import { AuthChecker } from "type-graphql";
import jwt from "jsonwebtoken";
import { env } from "../Config/env";
import { AppDataSource } from "../Config/DataSource";
import { Auth } from "../Entity/Auth";

export interface JwtPayload {
  userId: number;
  userUuid: string;
  email: string;
  role: string;
}

export interface AppContext {
  user?: JwtPayload;
  // Request details used by analytics/activity logging
  ip?: string;
  userAgent?: string;
}

// First address in X-Forwarded-For when behind a proxy, else the socket address
export function clientIp(req: any): string | undefined {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return (first || req.ip || req.socket?.remoteAddress || undefined)?.replace(/^::ffff:/, "");
}

export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) return null;
  const [type, token] = authorization.split(" ");
  return type === "Bearer" ? token : null;
}

export async function buildContext({ req }: { req: any }): Promise<AppContext> {
  const meta: AppContext = { ip: clientIp(req), userAgent: req.headers["user-agent"]?.slice(0, 300) };
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) return meta;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const authRepo = AppDataSource.getRepository(Auth);
    const authRecord = await authRepo.findOne({
      where: { userUuid: decoded.userUuid, isActive: true },
    });

    if (!authRecord) return meta;

    // Use the stored role, so role changes and demotions apply immediately instead of when the token expires
    return { ...meta, user: { ...decoded, role: authRecord.role } };
  } catch {
    return meta;
  }
}

export const authChecker: AuthChecker<AppContext> = ({ context }, roles) => {
  const { user } = context;

  if (!user) return false;

  if (roles.length === 0) return true;

  return roles.includes(user.role);
};
