import { describe, expect, test } from "bun:test";
import { GameEngine, type GameEvent } from "./game-engine";

function matchedGame() {
  const engine = new GameEngine();
  const waiting = engine.startGame({ id: "a", name: "Ada" });
  const started = engine.startGame({ id: "b", name: "Bob" });
  if (started.type !== "GAME_STARTED") throw new Error("expected match");
  const game = engine.games.get(started.payload.gameId)!;
  return { engine, waiting, started, game };
}

describe("matchmaking", () => {
  test("first player waits and second player starts the match", () => {
    const engine = new GameEngine();
    const waiting = engine.startGame({ id: "a", name: "Ada" });
    expect(waiting.type).toBe("WAITING");
    expect(engine.playerGame.get("a")).toBeTruthy();

    const started = engine.startGame({ id: "b", name: "Bob" });
    expect(started.type).toBe("GAME_STARTED");
    if (started.type !== "GAME_STARTED") return;
    expect(started.payload.members.map((member) => member.id)).toEqual(["a", "b"]);
    expect(started.payload.justMatched).toBe(true);
    expect(started.payload.index).toBe(0);
    expect(started.payload.score).toBe(0);
    expect("answer" in started.payload.question).toBe(false);
  });

  test("a second START_GAME while waiting keeps the same game", () => {
    const engine = new GameEngine();
    const first = engine.startGame({ id: "a", name: "Ada" });
    const second = engine.startGame({ id: "a", name: "Ada" });
    expect(first.type).toBe("WAITING");
    expect(second).toEqual(first);
  });

  test("reconnecting resumes the current question without re-matching", () => {
    const { engine, started, game } = matchedGame();
    if (started.type !== "GAME_STARTED") return;

    const question = game.questions[0]!;
    engine.submitAnswer("a", game.id, question.id, question.answer);

    const reconnected = engine.startGame({ id: "a", name: "Ada" });
    expect(reconnected.type).toBe("GAME_STARTED");
    if (reconnected.type !== "GAME_STARTED") return;
    expect(reconnected.payload.justMatched).toBe(false);
    expect(reconnected.payload.index).toBe(1);
    expect(reconnected.payload.score).toBe(1);
    expect(reconnected.payload.question.id).toBe(game.questions[1]!.id);
  });

  test("a third player queues only after the running match ends", () => {
    const { engine, game } = matchedGame();
    const third = engine.startGame({ id: "c", name: "Cleo" });
    expect(third.type).toBe("WAITING");
    expect(engine.games.get((third as { payload: { gameId: string } }).payload.gameId)?.status).toBe(
      "SEARCHING_FOR_PLAYER",
    );
    expect(game.members).toHaveLength(2);
  });
});

describe("answering", () => {
  test("wrong answers keep the same question and correct answers advance", () => {
    const { engine, game } = matchedGame();
    const first = game.questions[0]!;

    const wrong = engine.submitAnswer("a", game.id, first.id, first.answer + 1);
    expect(wrong.type).toBe("WRONG_ANSWER");
    expect(game.progress.a).toBe(0);
    expect(game.scores.a).toBe(0);
    expect(game.answers).toHaveLength(1);
    expect(game.answers[0]!.correct).toBe(false);

    const next = engine.submitAnswer("a", game.id, first.id, first.answer);
    expect(next.type).toBe("NEXT_QUESTION");
    expect(game.progress.a).toBe(1);
    expect(game.scores.a).toBe(1);
    expect(game.answers).toHaveLength(2);
  });

  test("rejects non-integer answers", () => {
    const { engine, game } = matchedGame();
    const question = game.questions[0]!;
    const result = engine.submitAnswer("a", game.id, question.id, 1.5);
    expect(result.type).toBe("ERROR");
    if (result.type === "ERROR") {
      expect(result.payload.message).toBe("Invalid answer");
    }
  });

  test("rejects answers for an unknown game or player", () => {
    const { engine, game } = matchedGame();
    const question = game.questions[0]!;

    expect(engine.submitAnswer("a", "missing", question.id, 1).type).toBe("ERROR");
    expect(engine.submitAnswer("stranger", game.id, question.id, 1).type).toBe("ERROR");
  });

  test("rejects an answer for a question the player is not on", () => {
    const { engine, game } = matchedGame();
    const future = game.questions[2]!;
    const result = engine.submitAnswer("a", game.id, future.id, future.answer);
    expect(result.type).toBe("ERROR");
    if (result.type === "ERROR") {
      expect(result.payload.message).toBe("Question mismatch");
    }
  });

  test("finishing the question set ends the game with a winner", () => {
    const { engine, game } = matchedGame();
    let lastEvent: GameEvent = {
      type: "WAITING",
      payload: { gameId: game.id },
    };

    for (const question of game.questions) {
      lastEvent = engine.submitAnswer("a", game.id, question.id, question.answer);
    }

    expect(lastEvent.type).toBe("GAME_OVER");
    if (lastEvent.type !== "GAME_OVER") return;
    expect(lastEvent.payload.winnerId).toBe("a");
    expect(lastEvent.payload.scores.a).toBe(game.questions.length);
    expect(game.status).toBe("ENDED");
    expect(engine.playerGame.get("a")).toBeUndefined();
    expect(engine.playerGame.get("b")).toBeUndefined();
  });
});

describe("leaving and cancelling", () => {
  test("leaving while waiting removes the queue entry", () => {
    const engine = new GameEngine();
    engine.startGame({ id: "a", name: "Ada" });

    expect(engine.leave("a")).toBeNull();
    expect(engine.games.size).toBe(0);
    expect(engine.playerGame.size).toBe(0);
  });

  test("leaving a running match ends it and awards the opponent", () => {
    const { engine, game } = matchedGame();
    const event = engine.leave("a");

    expect(event?.type).toBe("GAME_OVER");
    if (!event) return;
    expect(event.payload.winnerId).toBe("b");
    expect(game.status).toBe("ENDED");
    expect(engine.playerGame.size).toBe(0);
  });

  test("leaving without a game is a no-op", () => {
    const engine = new GameEngine();
    expect(engine.leave("nobody")).toBeNull();
  });

  test("cancel removes a waiting game but not a running one", () => {
    const engine = new GameEngine();
    engine.startGame({ id: "a", name: "Ada" });

    const cancelled = engine.cancel("a");
    expect(cancelled.type).toBe("CANCELLED");
    expect(engine.games.size).toBe(0);

    const { engine: runningEngine, game } = matchedGame();
    const blocked = runningEngine.cancel("a");
    expect(blocked.type).toBe("ERROR");
    expect(runningEngine.games.has(game.id)).toBe(true);
    expect(runningEngine.playerGame.get("a")).toBe(game.id);
  });

  test("cancel without a game reports an error", () => {
    const engine = new GameEngine();
    expect(engine.cancel("nobody").type).toBe("ERROR");
  });

  test("disposeGame clears all player mappings", () => {
    const { engine, game } = matchedGame();
    engine.disposeGame(game.id);
    expect(engine.games.size).toBe(0);
    expect(engine.playerGame.size).toBe(0);
  });
});
