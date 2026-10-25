import { z, type ZodError } from "zod";

export const TOKEN_ISSUER = "matiks";
export const TOKEN_AUDIENCE = "matiks-web";
export const TOKEN_TTL = "7d";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .toLowerCase()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
  );

export const usernameSchema = z
  .string()
  .trim()
  .min(
    USERNAME_MIN_LENGTH,
    `Username must be at least ${USERNAME_MIN_LENGTH} characters long`,
  )
  .max(
    USERNAME_MAX_LENGTH,
    `Username must be at most ${USERNAME_MAX_LENGTH} characters long`,
  )
  .regex(
    USERNAME_PATTERN,
    "Username can only contain letters, numbers, and underscores",
  );

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    usernameSchema.optional(),
  ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const zodErrorHandler = (error: ZodError) => {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const path = issue.path.join(".") || "form";
    if (!(path in acc)) {
      acc[path] = issue.message;
    }
    return acc;
  }, {});
};
