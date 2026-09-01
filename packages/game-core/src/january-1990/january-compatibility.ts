import {
  DETERMINISM_MANIFEST_V1,
  type DeterminismManifest,
  type Fingerprint,
} from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import { createJanuary1990BalanceFingerprint, type January1990BalanceV1 } from "./january-balance";
import { JANUARY_1990_REQUIRED_CHUNK_IDS } from "./january-content-ids";
import { JANUARY_1990_DECISION_IDS } from "./january-decisions";
import { JANUARY_1990_RNG_CALL_BUDGET, JANUARY_1990_RNG_SCOPES } from "./january-rng-scopes";

export const JANUARY_1990_STEP_TABLE_VERSION = "january-1990-step-table-v1" as const;
export const JANUARY_1990_HIERARCHICAL_RULES_VERSION = "january-1990-hierarchical-rng-v1" as const;

export const JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST: DeterminismManifest = Object.freeze({
  ...DETERMINISM_MANIFEST_V1,
  rulesVersion: JANUARY_1990_HIERARCHICAL_RULES_VERSION,
});

export type January1990RulesetManifestV1 = Readonly<{
  schemaVersion: "january-1990-ruleset-manifest-v1";
  coreRulesVersion: typeof JANUARY_1990_STEP_TABLE_VERSION;
  contentFingerprint: Fingerprint;
  balanceFingerprint: Fingerprint;
  scenarioFingerprint: null;
}>;

export function createJanuary1990RulesFingerprint(balance: January1990BalanceV1): Fingerprint {
  return fingerprint("january-1990-rules-v1", {
    sliceId: "january-1990",
    planSchemaVersion: "january-1990-month-plan-v1",
    stepTableVersion: JANUARY_1990_STEP_TABLE_VERSION,
    answerSchemaVersions: [
      "january-access-answer-v1",
      "january-learning-answer-v1",
      "january-defect-answer-v1",
    ],
    decisionIds: [
      JANUARY_1990_DECISION_IDS.access,
      JANUARY_1990_DECISION_IDS.learning,
      JANUARY_1990_DECISION_IDS.defect,
    ],
    rngScopes: [
      JANUARY_1990_RNG_SCOPES.content,
      JANUARY_1990_RNG_SCOPES.narrative,
      JANUARY_1990_RNG_SCOPES.outcome,
    ],
    rngCallBudget: JANUARY_1990_RNG_CALL_BUDGET,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
    balanceFingerprint: createJanuary1990BalanceFingerprint(balance),
  });
}

export function createJanuary1990RulesetManifest(
  input: Readonly<{
    contentFingerprint: Fingerprint;
    balance: January1990BalanceV1;
  }>,
): January1990RulesetManifestV1 {
  return Object.freeze({
    schemaVersion: "january-1990-ruleset-manifest-v1",
    coreRulesVersion: JANUARY_1990_STEP_TABLE_VERSION,
    contentFingerprint: input.contentFingerprint,
    balanceFingerprint: createJanuary1990BalanceFingerprint(input.balance),
    scenarioFingerprint: null,
  });
}
