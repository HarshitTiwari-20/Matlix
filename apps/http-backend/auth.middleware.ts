import type { NextFunction, Request, Response } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "./config";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    const userId = typeof decoded.userId === "string" ? decoded.userId : String(decoded.userId ?? "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as AuthenticatedRequest).userId = userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};