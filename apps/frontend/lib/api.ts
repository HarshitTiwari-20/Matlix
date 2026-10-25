import { API_URL } from "./config";
import { getToken, type AuthUser } from "./auth";

type AuthResponse = {
  message: string;
  data?: { token: string; user: AuthUser };
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string>;
  };

  if (!response.ok) {
    throw new ApiError(
      body.message ?? "Request failed. Please try again.",
      response.status,
      body.errors ?? {},
    );
  }

  return body as T;
}

export function register(input: { email: string; password: string; username?: string }) {
  return request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return request<{ data: { user: AuthUser } }>("/api/v1/auth/me");
}
