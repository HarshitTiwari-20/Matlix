import { WebSocketServer } from "ws";
import { prisma } from "@repo/db/client";
import { HEARTBEAT_MS, JWT_SECRET, WS_PORT } from "./config";
import { createGameServer, type LookupUser } from "./server";

const lookupUser: LookupUser = async (userId) => {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  return user ? { id: user.id, username: user.username } : null;
};

const wss = new WebSocketServer({ port: WS_PORT });
const gameServer = createGameServer({
  wss,
  lookupUser,
  jwtSecret: JWT_SECRET,
  heartbeatMs: HEARTBEAT_MS,
});

wss.on("listening", () => {
  console.log(`WebSocket server listening on ws://localhost:${WS_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  gameServer.close();
  for (const client of wss.clients) client.close(1001, "Server shutting down");
  wss.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
