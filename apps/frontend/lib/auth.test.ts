import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  clearSession,
  getStoredUser,
  getToken,
  isLoggedIn,
  setSession,
  type AuthUser,
} from "./auth";

const data = new Map<string, string>();

const storage: Storage = {
  get length() {
    return data.size;
  },
  clear: () => data.clear(),
  getItem: (key) => data.get(key) ?? null,
  key: (index) => Array.from(data.keys())[index] ?? null,
  removeItem: (key) => {
    data.delete(key);
  },
  setItem: (key, value) => {
    data.set(key, value);
  },
};

const user: AuthUser = { id: "u1", email: "ada@matiks.dev", username: "ada" };

function installWindow(localStorage: Storage) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
}

beforeEach(() => {
  data.clear();
  installWindow(storage);
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("session storage", () => {
  test("returns null without a browser window", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  test("stores and reads a session", () => {
    setSession("token-1", user);
    expect(getToken()).toBe("token-1");
    expect(getStoredUser()).toEqual(user);
    expect(isLoggedIn()).toBe(true);
  });

  test("clears a session", () => {
    setSession("token-1", user);
    clearSession();
    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  test("ignores corrupt stored users", () => {
    storage.setItem("matiks_user", "{not json");
    expect(getStoredUser()).toBeNull();
  });

  test("ignores stored values that are not users", () => {
    storage.setItem("matiks_user", JSON.stringify({ email: "ada@matiks.dev" }));
    expect(getStoredUser()).toBeNull();
  });

  test("survives a storage access error", () => {
    installWindow({
      ...storage,
      getItem: () => {
        throw new Error("blocked");
      },
    } as Storage);
    expect(getToken()).toBeNull();
    expect(() => setSession("token", user)).not.toThrow();
  });
});
