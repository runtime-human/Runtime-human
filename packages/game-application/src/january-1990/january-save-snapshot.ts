import { fingerprint, snapshotAuthoritativeValue } from "@runtime-human/game-core";
import { parseFingerprint } from "@runtime-human/game-persistence-contracts";
import {
  parseMonthRunId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
  type Fingerprint,
  type MonthRunId,
  type SaveRevision,
} from "@runtime-human/game-schema";

const EXPECTED_OUTCOMES = Object.freeze([
  Object.freeze({ outcomeId: "january-1990/access", scope: "month/content" }),
  Object.freeze({ outcomeId: "january-1990/work", scope: "month/content" }),
  Object.freeze({ outcomeId: "january-1990/defect", scope: "month/narrative" }),
  Object.freeze({ outcomeId: "january-1990/programming-outcome", scope: "month/outcome" }),
] as const);

export type January1990StoredOutcomeV1 = Readonly<{
  outcomeId: (typeof EXPECTED_OUTCOMES)[number]["outcomeId"];
  scope: (typeof EXPECTED_OUTCOMES)[number]["scope"];
  payload: AuthoritativeJsonValue;
  payloadHash: Fingerprint;
}>;

export type January1990CompletedMonthV1 = Readonly<{
  schemaVersion: "january-1990-completed-month-v1";
  month: "1990-01";
  runId: MonthRunId;
  baseSaveRevision: SaveRevision;
  completedCheckpointHash: Fingerprint;
  terminalResult: AuthoritativeJsonValue;
  outcomes: readonly January1990StoredOutcomeV1[];
}>;

export type January1990SaveSnapshotV1 = Readonly<{
  schemaVersion: "january-1990-save-snapshot-v1";
  completedMonth: January1990CompletedMonthV1 | null;
}>;

export const JANUARY_1990_SAVE_SCHEMA_FINGERPRINT = fingerprint("january-1990-save-schema-v1", {
  snapshotSchema: "january-1990-save-snapshot-v1",
  completedMonthSchema: "january-1990-completed-month-v1",
  month: "1990-01",
  topLevelFields: ["completedMonth", "schemaVersion"],
  completedMonthFields: [
    "baseSaveRevision",
    "completedCheckpointHash",
    "month",
    "outcomes",
    "runId",
    "schemaVersion",
    "terminalResult",
  ],
  outcomes: EXPECTED_OUTCOMES,
  outcomeFields: ["outcomeId", "payload", "payloadHash", "scope"],
  payloadHashNamespace: "month-run-materialized-outcome-v1",
  terminalResultSchema: "january-1990-result-v1",
});

export function createJanuary1990InitialSaveSnapshot(): January1990SaveSnapshotV1 {
  return Object.freeze({
    schemaVersion: "january-1990-save-snapshot-v1",
    completedMonth: null,
  });
}

export function parseJanuary1990SaveSnapshot(value: unknown): January1990SaveSnapshotV1 {
  const record = requireRecord(value, ["completedMonth", "schemaVersion"], "January save snapshot");
  if (record.schemaVersion !== "january-1990-save-snapshot-v1") {
    throw new TypeError("January save snapshot schemaVersion is incompatible");
  }
  return Object.freeze({
    schemaVersion: "january-1990-save-snapshot-v1",
    completedMonth:
      record.completedMonth === null ? null : parseCompletedMonth(record.completedMonth),
  });
}

function parseCompletedMonth(value: unknown): January1990CompletedMonthV1 {
  const record = requireRecord(
    value,
    [
      "baseSaveRevision",
      "completedCheckpointHash",
      "month",
      "outcomes",
      "runId",
      "schemaVersion",
      "terminalResult",
    ],
    "January completed month",
  );
  if (record.schemaVersion !== "january-1990-completed-month-v1" || record.month !== "1990-01") {
    throw new TypeError("January completed month schema or month is incompatible");
  }
  const terminalResult = parseTerminalResult(record.terminalResult);
  if (!Array.isArray(record.outcomes) || record.outcomes.length !== EXPECTED_OUTCOMES.length) {
    throw new TypeError("January completed month requires the exact four outcomes");
  }
  const outcomes = Object.freeze(
    record.outcomes.map((outcome, index) => parseStoredOutcome(outcome, index)),
  );
  return Object.freeze({
    schemaVersion: "january-1990-completed-month-v1",
    month: "1990-01",
    runId: parseMonthRunId(record.runId),
    baseSaveRevision: parseSaveRevision(record.baseSaveRevision),
    completedCheckpointHash: parseFingerprint(
      record.completedCheckpointHash,
      "January completed checkpoint hash",
    ),
    terminalResult,
    outcomes,
  });
}

function parseTerminalResult(value: unknown): AuthoritativeJsonValue {
  const snapshot = snapshotAuthoritativeValue(value);
  const record = requireRecord(
    snapshot,
    ["month", "outcomeEventId", "programmingOutcome", "projectId", "schemaVersion"],
    "January terminal result",
  );
  if (record.schemaVersion !== "january-1990-result-v1" || record.month !== "1990-01") {
    throw new TypeError("January terminal result schema or month is incompatible");
  }
  return freezeAuthoritative(snapshot);
}

function parseStoredOutcome(value: unknown, index: number): January1990StoredOutcomeV1 {
  const expected = EXPECTED_OUTCOMES[index];
  if (expected === undefined) throw new TypeError("Unexpected January outcome position");
  const record = requireRecord(
    value,
    ["outcomeId", "payload", "payloadHash", "scope"],
    "January stored outcome",
  );
  if (record.outcomeId !== expected.outcomeId || record.scope !== expected.scope) {
    throw new TypeError("January stored outcome order, ID or scope is incompatible");
  }
  const payload = freezeAuthoritative(snapshotAuthoritativeValue(record.payload));
  const payloadHash = parseFingerprint(record.payloadHash, "January outcome payload hash");
  if (payloadHash !== fingerprint("month-run-materialized-outcome-v1", payload)) {
    throw new TypeError("January stored outcome payload hash does not match its payload");
  }
  return Object.freeze({
    outcomeId: expected.outcomeId,
    scope: expected.scope,
    payload,
    payloadHash,
  });
}

function freezeAuthoritative(value: AuthoritativeJsonValue): AuthoritativeJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeAuthoritative(entry)));
  }
  if (typeof value === "object" && value !== null) {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, freezeAuthoritative(entry)]),
      ),
    );
  }
  return value;
}

function requireRecord(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain JSON object`);
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).toSorted(compareText);
  const approvedKeys = [...expectedKeys].toSorted(compareText);
  if (
    actualKeys.length !== approvedKeys.length ||
    !actualKeys.every((key, index) => key === approvedKeys[index])
  ) {
    throw new TypeError(`${label} field set does not match the closed contract`);
  }
  return record;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
