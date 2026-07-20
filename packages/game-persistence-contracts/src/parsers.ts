import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import {
  MAX_CANONICAL_PAYLOAD_BYTES,
  type BeginPersistedMonthRunCommandV1,
  type CanonicalPayloadV1,
  type CommitPersistedMonthRunCommandV1,
  type CreateBackupCommandV1,
  type CreateSaveCommandV1,
  type DurableMonthRunStatus,
  type LoadActiveMonthRunQueryV1,
  type LoadSaveQueryV1,
  type Sha256Hex,
  type StoreMonthRunBoundaryCommandV1,
} from "./contracts";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DURABLE_STATUSES = new Set<DurableMonthRunStatus>([
  "ready",
  "suspended",
  "completed",
  "failed",
  "incompatible",
  "recovery-required",
  "abandoned",
]);

const CANONICAL_PAYLOAD_KEYS = ["schemaVersion", "json", "sha256"] as const;
const CREATE_SAVE_KEYS = ["schemaVersion", "requestId", "saveId", "snapshot"] as const;
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
const LOAD_ACTIVE_RUN_KEYS = ["schemaVersion", "saveId"] as const;
const STORE_BOUNDARY_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "runId",
  "expectedRunRevision",
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
  "snapshot",
  "result",
] as const;
const CREATE_BACKUP_KEYS = ["schemaVersion", "requestId", "saveId"] as const;

type CheckpointIdentity = Readonly<{
  saveId: string;
  runId: string;
  baseSaveRevision: number;
  runRevision: number;
  status: DurableMonthRunStatus;
  compatibility: unknown;
}>;

export function parseCanonicalPayload(value: unknown): CanonicalPayloadV1 {
  const record = expectRecord(value, "canonical payload");
  assertExactKeys(record, CANONICAL_PAYLOAD_KEYS, "canonical payload");
  if (record.schemaVersion !== "canonical-payload-v1") {
    throw new TypeError("Unsupported canonical payload schema");
  }
  const json = expectString(record.json, "canonical payload JSON");
  if (utf8ByteLength(json) > MAX_CANONICAL_PAYLOAD_BYTES) {
    throw new RangeError(`Canonical payload byte limit is ${MAX_CANONICAL_PAYLOAD_BYTES}`);
  }
  try {
    JSON.parse(json);
  } catch {
    throw new TypeError("Canonical payload must contain valid JSON");
  }
  return {
    schemaVersion: "canonical-payload-v1",
    json,
    sha256: parseSha256(record.sha256, "canonical payload sha256"),
  };
}

export function parseCreateSaveCommand(value: unknown): CreateSaveCommandV1 {
  const record = expectRecord(value, "create save command");
  assertExactKeys(record, CREATE_SAVE_KEYS, "create save command");
  if (record.schemaVersion !== "create-save-command-v1") {
    throw new TypeError("Unsupported create save command schema");
  }
  return {
    schemaVersion: "create-save-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
    snapshot: parseCanonicalPayload(record.snapshot),
  };
}

export function parseLoadSaveQuery(value: unknown): LoadSaveQueryV1 {
  const record = expectRecord(value, "load save query");
  assertExactKeys(record, LOAD_SAVE_KEYS, "load save query");
  if (record.schemaVersion !== "load-save-query-v1") {
    throw new TypeError("Unsupported load save query schema");
  }
  return {
    schemaVersion: "load-save-query-v1",
    saveId: parseSaveId(record.saveId),
  };
}

export function parseBeginPersistedMonthRunCommand(
  value: unknown,
): BeginPersistedMonthRunCommandV1 {
  const record = expectRecord(value, "begin persisted MonthRun command");
  assertExactKeys(record, BEGIN_MONTH_RUN_KEYS, "begin persisted MonthRun command");
  if (record.schemaVersion !== "begin-persisted-month-run-command-v1") {
    throw new TypeError("Unsupported begin persisted MonthRun command schema");
  }

  const saveId = parseSaveId(record.saveId);
  const expectedSaveRevision = parseSaveRevision(record.expectedSaveRevision);
  const runId = parseMonthRunId(record.runId);
  const checkpoint = parseCanonicalPayload(record.checkpoint);
  const compatibility = parseCanonicalPayload(record.compatibility);
  const checkpointIdentity = parseCheckpointIdentity(checkpoint.json);

  if (checkpointIdentity.saveId !== saveId) {
    throw new TypeError("MonthRun checkpoint saveId must match the begin command");
  }
  if (checkpointIdentity.runId !== runId) {
    throw new TypeError("MonthRun checkpoint runId must match the begin command");
  }
  if (checkpointIdentity.baseSaveRevision !== expectedSaveRevision) {
    throw new TypeError("MonthRun checkpoint baseSaveRevision must match expectedSaveRevision");
  }
  if (checkpointIdentity.runRevision !== 0 || checkpointIdentity.status !== "ready") {
    throw new TypeError("Begin command requires a ready MonthRun checkpoint at revision zero");
  }
  if (!jsonValuesEqual(checkpointIdentity.compatibility, parseJson(compatibility.json))) {
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

export function parseLoadActiveMonthRunQuery(value: unknown): LoadActiveMonthRunQueryV1 {
  const record = expectRecord(value, "load active MonthRun query");
  assertExactKeys(record, LOAD_ACTIVE_RUN_KEYS, "load active MonthRun query");
  if (record.schemaVersion !== "load-active-month-run-query-v1") {
    throw new TypeError("Unsupported load active MonthRun query schema");
  }
  return {
    schemaVersion: "load-active-month-run-query-v1",
    saveId: parseSaveId(record.saveId),
  };
}

export function parseStoreMonthRunBoundaryCommand(value: unknown): StoreMonthRunBoundaryCommandV1 {
  const record = expectRecord(value, "store MonthRun boundary command");
  assertExactKeys(record, STORE_BOUNDARY_KEYS, "store MonthRun boundary command");
  if (record.schemaVersion !== "store-month-run-boundary-command-v1") {
    throw new TypeError("Unsupported store MonthRun boundary command schema");
  }

  const saveId = parseSaveId(record.saveId);
  const runId = parseMonthRunId(record.runId);
  const status = parseDurableStatus(record.status);
  const expectedRunRevision = parseMonthRunRevision(record.expectedRunRevision);
  const runRevision = parseMonthRunRevision(record.runRevision);
  if (runRevision <= expectedRunRevision) {
    throw new RangeError("Stored MonthRun revision must be newer than the expected revision");
  }
  const checkpoint = parseCanonicalPayload(record.checkpoint);
  const checkpointIdentity = parseCheckpointIdentity(checkpoint.json);

  if (checkpointIdentity.saveId !== saveId) {
    throw new TypeError("MonthRun checkpoint saveId must match the boundary command");
  }
  if (checkpointIdentity.runId !== runId) {
    throw new TypeError("MonthRun checkpoint runId must match the boundary command");
  }
  if (checkpointIdentity.runRevision !== runRevision) {
    throw new TypeError("MonthRun checkpoint runRevision must match the boundary command");
  }
  if (checkpointIdentity.status !== status) {
    throw new TypeError("MonthRun checkpoint status must match the boundary command");
  }

  return {
    schemaVersion: "store-month-run-boundary-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId,
    runId,
    expectedRunRevision,
    runRevision,
    status,
    checkpoint,
  };
}

export function parseCommitPersistedMonthRunCommand(
  value: unknown,
): CommitPersistedMonthRunCommandV1 {
  const record = expectRecord(value, "commit persisted MonthRun command");
  assertExactKeys(record, COMMIT_MONTH_RUN_KEYS, "commit persisted MonthRun command");
  if (record.schemaVersion !== "commit-persisted-month-run-command-v1") {
    throw new TypeError("Unsupported commit persisted MonthRun command schema");
  }
  return {
    schemaVersion: "commit-persisted-month-run-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
    runId: parseMonthRunId(record.runId),
    expectedSaveRevision: parseSaveRevision(record.expectedSaveRevision),
    expectedRunRevision: parseMonthRunRevision(record.expectedRunRevision),
    snapshot: parseCanonicalPayload(record.snapshot),
    result: parseCanonicalPayload(record.result),
  };
}

export function parseCreateBackupCommand(value: unknown): CreateBackupCommandV1 {
  const record = expectRecord(value, "create backup command");
  assertExactKeys(record, CREATE_BACKUP_KEYS, "create backup command");
  if (record.schemaVersion !== "create-backup-command-v1") {
    throw new TypeError("Unsupported create backup command schema");
  }
  return {
    schemaVersion: "create-backup-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId: parseSaveId(record.saveId),
  };
}

function parseCheckpointIdentity(json: string): CheckpointIdentity {
  const record = expectRecord(parseJson(json), "MonthRun checkpoint");
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
  };
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new TypeError("Canonical payload must contain valid JSON");
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

function parseDurableStatus(value: unknown): DurableMonthRunStatus {
  if (typeof value !== "string" || !DURABLE_STATUSES.has(value as DurableMonthRunStatus)) {
    throw new TypeError("Status must be a durable MonthRun boundary");
  }
  return value as DurableMonthRunStatus;
}

function parseSha256(value: unknown, name: string): Sha256Hex {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a lowercase SHA-256 fingerprint`);
  }
  return value as Sha256Hex;
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

function assertExactKeys(
  record: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  name: string,
): void {
  const keys = Object.keys(record);
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    throw new TypeError(`${name} contains unknown or missing fields`);
  }
}
