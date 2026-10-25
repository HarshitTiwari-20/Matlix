import { expect, test } from "bun:test";
import { describeEquation, formatEquation } from "./math";

test("formatEquation uses the Matiks operator glyphs", () => {
  expect(formatEquation(6, 3, "PLUS")).toBe("6 + 3");
  expect(formatEquation(6, 3, "MINUS")).toBe("6 − 3");
  expect(formatEquation(6, 3, "MULTIPLICATION")).toBe("6 × 3");
  expect(formatEquation(6, 3, "DIVIDE")).toBe("6 ÷ 3");
});

test("describeEquation spells operators for screen readers", () => {
  expect(describeEquation(6, 3, "PLUS")).toBe("6 plus 3");
  expect(describeEquation(6, 3, "MINUS")).toBe("6 minus 3");
  expect(describeEquation(6, 3, "MULTIPLICATION")).toBe("6 times 3");
  expect(describeEquation(6, 3, "DIVIDE")).toBe("6 divided by 3");
});
