import type { Question, QuestionSign } from "./types";

const SIGNS: QuestionSign[] = ["MINUS", "PLUS", "DIVIDE", "MULTIPLICATION"];

export function toPublicQuestion(question: Question) {
  return {
    id: question.id,
    operation1: question.operation1,
    operation2: question.operation2,
    sign: question.sign,
  };
}

export function computeAnswer(
  operation1: number,
  operation2: number,
  sign: QuestionSign,
): number {
  switch (sign) {
    case "PLUS":
      return operation1 + operation2;
    case "MINUS":
      return operation1 - operation2;
    case "MULTIPLICATION":
      return operation1 * operation2;
    case "DIVIDE":
      return operation1 / operation2;
  }
}

export function generateQuestions(
  count = 10,
  random: () => number = Math.random,
): Question[] {
  const questions: Question[] = [];

  while (questions.length < count) {
    const signIndex = Math.min(
      SIGNS.length - 1,
      Math.max(0, Math.floor(random() * SIGNS.length)),
    );
    const sign = SIGNS[signIndex]!;
    let operation1 = 0;
    let operation2 = 0;

    if (sign === "DIVIDE") {
      operation2 = 1 + Math.floor(random() * 9);
      const quotient = 1 + Math.floor(random() * 9);
      operation1 = operation2 * quotient;
    } else if (sign === "MINUS") {
      operation1 = Math.floor(random() * 20) + 1;
      operation2 = Math.floor(random() * operation1);
    } else if (sign === "MULTIPLICATION") {
      operation1 = 1 + Math.floor(random() * 9);
      operation2 = 1 + Math.floor(random() * 9);
    } else {
      operation1 = Math.floor(random() * 20);
      operation2 = Math.floor(random() * 20);
    }

    questions.push({
      id: crypto.randomUUID(),
      sign,
      operation1,
      operation2,
      answer: computeAnswer(operation1, operation2, sign),
    });
  }

  return questions;
}
