export type GameMember = {
    id: string;
    name: string;
  };
  
  export type Question = {
    id: string,
    operation1: number,
    operation2: number,
    sign: "PLUS" | "MINUS" | " MULTIPLICATION" | "DIVIDE";
  }
  
  export type Answer = {
    id: string,
    answer: number,
    questionId: string
  }
  
  export type Game = {
    id: string;
    members: User[];
    adminId: string;
    status: "SEARCHING_FOR_PLAYER" | "RUNNING" | "ENDED";
    questions: Question[];
    answers: Answer[];
  };
  
  export type User = {
    name: string;
    ws: WebSocket;
    id: string;
  };
  