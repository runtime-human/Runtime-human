import {
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  type January1990BalanceV1,
} from "@runtime-human/game-core";
import { parseFingerprint } from "@runtime-human/game-persistence-contracts";
import type {
  Fingerprint,
  MonthRunCompatibilityV1,
  ScenarioArtifactV1,
} from "@runtime-human/game-schema";

import { JANUARY_1990_SAVE_SCHEMA_FINGERPRINT } from "./january-save-snapshot";

export type CreateJanuary1990ScenarioCompatibilityInput = Readonly<{
  contentFingerprint: Fingerprint;
  balance: January1990BalanceV1;
  artifact: ScenarioArtifactV1;
}>;

export function createJanuary1990ScenarioCompatibility(
  input: CreateJanuary1990ScenarioCompatibilityInput,
): MonthRunCompatibilityV1 {
  return Object.freeze({
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint: createJanuary1990ScenarioRuntimeRulesFingerprint(
      input.balance,
      input.artifact,
    ),
    contentFingerprint: parseFingerprint(input.contentFingerprint),
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  });
}
