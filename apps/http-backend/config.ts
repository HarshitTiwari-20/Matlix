const isProduction = process.env.NODE_ENV === "production";

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  if (isProduction) {
    throw new Error("JWT_SECRET must be set in production");
  }

  return "development-secret";
}

export const JWT_SECRET = resolveJwtSecret();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
export const HTTP_PORT = Number(process.env.HTTP_PORT ?? process.env.PORT ?? 3001);
export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

export const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
