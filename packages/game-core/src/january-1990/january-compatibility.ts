import type { Fingerprint } from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import { JANUARY_1990_REQUIRED_CHUNK_IDS } from "./january-content-ids";
import { JANUARY_1990_DECISION_IDS } from "./january-decisions";
import {
  JANUARY_1990_RNG_CALL_BUDGET,
  JANUARY_1990_RNG_SCOPES,
} from "./january-rng-scopes";

export const JANUARY_1990_STEP_TABLE_VERSION = "january-1990-step-table-v1" as const;

const JANUARY_1990_RULES_FINGERPRINT = fingerprint("january-1990-rules-v1", {
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
});

export function createJanuary1990RulesFingerprint(): Fingerprint {
  return JANUARY_1990_RULES_FINGERPRINT;
}
