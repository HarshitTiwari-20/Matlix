import { describe, expect, test } from "bun:test";
import {
  loginSchema,
  registerSchema,
  usernameSchema,
  zodErrorHandler,
} from "./index";

describe("registerSchema", () => {
  test("accepts a valid payload and normalizes the email", () => {
    const result = registerSchema.safeParse({
      email: "  Player@Matiks.DEV ",
      password: "password1",
      username: "player_one",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("player@matiks.dev");
    expect(result.data.username).toBe("player_one");
  });

  test("treats a blank username as omitted", () => {
    const result = registerSchema.safeParse({
      email: "player@matiks.dev",
      password: "password1",
      username: "   ",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.username).toBeUndefined();
  });

  test("rejects a short password", () => {
    const result = registerSchema.safeParse({
      email: "player@matiks.dev",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodErrorHandler(result.error);
      expect(errors.password).toContain("8");
    }
  });

  test("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrorHandler(result.error).email).toBeDefined();
    }
  });

  test("rejects an invalid username", () => {
    const result = registerSchema.safeParse({
      email: "player@matiks.dev",
      password: "password1",
      username: "no spaces allowed",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrorHandler(result.error).username).toBeDefined();
    }
  });

  test("accepts the maximum bcrypt password length", () => {
    const result = registerSchema.safeParse({
      email: "player@matiks.dev",
      password: "a".repeat(72),
    });

    expect(result.success).toBe(true);
  });

  test("rejects passwords longer than bcrypt can hash", () => {
    const result = registerSchema.safeParse({
      email: "player@matiks.dev",
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  test("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "player@matiks.dev",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });
});

describe("usernameSchema", () => {
  test("accepts underscores and numbers", () => {
    expect(usernameSchema.safeParse("player_42").success).toBe(true);
  });

  test("rejects too short names", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });
});

describe("zodErrorHandler", () => {
  test("keeps the first error for each field", () => {
    const result = registerSchema.safeParse({
      email: "bad",
      password: "short",
      username: "!",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = zodErrorHandler(result.error);
    expect(Object.keys(errors).sort()).toEqual(["email", "password", "username"]);
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.username).toBeTruthy();
  });
});
