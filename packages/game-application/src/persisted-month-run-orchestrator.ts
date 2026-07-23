import {
  createMonthRunCheckpoint,
  fingerprint,
  runUntilBoundary,
  transitionMonthRun,
} from "@runtime-human/game-core";
import type {
  BeginMonthCommandV1,
  MonthRunCheckpointV1,
  MonthRunProtocolError,
  RequestId,
  ResumeMonthCommandV1,
  SaveId,
} from "@runtime-human/game-schema";
import type {
  MonthRunRecordV1,
  PersistenceErrorV1,
  RecoveryStatusV1,
  SaveRecordV1,
} from "@runtime-human/game-persistence-contracts";

import {
  buildBeginPersistedMonthRunCommand,
  buildCommitPersistedMonthRunCommand,
  buildStoreMonthRunBoundaryCommand,
  checkpointsEqual,
  createCommittedCheckpoint,
  restorePersistedCheckpoint,
} from "./month-run-persistence-payload";
import type {
  PersistedMonthRunError,
  PersistedMonthRunOrchestrator,
  PersistedMonthRunOrchestratorOptions,
  PersistedMonthRunResult,
} from "./persisted-month-run-types";

const RETRYABLE_PERSISTENCE_CODES = new Set([
  "PersistenceOverloaded",
  "PersistenceUnavailable",
  "StorageUnavailable",
]);
const CONFLICT_CODES = new Set([
  "SaveRevisionConflict",
  "RunRevisionConflict",
  "CheckpointHashConflict",
  "RunAlreadyCommitted",
]);

type Operation =
  | Readonly<{ kind: "load"; saveId: SaveId }>
  | Readonly<{ kind: "begin"; command: BeginMonthCommandV1 }>
  | Readonly<{ kind: "resume"; command: ResumeMonthCommandV1 }>;

type ProgressOrigin = "begin" | "resume" | "recovery";

type PreflightResult =
  | Readonly<{ kind: "ok"; recovery: RecoveryStatusV1 }>
  | Readonly<{ kind: "result"; result: PersistedMonthRunResult }>;

type SaveLoadResult =
  | Readonly<{ kind: "found"; save: SaveRecordV1 }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "result"; result: PersistedMonthRunResult }>;

type RunLoadResult =
  | Readonly<{ kind: "found"; run: MonthRunRecordV1 }>
  | Readonly<{ kind: "not-found" }>
  | Readonly<{ kind: "result"; result: PersistedMonthRunResult }>;

export function createPersistedMonthRunOrchestrator(
  options: PersistedMonthRunOrchestratorOptions,
): PersistedMonthRunOrchestrator {
  let retryableOperation: Operation | null = null;

  async function execute(operation: Operation): Promise<PersistedMonthRunResult> {
    try {
      const result = await executeUnchecked(operation);
      retryableOperation =
        result.kind === "rejected" && result.error.retryable ? operation : null;
      return result;
    } catch (error) {
      const retryable = !(error instanceof TypeError || error instanceof RangeError);
      const result = rejected({
        category: retryable ? "transport" : "contract",
        code: retryable ? "PersistenceUnavailable" : "InvalidPersistenceResponse",
        message: error instanceof Error ? error.message : "Persistence operation failed",
        retryable,
      });
      retryableOperation = retryable ? operation : null;
      return result;
    }
  }

  async function executeUnchecked(operation: Operation): Promise<PersistedMonthRunResult> {
    switch (operation.kind) {
      case "load":
        return load(operation.saveId);
      case "begin":
        return begin(operation.command);
      case "resume":
        return resume(operation.command);
    }
  }

  async function load(saveId: SaveId): Promise<PersistedMonthRunResult> {
    const preflight = await requireWritablePersistence();
    if (preflight.kind === "result") return preflight.result;

    const saveResult = await loadSave(saveId);
    if (saveResult.kind === "result") return saveResult.result;
    if (saveResult.kind === "not-found") return { kind: "idle", save: null };

    const runResult = await loadActiveRun(saveId);
    if (runResult.kind === "result") return runResult.result;
    if (runResult.kind === "not-found") return { kind: "idle", save: saveResult.save };
    return resolveRecord(saveResult.save, runResult.run, "recovery", null);
  }

  async function begin(command: BeginMonthCommandV1): Promise<PersistedMonthRunResult> {
    const preflight = await requireWritablePersistence();
    if (preflight.kind === "result") return preflight.result;

    const saveResult = await loadSave(command.saveId);
    if (saveResult.kind === "result") return saveResult.result;
    if (saveResult.kind === "not-found") {
      return persistenceRejected({
        schemaVersion: "persistence-error-v1",
        code: "SaveNotFound",
        message: "Save does not exist",
      });
    }
    if (saveResult.save.revision !== command.expectedSaveRevision) {
      return protocolRejected(
        "SaveRevisionConflict",
        "BeginMonth expected save revision is stale",
      );
    }

    const readyCheckpoint = createMonthRunCheckpoint({
      runId: command.runId,
      saveId: command.saveId,
      baseSaveRevision: command.expectedSaveRevision,
      compatibility: command.compatibility,
      plan: command.plan,
      rngState: command.initialRngState,
    });
    const persistedBegin = await options.persistence.beginMonthRun(
      buildBeginPersistedMonthRunCommand(command, readyCheckpoint),
    );
    if (persistedBegin.kind === "rejected") return persistenceRejected(persistedBegin.error);

    const currentRun = await loadRun(command.runId);
    if (currentRun.kind === "result") return currentRun.result;
    const run = currentRun.kind === "found" ? currentRun.run : persistedBegin.value.run;
    if (run.saveId !== command.saveId) {
      return protocolRejected("RunNotFound", "MonthRun does not belong to the requested save");
    }
    return resolveRecord(saveResult.save, run, "begin", command.requestId);
  }

  async function resume(command: ResumeMonthCommandV1): Promise<PersistedMonthRunResult> {
    const preflight = await requireWritablePersistence();
    if (preflight.kind === "result") return preflight.result;

    const saveResult = await loadSave(command.saveId);
    if (saveResult.kind === "result") return saveResult.result;
    if (saveResult.kind === "not-found") {
      return persistenceRejected({
        schemaVersion: "persistence-error-v1",
        code: "SaveNotFound",
        message: "Save does not exist",
      });
    }

    const runResult = await loadRun(command.runId);
    if (runResult.kind === "result") return runResult.result;
    if (runResult.kind === "not-found") {
      return protocolRejected("RunNotFound", `MonthRun ${command.runId} does not exist`);
    }
    const restored = restorePersistedCheckpoint(
      runResult.run,
      options.expectedCompatibility,
    );
    if (restored.kind === "blocked") {
      return checkpointBlocked(saveResult.save, runResult.run, restored);
    }
    const checkpoint = restored.checkpoint;
    if (checkpoint.saveId !== command.saveId) {
      return protocolRejected("RunNotFound", "MonthRun does not belong to the requested save");
    }

    const existingAnswer = checkpoint.acceptedDecisions.find(
      (decision) => decision.requestId === command.requestId,
    );
    if (existingAnswer !== undefined) {
      const answerHash = fingerprint("month-run-decision-answer-v1", command.answer);
      if (
        existingAnswer.decisionId !== command.decisionId ||
        existingAnswer.answerHash !== answerHash
      ) {
        return protocolRejected(
          "RequestPayloadConflict",
          `Request ${command.requestId} was already used with another payload`,
        );
      }
      return resolveRecord(saveResult.save, runResult.run, "resume", command.requestId);
    }

    if (checkpoint.runRevision !== command.expectedRunRevision) {
      return protocolRejected(
        "RunRevisionConflict",
        "ResumeMonth expected run revision is stale",
      );
    }
    if (
      checkpoint.status !== "suspended" ||
      checkpoint.pendingDecision?.decisionId !== command.decisionId
    ) {
      return protocolRejected(
        "UnexpectedDecision",
        "Decision does not match the pending persisted decision",
      );
    }

    const accepted = transitionMonthRun(checkpoint, {
      type: "accept-decision",
      requestId: command.requestId,
      decisionId: command.decisionId,
      answer: command.answer,
    });
    if (accepted.kind === "rejected") {
      return rejected({
        category: "protocol",
        code: accepted.error.code,
        message: accepted.error.message,
        retryable: false,
        protocolError: accepted.error,
      });
    }
    const runResultAfterAnswer = runUntilBoundary(accepted.checkpoint, options.steps);
    if (runResultAfterAnswer.kind === "rejected") {
      return rejected({
        category: "protocol",
        code: runResultAfterAnswer.error.code,
        message: runResultAfterAnswer.error.message,
        retryable: false,
        protocolError: runResultAfterAnswer.error,
      });
    }
    return storeBoundary(
      saveResult.save,
      runResult.run,
      runResultAfterAnswer.checkpoint,
      "resume",
      command.requestId,
    );
  }

  async function resolveRecord(
    save: SaveRecordV1,
    run: MonthRunRecordV1,
    origin: ProgressOrigin,
    outerRequestId: RequestId | null,
  ): Promise<PersistedMonthRunResult> {
    const restored = restorePersistedCheckpoint(run, options.expectedCompatibility);
    if (restored.kind === "blocked") return checkpointBlocked(save, run, restored);
    const checkpoint = restored.checkpoint;
    switch (checkpoint.status) {
      case "ready": {
        const execution = runUntilBoundary(checkpoint, options.steps);
        if (execution.kind === "rejected") {
          return rejected({
            category: "protocol",
            code: execution.error.code,
            message: execution.error.message,
            retryable: false,
            protocolError: execution.error,
          });
        }
        return storeBoundary(save, run, execution.checkpoint, origin, outerRequestId);
      }
      case "suspended":
        return { kind: "waiting-decision", save, run, checkpoint };
      case "completed":
        return commitCompleted(run, checkpoint);
      case "committed":
        return { kind: "committed", save, run, checkpoint };
      case "failed":
      case "abandoned":
        return { kind: "terminal", save, run, checkpoint };
      case "incompatible":
        return {
          kind: "blocked",
          reason: "incompatible-checkpoint",
          message: "Persisted MonthRun was marked incompatible",
          recovery: null,
          save,
          run,
        };
      case "recovery-required":
        return {
          kind: "blocked",
          reason: "recovery",
          message: "Persisted MonthRun requires recovery",
          recovery: null,
          save,
          run,
        };
      case "running":
        return protocolRejected(
          "InvalidCommand",
          "Transient running MonthRun checkpoint must never be persisted",
        );
    }
  }

  async function storeBoundary(
    save: SaveRecordV1,
    source: MonthRunRecordV1,
    checkpoint: MonthRunCheckpointV1,
    origin: ProgressOrigin,
    outerRequestId: RequestId | null,
  ): Promise<PersistedMonthRunResult> {
    const stage =
      origin === "begin"
        ? "begin-boundary"
        : origin === "resume"
          ? "resume-boundary"
          : "recovery-boundary";
    const stored = await options.persistence.storeMonthRunBoundary(
      buildStoreMonthRunBoundaryCommand({
        stage,
        outerRequestId,
        source,
        checkpoint,
      }),
    );
    if (stored.kind !== "rejected") {
      return resolveRecord(save, stored.value.run, origin, outerRequestId);
    }
    if (CONFLICT_CODES.has(stored.error.code)) {
      const current = await loadRun(source.runId);
      if (current.kind === "found" && checkpointsEqual(current.run, checkpoint)) {
        return resolveRecord(save, current.run, origin, outerRequestId);
      }
      if (current.kind === "result") return current.result;
    }
    return persistenceRejected(stored.error);
  }

  async function commitCompleted(
    source: MonthRunRecordV1,
    completedCheckpoint: MonthRunCheckpointV1,
  ): Promise<PersistedMonthRunResult> {
    const latestSaveResult = await loadSave(source.saveId);
    if (latestSaveResult.kind === "result") return latestSaveResult.result;
    if (latestSaveResult.kind === "not-found") {
      return persistenceRejected({
        schemaVersion: "persistence-error-v1",
        code: "SaveNotFound",
        message: "Save disappeared before MonthRun commit",
      });
    }
    const latestSave = latestSaveResult.save;
    if (latestSave.revision !== source.baseSaveRevision) {
      return persistenceRejected({
        schemaVersion: "persistence-error-v1",
        code: "SaveRevisionConflict",
        message: "Save revision changed before MonthRun commit",
      });
    }

    let materialized: ReturnType<typeof options.materializeCommit>;
    try {
      materialized = options.materializeCommit({
        save: latestSave,
        completedCheckpoint,
      });
    } catch (error) {
      return rejected({
        category: "contract",
        code: "CommitMaterializationFailed",
        message: error instanceof Error ? error.message : "Commit materialization failed",
        retryable: false,
      });
    }

    const committedCheckpoint = createCommittedCheckpoint(completedCheckpoint);
    const committed = await options.persistence.commitMonthRun(
      buildCommitPersistedMonthRunCommand({
        source,
        committedCheckpoint,
        snapshot: materialized.snapshot,
        result: materialized.result,
      }),
    );
    if (committed.kind !== "rejected") {
      const restored = restorePersistedCheckpoint(
        committed.value.run,
        options.expectedCompatibility,
      );
      if (restored.kind === "blocked") {
        return checkpointBlocked(committed.value.save, committed.value.run, restored);
      }
      return {
        kind: "committed",
        save: committed.value.save,
        run: committed.value.run,
        checkpoint: restored.checkpoint,
      };
    }

    if (CONFLICT_CODES.has(committed.error.code)) {
      const [currentSave, currentRun] = await Promise.all([
        loadSave(source.saveId),
        loadRun(source.runId),
      ]);
      if (currentSave.kind === "result") return currentSave.result;
      if (currentRun.kind === "result") return currentRun.result;
      if (
        currentSave.kind === "found" &&
        currentRun.kind === "found" &&
        currentRun.run.status === "committed" &&
        currentSave.save.lastCommittedRunId === currentRun.run.runId &&
        currentRun.run.committedSaveRevision === currentSave.save.revision
      ) {
        return resolveRecord(currentSave.save, currentRun.run, "recovery", null);
      }
    }
    return persistenceRejected(committed.error);
  }

  async function requireWritablePersistence(): Promise<PreflightResult> {
    const status = await options.persistence.getRecoveryStatus({
      schemaVersion: "get-recovery-status-query-v1",
    });
    if (status.kind === "rejected") {
      return { kind: "result", result: persistenceRejected(status.error) };
    }
    if (status.kind === "not-found") {
      return {
        kind: "result",
        result: rejected({
          category: "contract",
          code: "MissingRecoveryStatus",
          message: "Persistence did not return a recovery status",
          retryable: false,
        }),
      };
    }
    if (!status.value.writable) {
      return {
        kind: "result",
        result: {
          kind: "blocked",
          reason: "recovery",
          message: `Persistence is read-only: ${status.value.status}`,
          recovery: status.value,
          save: null,
          run: null,
        },
      };
    }
    return { kind: "ok", recovery: status.value };
  }

  async function loadSave(saveId: SaveId): Promise<SaveLoadResult> {
    const result = await options.persistence.loadSave({
      schemaVersion: "load-save-query-v1",
      saveId,
    });
    if (result.kind === "found") return { kind: "found", save: result.value };
    if (result.kind === "not-found") return { kind: "not-found" };
    return { kind: "result", result: persistenceRejected(result.error) };
  }

  async function loadRun(runId: MonthRunRecordV1["runId"]): Promise<RunLoadResult> {
    const result = await options.persistence.loadMonthRun({
      schemaVersion: "load-month-run-query-v1",
      runId,
    });
    if (result.kind === "found") return { kind: "found", run: result.value };
    if (result.kind === "not-found") return { kind: "not-found" };
    return { kind: "result", result: persistenceRejected(result.error) };
  }

  async function loadActiveRun(saveId: SaveId): Promise<RunLoadResult> {
    const result = await options.persistence.loadActiveMonthRun({
      schemaVersion: "load-active-month-run-query-v1",
      saveId,
    });
    if (result.kind === "found") return { kind: "found", run: result.value };
    if (result.kind === "not-found") return { kind: "not-found" };
    return { kind: "result", result: persistenceRejected(result.error) };
  }

  return {
    load: (saveId) => execute({ kind: "load", saveId }),
    begin: (command) => execute({ kind: "begin", command }),
    resume: (command) => execute({ kind: "resume", command }),
    retry: () =>
      retryableOperation === null
        ? Promise.resolve(
            rejected({
              category: "contract",
              code: "NoRetryableOperation",
              message: "No retryable persisted MonthRun operation is available",
              retryable: false,
            }),
          )
        : execute(retryableOperation),
  };
}

function checkpointBlocked(
  save: SaveRecordV1,
  run: MonthRunRecordV1,
  restored: Exclude<ReturnType<typeof restorePersistedCheckpoint>, { kind: "ok" }>,
): PersistedMonthRunResult {
  return {
    kind: "blocked",
    reason:
      restored.code === "IncompatibleCheckpoint"
        ? "incompatible-checkpoint"
        : "corrupted-checkpoint",
    message: restored.message,
    recovery: null,
    save,
    run,
  };
}

function protocolRejected(
  code: MonthRunProtocolError["code"],
  message: string,
): PersistedMonthRunResult {
  return rejected({
    category: "protocol",
    code,
    message,
    retryable: false,
    protocolError: { code, message },
  });
}

function persistenceRejected(error: PersistenceErrorV1): PersistedMonthRunResult {
  return rejected({
    category: "persistence",
    code: error.code,
    message: error.message,
    retryable: RETRYABLE_PERSISTENCE_CODES.has(error.code),
    persistenceError: error,
  });
}

function rejected(error: PersistedMonthRunError): PersistedMonthRunResult {
  return { kind: "rejected", error };
}
