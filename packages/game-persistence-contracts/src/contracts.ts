import type {
  Fingerprint,
  MonthRunId,
  MonthRunRevision,
  RequestId,
  SaveId,
  SaveRevision,
} from "@runtime-human/game-schema";

export const MAX_CANONICAL_PAYLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PERSISTENCE_RESULT_BYTES = 1024 * 1024;

const sha256HexBrand: unique symbol = Symbol("Sha256Hex");

export type Sha256Hex = string & { readonly [sha256HexBrand]: "Sha256Hex" };

export type CanonicalPayloadV1 = Readonly<{
  schemaVersion: "canonical-payload-v1";
  json: string;
  sha256: Sha256Hex;
}>;

export type DurableMonthRunStatus =
  | "ready"
  | "suspended"
  | "completed"
  | "committed"
  | "failed"
  | "incompatible"
  | "recovery-required"
  | "abandoned";

export type StorableMonthRunBoundaryStatus = Exclude<
  DurableMonthRunStatus,
  "ready" | "committed"
>;

export type CreateSaveCommandV1 = Readonly<{
  schemaVersion: "create-save-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  saveSchemaFingerprint: Fingerprint;
  snapshot: CanonicalPayloadV1;
}>;

export type LoadSaveQueryV1 = Readonly<{
  schemaVersion: "load-save-query-v1";
  saveId: SaveId;
}>;

export type BeginPersistedMonthRunCommandV1 = Readonly<{
  schemaVersion: "begin-persisted-month-run-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  runId: MonthRunId;
  checkpoint: CanonicalPayloadV1;
  compatibility: CanonicalPayloadV1;
}>;

export type LoadMonthRunQueryV1 = Readonly<{
  schemaVersion: "load-month-run-query-v1";
  runId: MonthRunId;
}>;

export type LoadActiveMonthRunQueryV1 = Readonly<{
  schemaVersion: "load-active-month-run-query-v1";
  saveId: SaveId;
}>;

export type StoreMonthRunBoundaryCommandV1 = Readonly<{
  schemaVersion: "store-month-run-boundary-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  expectedCheckpointPayloadSha256: Sha256Hex;
  expectedCheckpointHash: Fingerprint;
  runRevision: MonthRunRevision;
  status: StorableMonthRunBoundaryStatus;
  checkpoint: CanonicalPayloadV1;
}>;

export type CommitPersistedMonthRunCommandV1 = Readonly<{
  schemaVersion: "commit-persisted-month-run-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedSaveRevision: SaveRevision;
  expectedRunRevision: MonthRunRevision;
  expectedCheckpointPayloadSha256: Sha256Hex;
  expectedCheckpointHash: Fingerprint;
  snapshot: CanonicalPayloadV1;
  result: CanonicalPayloadV1;
}>;

export type CreateBackupCommandV1 = Readonly<{
  schemaVersion: "create-backup-command-v1";
  requestId: RequestId;
  saveId: SaveId;
}>;

export type GetRecoveryStatusQueryV1 = Readonly<{
  schemaVersion: "get-recovery-status-query-v1";
}>;

export type SaveRecordV1 = Readonly<{
  schemaVersion: "save-record-v1";
  saveId: SaveId;
  revision: SaveRevision;
  saveSchemaFingerprint: Fingerprint;
  snapshot: CanonicalPayloadV1;
  lastCommittedRunId: MonthRunId | null;
  createdSequence: number;
  updatedSequence: number;
}>;

export type MonthRunRecordV1 = Readonly<{
  schemaVersion: "month-run-record-v1";
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  runRevision: MonthRunRevision;
  status: DurableMonthRunStatus;
  checkpoint: CanonicalPayloadV1;
  checkpointHash: Fingerprint;
  previousCheckpointHash: Fingerprint | null;
  compatibility: CanonicalPayloadV1;
  committedSaveRevision: SaveRevision | null;
  result: CanonicalPayloadV1 | null;
  createdSequence: number;
  updatedSequence: number;
}>;

export type BackupMetadataV1 = Readonly<{
  schemaVersion: "backup-metadata-v1";
  backupId: string;
  saveId: SaveId;
  saveRevision: SaveRevision;
  hasActiveMonthRun: boolean;
  quickCheck: "ok";
  foreignKeyViolations: 0;
}>;

export type RecoveryStatus =
  | "healthy"
  | "unclean-but-valid"
  | "newer-schema-read-only"
  | "migration-history-mismatch"
  | "corrupted"
  | "backup-available";

export type RecoveryStatusV1 = Readonly<{
  schemaVersion: "recovery-status-v1";
  status: RecoveryStatus;
  writable: boolean;
  backupAvailable: boolean;
}>;

export type CreateSaveAcceptedV1 = Readonly<{
  schemaVersion: "create-save-accepted-v1";
  save: SaveRecordV1;
}>;

export type BeginPersistedMonthRunAcceptedV1 = Readonly<{
  schemaVersion: "begin-persisted-month-run-accepted-v1";
  run: MonthRunRecordV1;
}>;

export type StoreMonthRunBoundaryAcceptedV1 = Readonly<{
  schemaVersion: "store-month-run-boundary-accepted-v1";
  run: MonthRunRecordV1;
}>;

export type CommitPersistedMonthRunAcceptedV1 = Readonly<{
  schemaVersion: "commit-persisted-month-run-accepted-v1";
  save: SaveRecordV1;
  run: MonthRunRecordV1;
}>;

export type PersistenceErrorCode =
  | "InvalidCommand"
  | "PayloadTooLarge"
  | "PayloadHashMismatch"
  | "PersistenceOverloaded"
  | "PersistenceUnavailable"
  | "StorageUnavailable"
  | "UnsupportedSqliteVersion"
  | "IncompatibleSchema"
  | "MigrationHistoryMismatch"
  | "IntegrityCheckFailed"
  | "RequestPayloadConflict"
  | "SaveAlreadyExists"
  | "SaveNotFound"
  | "SaveRevisionConflict"
  | "ActiveRunExists"
  | "RunNotFound"
  | "RunRevisionConflict"
  | "CheckpointHashConflict"
  | "RunAlreadyCommitted"
  | "InvalidRunBoundary"
  | "CorruptedStoredPayload"
  | "BackupFailed"
  | "RecoveryRequired";

export type PersistenceErrorV1 = Readonly<{
  schemaVersion: "persistence-error-v1";
  code: PersistenceErrorCode;
  message: string;
}>;

export type PersistenceMutationResultV1<T> =
  | Readonly<{ kind: "accepted"; value: T }>
  | Readonly<{ kind: "duplicate"; value: T }>
  | Readonly<{ kind: "rejected"; error: PersistenceErrorV1 }>;

export type PersistenceQueryResultV1<T> =
  | Readonly<{ kind: "found"; value: T }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "rejected"; error: PersistenceErrorV1 }>;
