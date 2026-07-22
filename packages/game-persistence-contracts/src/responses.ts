import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import type {
  BackupMetadataV1,
  BeginPersistedMonthRunAcceptedV1,
  CommitPersistedMonthRunAcceptedV1,
  CreateSaveAcceptedV1,
  DurableMonthRunStatus,
  MonthRunRecordV1,
  PersistenceErrorCode,
  PersistenceErrorV1,
  PersistenceMutationResultV1,
  PersistenceQueryResultV1,
  RecoveryStatus,
  RecoveryStatusV1,
  SaveRecordV1,
  StoreMonthRunBoundaryAcceptedV1,
} from "./contracts";
import { parseCanonicalPayload, parseFingerprint } from "./parsers";

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
const RECOVERY_STATUSES = new Set<RecoveryStatus>([
  "healthy",
  "unclean-but-valid",
  "newer-schema-read-only",
  "migration-history-mismatch",
  "corrupted",
  "backup-available",
]);
const ERROR_CODES = new Set<PersistenceErrorCode>([
  "InvalidCommand",
  "PayloadTooLarge",
  "PayloadHashMismatch",
  "PersistenceOverloaded",
  "PersistenceUnavailable",
  "StorageUnavailable",
  "UnsupportedSqliteVersion",
  "IncompatibleSchema",
  "MigrationHistoryMismatch",
  "IntegrityCheckFailed",
  "RequestPayloadConflict",
  "SaveAlreadyExists",
  "SaveNotFound",
  "SaveRevisionConflict",
  "ActiveRunExists",
  "RunNotFound",
  "RunRevisionConflict",
  "CheckpointHashConflict",
  "RunAlreadyCommitted",
  "InvalidRunBoundary",
  "CorruptedStoredPayload",
  "BackupFailed",
  "RecoveryRequired",
]);

export function parseSaveRecord(value: unknown): SaveRecordV1 {
  const record = exactRecord(
    value,
    [
      "schemaVersion",
      "saveId",
      "revision",
      "saveSchemaFingerprint",
      "snapshot",
      "lastCommittedRunId",
      "createdSequence",
      "updatedSequence",
    ],
    "save record",
  );
  requireSchema(record.schemaVersion, "save-record-v1", "save record");
  const createdSequence = parseSafeInteger(record.createdSequence, "createdSequence");
  const updatedSequence = parseSafeInteger(record.updatedSequence, "updatedSequence");
  if (updatedSequence < createdSequence) {
    throw new TypeError("Save updatedSequence cannot precede createdSequence");
  }
  return {
    schemaVersion: "save-record-v1",
    saveId: parseSaveId(record.saveId),
    revision: parseSaveRevision(record.revision),
    saveSchemaFingerprint: parseFingerprint(
      record.saveSchemaFingerprint,
      "save schema fingerprint",
    ),
    snapshot: parseCanonicalPayload(record.snapshot),
    lastCommittedRunId:
      record.lastCommittedRunId === null ? null : parseMonthRunId(record.lastCommittedRunId),
    createdSequence,
    updatedSequence,
  };
}

export function parseMonthRunRecord(value: unknown): MonthRunRecordV1 {
  const record = exactRecord(
    value,
    [
      "schemaVersion",
      "runId",
      "saveId",
      "baseSaveRevision",
      "runRevision",
      "status",
      "checkpoint",
      "checkpointHash",
      "previousCheckpointHash",
      "compatibility",
      "committedSaveRevision",
      "result",
      "createdSequence",
      "updatedSequence",
    ],
    "MonthRun record",
  );
  requireSchema(record.schemaVersion, "month-run-record-v1", "MonthRun record");
  const status = parseDurableStatus(record.status);
  const committedSaveRevision =
    record.committedSaveRevision === null ? null : parseSaveRevision(record.committedSaveRevision);
  const result = record.result === null ? null : parseCanonicalPayload(record.result);
  if (status === "committed") {
    if (committedSaveRevision === null || result === null) {
      throw new TypeError("Committed MonthRun must contain save revision and result");
    }
  } else if (committedSaveRevision !== null || result !== null) {
    throw new TypeError("Only committed MonthRun may contain committed result fields");
  }
  const createdSequence = parseSafeInteger(record.createdSequence, "createdSequence");
  const updatedSequence = parseSafeInteger(record.updatedSequence, "updatedSequence");
  if (updatedSequence < createdSequence) {
    throw new TypeError("MonthRun updatedSequence cannot precede createdSequence");
  }
  return {
    schemaVersion: "month-run-record-v1",
    runId: parseMonthRunId(record.runId),
    saveId: parseSaveId(record.saveId),
    baseSaveRevision: parseSaveRevision(record.baseSaveRevision),
    runRevision: parseMonthRunRevision(record.runRevision),
    status,
    checkpoint: parseCanonicalPayload(record.checkpoint),
    checkpointHash: parseFingerprint(record.checkpointHash, "checkpoint hash"),
    previousCheckpointHash:
      record.previousCheckpointHash === null
        ? null
        : parseFingerprint(record.previousCheckpointHash, "previous checkpoint hash"),
    compatibility: parseCanonicalPayload(record.compatibility),
    committedSaveRevision,
    result,
    createdSequence,
    updatedSequence,
  };
}

export function parseBackupMetadata(value: unknown): BackupMetadataV1 {
  const record = exactRecord(
    value,
    [
      "schemaVersion",
      "backupId",
      "saveId",
      "saveRevision",
      "hasActiveMonthRun",
      "quickCheck",
      "foreignKeyViolations",
    ],
    "backup metadata",
  );
  requireSchema(record.schemaVersion, "backup-metadata-v1", "backup metadata");
  if (typeof record.backupId !== "string" || !/^backup-v1-[0-9a-f]{128}$/u.test(record.backupId)) {
    throw new TypeError("backupId must be an application-owned backup identifier");
  }
  if (record.quickCheck !== "ok" || record.foreignKeyViolations !== 0) {
    throw new TypeError("Backup metadata must describe a verified SQLite snapshot");
  }
  if (typeof record.hasActiveMonthRun !== "boolean") {
    throw new TypeError("hasActiveMonthRun must be boolean");
  }
  return {
    schemaVersion: "backup-metadata-v1",
    backupId: record.backupId,
    saveId: parseSaveId(record.saveId),
    saveRevision: parseSaveRevision(record.saveRevision),
    hasActiveMonthRun: record.hasActiveMonthRun,
    quickCheck: "ok",
    foreignKeyViolations: 0,
  };
}

export function parseRecoveryStatus(value: unknown): RecoveryStatusV1 {
  const record = exactRecord(
    value,
    ["schemaVersion", "status", "writable", "backupAvailable"],
    "recovery status",
  );
  requireSchema(record.schemaVersion, "recovery-status-v1", "recovery status");
  if (
    typeof record.status !== "string" ||
    !RECOVERY_STATUSES.has(record.status as RecoveryStatus)
  ) {
    throw new TypeError("Unknown recovery status");
  }
  if (typeof record.writable !== "boolean" || typeof record.backupAvailable !== "boolean") {
    throw new TypeError("Recovery flags must be boolean");
  }
  return {
    schemaVersion: "recovery-status-v1",
    status: record.status as RecoveryStatus,
    writable: record.writable,
    backupAvailable: record.backupAvailable,
  };
}

export function parseCreateSaveAccepted(value: unknown): CreateSaveAcceptedV1 {
  const record = exactRecord(value, ["schemaVersion", "save"], "create save result");
  requireSchema(record.schemaVersion, "create-save-accepted-v1", "create save result");
  return { schemaVersion: "create-save-accepted-v1", save: parseSaveRecord(record.save) };
}

export function parseBeginPersistedMonthRunAccepted(
  value: unknown,
): BeginPersistedMonthRunAcceptedV1 {
  const record = exactRecord(value, ["schemaVersion", "run"], "begin MonthRun result");
  requireSchema(
    record.schemaVersion,
    "begin-persisted-month-run-accepted-v1",
    "begin MonthRun result",
  );
  return {
    schemaVersion: "begin-persisted-month-run-accepted-v1",
    run: parseMonthRunRecord(record.run),
  };
}

export function parseStoreMonthRunBoundaryAccepted(
  value: unknown,
): StoreMonthRunBoundaryAcceptedV1 {
  const record = exactRecord(value, ["schemaVersion", "run"], "store boundary result");
  requireSchema(
    record.schemaVersion,
    "store-month-run-boundary-accepted-v1",
    "store boundary result",
  );
  return {
    schemaVersion: "store-month-run-boundary-accepted-v1",
    run: parseMonthRunRecord(record.run),
  };
}

export function parseCommitPersistedMonthRunAccepted(
  value: unknown,
): CommitPersistedMonthRunAcceptedV1 {
  const record = exactRecord(value, ["schemaVersion", "save", "run"], "commit MonthRun result");
  requireSchema(
    record.schemaVersion,
    "commit-persisted-month-run-accepted-v1",
    "commit MonthRun result",
  );
  return {
    schemaVersion: "commit-persisted-month-run-accepted-v1",
    save: parseSaveRecord(record.save),
    run: parseMonthRunRecord(record.run),
  };
}

export function parsePersistenceMutationResult<T>(
  value: unknown,
  parseValue: (value: unknown) => T,
): PersistenceMutationResultV1<T> {
  const record = expectRecord(value, "persistence mutation result");
  if (record.kind === "accepted" || record.kind === "duplicate") {
    assertExactKeys(record, ["kind", "value"], "persistence mutation result");
    return { kind: record.kind, value: parseValue(record.value) };
  }
  if (record.kind === "rejected") {
    assertExactKeys(record, ["kind", "error"], "persistence mutation result");
    return { kind: "rejected", error: parsePersistenceError(record.error) };
  }
  throw new TypeError("Unknown persistence mutation result kind");
}

export function parsePersistenceQueryResult<T>(
  value: unknown,
  parseValue: (value: unknown) => T,
): PersistenceQueryResultV1<T> {
  const record = expectRecord(value, "persistence query result");
  if (record.kind === "found") {
    assertExactKeys(record, ["kind", "value"], "persistence query result");
    return { kind: "found", value: parseValue(record.value) };
  }
  if (record.kind === "not-found") {
    assertExactKeys(record, ["kind"], "persistence query result");
    return { kind: "not-found" };
  }
  if (record.kind === "rejected") {
    assertExactKeys(record, ["kind", "error"], "persistence query result");
    return { kind: "rejected", error: parsePersistenceError(record.error) };
  }
  throw new TypeError("Unknown persistence query result kind");
}

export function parsePersistenceError(value: unknown): PersistenceErrorV1 {
  const record = exactRecord(value, ["schemaVersion", "code", "message"], "persistence error");
  requireSchema(record.schemaVersion, "persistence-error-v1", "persistence error");
  if (typeof record.code !== "string" || !ERROR_CODES.has(record.code as PersistenceErrorCode)) {
    throw new TypeError("Unknown persistence error code");
  }
  if (
    typeof record.message !== "string" ||
    record.message.length === 0 ||
    record.message.length > 512
  ) {
    throw new TypeError("Persistence error message must contain 1-512 characters");
  }
  return {
    schemaVersion: "persistence-error-v1",
    code: record.code as PersistenceErrorCode,
    message: record.message,
  };
}

function parseDurableStatus(value: unknown): DurableMonthRunStatus {
  if (typeof value !== "string" || !DURABLE_STATUSES.has(value as DurableMonthRunStatus)) {
    throw new TypeError("Unknown durable MonthRun status");
  }
  return value as DurableMonthRunStatus;
}

function parseSafeInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  name: string,
): Readonly<Record<string, unknown>> {
  const record = expectRecord(value, name);
  assertExactKeys(record, expectedKeys, name);
  return record;
}

function expectRecord(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
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

function requireSchema(actual: unknown, expected: string, name: string): void {
  if (actual !== expected) {
    throw new TypeError(`${name} must use ${expected}`);
  }
}
