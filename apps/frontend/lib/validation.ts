export type AuthMode = "login" | "register";

export type CredentialInput = {
  email: string;
  password: string;
  username?: string;
};

export type CredentialErrors = Partial<Record<"email" | "password" | "username", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateCredentials(
  input: CredentialInput,
  mode: AuthMode,
): CredentialErrors {
  const errors: CredentialErrors = {};
  const email = input.email.trim();
  const password = input.password;
  const username = input.username?.trim() ?? "";

  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
  } else if (password.length > 72) {
    errors.password = "Password must be at most 72 characters long";
  }

  if (mode === "register" && username) {
    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters long";
    } else if (username.length > 24) {
      errors.username = "Username must be at most 24 characters long";
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username = "Use letters, numbers, and underscores only";
    }
  }

  return errors;
}

export function firstError(errors: CredentialErrors) {
  return Object.values(errors)[0] ?? null;
}
