import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ApiError, login, me, register } from "./api";
import { setSession } from "./auth";
import { API_URL } from "./config";

const originalFetch = globalThis.fetch;

type Call = { url: string; init?: RequestInit };

let calls: Call[] = [];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(handler: (call: Call) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
}

function installStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
        clear: () => data.clear(),
        key: () => null,
        length: 0,
      },
    },
  });
}

beforeEach(() => {
  calls = [];
  installStorage();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as { window?: unknown }).window;
});

describe("api client", () => {
  test("posts login credentials", async () => {
    stubFetch(() =>
      jsonResponse({ message: "ok", data: { token: "t", user: { id: "1" } } }),
    );

    const result = await login("ada@matiks.dev", "password1");
    expect(result.data?.token).toBe("t");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`${API_URL}/api/v1/auth/login`);
    expect(calls[0]!.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
      email: "ada@matiks.dev",
      password: "password1",
    });
  });

  test("omits an empty username when registering", async () => {
    stubFetch(() => jsonResponse({ message: "ok" }));
    await register({ email: "ada@matiks.dev", password: "password1" });
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
      email: "ada@matiks.dev",
      password: "password1",
    });
  });

  test("sends the bearer token when a session exists", async () => {
    setSession("token-1", { id: "1", email: "ada@matiks.dev", username: "ada" });
    stubFetch(() => jsonResponse({ data: { user: { id: "1" } } }));

    await me();
    const headers = calls[0]!.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(calls[0]!.url).toBe(`${API_URL}/api/v1/auth/me`);
  });

  test("throws ApiError with field errors", async () => {
    stubFetch(() =>
      jsonResponse(
        { message: "Email is already registered", errors: { email: "Taken" } },
        409,
      ),
    );

    try {
      await register({ email: "ada@matiks.dev", password: "password1" });
      throw new Error("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.message).toBe("Email is already registered");
      expect(apiError.fieldErrors.email).toBe("Taken");
    }
  });

  test("falls back to a generic message for non-json failures", async () => {
    stubFetch(() => new Response("boom", { status: 500 }));

    try {
      await login("ada@matiks.dev", "password1");
      throw new Error("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(500);
      expect((error as ApiError).message).toContain("Request failed");
    }
  });
});
