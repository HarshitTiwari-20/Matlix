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
export const WS_PORT = Number(process.env.WS_PORT ?? process.env.PORT ?? 8080);
export const HEARTBEAT_MS = Number(process.env.WS_HEARTBEAT_MS ?? 30_000);
