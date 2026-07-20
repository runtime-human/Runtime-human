import type {
  AuthoritativeJsonValue,
  Fingerprint,
  MonthRunCheckpointV1,
  MonthRunCompatibilityV1,
  MonthRunId,
  MonthRunPhase,
  MonthRunStatus,
  SaveId,
  SaveRevision,
  SerializedXoshiro256State,
} from "@runtime-human/game-schema";
import {
  parseDecisionId,
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
} from "@runtime-human/game-schema";

import { canonicalizeAuthoritative } from "../determinism/authoritative-json";
import { fingerprint } from "../determinism/hash";

const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;
const STATUSES = new Set<MonthRunStatus>([
  "ready",
  "running",
  "suspended",
  "completed",
  "committed",
  "failed",
  "incompatible",
  "recovery-required",
  "abandoned",
]);
const PHASES = new Set<MonthRunPhase>([
  "initialize",
  "materialize",
  "await-decision",
  "resolve",
  "finalize",
]);

export type CreateMonthRunCheckpointInput = Readonly<{
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  compatibility: MonthRunCompatibilityV1;
  plan: AuthoritativeJsonValue;
  rngState: SerializedXoshiro256State;
}>;

export type RestoreMonthRunCheckpointResult =
  | Readonly<{ kind: "ok"; checkpoint: MonthRunCheckpointV1 }>
  | Readonly<{
      kind: "error";
      code: "InvalidCheckpoint" | "CorruptedCheckpoint";
      message: string;
    }>;

type CheckpointWithoutHash = Omit<MonthRunCheckpointV1, "checkpointHash">;

export function snapshotAuthoritativeValue(value: unknown): AuthoritativeJsonValue {
  return JSON.parse(canonicalizeAuthoritative(value)) as AuthoritativeJsonValue;
}

export function createMonthRunCheckpoint(
  input: CreateMonthRunCheckpointInput,
): MonthRunCheckpointV1 {
  return rehashMonthRunCheckpoint({
    schemaVersion: "month-run-checkpoint-v1",
    runId: parseMonthRunId(input.runId),
    saveId: parseSaveId(input.saveId),
    baseSaveRevision: parseSaveRevision(input.baseSaveRevision),
    runRevision: parseMonthRunRevision(0),
    status: "ready",
    phase: "initialize",
    stepIndex: 0,
    plan: snapshotAuthoritativeValue(input.plan),
    compatibility: snapshotCompatibility(input.compatibility),
    rngState: parseSerializedXoshiro256State(input.rngState),
    provisionalState: {},
    materializedOutcomes: [],
    pendingDecision: null,
    acceptedDecisions: [],
    terminalResult: null,
    previousCheckpointHash: null,
  });
}

export function rehashMonthRunCheckpoint(
  checkpoint: CheckpointWithoutHash,
): MonthRunCheckpointV1 {
  const detached = snapshotAuthoritativeValue(checkpoint) as unknown as CheckpointWithoutHash;
  return {
    ...detached,
    checkpointHash: fingerprint("month-run-checkpoint-v1", detached),
  };
}

export function restoreMonthRunCheckpoint(value: unknown): RestoreMonthRunCheckpointResult {
  let snapshot: AuthoritativeJsonValue;
  try {
    snapshot = snapshotAuthoritativeValue(value);
  } catch (error) {
    return invalidCheckpoint(error);
  }

  try {
    const checkpoint = parseCheckpoint(snapshot);
    const { checkpointHash, ...withoutHash } = checkpoint;
    const expectedHash = fingerprint("month-run-checkpoint-v1", withoutHash);
    if (checkpointHash !== expectedHash) {
      return {
        kind: "error",
        code: "CorruptedCheckpoint",
        message: "MonthRun checkpoint fingerprint does not match its payload",
      };
    }
    return { kind: "ok", checkpoint };
  } catch (error) {
    return invalidCheckpoint(error);
  }
}

function parseCheckpoint(value: AuthoritativeJsonValue): MonthRunCheckpointV1 {
  const record = expectRecord(value, "checkpoint");
  if (record.schemaVersion !== "month-run-checkpoint-v1") {
    throw new TypeError("Unsupported MonthRun checkpoint schema");
  }

  const status = expectString(record.status, "status") as MonthRunStatus;
  const phase = expectString(record.phase, "phase") as MonthRunPhase;
  if (!STATUSES.has(status) || !PHASES.has(phase)) {
    throw new TypeError("Unknown MonthRun status or phase");
  }

  const pendingDecision = parsePendingDecision(record.pendingDecision);
  const terminalResult = record.terminalResult ?? null;
  validateStatusShape(status, phase, pendingDecision, terminalResult);

  return {
    schemaVersion: "month-run-checkpoint-v1",
    runId: parseMonthRunId(record.runId),
    saveId: parseSaveId(record.saveId),
    baseSaveRevision: parseSaveRevision(record.baseSaveRevision),
    runRevision: parseMonthRunRevision(record.runRevision),
    status,
    phase,
    stepIndex: parseStepIndex(record.stepIndex),
    plan: expectAuthoritative(record.plan, "plan"),
    compatibility: parseCompatibility(record.compatibility),
    rngState: parseSerializedXoshiro256State(record.rngState),
    provisionalState: expectAuthoritative(record.provisionalState, "provisionalState"),
    materializedOutcomes: parseOutcomes(record.materializedOutcomes),
    pendingDecision,
    acceptedDecisions: parseAcceptedDecisions(record.acceptedDecisions),
    terminalResult: expectNullableAuthoritative(terminalResult, "terminalResult"),
    previousCheckpointHash: parseNullableFingerprint(record.previousCheckpointHash),
    checkpointHash: parseFingerprint(record.checkpointHash, "checkpointHash"),
  };
}

function parseCompatibility(value: AuthoritativeJsonValue | undefined): MonthRunCompatibilityV1 {
  const record = expectRecord(value, "compatibility");
  if (record.checkpointSchema !== "month-run-checkpoint-v1") {
    throw new TypeError("Incompatible MonthRun checkpoint schema marker");
  }
  return record as unknown as MonthRunCompatibilityV1;
}

function snapshotCompatibility(value: MonthRunCompatibilityV1): MonthRunCompatibilityV1 {
  return parseCompatibility(snapshotAuthoritativeValue(value));
}

function parseOutcomes(value: AuthoritativeJsonValue | undefined) {
  if (!Array.isArray(value)) throw new TypeError("materializedOutcomes must be an array");
  const ids = new Set<string>();
  return value.map((item) => {
    const record = expectRecord(item, "materializedOutcome");
    const outcomeId = expectString(record.outcomeId, "outcomeId");
    if (ids.has(outcomeId)) throw new TypeError("Duplicate materialized outcome ID");
    ids.add(outcomeId);
    return {
      outcomeId,
      scope: expectString(record.scope, "scope"),
      payload: expectAuthoritative(record.payload, "payload"),
      payloadHash: parseFingerprint(record.payloadHash, "payloadHash"),
    };
  });
}

function parsePendingDecision(value: AuthoritativeJsonValue | undefined) {
  if (value === null || value === undefined) return null;
  const record = expectRecord(value, "pendingDecision");
  return {
    decisionId: parseDecisionId(record.decisionId),
    kind: expectString(record.kind, "decision kind"),
    prompt: expectAuthoritative(record.prompt, "decision prompt"),
    answerSchemaFingerprint: parseFingerprint(
      record.answerSchemaFingerprint,
      "answerSchemaFingerprint",
    ),
  };
}

function parseAcceptedDecisions(value: AuthoritativeJsonValue | undefined) {
  if (!Array.isArray(value)) throw new TypeError("acceptedDecisions must be an array");
  const ids = new Set<string>();
  return value.map((item) => {
    const record = expectRecord(item, "acceptedDecision");
    const decisionId = parseDecisionId(record.decisionId);
    if (ids.has(decisionId)) throw new TypeError("Duplicate accepted decision ID");
    ids.add(decisionId);
    return {
      requestId: parseRequestId(record.requestId),
      decisionId,
      answer: expectAuthoritative(record.answer, "answer"),
      answerHash: parseFingerprint(record.answerHash, "answerHash"),
    };
  });
}

function validateStatusShape(
  status: MonthRunStatus,
  phase: MonthRunPhase,
  pendingDecision: ReturnType<typeof parsePendingDecision>,
  terminalResult: AuthoritativeJsonValue,
): void {
  if (status === "ready" && phase !== "initialize") {
    throw new TypeError("Ready MonthRun must be in initialize phase");
  }
  if (status === "suspended" && (phase !== "await-decision" || pendingDecision === null)) {
    throw new TypeError("Suspended MonthRun requires one pending decision");
  }
  if (status !== "suspended" && pendingDecision !== null) {
    throw new TypeError("Only a suspended MonthRun may contain a pending decision");
  }
  if ((status === "completed" || status === "committed") && terminalResult === null) {
    throw new TypeError("Completed MonthRun requires a terminal result");
  }
  if (status !== "completed" && status !== "committed" && terminalResult !== null) {
    throw new TypeError("Non-completed MonthRun cannot contain a terminal result");
  }
}

function parseStepIndex(value: AuthoritativeJsonValue | undefined): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("stepIndex must be a non-negative safe integer");
  }
  return value;
}

function parseFingerprint(value: AuthoritativeJsonValue | undefined, name: string): Fingerprint {
  if (typeof value !== "string" || !FINGERPRINT_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a lowercase SHA-256 fingerprint`);
  }
  return value as Fingerprint;
}

function parseNullableFingerprint(value: AuthoritativeJsonValue | undefined): Fingerprint | null {
  return value === null || value === undefined
    ? null
    : parseFingerprint(value, "previousCheckpointHash");
}

function expectRecord(
  value: AuthoritativeJsonValue | undefined,
  name: string,
): Readonly<Record<string, AuthoritativeJsonValue>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function expectString(value: AuthoritativeJsonValue | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function expectAuthoritative(
  value: AuthoritativeJsonValue | undefined,
  name: string,
): AuthoritativeJsonValue {
  if (value === undefined) throw new TypeError(`${name} is required`);
  return value;
}

function expectNullableAuthoritative(
  value: AuthoritativeJsonValue | undefined,
  name: string,
): AuthoritativeJsonValue | null {
  if (value === undefined) throw new TypeError(`${name} is required`);
  return value;
}

function invalidCheckpoint(error: unknown): RestoreMonthRunCheckpointResult {
  return {
    kind: "error",
    code: "InvalidCheckpoint",
    message: error instanceof Error ? error.message : "Invalid MonthRun checkpoint",
  };
}
