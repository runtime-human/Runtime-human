import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";
import type {
  Fingerprint,
  MonthRunId,
  MonthRunRevision,
  RequestId,
  SaveId,
  SaveRevision,
} from "@runtime-human/game-schema";

import type { CanonicalPayloadV1, Sha256Hex } from "./contracts";
import {
  parseCanonicalPayload,
  parseFingerprint,
  parsePersistenceCheckpointIdentity,
  parseSha256Hex,
} from "./parsers";

export type CommitPersistedMonthRunCommandV1 = Readonly<{
  schemaVersion: "commit-persisted-month-run-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedSaveRevision: SaveRevision;
  expectedRunRevision: MonthRunRevision;
  expectedCheckpointPayloadSha256: Sha256Hex;
  expectedCheckpointHash: Fingerprint;
  committedCheckpoint: CanonicalPayloadV1;
  snapshot: CanonicalPayloadV1;
  result: CanonicalPayloadV1;
}>;

const COMMIT_MONTH_RUN_KEYS = [
  "schemaVersion",
  "requestId",
  "saveId",
  "runId",
  "expectedSaveRevision",
  "expectedRunRevision",
  "expectedCheckpointPayloadSha256",
  "expectedCheckpointHash",
  "committedCheckpoint",
  "snapshot",
  "result",
] as const;

export function parseCommitPersistedMonthRunCommand(
  value: unknown,
): CommitPersistedMonthRunCommandV1 {
  const record = exactRecord(value, COMMIT_MONTH_RUN_KEYS, "commit persisted MonthRun command");
  if (record.schemaVersion !== "commit-persisted-month-run-command-v1") {
    throw new TypeError(
      "commit persisted MonthRun command must use commit-persisted-month-run-command-v1",
    );
  }

  const saveId = parseSaveId(record.saveId);
  const runId = parseMonthRunId(record.runId);
  const expectedSaveRevision = parseSaveRevision(record.expectedSaveRevision);
  const expectedRunRevision = parseMonthRunRevision(record.expectedRunRevision);
  const expectedCheckpointPayloadSha256 = parseSha256Hex(
    record.expectedCheckpointPayloadSha256,
    "expected checkpoint payload sha256",
  );
  const expectedCheckpointHash = parseFingerprint(
    record.expectedCheckpointHash,
    "expected checkpoint hash",
  );
  const committedCheckpoint = parseCanonicalPayload(record.committedCheckpoint);
  const identity = parsePersistenceCheckpointIdentity(committedCheckpoint.json);

  if (identity.saveId !== saveId || identity.runId !== runId) {
    throw new TypeError("Committed checkpoint identity must match the commit command");
  }
  if (identity.baseSaveRevision !== expectedSaveRevision) {
    throw new TypeError("Committed checkpoint baseSaveRevision must match expectedSaveRevision");
  }
  if (identity.status !== "committed") {
    throw new TypeError("Final persistence requires a committed MonthRun checkpoint");
  }
  if (identity.runRevision !== expectedRunRevision + 1) {
    throw new TypeError("Committed checkpoint must be the next MonthRun revision");
  }
  if (identity.previousCheckpointHash !== expectedCheckpointHash) {
    throw new TypeError(
      "Committed checkpoint previousCheckpointHash must match the completed checkpoint hash",
    );
  }

  return {
    schemaVersion: "commit-persisted-month-run-command-v1",
    requestId: parseRequestId(record.requestId),
    saveId,
    runId,
    expectedSaveRevision,
    expectedRunRevision,
    expectedCheckpointPayloadSha256,
    expectedCheckpointHash,
    committedCheckpoint,
    snapshot: parseCanonicalPayload(record.snapshot),
    result: parseCanonicalPayload(record.result),
  };
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  name: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
    throw new TypeError(`${name} contains unknown or missing fields`);
  }
  return record;
}
