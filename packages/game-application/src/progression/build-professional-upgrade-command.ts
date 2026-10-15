import { parseUpgradeProfessionalSaveCommandV1, type UpgradeProfessionalSaveCommandV1 } from "@runtime-human/game-persistence-contracts";
import type { RequestId } from "@runtime-human/game-schema";

import { createCanonicalPayload } from "../month-run-persistence-payload";
import { JANUARY_1990_SAVE_SCHEMA_FINGERPRINT } from "../january-1990/january-save-snapshot";
import {
  parseProfessionalSaveCandidateV2,
  PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
} from "./professional-save-candidate-v2";
import type { ProfessionalImportInspectionV2 } from "./inspect-professional-import-v2";

/**
 * Turns a read-only eligible preview into a strictly CAS-constrained command.
 * Must not be mistaken for approval to perform migration: the owner must
 * arrange a verified backup and B2C1 remains disabled in the player UI.
 * The worker rechecks all conditions atomically under BEGIN IMMEDIATE.
 */
export function buildProfessionalSaveUpgradeCommandV1(
  inspection: ProfessionalImportInspectionV2,
  requestId: RequestId,
): UpgradeProfessionalSaveCommandV1 {
  if (inspection.kind !== "eligible-preview" || inspection.migrationIsAtomic !== false) {
    throw new TypeError("Professional upgrade requires an eligible read-only preview");
  }
  const candidate = parseProfessionalSaveCandidateV2(inspection.candidate);
  if (
    candidate.legacyImport === null ||
    candidate.legacyImport.originalSaveId !== inspection.saveId ||
    candidate.legacyImport.originalSaveRevision !== inspection.observedRevision ||
    candidate.legacyImport.originalSnapshotSha256 !== inspection.observedSnapshotSha256
  ) {
    throw new TypeError("Professional upgrade preview provenance does not match");
  }
  return parseUpgradeProfessionalSaveCommandV1({
    schemaVersion: "upgrade-professional-save-command-v1",
    requestId,
    saveId: inspection.saveId,
    expectedSaveRevision: inspection.observedRevision,
    expectedUpdatedSequence: inspection.observedUpdatedSequence,
    expectedSnapshotSha256: inspection.observedSnapshotSha256,
    expectedSourceSaveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    targetSaveSchemaFingerprint: PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT,
    snapshot: createCanonicalPayload(candidate),
  });
}
