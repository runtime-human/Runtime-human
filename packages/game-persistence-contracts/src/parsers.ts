import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type Fingerprint,
} from "@runtime-human/game-schema";

import {
  MAX_CANONICAL_PAYLOAD_BYTES,
  type BeginPersistedMonthRunCommandV1,
  type CanonicalPayloadV1,
  type CommitPersistedMonthRunCommandV1,
  type CreateBackupCommandV1,
  type CreateSaveCommandV1,
  type DurableMonthRunStatus,
  type GetRecoveryStatusQueryV1,
  type LoadActiveMonthRunQueryV1,
  type LoadMonthRunQueryV1,
  type LoadSaveQueryV1,
  type Sha256Hex,
  type StorableMonthRunBoundaryStatus,
  type StoreMonthRunBoundaryCommandV1,
} from "./contracts";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DURABLE_STATUSES = new Set<DurableMonthRunStatus>([
  "ready",
  "suspended",
  "completed",
  "committed",
  "failed",
  "incompatible",
  "recovery-required",
  "abandoned",
]);
const STORABLE_BOUNDARY_STATUSES = new Set<StorableMonthRunBoundaryStatus>([
  "suspended",
  "completed",
  "failed",
  "incompatible",
  "recovery-required",
  "abandoned",
]);

const CANONICAL_PAYLOAD_KEYS = ["schemaVersion", "json", "sha256"] as const;
const CREATE_SAVE_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "saveSchemaFingerprint",
  "snapshot",
] as const;
const LOAD_SAVE_KEYS = ["schemaVersion", "saveId"] as const;
const BEGIN_MONTH_RUN_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "expectedSaveRevision",
  "runId",
  "checkpoint",
  "compatibility",
] as const;
const LOAD_MONTH_RUN_KEYS = ["schemaVersion", "runId"] as const;
const LOAD_ACTIVE_RUN_KEYS = ["schemaVersion", "saveId"] as const;
const STORE_BOUNDARY_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "runId",
  "expectedRunRevision",
  "expectedCheckpointPayloadSha256",
  "expectedCheckpointHash",
  "runRevision",
  "status",
  "checkpoint",
] as const;
const COMMIT_MONTH_RUN_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "runId",
  "expectedSaveRevision",
  "expectedRunRevision",
  "expectedCheckpointPayloadSha256",
  "expectedCheckpointHash",
  "snapshot",
  "result",
] as const;
const CREATE_BACKUP_KEYS = ["schemaVersion", "requestId", "saveId"] as const;
const RECOVERY_STATUS_KEYS = ["schemaVersion"] as const;

export type PersistenceCheckpointIdentity = Readonly<{
  saveId: ReturnType<typeof parseSaveId>;
  runId: ReturnType<typeof parseMonthRunId>;
  baseSaveRevision: ReturnType<typeof parseSaveRevision>;
  runRevision: ReturnType<typeof parseMonthRunRevision>;
  status: DurableMonthRunStatus;
  compatibility: unknown;
  previousCheckpointHash: Fingerprint | null;
  checkpointHash: Fingerprint;
}>;

export function parseSha256Hex(value: unknown, name = "SHA-256"): Sha256Hex {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a lowercase SHA-256 value`);
  }
  return value as Sha256Hex;
}

export function parseFingerprint(value: unknown, name = "fingerprint"): Fingerprint {
  return parseSha256Hex(value, name) as Fingerprint;
}

export function parseCanonicalPayload(value: unknown): CanonicalPayloadV1 {
  const record = expectRecord(value, "canonical payload");
  assertExactKeys(record, CANONICAL_PAYLOAD_KEYS, "canonical payload");
  requireSchema(record.schemaVersion, "canonical-payload-v1", "canonical payload");

  const json = expectString(record.json, "canonical payload JSON");
  if (utf8ByteLength(json) > MAX_CANONICAL_PAYLOAD_BYTES) {
    throw new RangeError(`Canonical payload byte limit is ${MAX_CANONICAL_PAYLOAD_BYTES}`);
  }
  parseJson(json, "canonical payload JSON");

  return {
    schemaVersion: "canonical-payload-v1",
    json,
    sha256: parseSha256Hex(record.sha256, "canonical payload sha256"),
  };
}

export function parseCreateSaveCommand(value: unknown): CreateSaveCommandV1 {
  const record = exactRecord(value, CREATE_SAVE_KEYS, "create save command");
  requireSchema(record.schemaVersion, "create-save-command-v1", "create save command");
  return {
    schemaVersion: "create-save-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
    saveSchemaFingerprint: parseFingerprint(record.saveSchemaFingerprint, "save schema fingerprint"),
    snapshot: parseCanonicalPayload(record.snapshot),
  };
}

export function parseLoadSaveQuery(value: unknown): LoadSaveQueryV1 {
  const record = exactRecord(value, LOAD_SAVE_KEYS, "load save query");
  requireSchema(record.schemaVersion, "load-save-query-v1", "load save query");
  return { schemaVersion: "load-save-query-v1", saveId: parseSaveId(record.saveId) };
}

export function parseBeginPersistedMonthRunCommand(
  value: unknown,
): BeginPersistedMonthRunCommandV1 {
  const record = exactRecord(value, BEGIN_MONTH_RUN_KEYS, "begin persisted MonthRun command");
  requireSchema(
    record.schemaVersion,
    "begin-persisted-month-run-command-v1",
    "begin persisted MonthRun command",
  );

  const saveId = parseSaveId(record.saveId);
  const expectedSaveRevision = parseSaveRevision(record.expectedSaveRevision);
  const runId = parseMonthRunId(record.runId);
  const checkpoint = parseCanonicalPayload(record.checkpoint);
  const compatibility = parseCanonicalPayload(record.compatibility);
  const identity = parsePersistenceCheckpointIdentity(checkpoint.json);

  if (identity.saveId !== saveId) {
    throw new TypeError("MonthRun checkpoint saveId must match the begin command");
  }
  if (identity.runId !== runId) {
    throw new TypeError("MonthRun checkpoint runId must match the begin command");
  }
  if (identity.baseSaveRevision !== expectedSaveRevision) {
    throw new TypeError("MonthRun checkpoint baseSaveRevision must match expectedSaveRevision");
  }
  if (identity.runRevision !== 0 || identity.status !== "ready") {
    throw new TypeError("Begin command requires a ready MonthRun checkpoint at revision zero");
  }
  if (identity.previousCheckpointHash !== null) {
    throw new TypeError("Initial MonthRun checkpoint cannot reference a previous checkpoint");
  }
  if (!jsonValuesEqual(identity.compatibility, parseJson(compatibility.json, "compatibility"))) {
    throw new TypeError("MonthRun checkpoint compatibility must match the begin command");
  }

  return {
    schemaVersion: "begin-persisted-month-run-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId,
    expectedSaveRevision,
    runId,
    checkpoint,
    compatibility,
  };
}

export function parseLoadMonthRunQuery(value: unknown): LoadMonthRunQueryV1 {
  const record = exactRecord(value, LOAD_MONTH_RUN_KEYS, "load MonthRun query");
  requireSchema(record.schemaVersion, "load-month-run-query-v1", "load MonthRun query");
  return { schemaVersion: "load-month-run-query-v1", runId: parseMonthRunId(record.runId) };
}

export function parseLoadActiveMonthRunQuery(value: unknown): LoadActiveMonthRunQueryV1 {
  const record = exactRecord(value, LOAD_ACTIVE_RUN_KEYS, "load active MonthRun query");
  requireSchema(
    record.schemaVersion,
    "load-active-month-run-query-v1",
    "load active MonthRun query",
  );
  return {
    schemaVersion: "load-active-month-run-query-v1",
    saveId: parseSaveId(record.saveId),
  };
}

export function parseStoreMonthRunBoundaryCommand(
  value: unknown,
): StoreMonthRunBoundaryCommandV1 {
  const record = exactRecord(value, STORE_BOUNDARY_KEYS, "store MonthRun boundary command");
  requireSchema(
    record.schemaVersion,
    "store-month-run-boundary-command-v1",
    "store MonthRun boundary command",
  );

  const saveId = parseSaveId(record.saveId);
  const runId = parseMonthRunId(record.runId);
  const expectedRunRevision = parseMonthRunRevision(record.expectedRunRevision);
  const expectedCheckpointPayloadSha256 = parseSha256Hex(
    record.expectedCheckpointPayloadSha256,
    "expected checkpoint payload sha256",
  );
  const expectedCheckpointHash = parseFingerprint(
    record.expectedCheckpointHash,
    "expected checkpoint hash",
  );
  const runRevision = parseMonthRunRevision(record.runRevision);
  if (runRevision <= expectedRunRevision) {
    throw new RangeError("Stored MonthRun revision must be newer than the expected revision");
  }

  const status = parseStorableBoundaryStatus(record.status);
  const checkpoint = parseCanonicalPayload(record.checkpoint);
  const identity = parsePersistenceCheckpointIdentity(checkpoint.json);
  if (identity.saveId !== saveId) {
    throw new TypeError("MonthRun checkpoint saveId must match the boundary command");
  }
  if (identity.runId !== runId) {
    throw new TypeError("MonthRun checkpoint runId must match the boundary command");
  }
  if (identity.runRevision !== runRevision) {
    throw new TypeError("MonthRun checkpoint runRevision must match the boundary command");
  }
  if (identity.status !== status) {
    throw new TypeError("MonthRun checkpoint status must match the boundary command");
  }

  return {
    schemaVersion: "store-month-run-boundary-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId,
    runId,
    expectedRunRevision,
    expectedCheckpointPayloadSha256,
    expectedCheckpointHash,
    runRevision,
    status,
    checkpoint,
  };
}

export function parseCommitPersistedMonthRunCommand(
  value: unknown,
): CommitPersistedMonthRunCommandV1 {
  const record = exactRecord(value, COMMIT_MONTH_RUN_KEYS, "commit persisted MonthRun command");
  requireSchema(
    record.schemaVersion,
    "commit-persisted-month-run-command-v1",
    "commit persisted MonthRun command",
  );
  return {
    schemaVersion: "commit-persisted-month-run-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
    runId: parseMonthRunId(record.runId),
    expectedSaveRevision: parseSaveRevision(record.expectedSaveRevision),
    expectedRunRevision: parseMonthRunRevision(record.expectedRunRevision),
    expectedCheckpointPayloadSha256: parseSha256Hex(
      record.expectedCheckpointPayloadSha256,
      "expected checkpoint payload sha256",
    ),
    expectedCheckpointHash: parseFingerprint(record.expectedCheckpointHash, "expected checkpoint hash"),
    snapshot: parseCanonicalPayload(record.snapshot),
    result: parseCanonicalPayload(record.result),
  };
}

export function parseCreateBackupCommand(value: unknown): CreateBackupCommandV1 {
  const record = exactRecord(value, CREATE_BACKUP_KEYS, "create backup command");
  requireSchema(record.schemaVersion, "create-backup-command-v1", "create backup command");
  return {
    schemaVersion: "create-backup-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
  };
}

export function parseGetRecoveryStatusQuery(value: unknown): GetRecoveryStatusQueryV1 {
  const record = exactRecord(value, RECOVERY_STATUS_KEYS, "get recovery status query");
  requireSchema(
    record.schemaVersion,
    "get-recovery-status-query-v1",
    "get recovery status query",
  );
  return { schemaVersion: "get-recovery-status-query-v1" };
}

export function parsePersistenceCheckpointIdentity(json: string): PersistenceCheckpointIdentity {
  const record = expectRecord(parseJson(json, "MonthRun checkpoint"), "MonthRun checkpoint");
  if (record.schemaVersion !== "month-run-checkpoint-v1") {
    throw new TypeError("Canonical checkpoint payload must use month-run-checkpoint-v1");
  }
  if (!("compatibility" in record)) {
    throw new TypeError("MonthRun checkpoint compatibility is required");
  }
  return {
    saveId: parseSaveId(record.saveId),
    runId: parseMonthRunId(record.runId),
    baseSaveRevision: parseSaveRevision(record.baseSaveRevision),
    runRevision: parseMonthRunRevision(record.runRevision),
    status: parseDurableStatus(record.status),
    compatibility: record.compatibility,
    previousCheckpointHash:
      record.previousCheckpointHash === null
        ? null
        : parseFingerprint(record.previousCheckpointHash, "previous checkpoint hash"),
    checkpointHash: parseFingerprint(record.checkpointHash, "checkpoint hash"),
  };
}

function parseDurableStatus(value: unknown): DurableMonthRunStatus {
  if (typeof value !== "string" || !DURABLE_STATUSES.has(value as DurableMonthRunStatus)) {
    throw new TypeError("Status must be a durable MonthRun status");
  }
  return value as DurableMonthRunStatus;
}

function parseStorableBoundaryStatus(value: unknown): StorableMonthRunBoundaryStatus {
  if (
    typeof value !== "string" ||
    !STORABLE_BOUNDARY_STATUSES.has(value as StorableMonthRunBoundaryStatus)
  ) {
    throw new TypeError("Status must be a storable MonthRun boundary");
  }
  return value as StorableMonthRunBoundaryStatus;
}

function parseJson(json: string, name: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new TypeError(`${name} must contain valid JSON`);
  }
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    );
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && jsonValuesEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function utf8ByteLength(value: string): number {
  let size = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    size += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return size;
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  name: string,
): Readonly<Record<string, unknown>> {
  const record = expectRecord(value, name);
  const keys = Object.keys(record);
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    throw new TypeError(`${name} contains unknown or missing fields`);
  }
  return record;
}

function expectRecord(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function expectString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function requireSchema(actual: unknown, expected: string, name: string): void {
  if (actual !== expected) {
    throw new TypeError(`${name} must use ${expected}`);
  }
}
