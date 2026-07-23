import { fingerprint, restoreMonthRunCheckpoint } from "@runtime-human/game-core";
import {
  parseMonthRunRevision,
  parseSaveRevision,
  type MonthRunId,
  type RequestId,
  type SaveId,
} from "@runtime-human/game-schema";
import type {
  BeginPersistedMonthRunAcceptedV1,
  BeginPersistedMonthRunCommandV1,
  CommitPersistedMonthRunAcceptedV1,
  CommitPersistedMonthRunCommandV1,
  CreateBackupCommandV1,
  CreateSaveAcceptedV1,
  CreateSaveCommandV1,
  MonthRunRecordV1,
  PersistenceErrorCode,
  PersistenceErrorV1,
  PersistenceMutationResultV1,
  RecoveryStatusV1,
  SaveRecordV1,
  StoreMonthRunBoundaryAcceptedV1,
  StoreMonthRunBoundaryCommandV1,
} from "@runtime-human/game-persistence-contracts";
import {
  createCanonicalPayload,
  type PersistenceService,
} from "@runtime-human/game-application";

export type AcknowledgementLossOperation =
  | "beginMonthRun"
  | "storeMonthRunBoundary"
  | "commitMonthRun";

export type InMemoryPersistenceStats = Readonly<{
  beginMutations: number;
  boundaryMutations: number;
  commitMutations: number;
}>;

type Receipt = Readonly<{ payloadHash: string; value: unknown }>;

export function createInMemoryPersistenceHarness(input: Readonly<{
  saveId: SaveId;
  saveSchemaFingerprint: SaveRecordV1["saveSchemaFingerprint"];
  initialSnapshot?: unknown;
}>): Readonly<{
  service: PersistenceService;
  loseNextAcknowledgement(operation: AcknowledgementLossOperation): void;
  commitNextAsCompeting(input: Readonly<{ snapshot: unknown; result: unknown }>): void;
  setRecoveryStatus(status: RecoveryStatusV1): void;
  getSave(): SaveRecordV1;
  getRun(runId: MonthRunId): MonthRunRecordV1 | null;
  getStats(): InMemoryPersistenceStats;
}> {
  let sequence = 1;
  let save: SaveRecordV1 = {
    schemaVersion: "save-record-v1",
    saveId: input.saveId,
    revision: parseSaveRevision(0),
    saveSchemaFingerprint: input.saveSchemaFingerprint,
    snapshot: createCanonicalPayload(input.initialSnapshot ?? { schemaVersion: "initial-save-v1" }),
    lastCommittedRunId: null,
    createdSequence: sequence,
    updatedSequence: sequence,
  };
  let recovery: RecoveryStatusV1 = {
    schemaVersion: "recovery-status-v1",
    status: "healthy",
    writable: true,
    backupAvailable: false,
  };
  const runs = new Map<MonthRunId, MonthRunRecordV1>();
  const receipts = new Map<RequestId, Receipt>();
  const lostAcknowledgements = new Set<AcknowledgementLossOperation>();
  let competingCommit: Readonly<{ snapshot: unknown; result: unknown }> | null = null;
  let beginMutations = 0;
  let boundaryMutations = 0;
  let commitMutations = 0;

  const service: PersistenceService = {
    async createSave(command: CreateSaveCommandV1) {
      return mutation<CreateSaveAcceptedV1>(command.requestId, command, () =>
        rejected("SaveAlreadyExists", "In-memory harness already contains its seeded save"),
      );
    },
    async loadSave(query) {
      return query.saveId === save.saveId ? { kind: "found", value: save } : { kind: "not-found" };
    },
    async beginMonthRun(command: BeginPersistedMonthRunCommandV1) {
      return mutation(command.requestId, command, () => {
        if (command.saveId !== save.saveId) return rejected("SaveNotFound", "Save not found");
        if (command.expectedSaveRevision !== save.revision) {
          return rejected("SaveRevisionConflict", "Save revision is stale");
        }
        const active = [...runs.values()].find(
          (run) => run.saveId === command.saveId && isActive(run),
        );
        if (active !== undefined) {
          return rejected("ActiveRunExists", "An active run already exists");
        }
        const checkpoint = requireCheckpoint(command.checkpoint.json);
        sequence += 1;
        const run: MonthRunRecordV1 = {
          schemaVersion: "month-run-record-v1",
          runId: command.runId,
          saveId: command.saveId,
          baseSaveRevision: command.expectedSaveRevision,
          runRevision: checkpoint.runRevision,
          status: "ready",
          checkpoint: command.checkpoint,
          checkpointHash: checkpoint.checkpointHash,
          previousCheckpointHash: checkpoint.previousCheckpointHash,
          compatibility: command.compatibility,
          committedSaveRevision: null,
          result: null,
          createdSequence: sequence,
          updatedSequence: sequence,
        };
        runs.set(run.runId, run);
        beginMutations += 1;
        return accepted<BeginPersistedMonthRunAcceptedV1>({
          schemaVersion: "begin-persisted-month-run-accepted-v1",
          run,
        });
      }, "beginMonthRun");
    },
    async loadMonthRun(query) {
      const run = runs.get(query.runId);
      return run === undefined ? { kind: "not-found" } : { kind: "found", value: run };
    },
    async loadActiveMonthRun(query) {
      const run = [...runs.values()].find(
        (candidate) => candidate.saveId === query.saveId && isActive(candidate),
      );
      return run === undefined ? { kind: "not-found" } : { kind: "found", value: run };
    },
    async storeMonthRunBoundary(command: StoreMonthRunBoundaryCommandV1) {
      return mutation(command.requestId, command, () => {
        const source = runs.get(command.runId);
        if (source === undefined || source.saveId !== command.saveId) {
          return rejected("RunNotFound", "Run not found");
        }
        if (source.runRevision !== command.expectedRunRevision) {
          return rejected("RunRevisionConflict", "Run revision is stale");
        }
        if (
          source.checkpoint.sha256 !== command.expectedCheckpointPayloadSha256 ||
          source.checkpointHash !== command.expectedCheckpointHash
        ) {
          return rejected("CheckpointHashConflict", "Checkpoint identity is stale");
        }
        const checkpoint = requireCheckpoint(command.checkpoint.json);
        sequence += 1;
        const run: MonthRunRecordV1 = {
          ...source,
          runRevision: parseMonthRunRevision(command.runRevision),
          status: command.status,
          checkpoint: command.checkpoint,
          checkpointHash: checkpoint.checkpointHash,
          previousCheckpointHash: checkpoint.previousCheckpointHash,
          updatedSequence: sequence,
        };
        runs.set(run.runId, run);
        boundaryMutations += 1;
        return accepted<StoreMonthRunBoundaryAcceptedV1>({
          schemaVersion: "store-month-run-boundary-accepted-v1",
          run,
        });
      }, "storeMonthRunBoundary");
    },
    async commitMonthRun(command: CommitPersistedMonthRunCommandV1) {
      if (competingCommit !== null) {
        const source = runs.get(command.runId);
        if (source === undefined || source.saveId !== command.saveId) {
          return rejected("RunNotFound", "Run not found");
        }
        const committedCheckpoint = requireCheckpoint(command.committedCheckpoint.json);
        sequence += 1;
        const committedRevision = parseSaveRevision(save.revision + 1);
        save = {
          ...save,
          revision: committedRevision,
          snapshot: createCanonicalPayload(competingCommit.snapshot),
          lastCommittedRunId: command.runId,
          updatedSequence: sequence,
        };
        const run: MonthRunRecordV1 = {
          ...source,
          runRevision: committedCheckpoint.runRevision,
          status: "committed",
          checkpoint: command.committedCheckpoint,
          checkpointHash: committedCheckpoint.checkpointHash,
          previousCheckpointHash: committedCheckpoint.previousCheckpointHash,
          committedSaveRevision: committedRevision,
          result: createCanonicalPayload(competingCommit.result),
          updatedSequence: sequence,
        };
        runs.set(run.runId, run);
        commitMutations += 1;
        competingCommit = null;
        return rejected("RunAlreadyCommitted", "A competing commit won the race");
      }
      return mutation(command.requestId, command, () => {
        const source = runs.get(command.runId);
        if (source === undefined || source.saveId !== command.saveId) {
          return rejected("RunNotFound", "Run not found");
        }
        if (source.status === "committed") {
          return rejected("RunAlreadyCommitted", "Run was already committed");
        }
        if (save.revision !== command.expectedSaveRevision) {
          return rejected("SaveRevisionConflict", "Save revision is stale");
        }
        if (source.runRevision !== command.expectedRunRevision) {
          return rejected("RunRevisionConflict", "Run revision is stale");
        }
        if (
          source.checkpoint.sha256 !== command.expectedCheckpointPayloadSha256 ||
          source.checkpointHash !== command.expectedCheckpointHash
        ) {
          return rejected("CheckpointHashConflict", "Checkpoint identity is stale");
        }
        const committedCheckpoint = requireCheckpoint(command.committedCheckpoint.json);
        sequence += 1;
        const committedRevision = parseSaveRevision(save.revision + 1);
        save = {
          ...save,
          revision: committedRevision,
          snapshot: command.snapshot,
          lastCommittedRunId: command.runId,
          updatedSequence: sequence,
        };
        const run: MonthRunRecordV1 = {
          ...source,
          runRevision: committedCheckpoint.runRevision,
          status: "committed",
          checkpoint: command.committedCheckpoint,
          checkpointHash: committedCheckpoint.checkpointHash,
          previousCheckpointHash: committedCheckpoint.previousCheckpointHash,
          committedSaveRevision: committedRevision,
          result: command.result,
          updatedSequence: sequence,
        };
        runs.set(run.runId, run);
        commitMutations += 1;
        return accepted<CommitPersistedMonthRunAcceptedV1>({
          schemaVersion: "commit-persisted-month-run-accepted-v1",
          save,
          run,
        });
      }, "commitMonthRun");
    },
    async createBackup(_command: CreateBackupCommandV1) {
      return rejected("BackupFailed", "Backup is outside this test harness scope");
    },
    async getRecoveryStatus() {
      return { kind: "found", value: recovery };
    },
  };

  return {
    service,
    loseNextAcknowledgement(operation) {
      lostAcknowledgements.add(operation);
    },
    commitNextAsCompeting(input) {
      competingCommit = input;
    },
    setRecoveryStatus(status) {
      recovery = status;
    },
    getSave: () => save,
    getRun: (runId) => runs.get(runId) ?? null,
    getStats: () => ({ beginMutations, boundaryMutations, commitMutations }),
  };

  async function mutation<T>(
    requestId: RequestId,
    command: unknown,
    apply: () => PersistenceMutationResultV1<T>,
    acknowledgementOperation?: AcknowledgementLossOperation,
  ): Promise<PersistenceMutationResultV1<T>> {
    const payloadHash = fingerprint("in-memory-persistence-command-v1", command);
    const existing = receipts.get(requestId);
    if (existing !== undefined) {
      if (existing.payloadHash !== payloadHash) {
        return rejected("RequestPayloadConflict", "Request ID was reused with another payload");
      }
      return { kind: "duplicate", value: existing.value as T };
    }
    const result = apply();
    if (result.kind === "rejected") return result;
    receipts.set(requestId, { payloadHash, value: result.value });
    if (
      acknowledgementOperation !== undefined &&
      lostAcknowledgements.delete(acknowledgementOperation)
    ) {
      throw new Error(`Simulated acknowledgement loss for ${acknowledgementOperation}`);
    }
    return result;
  }
}

function requireCheckpoint(json: string) {
  const restored = restoreMonthRunCheckpoint(JSON.parse(json) as unknown);
  if (restored.kind === "error") throw new TypeError(restored.message);
  return restored.checkpoint;
}

function accepted<T>(value: T): PersistenceMutationResultV1<T> {
  return { kind: "accepted", value };
}

function rejected(code: PersistenceErrorCode, message: string): Readonly<{
  kind: "rejected";
  error: PersistenceErrorV1;
}> {
  return {
    kind: "rejected",
    error: { schemaVersion: "persistence-error-v1", code, message },
  };
}

function isActive(run: MonthRunRecordV1): boolean {
  return run.status === "ready" || run.status === "suspended" || run.status === "completed";
}
