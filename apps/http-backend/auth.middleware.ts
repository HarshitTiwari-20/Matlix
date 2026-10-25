import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "./tokens";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = verifyAuthToken(token);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as AuthenticatedRequest).userId = userId;
  return next();
}
