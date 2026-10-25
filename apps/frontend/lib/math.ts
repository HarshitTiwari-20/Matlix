export const SIGN_LABEL = {
  PLUS: "+",
  MINUS: "−",
  MULTIPLICATION: "×",
  DIVIDE: "÷",
} as const;

export const SIGN_NAME = {
  PLUS: "plus",
  MINUS: "minus",
  MULTIPLICATION: "times",
  DIVIDE: "divided by",
} as const;

export function formatEquation(
  operation1: number,
  operation2: number,
  sign: keyof typeof SIGN_LABEL,
) {
  return `${operation1} ${SIGN_LABEL[sign]} ${operation2}`;
}

export function describeEquation(
  operation1: number,
  operation2: number,
  sign: keyof typeof SIGN_NAME,
) {
  return `${operation1} ${SIGN_NAME[sign]} ${operation2}`;
}
