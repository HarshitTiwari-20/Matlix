"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, login, register } from "../lib/api";
import { setSession } from "../lib/auth";
import {
  firstError,
  validateCredentials,
  type AuthMode,
  type CredentialErrors,
} from "../lib/validation";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  function updateField(field: keyof CredentialErrors, value: string) {
    if (field === "email") setEmail(value);
    if (field === "username") setUsername(value);
    if (field === "password") setPassword(value);
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (formError) setFormError("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const clientErrors = validateCredentials(
      { email, password, username },
      mode,
    );
    if (firstError(clientErrors)) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const result = isRegister
        ? await register({
            email: email.trim(),
            password,
            ...(username.trim() ? { username: username.trim() } : {}),
          })
        : await login(email.trim(), password);

      if (!result.data) {
        setFormError("Unexpected response from the server.");
        return;
      }

      setSession(result.data.token, result.data.user);
      router.replace("/play");
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Could not reach the match server. Is the API running?");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="panel p-7 sm:p-9">
        <p className="eyebrow">{isRegister ? "New challenger" : "Welcome back"}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {isRegister ? "Create your account" : "Log in to compete"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isRegister
            ? "Pick a call sign, queue up, and race a real opponent through ten equations."
            : "Your next 1v1 mental math match is one click away."}
        </p>

        <form className="mt-7 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {isRegister ? (
            <Field
              label="Username"
              hint="Optional — we will generate one from your email."
              error={fieldErrors.username}
            >
              <input
                className={`field ${fieldErrors.username ? "field-error" : ""}`}
                name="username"
                type="text"
                value={username}
                onChange={(event) => updateField("username", event.target.value)}
                placeholder="ada_lovelace"
                autoComplete="username"
                maxLength={24}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
              />
            </Field>
          ) : null}

          <Field label="Email" error={fieldErrors.email}>
            <input
              className={`field ${fieldErrors.email ? "field-error" : ""}`}
              name="email"
              type="email"
              value={email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
          </Field>

          <Field
            label="Password"
            hint={isRegister ? "8–72 characters." : undefined}
            error={fieldErrors.password}
          >
            <div className="relative">
              <input
                className={`field pr-16 ${fieldErrors.password ? "field-error" : ""}`}
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {formError ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          <button className="btn btn-primary mt-1 w-full" type="submit" disabled={pending}>
            {pending
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "Already have an account?" : "New to Matiks?"}{" "}
          <Link
            className="font-semibold text-accent transition-opacity hover:opacity-80"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Log in" : "Create one"}
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        <Link className="transition-colors hover:text-foreground" href="/">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-danger" id={`${label.toLowerCase()}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
