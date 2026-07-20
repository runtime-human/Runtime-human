import {
  createMonthRunCheckpoint,
  fingerprint,
  runUntilBoundary,
  transitionMonthRun,
  type MonthRunStep,
} from "@runtime-human/game-core";
import type {
  BeginMonthCommandV1,
  MonthRunCheckpointV1,
  MonthRunId,
  MonthRunProtocolError,
  RequestId,
  ResumeMonthCommandV1,
  SaveRevision,
} from "@runtime-human/game-schema";

export type MonthRunReferenceCommandResult =
  | Readonly<{
      kind: "boundary" | "duplicate";
      checkpoint: MonthRunCheckpointV1;
    }>
  | Readonly<{
      kind: "rejected";
      checkpoint: MonthRunCheckpointV1 | null;
      error: MonthRunProtocolError;
    }>;

export type CreateMonthRunReferenceHarnessInput = Readonly<{
  steps: readonly MonthRunStep[];
  saveRevision: SaveRevision;
}>;

type Receipt = Readonly<{
  payloadHash: string;
  result: MonthRunReferenceCommandResult;
}>;

export function createMonthRunReferenceHarness(input: CreateMonthRunReferenceHarnessInput) {
  const checkpoints = new Map<MonthRunId, MonthRunCheckpointV1>();
  const activeRunsBySave = new Map<string, MonthRunId>();
  const receipts = new Map<RequestId, Receipt>();

  return {
    begin(command: BeginMonthCommandV1): MonthRunReferenceCommandResult {
      const payloadHash = fingerprint("month-run-command-v1", command);
      const receipt = receipts.get(command.requestId);
      if (receipt !== undefined) {
        return receipt.payloadHash === payloadHash
          ? receipt.result
          : rejected(
              receipt.result.checkpoint,
              "RequestPayloadConflict",
              `Request ${command.requestId} was already used with another payload`,
            );
      }

      const activeRunId = activeRunsBySave.get(command.saveId);
      const activeCheckpoint =
        activeRunId === undefined ? null : (checkpoints.get(activeRunId) ?? null);
      if (command.expectedSaveRevision !== input.saveRevision) {
        return remember(
          command.requestId,
          payloadHash,
          rejected(
            activeCheckpoint,
            "SaveRevisionConflict",
            "BeginMonth expected save revision is stale",
          ),
        );
      }
      if (activeCheckpoint !== null && isActive(activeCheckpoint)) {
        return remember(
          command.requestId,
          payloadHash,
          rejected(
            activeCheckpoint,
            "ActiveRunExists",
            `Save ${command.saveId} already has an active MonthRun`,
          ),
        );
      }

      const checkpoint = createMonthRunCheckpoint({
        runId: command.runId,
        saveId: command.saveId,
        baseSaveRevision: command.expectedSaveRevision,
        compatibility: command.compatibility,
        plan: command.plan,
        rngState: command.initialRngState,
      });
      const runResult = runUntilBoundary(checkpoint, input.steps);
      checkpoints.set(command.runId, runResult.checkpoint);
      activeRunsBySave.set(command.saveId, command.runId);
      return remember(command.requestId, payloadHash, runResult);
    },

    resume(command: ResumeMonthCommandV1): MonthRunReferenceCommandResult {
      const payloadHash = fingerprint("month-run-command-v1", command);
      const receipt = receipts.get(command.requestId);
      if (receipt !== undefined) {
        return receipt.payloadHash === payloadHash
          ? receipt.result
          : rejected(
              receipt.result.checkpoint,
              "RequestPayloadConflict",
              `Request ${command.requestId} was already used with another payload`,
            );
      }

      const checkpoint = checkpoints.get(command.runId) ?? null;
      if (checkpoint === null) {
        return remember(
          command.requestId,
          payloadHash,
          rejected(null, "RunNotFound", `MonthRun ${command.runId} does not exist`),
        );
      }
      if (checkpoint.saveId !== command.saveId) {
        return remember(
          command.requestId,
          payloadHash,
          rejected(checkpoint, "RunNotFound", "MonthRun does not belong to the requested save"),
        );
      }
      if (checkpoint.runRevision !== command.expectedRunRevision) {
        return remember(
          command.requestId,
          payloadHash,
          rejected(
            checkpoint,
            "RunRevisionConflict",
            "ResumeMonth expected run revision is stale",
          ),
        );
      }

      const transition = transitionMonthRun(checkpoint, {
        type: "accept-decision",
        requestId: command.requestId,
        decisionId: command.decisionId,
        answer: command.answer,
      });
      if (transition.kind !== "accepted") {
        return remember(command.requestId, payloadHash, transition);
      }

      const runResult = runUntilBoundary(transition.checkpoint, input.steps);
      checkpoints.set(command.runId, runResult.checkpoint);
      return remember(command.requestId, payloadHash, runResult);
    },

    load(runId: MonthRunId): MonthRunCheckpointV1 | null {
      return checkpoints.get(runId) ?? null;
    },
  };

  function remember(
    requestId: RequestId,
    payloadHash: string,
    result: MonthRunReferenceCommandResult,
  ): MonthRunReferenceCommandResult {
    receipts.set(requestId, { payloadHash, result });
    return result;
  }
}

function isActive(checkpoint: MonthRunCheckpointV1): boolean {
  return (
    checkpoint.status === "ready" ||
    checkpoint.status === "running" ||
    checkpoint.status === "suspended" ||
    checkpoint.status === "completed"
  );
}

function rejected(
  checkpoint: MonthRunCheckpointV1 | null,
  code: MonthRunProtocolError["code"],
  message: string,
): MonthRunReferenceCommandResult {
  return { kind: "rejected", checkpoint, error: { code, message } };
}
