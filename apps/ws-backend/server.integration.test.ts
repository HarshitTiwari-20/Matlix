import { afterEach, describe, expect, test } from "bun:test";
import { sign } from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from "@repo/common/common";
import { createGameServer } from "./server";

const SECRET = "integration-secret";
const KNOWN_USERS = ["a", "b", "c"];

type Message = { type: string; payload?: Record<string, unknown> };

class TestClient {
  readonly ws: WebSocket;
  private queue: Message[] = [];
  private waiters: {
    type: string;
    resolve: (message: Message) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (raw) => {
      let message: Message;
      try {
        message = JSON.parse(raw.toString()) as Message;
      } catch {
        return;
      }
      this.deliver(message);
    });
  }

  private deliver(message: Message) {
    const waiterIndex = this.waiters.findIndex((waiter) => waiter.type === message.type);
    if (waiterIndex === -1) {
      this.queue.push(message);
      return;
    }
    const [waiter] = this.waiters.splice(waiterIndex, 1);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    waiter.resolve(message);
  }

  next(type: string, timeout = 2_000): Promise<Message> {
    const queuedIndex = this.queue.findIndex((message) => message.type === type);
    if (queuedIndex !== -1) {
      const [message] = this.queue.splice(queuedIndex, 1);
      return Promise.resolve(message!);
    }

    return new Promise<Message>((resolve, reject) => {
      const waiter = {
        type,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((entry) => entry !== waiter);
          reject(new Error(`Timed out waiting for ${type}`));
        }, timeout),
      };
      this.waiters.push(waiter);
    });
  }

  send(message: unknown) {
    this.ws.send(JSON.stringify(message));
  }

  close() {
    this.ws.close();
  }
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    try {
      cleanup();
    } catch {
      // ignore double-close errors
    }
  }
});

async function setup() {
  const wss = new WebSocketServer({ port: 0 });
  await new Promise<void>((resolve) => wss.once("listening", () => resolve()));

  const gameServer = createGameServer({
    wss,
    jwtSecret: SECRET,
    heartbeatMs: 0,
    lookupUser: async (id) =>
      KNOWN_USERS.includes(id) ? { id, username: `player_${id}` } : null,
  });

  const port = (wss.address() as AddressInfo).port;

  cleanups.push(() => {
    gameServer.close();
    for (const client of wss.clients) client.terminate();
    wss.close();
  });

  return { wss, gameServer, port };
}

function tokenFor(id: string) {
  return sign({ userId: id }, SECRET, {
    audience: TOKEN_AUDIENCE,
    issuer: TOKEN_ISSUER,
    expiresIn: "5m",
  });
}

function open(port: number, token: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}?token=${encodeURIComponent(token)}`);
  const client = new TestClient(ws);
  cleanups.push(() => ws.terminate());

  return new Promise<TestClient>((resolve, reject) => {
    ws.once("open", () => resolve(client));
    ws.once("error", reject);
  });
}

function waitClose(ws: WebSocket) {
  return new Promise<number>((resolve) => {
    ws.once("close", (code) => resolve(code));
  });
}

describe("websocket server", () => {
  test("plays a full match and broadcasts progress to the opponent", async () => {
    const { gameServer, port } = await setup();

    const a = await open(port, tokenFor("a"));
    await a.next("ONLINE_USERS");

    const b = await open(port, tokenFor("b"));
    const bOnline = await b.next("ONLINE_USERS");
    expect((bOnline.payload?.users as { id: string }[]).map((user) => user.id).sort()).toEqual([
      "a",
      "b",
    ]);

    a.send({ type: "START_GAME" });
    const waiting = await a.next("WAITING");
    expect(waiting.payload?.gameId).toBeTruthy();

    const aStarted = a.next("GAME_STARTED");
    const bStarted = b.next("GAME_STARTED");
    b.send({ type: "START_GAME" });
    const [startedA, startedB] = await Promise.all([aStarted, bStarted]);

    const gameId = String(startedA.payload?.gameId);
    expect(startedB.payload?.gameId).toBe(gameId);
    expect((startedA.payload?.members as { id: string }[]).map((member) => member.id)).toEqual([
      "a",
      "b",
    ]);
    expect(startedA.payload?.justMatched).toBe(true);
    expect(startedB.payload?.question).not.toHaveProperty("answer");

    const game = gameServer.engine.games.get(gameId)!;
    const gameOverA = a.next("GAME_OVER");
    const gameOverB = b.next("GAME_OVER");

    for (let index = 0; index < game.questions.length; index += 1) {
      const question = game.questions[index]!;
      a.send({
        type: "SUBMIT_ANSWER",
        payload: { gameId, questionId: question.id, answer: question.answer },
      });

      if (index < game.questions.length - 1) {
        const next = await a.next("NEXT_QUESTION");
        expect(next.payload?.index).toBe(index + 1);
        expect(next.payload?.score).toBe(index + 1);
      }
    }

    const [wonA, wonB] = await Promise.all([gameOverA, gameOverB]);
    expect(wonA.payload?.winnerId).toBe("a");
    expect(wonB.payload?.winnerId).toBe("a");
    expect((wonA.payload?.scores as Record<string, number>).a).toBe(game.questions.length);

    const progress = await b.next("PLAYER_PROGRESS");
    expect(progress.payload?.userId).toBe("a");
    expect(progress.payload?.progress).toBe(1);

    expect(gameServer.engine.games.has(gameId)).toBe(false);
    expect(gameServer.engine.playerGame.size).toBe(0);
  });

  test("a wrong answer does not advance the player", async () => {
    const { gameServer, port } = await setup();
    const a = await open(port, tokenFor("a"));
    const b = await open(port, tokenFor("b"));
    await a.next("ONLINE_USERS");
    await b.next("ONLINE_USERS");

    a.send({ type: "START_GAME" });
    await a.next("WAITING");
    const aStarted = a.next("GAME_STARTED");
    b.send({ type: "START_GAME" });
    const started = await aStarted;
    const gameId = String(started.payload?.gameId);
    const game = gameServer.engine.games.get(gameId)!;
    const question = game.questions[0]!;

    a.send({
      type: "SUBMIT_ANSWER",
      payload: { gameId, questionId: question.id, answer: question.answer + 1 },
    });

    const wrong = await a.next("WRONG_ANSWER");
    expect(wrong.payload?.questionId).toBe(question.id);
    expect(game.progress.a).toBe(0);
  });

  test("reconnecting replaces the old socket and resumes the game", async () => {
    const { gameServer, port } = await setup();
    const a = await open(port, tokenFor("a"));
    const b = await open(port, tokenFor("b"));
    await a.next("ONLINE_USERS");
    await b.next("ONLINE_USERS");

    a.send({ type: "START_GAME" });
    await a.next("WAITING");
    const aStarted = a.next("GAME_STARTED");
    b.send({ type: "START_GAME" });
    const started = await aStarted;
    const gameId = String(started.payload?.gameId);
    const game = gameServer.engine.games.get(gameId)!;

    const first = game.questions[0]!;
    a.send({
      type: "SUBMIT_ANSWER",
      payload: { gameId, questionId: first.id, answer: first.answer },
    });
    await a.next("NEXT_QUESTION");

    const oldClosed = waitClose(a.ws);
    const a2 = await open(port, tokenFor("a"));
    expect(await oldClosed).toBe(1000);

    a2.send({ type: "START_GAME" });
    const resumed = await a2.next("GAME_STARTED");
    expect(resumed.payload?.justMatched).toBe(false);
    expect(resumed.payload?.index).toBe(1);
    expect(resumed.payload?.score).toBe(1);
    expect(gameServer.engine.games.has(gameId)).toBe(true);
  });

  test("disconnecting from a running game ends it and notifies the opponent", async () => {
    const { gameServer, port } = await setup();
    const a = await open(port, tokenFor("a"));
    const b = await open(port, tokenFor("b"));
    await a.next("ONLINE_USERS");
    await b.next("ONLINE_USERS");

    a.send({ type: "START_GAME" });
    await a.next("WAITING");
    const aStarted = a.next("GAME_STARTED");
    b.send({ type: "START_GAME" });
    const started = await aStarted;
    const gameId = String(started.payload?.gameId);

    const gameOver = b.next("GAME_OVER");
    a.close();
    const event = await gameOver;
    expect(event.payload?.winnerId).toBe("b");
    expect(gameServer.engine.games.has(gameId)).toBe(false);
    expect(gameServer.engine.playerGame.size).toBe(0);
  });

  test("cancelling a search removes the queue entry", async () => {
    const { gameServer, port } = await setup();
    const a = await open(port, tokenFor("a"));
    await a.next("ONLINE_USERS");

    a.send({ type: "START_GAME" });
    const waiting = await a.next("WAITING");
    a.send({ type: "CANCEL_GAME" });
    const cancelled = await a.next("CANCELLED");
    expect(cancelled.payload?.gameId).toBe(waiting.payload?.gameId);
    expect(gameServer.engine.games.size).toBe(0);
  });

  test("rejects unknown message types", async () => {
    const { port } = await setup();
    const a = await open(port, tokenFor("a"));
    await a.next("ONLINE_USERS");

    a.send({ type: "DANCE" });
    const error = await a.next("ERROR");
    expect(error.payload?.message).toBe("Unknown message type");
  });

  test("closes connections without a valid token or user", async () => {
    const { port } = await setup();

    const withoutToken = new WebSocket(`ws://127.0.0.1:${port}`);
    const noTokenClosed = waitClose(withoutToken);
    expect(await noTokenClosed).toBe(1008);

    const badToken = new WebSocket(`ws://127.0.0.1:${port}?token=bad`);
    const badTokenClosed = waitClose(badToken);
    expect(await badTokenClosed).toBe(1008);

    const unknownUser = new WebSocket(`ws://127.0.0.1:${port}?token=${tokenFor("ghost")}`);
    const unknownUserClosed = waitClose(unknownUser);
    expect(await unknownUserClosed).toBe(1008);
  });

  test("rejects an expired token", async () => {
    const { port } = await setup();
    const expired = sign({ userId: "a" }, SECRET, {
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
      expiresIn: -1,
    });

    const ws = new WebSocket(`ws://127.0.0.1:${port}?token=${expired}`);
    const closed = waitClose(ws);
    expect(await closed).toBe(1008);
  });
});
