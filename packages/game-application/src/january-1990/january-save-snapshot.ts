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

export type January1990StoredOutcomeV1 = Readonly<{
  outcomeId: string;
  scope: string;
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

export const JANUARY_1990_SAVE_SCHEMA_FINGERPRINT = fingerprint(
  "january-1990-save-schema-v1",
  {
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
    outcomeFields: ["outcomeId", "payload", "payloadHash", "scope"],
  },
);

export function createJanuary1990InitialSaveSnapshot(): January1990SaveSnapshotV1 {
  return Object.freeze({
    schemaVersion: "january-1990-save-snapshot-v1",
    completedMonth: null,
  });
}

export function parseJanuary1990SaveSnapshot(value: unknown): January1990SaveSnapshotV1 {
  const record = requireRecord(
    value,
    ["completedMonth", "schemaVersion"],
    "January save snapshot",
  );
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
  if (
    record.schemaVersion !== "january-1990-completed-month-v1" ||
    record.month !== "1990-01"
  ) {
    throw new TypeError("January completed month schema or month is incompatible");
  }
  const terminalResult = snapshotAuthoritativeValue(record.terminalResult);
  if (terminalResult === null) {
    throw new TypeError("January completed month terminal result cannot be null");
  }
  if (!Array.isArray(record.outcomes)) {
    throw new TypeError("January completed month outcomes must be an array");
  }
  const outcomes = Object.freeze(record.outcomes.map(parseStoredOutcome));
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

function parseStoredOutcome(value: unknown): January1990StoredOutcomeV1 {
  const record = requireRecord(
    value,
    ["outcomeId", "payload", "payloadHash", "scope"],
    "January stored outcome",
  );
  return Object.freeze({
    outcomeId: parseToken(record.outcomeId, "outcomeId"),
    scope: parseToken(record.scope, "scope"),
    payload: snapshotAuthoritativeValue(record.payload),
    payloadHash: parseFingerprint(record.payloadHash, "January outcome payload hash"),
  });
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

function parseToken(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new TypeError(`January stored outcome ${field} must contain 1-256 characters`);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
