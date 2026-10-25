import { describe, expect, test } from "bun:test";
import { firstError, validateCredentials } from "./validation";

describe("validateCredentials", () => {
  test("accepts a valid login", () => {
    expect(
      validateCredentials({ email: "ada@matiks.dev", password: "password1" }, "login"),
    ).toEqual({});
  });

  test("accepts a valid registration with a username", () => {
    expect(
      validateCredentials(
        { email: "ada@matiks.dev", password: "password1", username: "ada_l" },
        "register",
      ),
    ).toEqual({});
  });

  test("ignores usernames while logging in", () => {
    expect(
      validateCredentials(
        { email: "ada@matiks.dev", password: "password1", username: "!" },
        "login",
      ),
    ).toEqual({});
  });

  test("requires a valid email", () => {
    expect(validateCredentials({ email: "", password: "password1" }, "login").email).toBe(
      "Email is required",
    );
    expect(
      validateCredentials({ email: "nope", password: "password1" }, "login").email,
    ).toBe("Enter a valid email address");
  });

  test("enforces the password bounds", () => {
    expect(
      validateCredentials({ email: "ada@matiks.dev", password: "" }, "login").password,
    ).toBe("Password is required");
    expect(
      validateCredentials({ email: "ada@matiks.dev", password: "short" }, "login").password,
    ).toContain("8");
    expect(
      validateCredentials(
        { email: "ada@matiks.dev", password: "a".repeat(73) },
        "login",
      ).password,
    ).toContain("72");
  });

  test("validates an optional username", () => {
    const base = { email: "ada@matiks.dev", password: "password1" };
    expect(validateCredentials({ ...base, username: "ab" }, "register").username).toContain(
      "3",
    );
    expect(
      validateCredentials({ ...base, username: "a".repeat(25) }, "register").username,
    ).toContain("24");
    expect(
      validateCredentials({ ...base, username: "bad name" }, "register").username,
    ).toContain("letters");
  });

  test("firstError returns the first field error", () => {
    expect(firstError({})).toBeNull();
    expect(firstError({ email: "bad" })).toBe("bad");
  });
});
