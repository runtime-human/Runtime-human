export const JANUARY_1990_RNG_SCOPES = Object.freeze({
  content: "month/content",
  narrative: "month/narrative",
  outcome: "month/outcome",
} as const);

export const JANUARY_1990_RNG_CALL_BUDGET = Object.freeze({
  content: 0,
  narrative: 1,
  outcome: 1,
} as const);

export type January1990RngScope =
  (typeof JANUARY_1990_RNG_SCOPES)[keyof typeof JANUARY_1990_RNG_SCOPES];
