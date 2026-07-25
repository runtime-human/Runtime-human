export const JANUARY_1990_RNG_SCOPES = Object.freeze({
  content: "month/content",
  narrative: "month/narrative",
  outcome: "month/outcome",
} as const);

export type January1990RngScope =
  (typeof JANUARY_1990_RNG_SCOPES)[keyof typeof JANUARY_1990_RNG_SCOPES];
