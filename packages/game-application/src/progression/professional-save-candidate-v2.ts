import {
  canonicalizeAuthoritative,
  createProfessionalLabStateV1,
  fingerprint,
  parseProfessionalLabStateV1,
  sha256Hex,
  PROFESSIONAL_LAB_RULES_V1,
  type ProfessionalLabStateV1,
} from "@runtime-human/game-core";
import {
  parseSaveRecord,
  type SaveRecordV1,
} from "@runtime-human/game-persistence-contracts";
import {
  parseMonthRunId,
  parseSaveId,
  parseSaveRevision,
  type MonthRunId,
  type SaveId,
  type SaveRevision,
} from "@runtime-human/game-schema";

import {
  projectCommittedJanuaryProfessionalSourceV1,
} from "../january-1990/january-professional-experience-bridge";
import {
  createJanuary1990InitialSaveSnapshot,
  parseJanuary1990SaveSnapshot,
  type January1990SaveSnapshotV1,
} from "../january-1990/january-save-snapshot";

/**
 * PROG-01B2B is a NON-PERSISTED candidate contract.
 * Its fingerprint is deliberately different from January v1.
 * The production MonthRun cutover and atomic compare-and-swap belong to B2C.
 * Lab rules are not yet balanced or eligible to award professional grades.
 */
export type ProfessionalLegacyReceiptV1 = Readonly<{
  schemaVersion: "professional-legacy-january-receipt-v1";
  originalSaveId: SaveId;
  originalSaveRevision: SaveRevision;
  originalSnapshotSha256: string;
  originalRunId: MonthRunId;
  sourceFingerprint: string;
  assessmentStatus: "unassessed";
}>;

export type ProfessionalSaveCandidateV2 = Readonly<{
  schemaVersion: "professional-save-candidate-v2";
  january: January1990SaveSnapshotV1;
  professional: ProfessionalLabStateV1;
  legacyImport: ProfessionalLegacyReceiptV1 | null;
}>;

const CANDIDATE_FIELDS = Object.freeze([
  "january",
  "legacyImport",
  "professional",
  "schemaVersion",
]);
const RECEIPT_FIELDS = Object.freeze([
  "assessmentStatus",
  "originalRunId",
  "originalSaveId",
  "originalSaveRevision",
  "originalSnapshotSha256",
  "schemaVersion",
  "sourceFingerprint",
]);
const HASH_PATTERN = /^[0-9a-f]{64}$/u;

/** Isolated version marker, never equal to the old January v1 fingerprint. */
export const PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT = fingerprint(
  "professional-save-candidate-schema-v2",
  {
    schemaVersion: "professional-save-candidate-v2",
    fields: CANDIDATE_FIELDS,
    receiptFields: RECEIPT_FIELDS,
    januarySchema: "january-1990-save-snapshot-v1",
    professionalSchema: "professional-lab-state-v1",
    labRulesFingerprint: fingerprint("professional-lab-rules-v1", PROFESSIONAL_LAB_RULES_V1),
    legacyImportPolicy: "only-committed-unassessed-no-retroactive-gain",
  },
);

export function createFreshProfessionalSaveCandidateV2(
  reasoning: number,
  learning: number,
): ProfessionalSaveCandidateV2 {
  return parseProfessionalSaveCandidateV2({
    schemaVersion: "professional-save-candidate-v2",
    january: createJanuary1990InitialSaveSnapshot(),
    professional: createProfessionalLabStateV1(reasoning, learning),
    legacyImport: null,
  });
}

/**
 * Pure legacy committed-month preview. The source save is NEVER modified.
 * An import here preserves historical truth but credits zero professional points.
 */
export function prepareCommittedJanuaryProfessionalCandidateV2(
  originalSave: SaveRecordV1,
  reasoning: number,
  learning: number,
): ProfessionalSaveCandidateV2 {
  const save = parseSaveRecord(originalSave);
  const source = projectCommittedJanuaryProfessionalSourceV1(save);
  const january = parseJanuary1990SaveSnapshot(JSON.parse(save.snapshot.json) as unknown);

  return parseProfessionalSaveCandidateV2({
    schemaVersion: "professional-save-candidate-v2",
    january,
    professional: createProfessionalLabStateV1(reasoning, learning),
    legacyImport: {
      schemaVersion: "professional-legacy-january-receipt-v1",
      originalSaveId: save.saveId,
      originalSaveRevision: save.revision,
      originalSnapshotSha256: save.snapshot.sha256,
      originalRunId: save.lastCommittedRunId,
      sourceFingerprint: source.sourceFingerprint,
      assessmentStatus: "unassessed",
    },
  });
}

export function parseProfessionalSaveCandidateV2(value: unknown): ProfessionalSaveCandidateV2 {
  const raw = closedRecord(value, CANDIDATE_FIELDS, "candidate");
  if (raw.schemaVersion !== "professional-save-candidate-v2") {
    throw new TypeError("Professional candidate schema is incompatible");
  }

  const january = parseJanuary1990SaveSnapshot(raw.january);
  const professional = parseProfessionalLabStateV1(raw.professional);
  // This is an import/initialization contract, not a progression-commit contract.
  if (professional.lastEpisode !== null) {
    throw new TypeError("Professional candidate must not contain credited lab episodes");
  }

  const legacyImport = raw.legacyImport === null ? null : parseLegacyReceipt(raw.legacyImport);
  const completed = january.completedMonth;

  if (legacyImport === null && completed !== null) {
    throw new TypeError("Completed January history requires a legacy import receipt");
  }
  if (legacyImport !== null) {
    if (completed === null) {
      throw new TypeError("Legacy import receipt requires a completed January month");
    }
    if (
      legacyImport.originalRunId !== completed.runId ||
      legacyImport.originalSaveRevision !== completed.baseSaveRevision + 1
    ) {
      throw new TypeError("Legacy import receipt does not match committed January identity");
    }
    const januaryHash = sha256Hex(canonicalizeAuthoritative(january));
    if (legacyImport.originalSnapshotSha256 !== januaryHash) {
      throw new TypeError("Legacy import snapshot SHA-256 does not match source history");
    }
    const expectedSource = fingerprint("january-professional-committed-source-v1", {
      saveId: legacyImport.originalSaveId,
      runId: completed.runId,
      checkpointHash: completed.completedCheckpointHash,
      result: completed.terminalResult,
    });
    if (legacyImport.sourceFingerprint !== expectedSource) {
      throw new TypeError("Legacy source fingerprint does not match completed history");
    }
  }

  return Object.freeze({
    schemaVersion: "professional-save-candidate-v2",
    january,
    professional,
    legacyImport,
  });
}

function parseLegacyReceipt(value: unknown): ProfessionalLegacyReceiptV1 {
  const raw = closedRecord(value, RECEIPT_FIELDS, "legacy import receipt");
  if (
    raw.schemaVersion !== "professional-legacy-january-receipt-v1" ||
    raw.assessmentStatus !== "unassessed"
  ) {
    throw new TypeError("Legacy import cannot claim assessed experience or awarded grade");
  }
  return Object.freeze({
    schemaVersion: "professional-legacy-january-receipt-v1",
    originalSaveId: parseSaveId(raw.originalSaveId),
    originalSaveRevision: parseSaveRevision(raw.originalSaveRevision),
    originalSnapshotSha256: sha256(raw.originalSnapshotSha256, "snapshot"),
    originalRunId: parseMonthRunId(raw.originalRunId),
    sourceFingerprint: sha256(raw.sourceFingerprint, "source"),
    assessmentStatus: "unassessed",
  });
}

function sha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new TypeError(`Legacy import ${label} fingerprint is invalid`);
  }
  return value;
}

function closedRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`Professional ${label} must be a plain JSON object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`Professional ${label} has unknown or missing fields`);
  }
  return value as Readonly<Record<string, unknown>>;
}
