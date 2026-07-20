import type {
  MonthRunId,
  MonthRunRevision,
  RequestId,
  SaveId,
  SaveRevision,
} from "@runtime-human/game-schema";

export const MAX_CANONICAL_PAYLOAD_BYTES = 4 * 1024 * 1024;

declare const sha256HexBrand: unique symbol;

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
  | "failed"
  | "incompatible"
  | "recovery-required"
  | "abandoned";

export type CreateSaveCommandV1 = Readonly<{
  schemaVersion: "create-save-command-v1";
  requestId: RequestId;
  saveId: SaveId;
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
  runRevision: MonthRunRevision;
  status: DurableMonthRunStatus;
  checkpoint: CanonicalPayloadV1;
}>;

export type CommitPersistedMonthRunCommandV1 = Readonly<{
  schemaVersion: "commit-persisted-month-run-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedSaveRevision: SaveRevision;
  expectedRunRevision: MonthRunRevision;
  snapshot: CanonicalPayloadV1;
  result: CanonicalPayloadV1;
}>;

export type CreateBackupCommandV1 = Readonly<{
  schemaVersion: "create-backup-command-v1";
  requestId: RequestId;
  saveId: SaveId;
}>;

export type SaveRecordV1 = Readonly<{
  schemaVersion: "save-record-v1";
  saveId: SaveId;
  revision: SaveRevision;
  snapshot: CanonicalPayloadV1;
  lastCommittedRunId: MonthRunId | null;
}>;

export type PendingMonthRunRecordV1 = Readonly<{
  schemaVersion: "pending-month-run-record-v1";
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  runRevision: MonthRunRevision;
  status: DurableMonthRunStatus;
  checkpoint: CanonicalPayloadV1;
  compatibility: CanonicalPayloadV1;
}>;

export type CommittedMonthRunRecordV1 = Readonly<{
  schemaVersion: "committed-month-run-record-v1";
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  committedSaveRevision: SaveRevision;
  finalCheckpointSha256: Sha256Hex;
  snapshotSha256: Sha256Hex;
  result: CanonicalPayloadV1;
}>;

export type BackupMetadataV1 = Readonly<{
  schemaVersion: "backup-metadata-v1";
  saveId: SaveId;
  saveRevision: SaveRevision;
  hasPendingMonthRun: boolean;
  quickCheck: "ok";
  foreignKeyViolations: 0;
}>;

export type PersistenceErrorCode =
  | "InvalidCommand"
  | "PayloadTooLarge"
  | "PayloadHashMismatch"
  | "StorageUnavailable"
  | "UnsupportedSqliteVersion"
  | "IntegrityCheckFailed"
  | "RequestPayloadConflict"
  | "SaveAlreadyExists"
  | "SaveNotFound"
  | "SaveRevisionConflict"
  | "ActiveRunExists"
  | "RunNotFound"
  | "RunRevisionConflict"
  | "RunAlreadyCommitted"
  | "InvalidRunBoundary"
  | "CorruptedStoredPayload";

export type PersistenceErrorV1 = Readonly<{
  code: PersistenceErrorCode;
  message: string;
}>;

export type PersistenceMutationResultV1<T> =
  | Readonly<{ kind: "accepted"; value: T }>
  | Readonly<{ kind: "duplicate"; value: T }>
  | Readonly<{ kind: "rejected"; error: PersistenceErrorV1 }>;

export type PersistenceQueryResultV1<T> =
  | Readonly<{ kind: "found"; value: T }>
  | Readonly<{ kind: "not-found" }>;
