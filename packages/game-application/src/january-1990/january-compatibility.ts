import { createJanuary1990RulesFingerprint } from "@runtime-human/game-core";
import { parseFingerprint } from "@runtime-human/game-persistence-contracts";
import {
  DETERMINISM_MANIFEST_V1,
  type Fingerprint,
  type MonthRunCompatibilityV1,
} from "@runtime-human/game-schema";

export type CreateJanuary1990CompatibilityInput = Readonly<{
  contentFingerprint: Fingerprint;
  saveSchemaFingerprint: Fingerprint;
}>;

export function createJanuary1990Compatibility(
  input: CreateJanuary1990CompatibilityInput,
): MonthRunCompatibilityV1 {
  return Object.freeze({
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint: createJanuary1990RulesFingerprint(),
    contentFingerprint: parseFingerprint(input.contentFingerprint),
    saveSchemaFingerprint: parseFingerprint(input.saveSchemaFingerprint),
    determinismManifest: DETERMINISM_MANIFEST_V1,
  });
}
