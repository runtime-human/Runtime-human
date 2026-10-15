import {
  canonicalizeAuthoritative,
  createProfessionalLabStateV1,
  fingerprint,
  parseProfessionalLabStateV1,
  sha256Hex,
  PROFESSIONAL_LAB_ALGORITHM_VERSION_V1,
  PROFESSIONAL_LAB_RULES_V1,
  PROFESSIONAL_LAB_STATE_MANIFEST_V1,
  type ProfessionalLabStateV1,
} from "@runtime-human/game-core";
import { parseSaveRecord, type SaveRecordV1 } from "@runtime-human/game-persistence-contracts";
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
  requireCommittedJanuaryMonthEvidenceV1,
} from "../january-1990/january-professional-experience-bridge";
import {
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  parseJanuary1990SaveSnapshot,
  type January1990SaveSnapshotV1,
} from "../january-1990/january-save-snapshot";

/**
 * PROG-01B2B is a NON-PERSISTED candidate contract.
 * Its fingerprint is deliberately different from January v1.
 * The production MonthRun cutover and atomic compare-and-swap belong to B2C.
 * Lab rules are not yet balanced or eligible to award professional grades.
 *
 * The legacy receipt is a SELF-CONSISTENCY record, not proof of authenticity:
 * anyone able to build a full candidate can build a consistent receipt. B2C
 * must re-derive the candidate from the stored January save inside the atomic
 * compare-and-swap (and check the MonthRun checkpoint row) before writing.
 * See docs/persistence/SAVE-COMPATIBILITY.md.
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

/**
 * Isolated structural version marker, never equal to the old January v1
 * fingerprint. It covers the candidate/receipt field sets, the January v1
 * save-schema fingerprint, the lab-state field/bound/skill manifest, the
 * snapshot hash domain and the import policy. It does NOT cover numeric
 * rules (see the rules fingerprint below).
 */
export const PROFESSIONAL_SAVE_CANDIDATE_V2_FINGERPRINT = fingerprint(
  "professional-save-candidate-schema-v2",
  {
    schemaVersion: "professional-save-candidate-v2",
    fields: CANDIDATE_FIELDS,
    receiptFields: RECEIPT_FIELDS,
    januarySchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    professionalState: PROFESSIONAL_LAB_STATE_MANIFEST_V1,
    receiptSnapshotHashDomain: "sha256(canonicalizeAuthoritative(january-snapshot))",
    legacyImportPolicy: "only-committed-unassessed-no-retroactive-gain",
  },
);

/**
 * Semantic rules marker: the numeric lab rules table plus the apply-algorithm
 * version token. Tuning or a formula change alters this hash without altering
 * the structural schema hash above.
 */
export const PROFESSIONAL_SAVE_CANDIDATE_V2_RULES_FINGERPRINT = fingerprint(
  "professional-lab-rules-v1",
  {
    algorithm: PROFESSIONAL_LAB_ALGORITHM_VERSION_V1,
    rules: PROFESSIONAL_LAB_RULES_V1,
  },
);

/**
 * The single sanctioned aptitude value for a professional upgrade until character
 * creation (ADR-021 section 8 new-game screen) defines a canonical source. Aptitudes
 * are hidden authoritative state: neither the caller nor quality scores may choose
 * them. Must stay identical to `PROFESSIONAL_CANONICAL_DEFAULT_APTITUDE` in
 * `professional_upgrade_contract.rs`, which rejects any other value in the upgrade
 * command and in the recovery scan. Deliberately outside both fingerprints: changing
 * it is an owner-gated decision that must update both languages together.
 */
export const PROFESSIONAL_CANONICAL_DEFAULT_APTITUDES_V1 = Object.freeze({
  reasoning: 500,
  learning: 500,
});

export type ProfessionalImportRefusalReason =
  | "nothing-to-import"
  | "non-canonical-source-snapshot"
  | "incompatible-source";

/** Typed refusal so preflight can report a precise reason without message sniffing. */
export class ProfessionalImportRefusedError extends TypeError {
  readonly reason: ProfessionalImportRefusalReason;

  constructor(reason: ProfessionalImportRefusalReason, message: string) {
    super(message);
    this.name = "ProfessionalImportRefusedError";
    this.reason = reason;
  }
}

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
  // Caller errors first: invalid aptitudes throw a plain TypeError before any save is read.
  const professional = createProfessionalLabStateV1(reasoning, learning);
  const save = parseSaveRecord(originalSave);
  refuseIdleJanuarySave(save);
  const source = projectCommittedJanuaryProfessionalSourceV1(save);
  const january = parseJanuary1990SaveSnapshot(JSON.parse(save.snapshot.json) as unknown);
  // The receipt hash domain is the canonical snapshot form. A valid but differently
  // serialized v1 payload must be refused explicitly, never silently mis-hashed.
  if (sha256Hex(canonicalizeAuthoritative(january)) !== save.snapshot.sha256) {
    throw new ProfessionalImportRefusedError(
      "non-canonical-source-snapshot",
      "January save payload is valid but not canonically serialized; it cannot be imported",
    );
  }

  return parseProfessionalSaveCandidateV2({
    schemaVersion: "professional-save-candidate-v2",
    january,
    professional,
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

/** An intact January v1 save with no completed month has no history to import. */
function refuseIdleJanuarySave(save: SaveRecordV1): void {
  if (
    save.saveSchemaFingerprint !== JANUARY_1990_SAVE_SCHEMA_FINGERPRINT ||
    sha256Hex(save.snapshot.json) !== save.snapshot.sha256
  ) {
    return; // the source projection reports the precise incompatibility
  }
  let snapshot: January1990SaveSnapshotV1;
  try {
    snapshot = parseJanuary1990SaveSnapshot(JSON.parse(save.snapshot.json) as unknown);
  } catch {
    return;
  }
  if (snapshot.completedMonth === null) {
    throw new ProfessionalImportRefusedError(
      "nothing-to-import",
      "January save has no completed month to import",
    );
  }
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
    // A stored v1 wrapper alone is insufficient: validate provider outcome semantics,
    // canonical skill evidence and the stored programming outcome.
    requireCommittedJanuaryMonthEvidenceV1(completed);
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
  const actual = Object.keys(value).toSorted();
  const expected = [...fields].toSorted();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`Professional ${label} has unknown or missing fields`);
  }
  return value as Readonly<Record<string, unknown>>;
}
