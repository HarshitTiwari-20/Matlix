import { describe, expect, test } from "bun:test";
import { computeAnswer, generateQuestions, toPublicQuestion } from "./questions";

describe("computeAnswer", () => {
  test("handles every operator", () => {
    expect(computeAnswer(6, 3, "PLUS")).toBe(9);
    expect(computeAnswer(6, 3, "MINUS")).toBe(3);
    expect(computeAnswer(6, 3, "MULTIPLICATION")).toBe(18);
    expect(computeAnswer(6, 3, "DIVIDE")).toBe(2);
  });
});

describe("generateQuestions", () => {
  test("returns the requested count", () => {
    expect(generateQuestions(12)).toHaveLength(12);
    expect(generateQuestions(0)).toHaveLength(0);
  });

  test("generated answers are integers and never divide by zero", () => {
    const questions = generateQuestions(120);

    for (const question of questions) {
      expect(Number.isInteger(question.answer)).toBe(true);
      expect(question.answer).toBe(
        computeAnswer(question.operation1, question.operation2, question.sign),
      );

      if (question.sign === "DIVIDE") {
        expect(question.operation2).not.toBe(0);
        expect(question.operation1 % question.operation2).toBe(0);
      }

      if (question.sign === "MINUS") {
        expect(question.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("generates unique ids", () => {
    const questions = generateQuestions(30);
    const ids = new Set(questions.map((question) => question.id));
    expect(ids.size).toBe(questions.length);
  });

  test("is deterministic for a supplied random source", () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    let index = 0;
    const random = () => values[index++ % values.length]!;

    const first = generateQuestions(5, random);
    index = 0;
    const second = generateQuestions(5, random);

    expect(
      first.map(({ operation1, operation2, sign, answer }) => ({
        operation1,
        operation2,
        sign,
        answer,
      })),
    ).toEqual(
      second.map(({ operation1, operation2, sign, answer }) => ({
        operation1,
        operation2,
        sign,
        answer,
      })),
    );
  });

  test("handles a random source that returns 1", () => {
    const questions = generateQuestions(5, () => 1);
    expect(questions).toHaveLength(5);
    expect(questions.every((question) => question.sign === "MULTIPLICATION")).toBe(true);
  });

  test("toPublicQuestion strips the answer", () => {
    const [question] = generateQuestions(1);
    expect(question).toBeDefined();
    expect(toPublicQuestion(question!)).toEqual({
      id: question!.id,
      operation1: question!.operation1,
      operation2: question!.operation2,
      sign: question!.sign,
    });
    expect("answer" in toPublicQuestion(question!)).toBe(false);
  });
});
