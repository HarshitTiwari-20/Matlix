import { sign, verify, type JwtPayload, type SignOptions } from "jsonwebtoken";
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from "@repo/common/common";
import { JWT_EXPIRES_IN, JWT_SECRET } from "./config";

const VERIFY_OPTIONS = {
  audience: TOKEN_AUDIENCE,
  issuer: TOKEN_ISSUER,
};

export function signAuthToken(userId: string) {
  return sign({ userId }, JWT_SECRET, {
    audience: TOKEN_AUDIENCE,
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: TOKEN_ISSUER,
    subject: userId,
  });
}

export function readUserId(payload: string | JwtPayload): string | null {
  if (typeof payload === "string") return null;
  const userId = typeof payload.userId === "string" ? payload.userId : payload.sub;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export function verifyAuthToken(token: string): string | null {
  try {
    return readUserId(verify(token, JWT_SECRET, VERIFY_OPTIONS) as JwtPayload);
  } catch {
    return null;
  }
}
