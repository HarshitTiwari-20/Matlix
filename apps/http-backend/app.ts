import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { CORS_ORIGINS } from "./config";
import { createAuthRouter, type AuthDb } from "./routes/auth.routes";

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function originAllowed(origin: string, extraOrigins: string[]) {
  return (
    extraOrigins.includes("*") ||
    extraOrigins.includes(origin) ||
    LOCAL_ORIGIN.test(origin)
  );
}

export function createApp(db: AuthDb, options: { allowedOrigins?: string[] } = {}): Express {
  const allowedOrigins = options.allowedOrigins ?? CORS_ORIGINS;
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && originAllowed(origin, allowedOrigins)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.header("Access-Control-Max-Age", "86400");
    }

    if (req.method === "OPTIONS") {
      return origin && !originAllowed(origin, allowedOrigins)
        ? res.status(403).json({ message: "Origin not allowed" })
        : res.sendStatus(204);
    }

    return next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "matiks-http", uptime: process.uptime() });
  });

  app.use("/api/v1/auth", createAuthRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ message: "Invalid JSON body" });
      return;
    }

    console.error("[http-backend] unhandled error", error);
    res.status(500).json({ message: "Internal server error" });
  };

  app.use(errorHandler);

  return app;
}
