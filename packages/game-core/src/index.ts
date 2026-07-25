export { canonicalizeAuthoritative } from "./determinism/authoritative-json";
export { fingerprint, sha256Hex, stableId } from "./determinism/hash";
export type { RandomSource } from "./determinism/random-source";
export { Xoshiro256StarStar } from "./determinism/xoshiro256ss";
export {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990Result,
  createJanuary1990RulesFingerprint,
  createJanuaryInitialProvisionalState,
  createJanuaryProgrammingOutcomeFromState,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_REASON_CODES,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  JANUARY_1990_RNG_SCOPES,
  JANUARY_1990_STABLE_IDS,
  JANUARY_1990_STEP_TABLE_VERSION,
  materializeJanuaryProgrammingState,
  parseJanuaryAccessAnswer,
  parseJanuaryDefectAnswer,
  parseJanuaryLearningAnswer,
  parseJanuaryProvisionalState,
  updateJanuaryProvisionalState,
} from "./january-1990";
export type {
  January1990ContentContext,
  January1990ContentId,
  January1990DecisionId,
  January1990MonthPlanV1,
  January1990ReasonCode,
  January1990ResultV1,
  January1990RngScope,
  JanuaryAccessAnswerV1,
  JanuaryAccessRoute,
  JanuaryDefectAnswerV1,
  JanuaryEventDefinition,
  JanuaryEvidenceV1,
  JanuaryLearningActivity,
  JanuaryLearningAnswerV1,
  JanuaryProgrammingOutcomeV1,
  JanuaryProjectDefinition,
  JanuaryProvisionalStateV1,
  JanuaryQuality,
  JanuaryQualityScoresV1,
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
