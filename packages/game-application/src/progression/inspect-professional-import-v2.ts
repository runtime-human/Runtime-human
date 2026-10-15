import { parseSaveRecord } from "@runtime-human/game-persistence-contracts";
import type { SaveRecordV1 } from "@runtime-human/game-persistence-contracts";
import type { SaveId, SaveRevision } from "@runtime-human/game-schema";

import type { PersistenceService } from "../persistence-service";
import {
  prepareCommittedJanuaryProfessionalCandidateV2,
  type ProfessionalSaveCandidateV2,
} from "./professional-save-candidate-v2";

export type ProfessionalImportInspectionV2 =
  | Readonly<{
      kind: "eligible-preview";
      candidate: ProfessionalSaveCandidateV2;
      saveId: SaveId;
      observedRevision: SaveRevision;
      observedUpdatedSequence: number;
      observedSnapshotSha256: string;
      migrationIsAtomic: false;
    }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "recovery-unavailable"
        | "save-not-found"
        | "active-month-run"
        | "persistence-unavailable"
        | "source-changed"
        | "incompatible-source";
    }>;

/**
 * Read-only preflight against the actual PersistenceService.
 *
 * This intentionally does NOT return a migration authorization. The absence
 * of an active run and an unchanged revision are observations, not locks.
 * B2C must revalidate them inside an atomic worker CAS before writing.
 */
export async function inspectCommittedJanuaryProfessionalImportV2(
  persistence: Pick<PersistenceService, "getRecoveryStatus" | "loadSave" | "loadActiveMonthRun">,
  saveId: SaveId,
  aptitudes: Readonly<{ reasoning: number; learning: number }>,
): Promise<ProfessionalImportInspectionV2> {
  const recovery = await persistence.getRecoveryStatus({
    schemaVersion: "get-recovery-status-query-v1",
  });
  if (
    recovery.kind !== "found" ||
    !recovery.value.writable ||
    (recovery.value.status !== "healthy" && recovery.value.status !== "unclean-but-valid")
  ) {
    return Object.freeze({ kind: "blocked", reason: "recovery-unavailable" });
  }

  const first = await persistence.loadSave({ schemaVersion: "load-save-query-v1", saveId });
  if (first.kind === "rejected") {
    return Object.freeze({ kind: "blocked", reason: "persistence-unavailable" });
  }
  if (first.kind === "not-found") {
    return Object.freeze({ kind: "blocked", reason: "save-not-found" });
  }

  const active = await persistence.loadActiveMonthRun({
    schemaVersion: "load-active-month-run-query-v1",
    saveId,
  });
  if (active.kind === "rejected") {
    return Object.freeze({ kind: "blocked", reason: "persistence-unavailable" });
  }
  if (active.kind === "found") {
    return Object.freeze({ kind: "blocked", reason: "active-month-run" });
  }

  const latest = await persistence.loadSave({ schemaVersion: "load-save-query-v1", saveId });
  if (latest.kind === "rejected") {
    return Object.freeze({ kind: "blocked", reason: "persistence-unavailable" });
  }
  if (latest.kind === "not-found") {
    return Object.freeze({ kind: "blocked", reason: "source-changed" });
  }

  let original: SaveRecordV1;
  let observed: SaveRecordV1;
  try {
    original = parseSaveRecord(first.value);
    observed = parseSaveRecord(latest.value);
  } catch {
    return Object.freeze({ kind: "blocked", reason: "incompatible-source" });
  }
  if (
    original.saveId !== saveId ||
    observed.saveId !== saveId ||
    original.revision !== observed.revision ||
    original.updatedSequence !== observed.updatedSequence ||
    original.snapshot.sha256 !== observed.snapshot.sha256 ||
    original.snapshot.json !== observed.snapshot.json ||
    original.lastCommittedRunId !== observed.lastCommittedRunId ||
    original.saveSchemaFingerprint !== observed.saveSchemaFingerprint
  ) {
    return Object.freeze({ kind: "blocked", reason: "source-changed" });
  }

  try {
    const candidate = prepareCommittedJanuaryProfessionalCandidateV2(
      observed,
      aptitudes.reasoning,
      aptitudes.learning,
    );
    return Object.freeze({
      kind: "eligible-preview",
      candidate,
      saveId,
      observedRevision: observed.revision,
      observedUpdatedSequence: observed.updatedSequence,
      observedSnapshotSha256: observed.snapshot.sha256,
      migrationIsAtomic: false,
    });
  } catch (error) {
    // Invalid aptitudes are caller/programmer errors, not a corrupt legacy save.
    if (error instanceof TypeError && error.message.includes("aptitude")) {
      throw error;
    }
    return Object.freeze({ kind: "blocked", reason: "incompatible-source" });
  }
}
