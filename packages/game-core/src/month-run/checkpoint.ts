import type {
  AuthoritativeJsonValue,
  DeterminismManifest,
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
const TOKEN_PATTERN = /^[!-~]{1,256}$/u;
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
const CHECKPOINT_KEYS = [
  "schemaVersion",
  "runId",
  "saveId",
  "baseSaveRevision",
  "runRevision",
  "status",
  "phase",
  "stepIndex",
  "programCounter",
  "plan",
  "compatibility",
  "rngState",
  "provisionalState",
  "materializedOutcomes",
  "pendingDecision",
  "acceptedDecisions",
  "terminalResult",
  "terminalReason",
  "previousCheckpointHash",
  "checkpointHash",
] as const;
const COMPATIBILITY_KEYS = [
  "checkpointSchema",
  "rulesFingerprint",
  "contentFingerprint",
  "saveSchemaFingerprint",
  "determinismManifest",
] as const;
const DETERMINISM_MANIFEST_KEYS = [
  "rulesVersion",
  "rngAlgorithm",
  "hashAlgorithm",
  "numericModel",
  "calendarModel",
  "candidateSort",
  "effectOrdering",
  "serializationVersion",
] as const;
const MATERIALIZED_OUTCOME_KEYS = ["outcomeId", "scope", "payload", "payloadHash"] as const;
const PENDING_DECISION_KEYS = ["decisionId", "kind", "prompt", "answerSchemaFingerprint"] as const;
const ACCEPTED_DECISION_KEYS = ["requestId", "decisionId", "answer", "answerHash"] as const;

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

export type MonthRunCompatibilityField =
  | "checkpointSchema"
  | "rulesFingerprint"
  | "contentFingerprint"
  | "saveSchemaFingerprint"
  | "determinismManifest";

export type MonthRunCompatibilityCheckResult =
  | Readonly<{ kind: "compatible" }>
  | Readonly<{
      kind: "incompatible";
      mismatches: readonly MonthRunCompatibilityField[];
    }>;

type CheckpointWithoutHash = Omit<MonthRunCheckpointV1, "checkpointHash">;

export function snapshotAuthoritativeValue(value: unknown): AuthoritativeJsonValue {
  return JSON.parse(canonicalizeAuthoritative(value)) as AuthoritativeJsonValue;
}

export function checkMonthRunCompatibility(
  actual: MonthRunCompatibilityV1,
  expected: MonthRunCompatibilityV1,
): MonthRunCompatibilityCheckResult {
  const left = snapshotCompatibility(actual);
  const right = snapshotCompatibility(expected);
  const mismatches: MonthRunCompatibilityField[] = [];

  if (left.checkpointSchema !== right.checkpointSchema) mismatches.push("checkpointSchema");
  if (left.rulesFingerprint !== right.rulesFingerprint) mismatches.push("rulesFingerprint");
  if (left.contentFingerprint !== right.contentFingerprint) mismatches.push("contentFingerprint");
  if (left.saveSchemaFingerprint !== right.saveSchemaFingerprint) {
    mismatches.push("saveSchemaFingerprint");
  }
  if (
    canonicalizeAuthoritative(left.determinismManifest) !==
    canonicalizeAuthoritative(right.determinismManifest)
  ) {
    mismatches.push("determinismManifest");
  }

  return mismatches.length === 0 ? { kind: "compatible" } : { kind: "incompatible", mismatches };
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
    programCounter: 0,
    plan: snapshotAuthoritativeValue(input.plan),
    compatibility: snapshotCompatibility(input.compatibility),
    rngState: parseSerializedXoshiro256State(input.rngState),
    provisionalState: {},
    materializedOutcomes: [],
    pendingDecision: null,
    acceptedDecisions: [],
    terminalResult: null,
    terminalReason: null,
    previousCheckpointHash: null,
  });
}

export function rehashMonthRunCheckpoint(checkpoint: CheckpointWithoutHash): MonthRunCheckpointV1 {
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
  assertExactKeys(record, CHECKPOINT_KEYS, "checkpoint");
  if (record.schemaVersion !== "month-run-checkpoint-v1") {
    throw new TypeError("Unsupported MonthRun checkpoint schema");
  }

  const status = expectString(record.status, "status") as MonthRunStatus;
  const phase = expectString(record.phase, "phase") as MonthRunPhase;
  if (!STATUSES.has(status) || !PHASES.has(phase)) {
    throw new TypeError("Unknown MonthRun status or phase");
  }

  const runRevision = parseMonthRunRevision(record.runRevision);
  const stepIndex = parseCounter(record.stepIndex, "stepIndex");
  const programCounter = parseCounter(record.programCounter, "programCounter");
  const previousCheckpointHash = parseNullableFingerprint(record.previousCheckpointHash);
  const pendingDecision = parsePendingDecision(record.pendingDecision);
  const terminalResult = expectNullableAuthoritative(record.terminalResult, "terminalResult");
  const terminalReason = expectNullableAuthoritative(record.terminalReason, "terminalReason");
  validateStatusShape(status, phase, pendingDecision, terminalResult, terminalReason);
  validateCheckpointProgress(
    status,
    runRevision,
    stepIndex,
    programCounter,
    previousCheckpointHash,
  );

  return {
    schemaVersion: "month-run-checkpoint-v1",
    runId: parseMonthRunId(record.runId),
    saveId: parseSaveId(record.saveId),
    baseSaveRevision: parseSaveRevision(record.baseSaveRevision),
    runRevision,
    status,
    phase,
    stepIndex,
    programCounter,
    plan: expectAuthoritative(record.plan, "plan"),
    compatibility: parseCompatibility(record.compatibility),
    rngState: parseSerializedXoshiro256State(record.rngState),
    provisionalState: expectAuthoritative(record.provisionalState, "provisionalState"),
    materializedOutcomes: parseOutcomes(record.materializedOutcomes),
    pendingDecision,
    acceptedDecisions: parseAcceptedDecisions(record.acceptedDecisions),
    terminalResult,
    terminalReason,
    previousCheckpointHash,
    checkpointHash: parseFingerprint(record.checkpointHash, "checkpointHash"),
  };
}

function parseCompatibility(value: AuthoritativeJsonValue | undefined): MonthRunCompatibilityV1 {
  const record = expectRecord(value, "compatibility");
  assertExactKeys(record, COMPATIBILITY_KEYS, "compatibility");
  if (record.checkpointSchema !== "month-run-checkpoint-v1") {
    throw new TypeError("Incompatible MonthRun checkpoint schema marker");
  }
  return {
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint: parseFingerprint(record.rulesFingerprint, "rulesFingerprint"),
    contentFingerprint: parseFingerprint(record.contentFingerprint, "contentFingerprint"),
    saveSchemaFingerprint: parseFingerprint(record.saveSchemaFingerprint, "saveSchemaFingerprint"),
    determinismManifest: parseDeterminismManifest(record.determinismManifest),
  };
}

function parseDeterminismManifest(value: AuthoritativeJsonValue | undefined): DeterminismManifest {
  const record = expectRecord(value, "determinismManifest");
  assertExactKeys(record, DETERMINISM_MANIFEST_KEYS, "determinismManifest");
  const rulesVersion = expectString(record.rulesVersion, "rulesVersion");
  if (
    record.rngAlgorithm !== "xoshiro256ss-v1" ||
    record.hashAlgorithm !== "sha256-v1" ||
    record.numericModel !== "fixed-point-v1" ||
    record.calendarModel !== "gregorian-v1" ||
    record.candidateSort !== "stable-id-ascending-v1" ||
    record.effectOrdering !== "phase-then-priority-then-stable-id-v1" ||
    record.serializationVersion !== "canonical-json-v1"
  ) {
    throw new TypeError("Unsupported determinism manifest algorithms");
  }
  return {
    rulesVersion,
    rngAlgorithm: "xoshiro256ss-v1",
    hashAlgorithm: "sha256-v1",
    numericModel: "fixed-point-v1",
    calendarModel: "gregorian-v1",
    candidateSort: "stable-id-ascending-v1",
    effectOrdering: "phase-then-priority-then-stable-id-v1",
    serializationVersion: "canonical-json-v1",
  };
}

function snapshotCompatibility(value: MonthRunCompatibilityV1): MonthRunCompatibilityV1 {
  return parseCompatibility(snapshotAuthoritativeValue(value));
}

function parseOutcomes(value: AuthoritativeJsonValue | undefined) {
  if (!Array.isArray(value)) throw new TypeError("materializedOutcomes must be an array");
  const ids = new Set<string>();
  return value.map((item) => {
    const record = expectRecord(item, "materializedOutcome");
    assertExactKeys(record, MATERIALIZED_OUTCOME_KEYS, "materializedOutcome");
    const outcomeId = parseToken(record.outcomeId, "outcomeId");
    if (ids.has(outcomeId)) throw new TypeError("Duplicate materialized outcome ID");
    ids.add(outcomeId);
    const payload = expectAuthoritative(record.payload, "payload");
    const payloadHash = parseFingerprint(record.payloadHash, "payloadHash");
    if (payloadHash !== fingerprint("month-run-materialized-outcome-v1", payload)) {
      throw new TypeError(`Materialized outcome ${outcomeId} payload hash is inconsistent`);
    }
    return {
      outcomeId,
      scope: parseToken(record.scope, "scope"),
      payload,
      payloadHash,
    };
  });
}

function parsePendingDecision(value: AuthoritativeJsonValue | undefined) {
  if (value === null || value === undefined) return null;
  const record = expectRecord(value, "pendingDecision");
  assertExactKeys(record, PENDING_DECISION_KEYS, "pendingDecision");
  return {
    decisionId: parseDecisionId(record.decisionId),
    kind: parseToken(record.kind, "decision kind"),
    prompt: expectAuthoritative(record.prompt, "decision prompt"),
    answerSchemaFingerprint: parseFingerprint(
      record.answerSchemaFingerprint,
      "answerSchemaFingerprint",
    ),
  };
}

function parseAcceptedDecisions(value: AuthoritativeJsonValue | undefined) {
  if (!Array.isArray(value)) throw new TypeError("acceptedDecisions must be an array");
  const decisionIds = new Set<string>();
  const requestIds = new Set<string>();
  return value.map((item) => {
    const record = expectRecord(item, "acceptedDecision");
    assertExactKeys(record, ACCEPTED_DECISION_KEYS, "acceptedDecision");
    const requestId = parseRequestId(record.requestId);
    const decisionId = parseDecisionId(record.decisionId);
    if (requestIds.has(requestId)) throw new TypeError("Duplicate accepted request ID");
    if (decisionIds.has(decisionId)) throw new TypeError("Duplicate accepted decision ID");
    requestIds.add(requestId);
    decisionIds.add(decisionId);
    const answer = expectAuthoritative(record.answer, "answer");
    const answerHash = parseFingerprint(record.answerHash, "answerHash");
    if (answerHash !== fingerprint("month-run-decision-answer-v1", answer)) {
      throw new TypeError(`Accepted decision ${decisionId} answer hash is inconsistent`);
    }
    return {
      requestId,
      decisionId,
      answer,
      answerHash,
    };
  });
}

function validateStatusShape(
  status: MonthRunStatus,
  phase: MonthRunPhase,
  pendingDecision: ReturnType<typeof parsePendingDecision>,
  terminalResult: AuthoritativeJsonValue | null,
  terminalReason: AuthoritativeJsonValue | null,
): void {
  if (status === "ready" && phase !== "initialize") {
    throw new TypeError("Ready MonthRun must be in initialize phase");
  }
  if (status === "running" && (phase === "initialize" || phase === "await-decision")) {
    throw new TypeError("Running MonthRun has an invalid phase");
  }
  if (status === "suspended" && (phase !== "await-decision" || pendingDecision === null)) {
    throw new TypeError("Suspended MonthRun requires one pending decision");
  }
  if ((status === "completed" || status === "committed") && phase !== "finalize") {
    throw new TypeError("Completed MonthRun must be in finalize phase");
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

  const exceptional =
    status === "failed" ||
    status === "incompatible" ||
    status === "recovery-required" ||
    status === "abandoned";
  if (exceptional && terminalReason === null) {
    throw new TypeError("Exceptional MonthRun requires a terminal reason");
  }
  if (!exceptional && terminalReason !== null) {
    throw new TypeError("Non-exceptional MonthRun cannot contain a terminal reason");
  }
}

function validateCheckpointProgress(
  status: MonthRunStatus,
  runRevision: number,
  stepIndex: number,
  programCounter: number,
  previousCheckpointHash: Fingerprint | null,
): void {
  if (runRevision !== stepIndex) {
    throw new TypeError("MonthRun revision must equal its durable step index");
  }
  if (programCounter > stepIndex) {
    throw new TypeError("MonthRun program counter cannot exceed its durable step index");
  }
  if ((status === "ready") !== (runRevision === 0)) {
    throw new TypeError("Only the initial MonthRun checkpoint may be ready");
  }
  if ((runRevision === 0) !== (previousCheckpointHash === null)) {
    throw new TypeError("MonthRun hash linkage is inconsistent with its revision");
  }
}

function parseCounter(value: AuthoritativeJsonValue | undefined, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
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

function parseToken(value: AuthoritativeJsonValue | undefined, name: string): string {
  const token = expectString(value, name);
  if (!TOKEN_PATTERN.test(token)) {
    throw new TypeError(`${name} must contain 1-256 printable ASCII characters without whitespace`);
  }
  return token;
}

function expectRecord(
  value: AuthoritativeJsonValue | undefined,
  name: string,
): Readonly<Record<string, AuthoritativeJsonValue>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Readonly<Record<string, AuthoritativeJsonValue>>;
}

function assertExactKeys(
  record: Readonly<Record<string, AuthoritativeJsonValue>>,
  expectedKeys: readonly string[],
  name: string,
): void {
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  ) {
    throw new TypeError(`${name} contains unknown or missing fields`);
  }
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
