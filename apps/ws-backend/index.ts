import { JWT_SECRET } from './../http-backend/config';
import { verify, type JwtPayload } from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
import { prisma, type Question } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });
//const JWT_SECRET = process.env.JWT_SECRET ;
const onlineUsers: Map<string, User> = new Map();
const games: Map<string, Game> = new Map();


type ExtendedWs = WebSocket & { userId: string };

function broadcastOnlineUsers() {
  const payload = {
    type: "OnlineUsers",
    payload: {
      users: Array.from(onlineUsers.values()).map((onlineUser) => ({
        name: onlineUser.name,
        id: onlineUser.id,
      })),
    },
  };

  wss.clients.forEach((client) => {
    client.send(JSON.stringify(payload));
  });
}

wss.on("connection", async (socket, req) => {
  const ws = socket as ExtendedWs;
  const token = req.url?.split("?token=")[1];
  if (!token) {
    ws.close(1008, "Unauthorized");
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    ws.close(1008, "Unauthorized");
    return;
  }

  const userId =
    typeof decoded.userId === "string" ? decoded.userId : String(decoded.userId ?? "");
  if (!userId) {
    ws.close(1008, "Unauthorized");
    return;
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    ws.close(1008, "Unauthorized");
    return;
  }

  ws.userId = user.id;

  onlineUsers.set(user.id, {
    name: user.username,
    ws,
    id: user.id,
  });

  broadcastOnlineUsers();

  ws.on("message", (event) => {
    let parsedData: { type?: string; payload?: unknown };
    try {
      parsedData = JSON.parse(event.toString());
    } catch {
      return;
    }

    if (parsedData.type === "START_GAME") {
      let existingGame: Game | null = null;   
      // runningGame = existinggame

      for (const game of games.values()) {
        if (
          game.status === "SEARCHING_FOR_PLAYER" &&
          !game.members.some((member) => member.id === user.id)
        ) {
          existingGame = game;
          break;
        }
      }

      if (existingGame) {
        existingGame.members.push({
          id: user.id,
          name: user.username,
          ws
        });
        existingGame.status = "RUNNING";
      } else {
        const gameId = crypto.randomUUID();
        games.set(gameId, {
          id: gameId,
          members: [
            {
              id: user.id,
              name: user.username,
              ws
            },
          ],
          adminId: user.id,
          status: "SEARCHING_FOR_PLAYER",
          questions: [],
          answers: [],
        });

        wss.clients.forEach((wsAll) => {
          if (wsAll === ws) return;
          wsAll.send(
            JSON.stringify({
              type: "GAME_REQUEST",
              payload: {
                username: user.username,
              },
            }),
          );
        });
      }
    }
  });

  ws.on("close", () => {
    onlineUsers.delete(user.id);
    broadcastOnlineUsers();
  });
});
