export type QuestionSign = "PLUS" | "MINUS" | "MULTIPLICATION" | "DIVIDE";

export type PublicQuestion = {
  id: string;
  operation1: number;
  operation2: number;
  sign: QuestionSign;
};

export type Member = { id: string; name: string };

export type GameScreen = "idle" | "waiting" | "playing" | "over";

export type GameState = {
  selfId: string;
  screen: GameScreen;
  connected: boolean;
  online: Member[];
  gameId: string | null;
  question: PublicQuestion | null;
  index: number;
  total: number;
  scores: Record<string, number>;
  progresses: Record<string, number>;
  members: Member[];
  winnerId: string | null;
  flash: "ok" | "bad" | null;
  notice: string;
  error: string;
};

export type ServerMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

export type GameAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED"; message?: string }
  | { type: "STARTING" }
  | { type: "RESET" }
  | { type: "CLEAR_FLASH" }
  | { type: "SET_ERROR"; message: string }
  | { type: "SERVER"; message: ServerMessage };

export function initialGameState(selfId = ""): GameState {
  return {
    selfId,
    screen: "idle",
    connected: false,
    online: [],
    gameId: null,
    question: null,
    index: 0,
    total: 10,
    scores: {},
    progresses: {},
    members: [],
    winnerId: null,
    flash: null,
    notice: "",
    error: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function numberField(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : fallback;
}

function asMembers(value: unknown): Member[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = stringField(entry, "id");
    const name = stringField(entry, "name");
    return id && name ? [{ id, name }] : [];
  });
}

function asScores(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const score = Number(raw);
    if (Number.isFinite(score)) scores[key] = score;
  }
  return scores;
}

const SIGNS: QuestionSign[] = ["PLUS", "MINUS", "MULTIPLICATION", "DIVIDE"];

function asQuestion(value: unknown): PublicQuestion | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const sign = stringField(value, "sign") as QuestionSign;
  const operation1 = Number(value.operation1);
  const operation2 = Number(value.operation2);

  if (!id || !SIGNS.includes(sign)) return null;
  if (!Number.isFinite(operation1) || !Number.isFinite(operation2)) return null;

  return { id, operation1, operation2, sign };
}

function clearFlash(state: GameState): GameState {
  return state.flash ? { ...state, flash: null } : state;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true, error: "" };

    case "DISCONNECTED":
      return {
        ...state,
        connected: false,
        error: action.message ?? "Connection lost. Reconnect to keep playing.",
      };

    case "STARTING":
      return { ...state, error: "", notice: "Joining the queue…" };

    case "RESET":
      return { ...initialGameState(state.selfId), online: state.online, connected: state.connected };

    case "CLEAR_FLASH":
      return clearFlash(state);

    case "SET_ERROR":
      return { ...state, error: action.message };

    case "SERVER": {
      const { type } = action.message;
      const payload = action.message.payload ?? {};

      if (type === "ONLINE_USERS") {
        return { ...state, online: asMembers(payload.users) };
      }

      if (type === "WAITING") {
        return {
          ...state,
          screen: "waiting",
          gameId: stringField(payload, "gameId") || state.gameId,
          question: null,
          notice: "Scanning the arena for an opponent…",
          error: "",
        };
      }

      if (type === "GAME_STARTED") {
        const question = asQuestion(payload.question);
        if (!question) {
          return { ...state, error: "Received an invalid question from the server." };
        }

        const index = numberField(payload, "index", 0);
        const score = numberField(payload, "score", 0);

        return {
          ...state,
          screen: "playing",
          gameId: stringField(payload, "gameId") || state.gameId,
          question,
          members: asMembers(payload.members),
          scores: { ...asScores(payload.scores), [state.selfId]: score },
          progresses: { ...state.progresses, [state.selfId]: index },
          index,
          total: numberField(payload, "totalQuestions", 10),
          winnerId: null,
          flash: null,
          notice: "",
          error: "",
        };
      }

      if (type === "WRONG_ANSWER") {
        return { ...state, flash: "bad" };
      }

      if (type === "NEXT_QUESTION") {
        const question = asQuestion(payload.question);
        if (!question) {
          return { ...state, error: "Received an invalid question from the server." };
        }

        const index = numberField(payload, "index", 0);
        const score = numberField(payload, "score", state.scores[state.selfId] ?? 0);

        return {
          ...state,
          question,
          index,
          total: numberField(payload, "totalQuestions", state.total),
          scores: { ...state.scores, [state.selfId]: score },
          progresses: { ...state.progresses, [state.selfId]: index },
          flash: "ok",
          error: "",
        };
      }

      if (type === "PLAYER_PROGRESS") {
        const userId = stringField(payload, "userId");
        if (!userId) return state;
        return {
          ...state,
          scores: { ...state.scores, [userId]: numberField(payload, "score", 0) },
          progresses: {
            ...state.progresses,
            [userId]: numberField(payload, "progress", 0),
          },
        };
      }

      if (type === "GAME_OVER") {
        return {
          ...state,
          screen: "over",
          scores: asScores(payload.scores),
          members: asMembers(payload.members),
          winnerId: typeof payload.winnerId === "string" ? payload.winnerId : null,
          flash: null,
          notice: "",
          error: "",
        };
      }

      if (type === "CANCELLED") {
        return {
          ...state,
          screen: "idle",
          gameId: null,
          question: null,
          index: 0,
          winnerId: null,
          notice: "Search cancelled.",
        };
      }

      if (type === "ERROR") {
        return {
          ...state,
          error: stringField(payload, "message") || "Something went wrong.",
        };
      }

      return state;
    }

    default:
      return state;
  }
}

export function scoreFor(state: GameState, userId: string | undefined) {
  if (!userId) return 0;
  return state.scores[userId] ?? 0;
}

export function progressFor(state: GameState, userId: string | undefined) {
  if (!userId) return 0;
  return state.progresses[userId] ?? 0;
}

export function rankedMembers(state: GameState) {
  return [...state.members].sort(
    (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0),
  );
}
