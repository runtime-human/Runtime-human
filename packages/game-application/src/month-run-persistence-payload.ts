import {
  canonicalizeAuthoritative,
  checkMonthRunCompatibility,
  fingerprint,
  restoreMonthRunCheckpoint,
  sha256Hex,
  transitionMonthRun,
  type MonthRunCompatibilityField,
} from "@runtime-human/game-core";
import {
  parseRequestId,
  type AuthoritativeJsonValue,
  type BeginMonthCommandV1,
  type Fingerprint,
  type MonthRunCheckpointV1,
  type MonthRunId,
  type MonthRunRevision,
  type RequestId,
} from "@runtime-human/game-schema";
import {
  parseBeginPersistedMonthRunCommand,
  parseCanonicalPayload,
  parseCommitPersistedMonthRunCommand,
  parseStoreMonthRunBoundaryCommand,
  type BeginPersistedMonthRunCommandV1,
  type CanonicalPayloadV1,
  type CommitPersistedMonthRunCommandV1,
  type MonthRunRecordV1,
  type StorableMonthRunBoundaryStatus,
  type StoreMonthRunBoundaryCommandV1,
} from "@runtime-human/game-persistence-contracts";

export type PersistenceReceiptStage =
  | "begin"
  | "begin-boundary"
  | "resume-boundary"
  | "recovery-boundary"
  | "commit";

export type DerivePersistenceRequestIdInput = Readonly<{
  stage: PersistenceReceiptStage;
  outerRequestId: RequestId | null;
  runId: MonthRunId;
  sourceRunRevision: MonthRunRevision;
  sourceCheckpointHash: Fingerprint;
}>;

export type RestorePersistedCheckpointResult =
  | Readonly<{ kind: "ok"; checkpoint: MonthRunCheckpointV1 }>
  | Readonly<{
      kind: "blocked";
      code:
        | "PayloadHashMismatch"
        | "CorruptedCheckpoint"
        | "StoredRecordMismatch"
        | "IncompatibleCheckpoint";
      message: string;
      mismatches?: readonly MonthRunCompatibilityField[];
    }>;

export function createCanonicalPayload(value: unknown): CanonicalPayloadV1 {
  const json = canonicalizeAuthoritative(value);
  return parseCanonicalPayload({
    schemaVersion: "canonical-payload-v1",
    json,
    sha256: sha256Hex(json),
  });
}

export function derivePersistenceRequestId(
  input: DerivePersistenceRequestIdInput,
): RequestId {
  return parseRequestId(
    fingerprint("persisted-month-run-receipt-v1", {
      stage: input.stage,
      outerRequestId: input.outerRequestId,
      runId: input.runId,
      sourceRunRevision: input.sourceRunRevision,
      sourceCheckpointHash: input.sourceCheckpointHash,
    }),
  );
}

export function buildBeginPersistedMonthRunCommand(
  command: BeginMonthCommandV1,
  checkpoint: MonthRunCheckpointV1,
): BeginPersistedMonthRunCommandV1 {
  return parseBeginPersistedMonthRunCommand({
    schemaVersion: "begin-persisted-month-run-command-v1",
    requestId: derivePersistenceRequestId({
      stage: "begin",
      outerRequestId: command.requestId,
      runId: checkpoint.runId,
      sourceRunRevision: checkpoint.runRevision,
      sourceCheckpointHash: checkpoint.checkpointHash,
    }),
    saveId: command.saveId,
    expectedSaveRevision: command.expectedSaveRevision,
    runId: command.runId,
    checkpoint: createCanonicalPayload(checkpoint),
    compatibility: createCanonicalPayload(checkpoint.compatibility),
  });
}

export function buildStoreMonthRunBoundaryCommand(input: Readonly<{
  stage: Extract<
    PersistenceReceiptStage,
    "begin-boundary" | "resume-boundary" | "recovery-boundary"
  >;
  outerRequestId: RequestId | null;
  source: MonthRunRecordV1;
  checkpoint: MonthRunCheckpointV1;
}>): StoreMonthRunBoundaryCommandV1 {
  const status = requireStorableBoundary(input.checkpoint.status);
  return parseStoreMonthRunBoundaryCommand({
    schemaVersion: "store-month-run-boundary-command-v1",
    requestId: derivePersistenceRequestId({
      stage: input.stage,
      outerRequestId: input.outerRequestId,
      runId: input.source.runId,
      sourceRunRevision: input.source.runRevision,
      sourceCheckpointHash: input.source.checkpointHash,
    }),
    saveId: input.source.saveId,
    runId: input.source.runId,
    expectedRunRevision: input.source.runRevision,
    expectedCheckpointPayloadSha256: input.source.checkpoint.sha256,
    expectedCheckpointHash: input.source.checkpointHash,
    runRevision: input.checkpoint.runRevision,
    status,
    checkpoint: createCanonicalPayload(input.checkpoint),
  });
}

export function createCommittedCheckpoint(
  completedCheckpoint: MonthRunCheckpointV1,
): MonthRunCheckpointV1 {
  const transition = transitionMonthRun(completedCheckpoint, { type: "mark-committed" });
  if (transition.kind === "rejected") {
    throw new TypeError(`Completed MonthRun cannot be committed: ${transition.error.message}`);
  }
  if (transition.kind === "duplicate") {
    throw new TypeError(
      "Completed MonthRun commit transition was unexpectedly classified as duplicate",
    );
  }
  return transition.checkpoint;
}

export function buildCommitPersistedMonthRunCommand(input: Readonly<{
  source: MonthRunRecordV1;
  committedCheckpoint: MonthRunCheckpointV1;
  snapshot: AuthoritativeJsonValue;
  result: AuthoritativeJsonValue;
}>): CommitPersistedMonthRunCommandV1 {
  return parseCommitPersistedMonthRunCommand({
    schemaVersion: "commit-persisted-month-run-command-v1",
    requestId: derivePersistenceRequestId({
      stage: "commit",
      outerRequestId: null,
      runId: input.source.runId,
      sourceRunRevision: input.source.runRevision,
      sourceCheckpointHash: input.source.checkpointHash,
    }),
    saveId: input.source.saveId,
    runId: input.source.runId,
    expectedSaveRevision: input.source.baseSaveRevision,
    expectedRunRevision: input.source.runRevision,
    expectedCheckpointPayloadSha256: input.source.checkpoint.sha256,
    expectedCheckpointHash: input.source.checkpointHash,
    committedCheckpoint: createCanonicalPayload(input.committedCheckpoint),
    snapshot: createCanonicalPayload(input.snapshot),
    result: createCanonicalPayload(input.result),
  });
}

export function restorePersistedCheckpoint(
  record: MonthRunRecordV1,
  expectedCompatibility: MonthRunCheckpointV1["compatibility"],
): RestorePersistedCheckpointResult {
  if (sha256Hex(record.checkpoint.json) !== record.checkpoint.sha256) {
    return blocked("PayloadHashMismatch", "Stored MonthRun checkpoint payload hash is invalid");
  }
  if (sha256Hex(record.compatibility.json) !== record.compatibility.sha256) {
    return blocked("PayloadHashMismatch", "Stored MonthRun compatibility payload hash is invalid");
  }

  let value: unknown;
  let persistedCompatibility: unknown;
  try {
    value = JSON.parse(record.checkpoint.json) as unknown;
    persistedCompatibility = JSON.parse(record.compatibility.json) as unknown;
  } catch {
    return blocked("CorruptedCheckpoint", "Stored MonthRun payload is not valid JSON");
  }

  const restored = restoreMonthRunCheckpoint(value);
  if (restored.kind === "error") {
    return blocked("CorruptedCheckpoint", restored.message);
  }
  const checkpoint = restored.checkpoint;
  if (
    checkpoint.runId !== record.runId ||
    checkpoint.saveId !== record.saveId ||
    checkpoint.baseSaveRevision !== record.baseSaveRevision ||
    checkpoint.runRevision !== record.runRevision ||
    checkpoint.status !== record.status ||
    checkpoint.checkpointHash !== record.checkpointHash ||
    checkpoint.previousCheckpointHash !== record.previousCheckpointHash
  ) {
    return blocked("StoredRecordMismatch", "Stored MonthRun row does not match its checkpoint");
  }
  if (
    canonicalizeAuthoritative(persistedCompatibility) !==
    canonicalizeAuthoritative(checkpoint.compatibility)
  ) {
    return blocked(
      "StoredRecordMismatch",
      "Stored MonthRun compatibility envelope does not match its checkpoint",
    );
  }

  const compatibility = checkMonthRunCompatibility(checkpoint.compatibility, expectedCompatibility);
  if (compatibility.kind === "incompatible") {
    return {
      kind: "blocked",
      code: "IncompatibleCheckpoint",
      message: "Stored MonthRun is incompatible with the current runtime",
      mismatches: compatibility.mismatches,
    };
  }
  return { kind: "ok", checkpoint };
}

export function checkpointsEqual(
  record: MonthRunRecordV1,
  checkpoint: MonthRunCheckpointV1,
): boolean {
  const payload = createCanonicalPayload(checkpoint);
  return (
    record.runRevision === checkpoint.runRevision &&
    record.status === checkpoint.status &&
    record.checkpointHash === checkpoint.checkpointHash &&
    record.checkpoint.sha256 === payload.sha256 &&
    record.checkpoint.json === payload.json
  );
}

function requireStorableBoundary(
  status: MonthRunCheckpointV1["status"],
): StorableMonthRunBoundaryStatus {
  switch (status) {
    case "suspended":
    case "completed":
    case "failed":
    case "incompatible":
    case "recovery-required":
    case "abandoned":
      return status;
    case "ready":
    case "running":
    case "committed":
      throw new TypeError(`MonthRun status ${status} is not a storable boundary`);
  }
}

function blocked(
  code: Exclude<RestorePersistedCheckpointResult, { kind: "ok" }>["code"],
  message: string,
): RestorePersistedCheckpointResult {
  return { kind: "blocked", code, message };
}
