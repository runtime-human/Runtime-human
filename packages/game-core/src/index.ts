export { canonicalizeAuthoritative } from "./determinism/authoritative-json";
export { fingerprint, sha256Hex, stableId } from "./determinism/hash";
export type { RandomSource } from "./determinism/random-source";
export { Xoshiro256StarStar } from "./determinism/xoshiro256ss";
export {
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  JANUARY_1990_STABLE_IDS,
} from "./january-1990";
export type {
  January1990ContentContext,
  January1990ContentId,
  January1990ReasonCode,
  JanuaryAccessRoute,
  JanuaryEventDefinition,
  JanuaryLearningActivity,
  JanuaryProjectDefinition,
  JanuaryQuality,
  JanuarySituationDefinition,
  JanuarySkillDefinition,
  JanuaryTechnologyContext,
  JanuaryWorkPackage,
} from "./january-1990";
export {
  checkMonthRunCompatibility,
  createMonthRunCheckpoint,
  restoreMonthRunCheckpoint,
  snapshotAuthoritativeValue,
} from "./month-run/checkpoint";
export type {
  CreateMonthRunCheckpointInput,
  MonthRunCompatibilityCheckResult,
  MonthRunCompatibilityField,
  RestoreMonthRunCheckpointResult,
} from "./month-run/checkpoint";
export { runUntilBoundary } from "./month-run/runner";
export type { MonthRunRunResult, MonthRunStep } from "./month-run/runner";
export { transitionMonthRun } from "./month-run/transition";
export type { AuthoritativeJsonValue } from "@runtime-human/game-schema";
