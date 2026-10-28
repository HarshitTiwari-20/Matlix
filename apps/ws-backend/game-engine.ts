import { generateQuestions, toPublicQuestion } from "./questions";
import type { Game, GamePlayer, PublicQuestion } from "./types";

export const QUESTIONS_PER_GAME = 10;

type GameStartedPayload = {
  gameId: string;
  members: GamePlayer[];
  question: PublicQuestion;
  index: number;
  score: number;
  totalQuestions: number;
  scores: Record<string, number>;
  justMatched: boolean;
};

export type GameEvent =
  | { type: "WAITING"; payload: { gameId: string } }
  | { type: "GAME_STARTED"; payload: GameStartedPayload }
  | { type: "WRONG_ANSWER"; payload: { gameId: string; questionId: string } }
  | {
      type: "NEXT_QUESTION";
      payload: {
        gameId: string;
        userId: string;
        question: PublicQuestion;
        index: number;
        score: number;
        totalQuestions: number;
      };
    }
  | {
      type: "GAME_OVER";
      payload: {
        gameId: string;
        scores: Record<string, number>;
        winnerId: string | null;
        members: GamePlayer[];
      };
    }
  | { type: "CANCELLED"; payload: { gameId: string } }
  | { type: "ERROR"; payload: { message: string } };

export class GameEngine {
  readonly games = new Map<string, Game>();
  readonly playerGame = new Map<string, string>();

  startGame(player: GamePlayer): GameEvent {
    const existingGameId = this.playerGame.get(player.id);
    if (existingGameId) {
      const existing = this.games.get(existingGameId);
      if (existing?.status === "SEARCHING_FOR_PLAYER") {
        return { type: "WAITING", payload: { gameId: existing.id } };
      }
      if (existing?.status === "RUNNING") {
        return this.rejoin(player, existing);
      }
      this.playerGame.delete(player.id);
    }

    for (const game of this.games.values()) {
      if (
        game.status === "SEARCHING_FOR_PLAYER" &&
        !game.members.some((member) => member.id === player.id)
      ) {
        game.members.push(player);
        game.status = "RUNNING";
        game.questions = generateQuestions(QUESTIONS_PER_GAME);
        game.startedAt = Date.now();
        game.progress = Object.fromEntries(game.members.map((member) => [member.id, 0]));
        game.scores = Object.fromEntries(game.members.map((member) => [member.id, 0]));
        this.playerGame.set(player.id, game.id);

        return {
          type: "GAME_STARTED",
          payload: this.gameStartedPayload(game, player.id, true),
        };
      }
    }

    const gameId = crypto.randomUUID();
    const game: Game = {
      id: gameId,
      adminId: player.id,
      status: "SEARCHING_FOR_PLAYER",
      members: [player],
      questions: [],
      answers: [],
      index: 0,
      progress: { [player.id]: 0 },
      scores: { [player.id]: 0 },
    };
    this.games.set(gameId, game);
    this.playerGame.set(player.id, gameId);
    return { type: "WAITING", payload: { gameId } };
  }

  submitAnswer(
    userId: string,
    gameId: string,
    questionId: string,
    answer: number,
  ): GameEvent {
    const game = this.games.get(gameId);
    if (!game || game.status !== "RUNNING") {
      return { type: "ERROR", payload: { message: "Game not found" } };
    }

    if (!game.members.some((member) => member.id === userId)) {
      return { type: "ERROR", payload: { message: "Not in this game" } };
    }

    if (!Number.isInteger(answer)) {
      return { type: "ERROR", payload: { message: "Invalid answer" } };
    }

    const index = game.index;
    const current = game.questions[index];
    if (!current || current.id !== questionId) {
      return { type: "ERROR", payload: { message: "Question mismatch" } };
    }

    const correct = answer === current.answer;
    game.answers.push({
      id: crypto.randomUUID(),
      userId,
      answer,
      questionId,
      correct,
    });

    if (!correct) {
      return { type: "WRONG_ANSWER", payload: { gameId: game.id, questionId } };
    }

    game.scores[userId] = (game.scores[userId] ?? 0) + 1;
    game.progress[userId] = game.scores[userId]!;
    game.index = index + 1;

    if (game.index >= game.questions.length) {
      return this.finishGame(game);
    }

    const next = game.questions[game.index]!;
    return {
      type: "NEXT_QUESTION",
      payload: {
        gameId: game.id,
        userId,
        question: toPublicQuestion(next),
        index: game.index,
        score: game.scores[userId]!,
        totalQuestions: game.questions.length,
      },
    };
  }

  cancel(userId: string): GameEvent {
    const gameId = this.playerGame.get(userId);
    if (!gameId) {
      return { type: "ERROR", payload: { message: "You are not in a match" } };
    }

    const game = this.games.get(gameId);
    this.playerGame.delete(userId);
    if (!game) return { type: "CANCELLED", payload: { gameId } };

    if (game.status !== "SEARCHING_FOR_PLAYER") {
      this.playerGame.set(userId, gameId);
      return { type: "ERROR", payload: { message: "Cannot cancel a running match" } };
    }

    this.games.delete(gameId);
    return { type: "CANCELLED", payload: { gameId } };
  }

  leave(userId: string): Extract<GameEvent, { type: "GAME_OVER" }> | null {
    const gameId = this.playerGame.get(userId);
    if (!gameId) return null;
    const game = this.games.get(gameId);
    if (!game) {
      this.playerGame.delete(userId);
      return null;
    }

    if (game.status === "SEARCHING_FOR_PLAYER") {
      this.games.delete(game.id);
      this.playerGame.delete(userId);
      return null;
    }

    if (game.status === "RUNNING") {
      game.status = "ENDED";
      const opponent = game.members.find((member) => member.id !== userId) ?? null;
      this.playerGame.delete(userId);
      if (opponent) this.playerGame.delete(opponent.id);
      return {
        type: "GAME_OVER",
        payload: {
          gameId: game.id,
          scores: game.scores,
          winnerId: opponent?.id ?? null,
          members: game.members,
        },
      };
    }

    this.playerGame.delete(userId);
    return null;
  }

  disposeGame(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    for (const member of game.members) {
      if (this.playerGame.get(member.id) === gameId) {
        this.playerGame.delete(member.id);
      }
    }
    this.games.delete(gameId);
  }

  private rejoin(player: GamePlayer, game: Game): GameEvent {
    const index = game.index;
    const question = game.questions[index];
    if (!question) {
      return this.finishGame(game);
    }

    return {
      type: "GAME_STARTED",
      payload: this.gameStartedPayload(game, player.id, false),
    };
  }

  private gameStartedPayload(
    game: Game,
    playerId: string,
    justMatched: boolean,
  ): GameStartedPayload {
    const index = game.index;
    const question = game.questions[index]!;
    return {
      gameId: game.id,
      members: game.members,
      question: toPublicQuestion(question),
      index,
      score: game.scores[playerId] ?? 0,
      totalQuestions: game.questions.length,
      scores: game.scores,
      justMatched,
    };
  }

  private finishGame(game: Game): Extract<GameEvent, { type: "GAME_OVER" }> {
    game.status = "ENDED";
    for (const member of game.members) {
      if (this.playerGame.get(member.id) === game.id) {
        this.playerGame.delete(member.id);
      }
    }

    const entries = Object.entries(game.scores);
    const topScore = Math.max(...entries.map(([, score]) => score), 0);
    const winners = entries.filter(([, score]) => score === topScore);
    const winnerId = winners.length === 1 ? (winners[0]?.[0] ?? null) : null;

    return {
      type: "GAME_OVER",
      payload: {
        gameId: game.id,
        scores: game.scores,
        winnerId,
        members: game.members,
      },
    };
  }
}
