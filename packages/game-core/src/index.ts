export { canonicalizeAuthoritative } from "./determinism/authoritative-json";
export { fingerprint, sha256Hex, stableId } from "./determinism/hash";
export type { RandomSource } from "./determinism/random-source";
export {
  RNG_DOMAIN_PURPOSES_V1,
  createRngDomainPathV1,
} from "./determinism/rng-domain";
export type {
  RngDomainDescriptorV1,
  RngDomainPathV1,
  RngDomainPurposeV1,
  RngDomainV1,
} from "./determinism/rng-domain";
export { deriveRandomSource, deriveRngState } from "./determinism/rng-derivation";
export { Xoshiro256StarStar } from "./determinism/xoshiro256ss";
export { RNG_DERIVATION_MANIFEST_V1 } from "@runtime-human/game-schema";
export type { RngDerivationManifestV1, RngDerivationVersion } from "@runtime-human/game-schema";
export {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990Result,
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesetManifest,
  createJanuaryInitialProvisionalState,
  createJanuaryProgrammingOutcomeFromState,
  JANUARY_1990_BALANCE_SLICE_ID,
  JANUARY_1990_BALANCE_SCHEMA_VERSION,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_QUALITY_SCORE_MAXIMUMS,
  JANUARY_1990_REASON_CODES,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  JANUARY_1990_RNG_CALL_BUDGET,
  JANUARY_1990_RNG_SCOPES,
  JANUARY_1990_STABLE_IDS,
  JANUARY_1990_STEP_TABLE_VERSION,
  createJanuary1990BalanceFingerprint,
  deriveJanuaryQualityScoreMaximums,
  materializeJanuaryProgrammingState,
  parseJanuary1990Balance,
  parseJanuary1990MonthPlan,
  parseJanuary1990Result,
  parseJanuaryAccessAnswer,
  parseJanuaryDefectAnswer,
  parseJanuaryLearningAnswer,
  parseJanuaryProvisionalState,
  updateJanuaryProvisionalState,
} from "./january-1990";
export type {
  January1990BalanceV1,
  January1990ContentContext,
  January1990ContentId,
  January1990DecisionId,
  January1990MonthPlanV1,
  January1990ReasonCode,
  January1990ResultV1,
  January1990RngScope,
  January1990RulesetManifestV1,
  JanuaryAccessAnswerV1,
  JanuaryAccessRoute,
  JanuaryBalanceAccessRoute,
  JanuaryBalanceDefectResponse,
  JanuaryBalanceLearningPractice,
  JanuaryDefectAnswerV1,
  JanuaryEventDefinition,
  JanuaryEvidenceV1,
  JanuaryLearningActivity,
  JanuaryLearningAnswerV1,
  JanuaryProgrammingOutcomeV1,
  JanuaryProjectDefinition,
  JanuaryProvisionalStateV1,
  JanuaryQuality,
  JanuaryQualityBalanceV1,
  JanuaryQualityModifiersV1,
  JanuaryQualityScoresV1,
  JanuarySkillEvidenceBalanceV1,
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
