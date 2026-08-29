import {
  createJanuary1990RulesFingerprint,
  type January1990BalanceV1,
} from "@runtime-human/game-core";
import { parseFingerprint } from "@runtime-human/game-persistence-contracts";
import {
  DETERMINISM_MANIFEST_V1,
  type Fingerprint,
  type MonthRunCompatibilityV1,
} from "@runtime-human/game-schema";

import { JANUARY_1990_SAVE_SCHEMA_FINGERPRINT } from "./january-save-snapshot";

export type CreateJanuary1990CompatibilityInput = Readonly<{
  contentFingerprint: Fingerprint;
  balance: January1990BalanceV1;
}>;

export function createJanuary1990Compatibility(
  input: CreateJanuary1990CompatibilityInput,
): MonthRunCompatibilityV1 {
  return Object.freeze({
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint: createJanuary1990RulesFingerprint(input.balance),
    contentFingerprint: parseFingerprint(input.contentFingerprint),
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    determinismManifest: DETERMINISM_MANIFEST_V1,
  });
}
