import { prisma } from "@repo/db/client";
import { createApp } from "./app";
import { HTTP_PORT } from "./config";
import type { AuthDb } from "./routes/auth.routes";

const app = createApp(prisma as unknown as AuthDb);

const server = app.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
