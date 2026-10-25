import { describe, expect, test } from "bun:test";
import {
  gameReducer,
  initialGameState,
  progressFor,
  rankedMembers,
  scoreFor,
  type GameState,
  type PublicQuestion,
} from "./game-state";

const player = { id: "me", name: "Ada" };
const opponent = { id: "opp", name: "Nova" };

const firstQuestion: PublicQuestion = {
  id: "q1",
  operation1: 6,
  operation2: 3,
  sign: "MULTIPLICATION",
};

function apply(state: GameState, type: string, payload: Record<string, unknown>) {
  return gameReducer(state, { type: "SERVER", message: { type, payload } });
}

function startedState() {
  return apply(initialGameState(player.id), "GAME_STARTED", {
    gameId: "g1",
    members: [player, opponent],
    question: firstQuestion,
    index: 0,
    score: 0,
    totalQuestions: 10,
    scores: { me: 0, opp: 0 },
    justMatched: true,
  });
}

describe("initial state", () => {
  test("starts idle and disconnected", () => {
    const state = initialGameState("me");
    expect(state.screen).toBe("idle");
    expect(state.connected).toBe(false);
    expect(state.total).toBe(10);
    expect(state.selfId).toBe("me");
  });
});

describe("connection and presence", () => {
  test("tracks connection status", () => {
    const connected = gameReducer(initialGameState("me"), { type: "CONNECTED" });
    expect(connected.connected).toBe(true);
    expect(connected.error).toBe("");

    const disconnected = gameReducer(connected, {
      type: "DISCONNECTED",
      message: "gone",
    });
    expect(disconnected.connected).toBe(false);
    expect(disconnected.error).toBe("gone");
  });

  test("uses a default reconnect message", () => {
    const state = gameReducer(initialGameState("me"), { type: "DISCONNECTED" });
    expect(state.error).toContain("Connection lost");
  });

  test("updates the online roster", () => {
    const state = apply(initialGameState("me"), "ONLINE_USERS", {
      users: [player, { id: "x", name: "X" }],
    });
    expect(state.online).toEqual([player, { id: "x", name: "X" }]);
  });

  test("ignores malformed online rosters", () => {
    const state = apply(initialGameState("me"), "ONLINE_USERS", {
      users: [{ id: "x" }, null, "bad"],
    });
    expect(state.online).toEqual([]);
  });
});

describe("match flow", () => {
  test("moves to waiting when queued", () => {
    const state = apply(gameReducer(initialGameState("me"), { type: "CONNECTED" }), "WAITING", {
      gameId: "g1",
    });
    expect(state.screen).toBe("waiting");
    expect(state.gameId).toBe("g1");
    expect(state.notice).toContain("opponent");
    expect(state.connected).toBe(true);
  });

  test("starts a match with a valid question", () => {
    const state = startedState();
    expect(state.screen).toBe("playing");
    expect(state.gameId).toBe("g1");
    expect(state.question).toEqual(firstQuestion);
    expect(state.members).toEqual([player, opponent]);
    expect(state.total).toBe(10);
    expect(state.scores).toEqual({ me: 0, opp: 0 });
  });

  test("restores progress when reconnecting mid-match", () => {
    const state = apply(initialGameState(player.id), "GAME_STARTED", {
      gameId: "g1",
      members: [player, opponent],
      question: { ...firstQuestion, id: "q4" },
      index: 3,
      score: 3,
      totalQuestions: 10,
      scores: { me: 3, opp: 1 },
    });
    expect(state.index).toBe(3);
    expect(state.scores.me).toBe(3);
    expect(progressFor(state, player.id)).toBe(3);
  });

  test("rejects a malformed question", () => {
    const state = apply(initialGameState("me"), "GAME_STARTED", {
      gameId: "g1",
      question: { id: "q1", sign: "NOPE" },
    });
    expect(state.screen).toBe("idle");
    expect(state.error).toContain("invalid question");
  });

  test("flags wrong answers and can clear the flash", () => {
    const wrong = apply(startedState(), "WRONG_ANSWER", {});
    expect(wrong.flash).toBe("bad");
    expect(wrong.index).toBe(0);

    const cleared = gameReducer(wrong, { type: "CLEAR_FLASH" });
    expect(cleared.flash).toBeNull();
  });

  test("advances on a correct answer", () => {
    const state = apply(startedState(), "NEXT_QUESTION", {
      question: { ...firstQuestion, id: "q2" },
      index: 1,
      score: 1,
      totalQuestions: 10,
    });
    expect(state.index).toBe(1);
    expect(state.question?.id).toBe("q2");
    expect(state.scores.me).toBe(1);
    expect(state.progresses.me).toBe(1);
    expect(state.flash).toBe("ok");
  });

  test("tracks opponent progress live", () => {
    const state = apply(startedState(), "PLAYER_PROGRESS", {
      userId: opponent.id,
      score: 4,
      progress: 4,
      totalQuestions: 10,
    });
    expect(state.scores.opp).toBe(4);
    expect(progressFor(state, opponent.id)).toBe(4);
  });

  test("ignores opponent progress without a user id", () => {
    const initial = startedState();
    expect(apply(initial, "PLAYER_PROGRESS", { score: 3 })).toBe(initial);
  });

  test("ends the match", () => {
    const state = apply(startedState(), "GAME_OVER", {
      scores: { me: 10, opp: 6 },
      winnerId: "me",
      members: [player, opponent],
    });
    expect(state.screen).toBe("over");
    expect(state.winnerId).toBe("me");
    expect(state.scores).toEqual({ me: 10, opp: 6 });
    expect(state.flash).toBeNull();
  });

  test("treats a missing winner as a draw", () => {
    const state = apply(startedState(), "GAME_OVER", {
      scores: { me: 8, opp: 8 },
      winnerId: null,
      members: [player, opponent],
    });
    expect(state.winnerId).toBeNull();
  });

  test("returns to the lobby after cancelling", () => {
    const state = apply(startedState(), "CANCELLED", {});
    expect(state.screen).toBe("idle");
    expect(state.gameId).toBeNull();
    expect(state.question).toBeNull();
    expect(state.notice).toContain("cancelled");
  });

  test("surfaces server errors", () => {
    const state = apply(startedState(), "ERROR", { message: "Game not found" });
    expect(state.error).toBe("Game not found");
  });

  test("ignores unknown server messages", () => {
    const initial = startedState();
    expect(apply(initial, "MYSTERY", {})).toBe(initial);
  });
});

describe("local actions", () => {
  test("STARTING clears errors and sets a notice", () => {
    const withError = gameReducer(startedState(), {
      type: "SET_ERROR",
      message: "boom",
    });
    const starting = gameReducer(withError, { type: "STARTING" });
    expect(starting.error).toBe("");
    expect(starting.notice).toContain("queue");
  });

  test("RESET preserves presence but clears the match", () => {
    const connected = apply(
      gameReducer(initialGameState("me"), { type: "CONNECTED" }),
      "ONLINE_USERS",
      { users: [player] },
    );
    const playing = apply(connected, "GAME_STARTED", {
      gameId: "g1",
      members: [player, opponent],
      question: firstQuestion,
      index: 0,
      score: 0,
      totalQuestions: 10,
      scores: {},
    });

    const reset = gameReducer(playing, { type: "RESET" });
    expect(reset.screen).toBe("idle");
    expect(reset.gameId).toBeNull();
    expect(reset.members).toEqual([]);
    expect(reset.connected).toBe(true);
    expect(reset.online).toEqual([player]);
  });
});

describe("selectors", () => {
  test("score and progress default to zero", () => {
    const state = startedState();
    expect(scoreFor(state, "unknown")).toBe(0);
    expect(scoreFor(state, undefined)).toBe(0);
    expect(progressFor(state, "unknown")).toBe(0);
  });

  test("rankedMembers sorts by score", () => {
    const state = apply(startedState(), "PLAYER_PROGRESS", {
      userId: opponent.id,
      score: 7,
      progress: 7,
    });
    expect(rankedMembers(state).map((member) => member.id)).toEqual(["opp", "me"]);
  });
});
