import { verify, type JwtPayload } from "jsonwebtoken";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from "@repo/common/common";
import { GameEngine, type GameEvent } from "./game-engine";

export type LookupUser = (
  userId: string,
) => Promise<{ id: string; username: string } | null>;

type Socket = WebSocket & { userId?: string; isAlive?: boolean };

type OnlineUser = {
  id: string;
  name: string;
  ws: Socket;
};

export type GameServerOptions = {
  wss: WebSocketServer;
  lookupUser: LookupUser;
  jwtSecret: string;
  heartbeatMs?: number;
};

export type GameServer = {
  engine: GameEngine;
  onlineUsers: Map<string, OnlineUser>;
  close: () => void;
};

function send(ws: WebSocket, event: GameEvent | { type: string; payload: unknown }) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function readUserId(payload: string | JwtPayload): string | null {
  if (typeof payload === "string") return null;
  const userId = typeof payload.userId === "string" ? payload.userId : payload.sub;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function authenticate(token: string | null, secret: string) {
  if (!token) return null;
  try {
    return readUserId(
      verify(token, secret, {
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER,
      }) as JwtPayload,
    );
  } catch {
    return null;
  }
}

function parseMessage(data: RawData): { type: string; payload?: Record<string, unknown> } | null {
  try {
    const parsed: unknown = JSON.parse(data.toString());
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as { type?: unknown; payload?: unknown };
    if (typeof record.type !== "string") return null;
    return {
      type: record.type,
      payload:
        typeof record.payload === "object" && record.payload !== null
          ? (record.payload as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return null;
  }
}

export function createGameServer({
  wss,
  lookupUser,
  jwtSecret,
  heartbeatMs = 30_000,
}: GameServerOptions): GameServer {
  const engine = new GameEngine();
  const onlineUsers = new Map<string, OnlineUser>();

  function broadcastOnlineUsers() {
    const payload = {
      type: "ONLINE_USERS",
      payload: {
        users: Array.from(onlineUsers.values()).map((onlineUser) => ({
          id: onlineUser.id,
          name: onlineUser.name,
        })),
      },
    };

    for (const client of wss.clients) send(client, payload);
  }

  function notifyGameMembers(gameId: string, event: GameEvent, exceptUserId?: string) {
    const game = engine.games.get(gameId);
    if (!game) return;

    for (const member of game.members) {
      if (member.id === exceptUserId) continue;
      const socket = onlineUsers.get(member.id)?.ws;
      if (socket) send(socket, event);
    }
  }

  function handleMessage(ws: Socket, user: OnlineUser, data: RawData) {
    const message = parseMessage(data);
    if (!message) {
      send(ws, { type: "ERROR", payload: { message: "Malformed message" } });
      return;
    }

    if (message.type === "START_GAME") {
      const result = engine.startGame({ id: user.id, name: user.name });
      send(ws, result);
      if (result.type === "GAME_STARTED" && result.payload.justMatched) {
        notifyGameMembers(result.payload.gameId, result, user.id);
      }
      return;
    }

    if (message.type === "SUBMIT_ANSWER") {
      const gameId = String(message.payload?.gameId ?? "");
      const questionId = String(message.payload?.questionId ?? "");
      const answer = Number(message.payload?.answer);
      if (!gameId || !questionId || !Number.isFinite(answer)) {
        send(ws, { type: "ERROR", payload: { message: "Invalid answer payload" } });
        return;
      }

      const result = engine.submitAnswer(user.id, gameId, questionId, answer);
      send(ws, result);

      if (result.type === "ERROR") return;

      const game = engine.games.get(gameId);
      if (game) {
        notifyGameMembers(
          gameId,
          {
            type: "PLAYER_PROGRESS",
            payload: {
              gameId,
              userId: user.id,
              name: user.name,
              score: game.scores[user.id] ?? 0,
              progress: game.progress[user.id] ?? 0,
              totalQuestions: game.questions.length,
            },
          },
          user.id,
        );
      }

      if (result.type === "GAME_OVER") {
        notifyGameMembers(gameId, result, user.id);
        engine.disposeGame(gameId);
      }
      return;
    }

    if (message.type === "CANCEL_GAME") {
      send(ws, engine.cancel(user.id));
      return;
    }

    send(ws, { type: "ERROR", payload: { message: "Unknown message type" } });
  }

  wss.on("connection", async (socket, req) => {
    const ws = socket as Socket;
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const token = new URL(req.url ?? "", "http://localhost").searchParams.get("token");
    const userId = authenticate(token, jwtSecret);
    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    let onlineUser: OnlineUser | null = null;
    const pending: RawData[] = [];

    ws.on("message", (data) => {
      if (!onlineUser) {
        pending.push(data);
        return;
      }
      handleMessage(ws, onlineUser, data);
    });

    ws.on("close", () => {
      const current = onlineUsers.get(userId);
      if (current?.ws !== ws) return;

      onlineUsers.delete(userId);
      const leaveEvent = engine.leave(userId);
      if (leaveEvent) {
        notifyGameMembers(leaveEvent.payload.gameId, leaveEvent);
        engine.disposeGame(leaveEvent.payload.gameId);
      }
      broadcastOnlineUsers();
    });

    let user: Awaited<ReturnType<LookupUser>> = null;
    try {
      user = await lookupUser(userId);
    } catch (error) {
      console.error("[ws-backend] user lookup failed", error);
      ws.close(1011, "Lookup failed");
      return;
    }

    if (!user || ws.readyState !== WebSocket.OPEN) {
      if (ws.readyState === WebSocket.OPEN) ws.close(1008, "Unauthorized");
      return;
    }

    ws.userId = user.id;

    const previous = onlineUsers.get(user.id);

    onlineUser = { id: user.id, name: user.username, ws };
    onlineUsers.set(user.id, onlineUser);
    broadcastOnlineUsers();

    if (previous && previous.ws !== ws) {
      previous.ws.close(1000, "Replaced by new connection");
    }

    for (const data of pending.splice(0)) {
      handleMessage(ws, onlineUser, data);
    }
  });

  const heartbeat =
    heartbeatMs > 0
      ? setInterval(() => {
          for (const client of wss.clients) {
            const ws = client as Socket;
            if (ws.isAlive === false) {
              ws.terminate();
              continue;
            }
            ws.isAlive = false;
            ws.ping();
          }
        }, heartbeatMs)
      : null;

  return {
    engine,
    onlineUsers,
    close: () => {
      if (heartbeat) clearInterval(heartbeat);
    },
  };
}
