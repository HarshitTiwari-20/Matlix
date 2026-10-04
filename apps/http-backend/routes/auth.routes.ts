import { Router, type Request } from "express";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { prisma } from "@repo/db/client";
import { loginSchema, registerSchema, zodErrorHandler } from "@repo/common/common";
import { JWT_SECRET } from "../config";
import { auth, type AuthenticatedRequest } from "../auth.middleware";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);

  if (!success) {
    return res.status(403).json({ errors: zodErrorHandler(error) });
  }

  const { email, password } = data;
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(403).json({ errors: { email: "Email already exists" } });
  }

  const username = email.split("@")[0] ?? "user";
  const hashedPassword = await hash(password, 10);
  const user = await prisma.users.create({
    data: { email, password: hashedPassword, username },
  });

  return res.status(201).json({ message: "Registered successfully", user });
});

authRouter.post("/login", async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  if (!success) {
    return res.status(403).json({ errors: zodErrorHandler(error) });
  }

  const { email, password } = data;
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });

  if (!existingUser) {
    return res.status(403).json({ errors: { email: "User not exists" } });
  }

  const isPasswordValid = await compare(password, existingUser.password);
  if (!isPasswordValid) {
    return res.status(403).json({ message: "Invalid password" });
  }

  const token = sign({ userId: existingUser.id }, JWT_SECRET);

  return res.status(200).json({
    message: "Logged in successfully",
    data: { token },
  });
});

authRouter.post("/me", auth, async (req: Request, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      rating: true,
      gameMember: {
        include: {
          game: true,
        },
      },
    },
  });

  return res.json({
    message: user ? "User fetched successfully" : "User not found",
    data: { user },
  });
});