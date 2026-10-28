export type QuestionSign = "PLUS" | "MINUS" | "MULTIPLICATION" | "DIVIDE";

export type PublicQuestion = {
  id: string;
  operation1: number;
  operation2: number;
  sign: QuestionSign;
};

export type Question = PublicQuestion & {
  answer: number;
};

export type Answer = {
  id: string;
  userId: string;
  answer: number;
  questionId: string;
  correct: boolean;
};

export type GamePlayer = {
  id: string;
  name: string;
};

export type GameStatus = "SEARCHING_FOR_PLAYER" | "RUNNING" | "ENDED";

export type Game = {
  id: string;
  adminId: string;
  status: GameStatus;
  members: GamePlayer[];
  questions: Question[];
  answers: Answer[];
  index: number;
  progress: Record<string, number>;
  scores: Record<string, number>;
  startedAt?: number;
};

export type User = GamePlayer & {
  ws: { send: (data: string) => void; close: (code?: number, reason?: string) => void };
};
