import type {
  AcceptDecisionEventV1,
  AdvanceStepEventV1,
  AuthoritativeJsonValue,
  Fingerprint,
  MaterializeOutcomeEventV1,
  MonthRunCheckpointV1,
  MonthRunEventV1,
  MonthRunPhase,
  MonthRunProtocolErrorCode,
  MonthRunTransitionResult,
  PendingDecisionV1,
  SerializedXoshiro256State,
} from "@runtime-human/game-schema";
import {
  parseDecisionId,
  parseMonthRunRevision,
  parseRequestId,
  parseSerializedXoshiro256State,
} from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import { rehashMonthRunCheckpoint, snapshotAuthoritativeValue } from "./checkpoint";

const TOKEN_PATTERN = /^[!-~]{1,256}$/u;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;

export function transitionMonthRun(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult {
  try {
    return transitionMonthRunUnchecked(checkpoint, normalizeMonthRunEvent(event));
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
      return accepted(checkpoint, { status: "running", phase: "materialize" }, true);
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
      return accepted(
        checkpoint,
        {
          status: "completed",
          phase: "finalize",
          terminalResult: event.result,
          terminalReason: null,
        },
        true,
      );
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
  return accepted(
    checkpoint,
    {
      phase: event.phase,
      provisionalState: event.provisionalState,
      rngState: event.rngState ?? checkpoint.rngState,
    },
    true,
  );
}

function materialize(
  checkpoint: MonthRunCheckpointV1,
  event: MaterializeOutcomeEventV1,
): MonthRunTransitionResult {
  return accepted(
    checkpoint,
    {
      phase: event.phase,
      provisionalState: event.provisionalState,
      rngState: event.rngState,
      materializedOutcomes: [
        ...checkpoint.materializedOutcomes,
        {
          outcomeId: event.outcomeId,
          scope: event.scope,
          payload: event.payload,
          payloadHash: fingerprint("month-run-materialized-outcome-v1", event.payload),
        },
      ],
    },
    true,
  );
}

function suspend(
  checkpoint: MonthRunCheckpointV1,
  decision: PendingDecisionV1,
): MonthRunTransitionResult {
  return accepted(
    checkpoint,
    {
      status: "suspended",
      phase: "await-decision",
      pendingDecision: decision,
    },
    true,
  );
}

function acceptDecision(
  checkpoint: MonthRunCheckpointV1,
  event: AcceptDecisionEventV1,
): MonthRunTransitionResult {
  if (checkpoint.pendingDecision?.decisionId !== event.decisionId) {
    return reject(checkpoint, "UnexpectedDecision", "Decision does not match the pending decision");
  }
  return accepted(checkpoint, {
    status: "running",
    phase: "resolve",
    pendingDecision: null,
    acceptedDecisions: [
      ...checkpoint.acceptedDecisions,
      {
        requestId: event.requestId,
        decisionId: event.decisionId,
        answer: event.answer,
        answerHash: fingerprint("month-run-decision-answer-v1", event.answer),
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
  reason: AuthoritativeJsonValue,
): MonthRunTransitionResult {
  return accepted(checkpoint, {
    status,
    pendingDecision: null,
    terminalResult: null,
    terminalReason: reason,
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
    | "terminalReason"
  >
>;

function accepted(
  checkpoint: MonthRunCheckpointV1,
  changes: CheckpointChanges,
  advanceProgramCounter = false,
): MonthRunTransitionResult {
  const withoutHash = removeCheckpointHash(checkpoint);
  return {
    kind: "accepted",
    checkpoint: rehashMonthRunCheckpoint({
      ...withoutHash,
      ...changes,
      runRevision: parseMonthRunRevision(checkpoint.runRevision + 1),
      stepIndex: checkpoint.stepIndex + 1,
      programCounter: checkpoint.programCounter + (advanceProgramCounter ? 1 : 0),
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

function normalizeMonthRunEvent(value: MonthRunEventV1): MonthRunEventV1 {
  const event = expectRuntimeRecord(value, "MonthRun event");
  switch (event.type) {
    case "start":
      return { type: "start" };
    case "advance-step": {
      const rngState = parseOptionalRngState(event.rngState);
      return {
        type: "advance-step",
        phase: parseRunningPhase(event.phase),
        provisionalState: snapshotAuthoritativeValue(event.provisionalState),
        ...(rngState === undefined ? {} : { rngState }),
      };
    }
    case "materialize-outcome":
      return {
        type: "materialize-outcome",
        outcomeId: validateToken(event.outcomeId, "outcomeId"),
        scope: validateToken(event.scope, "scope"),
        payload: snapshotAuthoritativeValue(event.payload),
        phase: parseRunningPhase(event.phase),
        provisionalState: snapshotAuthoritativeValue(event.provisionalState),
        rngState: parseSerializedXoshiro256State(event.rngState),
      };
    case "suspend-for-decision":
      return {
        type: "suspend-for-decision",
        decision: parsePendingDecision(event.decision),
      };
    case "accept-decision":
      return {
        type: "accept-decision",
        requestId: parseRequestId(event.requestId),
        decisionId: parseDecisionId(event.decisionId),
        answer: snapshotAuthoritativeValue(event.answer),
      };
    case "complete":
      return {
        type: "complete",
        result: snapshotNonNullAuthoritativeValue(event.result, "terminal result"),
      };
    case "mark-committed":
      return { type: "mark-committed" };
    case "fail":
    case "mark-incompatible":
    case "require-recovery":
    case "abandon":
      return {
        type: event.type,
        reason: snapshotNonNullAuthoritativeValue(event.reason, "terminal reason"),
      };
    default:
      throw new TypeError("Unknown MonthRun event type");
  }
}

function parsePendingDecision(value: unknown): PendingDecisionV1 {
  const decision = expectRuntimeRecord(value, "pending decision");
  return {
    decisionId: parseDecisionId(decision.decisionId),
    kind: validateToken(decision.kind, "decision kind"),
    prompt: snapshotAuthoritativeValue(decision.prompt),
    answerSchemaFingerprint: parseRuntimeFingerprint(
      decision.answerSchemaFingerprint,
      "answerSchemaFingerprint",
    ),
  };
}

function parseRunningPhase(
  value: unknown,
): Extract<MonthRunPhase, "materialize" | "resolve" | "finalize"> {
  if (value !== "materialize" && value !== "resolve" && value !== "finalize") {
    throw new TypeError("Running MonthRun has an invalid phase");
  }
  return value;
}

function parseOptionalRngState(value: unknown): SerializedXoshiro256State | undefined {
  return value === undefined ? undefined : parseSerializedXoshiro256State(value);
}

function parseRuntimeFingerprint(value: unknown, name: string): Fingerprint {
  if (typeof value !== "string" || !FINGERPRINT_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a lowercase SHA-256 fingerprint`);
  }
  return value as Fingerprint;
}

function snapshotNonNullAuthoritativeValue(
  value: unknown,
  name: string,
): Exclude<AuthoritativeJsonValue, null> {
  const snapshot = snapshotAuthoritativeValue(value);
  if (snapshot === null) throw new TypeError(`${name} cannot be null`);
  return snapshot;
}

function expectRuntimeRecord(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function validateToken(value: unknown, name: string): string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new TypeError(`${name} must contain 1-256 printable ASCII characters without whitespace`);
  }
  return value;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MonthRun variant: ${String(value)}`);
}
