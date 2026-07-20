import type { AuthoritativeJsonValue } from "./authoritative-json";
import type {
  DeterminismManifest,
  Fingerprint,
  SerializedXoshiro256State,
} from "./determinism";

const PROTOCOL_ID_PATTERN = /^[!-~]{1,128}$/u;

declare const requestIdBrand: unique symbol;
declare const saveIdBrand: unique symbol;
declare const monthRunIdBrand: unique symbol;
declare const decisionIdBrand: unique symbol;
declare const saveRevisionBrand: unique symbol;
declare const monthRunRevisionBrand: unique symbol;

export type RequestId = string & { readonly [requestIdBrand]: "RequestId" };
export type SaveId = string & { readonly [saveIdBrand]: "SaveId" };
export type MonthRunId = string & { readonly [monthRunIdBrand]: "MonthRunId" };
export type DecisionId = string & { readonly [decisionIdBrand]: "DecisionId" };
export type SaveRevision = number & { readonly [saveRevisionBrand]: "SaveRevision" };
export type MonthRunRevision = number & {
  readonly [monthRunRevisionBrand]: "MonthRunRevision";
};

export type MonthRunStatus =
  | "ready"
  | "running"
  | "suspended"
  | "completed"
  | "committed"
  | "failed"
  | "incompatible"
  | "recovery-required"
  | "abandoned";

export type MonthRunPhase =
  | "initialize"
  | "materialize"
  | "await-decision"
  | "resolve"
  | "finalize";

export type MonthRunCompatibilityV1 = Readonly<{
  checkpointSchema: "month-run-checkpoint-v1";
  rulesFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  saveSchemaFingerprint: Fingerprint;
  determinismManifest: DeterminismManifest;
}>;

export type BeginMonthCommandV1 = Readonly<{
  schemaVersion: "begin-month-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  runId: MonthRunId;
  plan: AuthoritativeJsonValue;
  compatibility: MonthRunCompatibilityV1;
  initialRngState: SerializedXoshiro256State;
}>;

export type ResumeMonthCommandV1 = Readonly<{
  schemaVersion: "resume-month-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
}>;

export type MaterializedOutcomeV1 = Readonly<{
  outcomeId: string;
  scope: string;
  payload: AuthoritativeJsonValue;
  payloadHash: Fingerprint;
}>;

export type PendingDecisionV1 = Readonly<{
  decisionId: DecisionId;
  kind: string;
  prompt: AuthoritativeJsonValue;
  answerSchemaFingerprint: Fingerprint;
}>;

export type AcceptedDecisionV1 = Readonly<{
  requestId: RequestId;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
  answerHash: Fingerprint;
}>;

export type MonthRunCheckpointV1 = Readonly<{
  schemaVersion: "month-run-checkpoint-v1";
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  runRevision: MonthRunRevision;
  status: MonthRunStatus;
  phase: MonthRunPhase;
  stepIndex: number;
  plan: AuthoritativeJsonValue;
  compatibility: MonthRunCompatibilityV1;
  rngState: SerializedXoshiro256State;
  provisionalState: AuthoritativeJsonValue;
  materializedOutcomes: readonly MaterializedOutcomeV1[];
  pendingDecision: PendingDecisionV1 | null;
  acceptedDecisions: readonly AcceptedDecisionV1[];
  terminalResult: AuthoritativeJsonValue | null;
  previousCheckpointHash: Fingerprint | null;
  checkpointHash: Fingerprint;
}>;

export type StartRunEventV1 = Readonly<{ type: "start" }>;

export type AdvanceStepEventV1 = Readonly<{
  type: "advance-step";
  phase: MonthRunPhase;
  provisionalState: AuthoritativeJsonValue;
  rngState?: SerializedXoshiro256State;
}>;

export type MaterializeOutcomeEventV1 = Readonly<{
  type: "materialize-outcome";
  outcomeId: string;
  scope: string;
  payload: AuthoritativeJsonValue;
  phase: MonthRunPhase;
  provisionalState: AuthoritativeJsonValue;
  rngState: SerializedXoshiro256State;
}>;

export type SuspendForDecisionEventV1 = Readonly<{
  type: "suspend-for-decision";
  decision: PendingDecisionV1;
}>;

export type AcceptDecisionEventV1 = Readonly<{
  type: "accept-decision";
  requestId: RequestId;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
}>;

export type CompleteRunEventV1 = Readonly<{
  type: "complete";
  result: AuthoritativeJsonValue;
}>;

export type MarkCommittedEventV1 = Readonly<{ type: "mark-committed" }>;

export type FailRunEventV1 = Readonly<{
  type: "fail";
  reason: AuthoritativeJsonValue;
}>;

export type MarkIncompatibleEventV1 = Readonly<{
  type: "mark-incompatible";
  reason: AuthoritativeJsonValue;
}>;

export type RequireRecoveryEventV1 = Readonly<{
  type: "require-recovery";
  reason: AuthoritativeJsonValue;
}>;

export type AbandonRunEventV1 = Readonly<{
  type: "abandon";
  reason: AuthoritativeJsonValue;
}>;

export type MonthRunEventV1 =
  | StartRunEventV1
  | AdvanceStepEventV1
  | MaterializeOutcomeEventV1
  | SuspendForDecisionEventV1
  | AcceptDecisionEventV1
  | CompleteRunEventV1
  | MarkCommittedEventV1
  | FailRunEventV1
  | MarkIncompatibleEventV1
  | RequireRecoveryEventV1
  | AbandonRunEventV1;

export type MonthRunProtocolErrorCode =
  | "InvalidCommand"
  | "RequestPayloadConflict"
  | "SaveRevisionConflict"
  | "RunRevisionConflict"
  | "ActiveRunExists"
  | "RunNotFound"
  | "IllegalTransition"
  | "UnexpectedDecision"
  | "DecisionAlreadyAnswered"
  | "MaterializationConflict"
  | "IncompatibleCheckpoint"
  | "CorruptedCheckpoint"
  | "TransitionBudgetExceeded";

export type MonthRunProtocolError = Readonly<{
  code: MonthRunProtocolErrorCode;
  message: string;
}>;

export type MonthRunTransitionResult =
  | Readonly<{ kind: "accepted"; checkpoint: MonthRunCheckpointV1 }>
  | Readonly<{ kind: "duplicate"; checkpoint: MonthRunCheckpointV1 }>
  | Readonly<{
      kind: "rejected";
      checkpoint: MonthRunCheckpointV1;
      error: MonthRunProtocolError;
    }>;

export function parseRequestId(value: unknown): RequestId {
  return parseProtocolId(value, "RequestId") as RequestId;
}

export function parseSaveId(value: unknown): SaveId {
  return parseProtocolId(value, "SaveId") as SaveId;
}

export function parseMonthRunId(value: unknown): MonthRunId {
  return parseProtocolId(value, "MonthRunId") as MonthRunId;
}

export function parseDecisionId(value: unknown): DecisionId {
  return parseProtocolId(value, "DecisionId") as DecisionId;
}

export function parseSaveRevision(value: unknown): SaveRevision {
  return parseRevision(value, "SaveRevision") as SaveRevision;
}

export function parseMonthRunRevision(value: unknown): MonthRunRevision {
  return parseRevision(value, "MonthRunRevision") as MonthRunRevision;
}

function parseProtocolId(value: unknown, kind: string): string {
  if (typeof value !== "string" || !PROTOCOL_ID_PATTERN.test(value)) {
    throw new TypeError(`${kind} must contain 1-128 printable ASCII characters without whitespace`);
  }
  return value;
}

function parseRevision(value: unknown, kind: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${kind} must be a non-negative safe integer`);
  }
  return value;
}
