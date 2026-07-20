import type {
  AcceptDecisionEventV1,
  AdvanceStepEventV1,
  MaterializeOutcomeEventV1,
  MonthRunCheckpointV1,
  MonthRunEventV1,
  MonthRunProtocolErrorCode,
  MonthRunTransitionResult,
  PendingDecisionV1,
} from "@runtime-human/game-schema";
import { parseMonthRunRevision } from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import { rehashMonthRunCheckpoint, snapshotAuthoritativeValue } from "./checkpoint";

export function transitionMonthRun(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  try {
    return transitionMonthRunUnchecked(checkpoint, event);
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      return reject(
        checkpoint,
        "InvalidCommand",
        error.message.length === 0 ? "Invalid MonthRun event" : error.message,
      );
    }
    throw error;
  }
}

function transitionMonthRunUnchecked(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  if (event.type === "materialize-outcome") {
    const repeat = classifyMaterialization(checkpoint, event);
    if (repeat !== null) return repeat;
  }
  if (event.type === "accept-decision") {
    const repeat = classifyDecisionAnswer(checkpoint, event);
    if (repeat !== null) return repeat;
  }

  switch (checkpoint.status) {
    case "ready":
      return transitionReady(checkpoint, event);
    case "running":
      return transitionRunning(checkpoint, event);
    case "suspended":
      return transitionSuspended(checkpoint, event);
    case "completed":
      return transitionCompleted(checkpoint, event);
    case "committed":
    case "failed":
    case "incompatible":
    case "recovery-required":
    case "abandoned":
      return reject(checkpoint, "IllegalTransition", `MonthRun ${checkpoint.status} is terminal`);
    default:
      return assertNever(checkpoint.status);
  }
}

function transitionReady(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  switch (event.type) {
    case "start":
      return accepted(checkpoint, { status: "running", phase: "materialize" });
    case "fail":
      return exceptional(checkpoint, "failed", event.reason);
    case "mark-incompatible":
      return exceptional(checkpoint, "incompatible", event.reason);
    case "require-recovery":
      return exceptional(checkpoint, "recovery-required", event.reason);
    case "abandon":
      return exceptional(checkpoint, "abandoned", event.reason);
    case "advance-step":
    case "materialize-outcome":
    case "suspend-for-decision":
    case "accept-decision":
    case "complete":
    case "mark-committed":
      return illegal(checkpoint, event);
    default:
      return assertNever(event);
  }
}

function transitionRunning(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  switch (event.type) {
    case "advance-step":
      return advance(checkpoint, event);
    case "materialize-outcome":
      return materialize(checkpoint, event);
    case "suspend-for-decision":
      return suspend(checkpoint, event.decision);
    case "complete":
      return accepted(checkpoint, {
        status: "completed",
        phase: "finalize",
        terminalResult: snapshotAuthoritativeValue(event.result),
      });
    case "fail":
      return exceptional(checkpoint, "failed", event.reason);
    case "mark-incompatible":
      return exceptional(checkpoint, "incompatible", event.reason);
    case "require-recovery":
      return exceptional(checkpoint, "recovery-required", event.reason);
    case "abandon":
      return exceptional(checkpoint, "abandoned", event.reason);
    case "start":
    case "accept-decision":
    case "mark-committed":
      return illegal(checkpoint, event);
    default:
      return assertNever(event);
  }
}

function transitionSuspended(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  switch (event.type) {
    case "accept-decision":
      return acceptDecision(checkpoint, event);
    case "fail":
      return exceptional(checkpoint, "failed", event.reason);
    case "mark-incompatible":
      return exceptional(checkpoint, "incompatible", event.reason);
    case "require-recovery":
      return exceptional(checkpoint, "recovery-required", event.reason);
    case "abandon":
      return exceptional(checkpoint, "abandoned", event.reason);
    case "start":
    case "advance-step":
    case "materialize-outcome":
    case "suspend-for-decision":
    case "complete":
    case "mark-committed":
      return illegal(checkpoint, event);
    default:
      return assertNever(event);
  }
}

function transitionCompleted(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  switch (event.type) {
    case "mark-committed":
      return accepted(checkpoint, { status: "committed", phase: "finalize" });
    case "require-recovery":
      return exceptional(checkpoint, "recovery-required", event.reason);
    case "start":
    case "advance-step":
    case "materialize-outcome":
    case "suspend-for-decision":
    case "accept-decision":
    case "complete":
    case "fail":
    case "mark-incompatible":
    case "abandon":
      return illegal(checkpoint, event);
    default:
      return assertNever(event);
  }
}

function advance(
  checkpoint: MonthRunCheckpointV1,
  event: AdvanceStepEventV1,
): MonthRunTransitionResult {
  validateRunningPhase(event.phase);
  return accepted(checkpoint, {
    phase: event.phase,
    provisionalState: snapshotAuthoritativeValue(event.provisionalState),
    rngState: event.rngState ?? checkpoint.rngState,
  });
}

function materialize(
  checkpoint: MonthRunCheckpointV1,
  event: MaterializeOutcomeEventV1,
): MonthRunTransitionResult {
  validateRunningPhase(event.phase);
  const payload = snapshotAuthoritativeValue(event.payload);
  return accepted(checkpoint, {
    phase: event.phase,
    provisionalState: snapshotAuthoritativeValue(event.provisionalState),
    rngState: event.rngState,
    materializedOutcomes: [
      ...checkpoint.materializedOutcomes,
      {
        outcomeId: validateToken(event.outcomeId, "outcomeId"),
        scope: validateToken(event.scope, "scope"),
        payload,
        payloadHash: fingerprint("month-run-materialized-outcome-v1", payload),
      },
    ],
  });
}

function suspend(
  checkpoint: MonthRunCheckpointV1,
  decision: PendingDecisionV1,
): MonthRunTransitionResult {
  return accepted(checkpoint, {
    status: "suspended",
    phase: "await-decision",
    pendingDecision: {
      ...decision,
      kind: validateToken(decision.kind, "decision kind"),
      prompt: snapshotAuthoritativeValue(decision.prompt),
    },
  });
}

function acceptDecision(
  checkpoint: MonthRunCheckpointV1,
  event: AcceptDecisionEventV1,
): MonthRunTransitionResult {
  if (checkpoint.pendingDecision?.decisionId !== event.decisionId) {
    return reject(checkpoint, "UnexpectedDecision", "Decision does not match the pending decision");
  }
  const answer = snapshotAuthoritativeValue(event.answer);
  return accepted(checkpoint, {
    status: "running",
    phase: "resolve",
    pendingDecision: null,
    acceptedDecisions: [
      ...checkpoint.acceptedDecisions,
      {
        requestId: event.requestId,
        decisionId: event.decisionId,
        answer,
        answerHash: fingerprint("month-run-decision-answer-v1", answer),
      },
    ],
  });
}

function classifyMaterialization(
  checkpoint: MonthRunCheckpointV1,
  event: MaterializeOutcomeEventV1,
): MonthRunTransitionResult | null {
  const existing = checkpoint.materializedOutcomes.find(
    (outcome) => outcome.outcomeId === event.outcomeId,
  );
  if (existing === undefined) return null;
  const payloadHash = fingerprint("month-run-materialized-outcome-v1", event.payload);
  return existing.payloadHash === payloadHash && existing.scope === event.scope
    ? { kind: "duplicate", checkpoint }
    : reject(
        checkpoint,
        "MaterializationConflict",
        `Outcome ${event.outcomeId} was already materialized differently`,
      );
}

function classifyDecisionAnswer(
  checkpoint: MonthRunCheckpointV1,
  event: AcceptDecisionEventV1,
): MonthRunTransitionResult | null {
  const answerHash = fingerprint("month-run-decision-answer-v1", event.answer);
  const request = checkpoint.acceptedDecisions.find(
    (decision) => decision.requestId === event.requestId,
  );
  if (request !== undefined) {
    return request.decisionId === event.decisionId && request.answerHash === answerHash
      ? { kind: "duplicate", checkpoint }
      : reject(
          checkpoint,
          "RequestPayloadConflict",
          `Request ${event.requestId} was already used with another payload`,
        );
  }
  const decision = checkpoint.acceptedDecisions.find(
    (acceptedDecision) => acceptedDecision.decisionId === event.decisionId,
  );
  return decision === undefined
    ? null
    : reject(
        checkpoint,
        "DecisionAlreadyAnswered",
        `Decision ${event.decisionId} was already answered`,
      );
}

function exceptional(
  checkpoint: MonthRunCheckpointV1,
  status: "failed" | "incompatible" | "recovery-required" | "abandoned",
  reason: unknown,
): MonthRunTransitionResult {
  return accepted(checkpoint, {
    status,
    pendingDecision: null,
    terminalResult: null,
    provisionalState: { terminalReason: snapshotAuthoritativeValue(reason) },
  });
}

type CheckpointChanges = Partial<
  Pick<
    MonthRunCheckpointV1,
    | "status"
    | "phase"
    | "rngState"
    | "provisionalState"
    | "materializedOutcomes"
    | "pendingDecision"
    | "acceptedDecisions"
    | "terminalResult"
  >
>;

function accepted(
  checkpoint: MonthRunCheckpointV1,
  changes: CheckpointChanges,
): MonthRunTransitionResult {
  const withoutHash = removeCheckpointHash(checkpoint);
  return {
    kind: "accepted",
    checkpoint: rehashMonthRunCheckpoint({
      ...withoutHash,
      ...changes,
      runRevision: parseMonthRunRevision(checkpoint.runRevision + 1),
      stepIndex: checkpoint.stepIndex + 1,
      previousCheckpointHash: checkpoint.checkpointHash,
    }),
  };
}

function removeCheckpointHash(
  checkpoint: MonthRunCheckpointV1,
): Omit<MonthRunCheckpointV1, "checkpointHash"> {
  const { checkpointHash, ...withoutHash } = checkpoint;
  if (checkpointHash.length === 0) throw new TypeError("Checkpoint hash cannot be empty");
  return withoutHash;
}

function illegal(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  return reject(
    checkpoint,
    "IllegalTransition",
    `Event ${event.type} is illegal while MonthRun is ${checkpoint.status}`,
  );
}

function reject(
  checkpoint: MonthRunCheckpointV1,
  code: MonthRunProtocolErrorCode,
  message: string,
): MonthRunTransitionResult {
  return { kind: "rejected", checkpoint, error: { code, message } };
}

function validateRunningPhase(phase: AdvanceStepEventV1["phase"]): void {
  if (phase === "initialize" || phase === "await-decision") {
    throw new TypeError(`Running MonthRun cannot enter ${phase} phase`);
  }
}

function validateToken(value: string, name: string): string {
  if (value.length === 0 || value.length > 256 || value.includes("\0")) {
    throw new TypeError(`${name} must contain 1-256 characters without NUL`);
  }
  return value;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MonthRun variant: ${String(value)}`);
}
