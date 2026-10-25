import { Router, type Request, type Response } from "express";
import { compare, hash } from "bcryptjs";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  loginSchema,
  registerSchema,
  zodErrorHandler,
} from "@repo/common/common";
import { BCRYPT_ROUNDS } from "../config";
import { auth, type AuthenticatedRequest } from "../auth.middleware";
import { signAuthToken } from "../tokens";

export type UserRecord = {
  id: string;
  email: string;
  password: string;
  username: string;
  createdAt?: Date;
  updatedAt?: Date;
  rating?: unknown;
  gameMember?: unknown;
};

type FindUniqueArgs = {
  where: { email?: string; id?: string; username?: string };
  include?: Record<string, unknown>;
};

export type AuthDb = {
  users: {
    findUnique: (args: FindUniqueArgs) => Promise<UserRecord | null>;
    create: (args: {
      data: {
        email: string;
        password: string;
        username: string;
        rating?: { create: Record<string, never> };
      };
    }) => Promise<UserRecord>;
  };
};

function publicUser(user: UserRecord) {
  const { password: _password, ...safe } = user;
  return safe;
}

function isUniqueConstraintError(
  error: unknown,
): error is { code: string; meta?: { target?: unknown } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function sanitizeUsername(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);

  if (cleaned.length >= USERNAME_MIN_LENGTH) return cleaned;
  return `player_${crypto.randomUUID().slice(0, 6)}`;
}

async function allocateUsername(db: AuthDb, desired: string) {
  const base = sanitizeUsername(desired);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const existing = await db.users.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${base.slice(0, USERNAME_MAX_LENGTH - 9)}_${crypto.randomUUID().slice(0, 8)}`;
}

export function createAuthRouter(db: AuthDb) {
  const authRouter = Router();

  authRouter.post("/register", async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Please check the highlighted fields",
        errors: zodErrorHandler(parsed.error),
      });
    }

    const { email, password, username: requestedUsername } = parsed.data;

    const existingUser = await db.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
        errors: { email: "Email is already registered" },
      });
    }

    const desiredUsername = requestedUsername ?? email.split("@")[0] ?? "player";
    const username = await allocateUsername(db, desiredUsername);
    const hashedPassword = await hash(password, BCRYPT_ROUNDS);

    try {
      const user = await db.users.create({
        data: {
          email,
          password: hashedPassword,
          username,
          rating: { create: {} },
        },
      });

      return res.status(201).json({
        message: "Registered successfully",
        data: { token: signAuthToken(user.id), user: publicUser(user) },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const rawTarget = error.meta?.target;
        const target = Array.isArray(rawTarget)
          ? rawTarget.join(",")
          : String(rawTarget ?? "");
        const field = target.includes("username") ? "username" : "email";
        return res.status(409).json({
          message: field === "username" ? "Username is already taken" : "Email is already registered",
          errors: { [field]: field === "username" ? "Username is already taken" : "Email is already registered" },
        });
      }
      throw error;
    }
  });

  authRouter.post("/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Please check the highlighted fields",
        errors: zodErrorHandler(parsed.error),
      });
    }

    const { email, password } = parsed.data;
    const existingUser = await db.users.findUnique({ where: { email } });

    if (!existingUser) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Logged in successfully",
      data: { token: signAuthToken(existingUser.id), user: publicUser(existingUser) },
    });
  });

  authRouter.get("/me", auth, async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        rating: true,
        gameMember: {
          include: { game: true },
          orderBy: { game: { startedAt: "desc" } },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "User fetched successfully",
      data: { user: publicUser(user) },
    });
  });

  return authRouter;
}
