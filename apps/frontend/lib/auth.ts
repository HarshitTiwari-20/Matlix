const TOKEN_KEY = "matiks_token";
const USER_KEY = "matiks_user";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  createdAt?: string;
  rating?: { rating: number } | null;
};

export type SessionSnapshot = {
  token: string | null;
  user: AuthUser | null;
};

const EMPTY_SESSION: SessionSnapshot = { token: null, user: null };

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function parseUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as AuthUser).id !== "string"
    ) {
      return null;
    }
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

let snapshot: SessionSnapshot = EMPTY_SESSION;
let cachedToken: string | null = null;
let cachedUserRaw: string | null = null;

function refreshSnapshot() {
  const token = read(TOKEN_KEY);
  const userRaw = read(USER_KEY);
  if (token === cachedToken && userRaw === cachedUserRaw) return;

  cachedToken = token;
  cachedUserRaw = userRaw;
  snapshot = { token, user: parseUser(userRaw) };
}

export function getSessionSnapshot(): SessionSnapshot {
  refreshSnapshot();
  return snapshot;
}

export function getServerSessionSnapshot(): SessionSnapshot {
  return EMPTY_SESSION;
}

const listeners = new Set<() => void>();

export function subscribeSession(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  function onStorage(event: StorageEvent) {
    if (event.key && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
    refreshSnapshot();
    listener();
  }

  window.addEventListener("storage", onStorage);
  listeners.add(listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(listener);
  };
}

function emitSessionChange() {
  refreshSnapshot();
  for (const listener of listeners) listener();
}

export function getToken(): string | null {
  return getSessionSnapshot().token;
}

export function getStoredUser(): AuthUser | null {
  return getSessionSnapshot().user;
}

export function setSession(token: string, user: AuthUser) {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Storage can be unavailable (private mode, quota). The session just won't persist.
    }
  }
  emitSessionChange();
}

export function clearSession() {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    } catch {
      // Nothing else to do if storage is blocked.
    }
  }
  emitSessionChange();
}

export function isLoggedIn() {
  return Boolean(getToken() && getStoredUser());
}
