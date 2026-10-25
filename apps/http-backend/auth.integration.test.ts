import { afterAll, describe, expect, test } from "bun:test";
import { sign } from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from "@repo/common/common";
import { createApp } from "./app";
import type { AuthDb, UserRecord } from "./routes/auth.routes";
import { JWT_SECRET } from "./config";
import { signAuthToken } from "./tokens";

function memoryDb(): AuthDb {
  const users: UserRecord[] = [];
  return {
    users: {
      findUnique: async ({ where }) =>
        users.find(
          (user) =>
            (where.email !== undefined && user.email === where.email) ||
            (where.id !== undefined && user.id === where.id) ||
            (where.username !== undefined && user.username === where.username),
        ) ?? null,
      create: async ({ data }) => {
        const { rating, ...rest } = data;
        const id = crypto.randomUUID();
        const user: UserRecord = {
          id,
          ...rest,
          createdAt: new Date(),
          updatedAt: new Date(),
          rating: rating ? { id: crypto.randomUUID(), userId: id, rating: 1000 } : null,
          gameMember: [],
        };
        users.push(user);
        return user;
      },
    },
  };
}

async function listen(app: ReturnType<typeof createApp>) {
  const server = app.listen(0);
  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }
  return { server, url: `http://127.0.0.1:${address.port}` };
}

const handles: { close: () => void }[] = [];
afterAll(() => {
  for (const handle of handles) handle.close();
});

async function start(db = memoryDb()) {
  const handle = await listen(createApp(db));
  handles.push(handle.server);
  return handle;
}

async function post(url: string, path: string, body: unknown) {
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("health and CORS", () => {
  test("health check responds", async () => {
    const { url } = await start();
    const response = await fetch(`${url}/health`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("allows local development origins", async () => {
    const { url } = await start();
    const response = await fetch(`${url}/health`, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });

  test("rejects unknown preflight origins", async () => {
    const { url } = await start();
    const response = await fetch(`${url}/api/v1/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    expect(response.status).toBe(403);
  });

  test("handles preflight requests", async () => {
    const { url } = await start();
    const response = await fetch(`${url}/api/v1/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:3000" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });
});

describe("auth flow", () => {
  test("register, login, and me flow", async () => {
    const { url } = await start();

    const registerResponse = await post(url, "/api/v1/auth/register", {
      email: "ada@matiks.dev",
      password: "password1",
      username: "ada_l",
    });
    expect(registerResponse.status).toBe(201);

    const registered = (await registerResponse.json()) as {
      data: { token: string; user: Record<string, unknown> };
    };
    expect(registered.data.user.email).toBe("ada@matiks.dev");
    expect(registered.data.user.username).toBe("ada_l");
    expect(registered.data.user.password).toBeUndefined();
    expect(registered.data.token).toBeTruthy();

    const duplicate = await post(url, "/api/v1/auth/register", {
      email: "ada@matiks.dev",
      password: "password1",
    });
    expect(duplicate.status).toBe(409);

    const loginResponse = await post(url, "/api/v1/auth/login", {
      email: "ADA@MATIKS.DEV",
      password: "password1",
    });
    expect(loginResponse.status).toBe(200);
    const loggedIn = (await loginResponse.json()) as { data: { token: string } };

    const meResponse = await fetch(`${url}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loggedIn.data.token}` },
    });
    expect(meResponse.status).toBe(200);
    const me = (await meResponse.json()) as {
      data: { user: { password?: string; rating?: { rating: number } } };
    };
    expect(me.data.user.password).toBeUndefined();
    expect(me.data.user.rating?.rating).toBe(1000);
  });

  test("allocates a unique username when the local part already exists", async () => {
    const { url } = await start();

    const first = await post(url, "/api/v1/auth/register", {
      email: "player@one.dev",
      password: "password1",
    });
    const second = await post(url, "/api/v1/auth/register", {
      email: "player@two.dev",
      password: "password1",
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstBody = (await first.json()) as { data: { user: { username: string } } };
    const secondBody = (await second.json()) as { data: { user: { username: string } } };
    expect(firstBody.data.user.username).toBe("player");
    expect(secondBody.data.user.username).toBe("player_2");
  });

  test("normalizes usernames and rejects invalid ones", async () => {
    const { url } = await start();

    const valid = await post(url, "/api/v1/auth/register", {
      email: "grace@matiks.dev",
      password: "password1",
      username: "Grace_H",
    });
    expect(valid.status).toBe(201);
    const body = (await valid.json()) as { data: { user: { username: string } } };
    expect(body.data.user.username).toBe("grace_h");

    const invalid = await post(url, "/api/v1/auth/register", {
      email: "bad@matiks.dev",
      password: "password1",
      username: "no spaces",
    });
    expect(invalid.status).toBe(400);
  });

  test("rejects short passwords and malformed bodies", async () => {
    const { url } = await start();

    const shortPassword = await post(url, "/api/v1/auth/register", {
      email: "short@matiks.dev",
      password: "short",
    });
    expect(shortPassword.status).toBe(400);
    const body = (await shortPassword.json()) as { errors: Record<string, string> };
    expect(body.errors.password).toContain("8");

    const malformed = await fetch(`${url}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);
  });

  test("returns a generic error for bad credentials", async () => {
    const { url } = await start();
    await post(url, "/api/v1/auth/register", {
      email: "ada@matiks.dev",
      password: "password1",
    });

    const wrongPassword = await post(url, "/api/v1/auth/login", {
      email: "ada@matiks.dev",
      password: "password2",
    });
    expect(wrongPassword.status).toBe(401);
    expect(((await wrongPassword.json()) as { message: string }).message).toBe(
      "Invalid email or password",
    );

    const unknownUser = await post(url, "/api/v1/auth/login", {
      email: "nobody@matiks.dev",
      password: "password1",
    });
    expect(unknownUser.status).toBe(401);
  });
});

describe("auth middleware", () => {
  test("rejects a missing or invalid token", async () => {
    const { url } = await start();

    expect((await fetch(`${url}/api/v1/auth/me`)).status).toBe(401);
    expect(
      (
        await fetch(`${url}/api/v1/auth/me`, {
          headers: { Authorization: "Bearer not-a-token" },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${url}/api/v1/auth/me`, {
          headers: { Authorization: "Token abc" },
        })
      ).status,
    ).toBe(401);
  });

  test("rejects tokens with the wrong audience or expiry", async () => {
    const { url } = await start();

    const wrongAudience = sign({ userId: "someone" }, JWT_SECRET, {
      audience: "someone-else",
      issuer: TOKEN_ISSUER,
    });
    expect(
      (
        await fetch(`${url}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${wrongAudience}` },
        })
      ).status,
    ).toBe(401);

    const expired = sign({ userId: "someone" }, JWT_SECRET, {
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
      expiresIn: -1,
    });
    expect(
      (
        await fetch(`${url}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${expired}` },
        })
      ).status,
    ).toBe(401);
  });

  test("returns 404 when a valid token points at a deleted user", async () => {
    const { url } = await start();
    const response = await fetch(`${url}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${signAuthToken("missing")}` },
    });
    expect(response.status).toBe(404);
  });
});
