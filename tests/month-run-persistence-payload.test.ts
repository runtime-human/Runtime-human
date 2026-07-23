import { describe, expect, it } from "vitest";

import { createMonthRunCheckpoint, sha256Hex } from "@runtime-human/game-core";
import { parseMonthRunRevision, parseRequestId } from "@runtime-human/game-schema";
import {
  parseCanonicalPayload,
  type MonthRunRecordV1,
} from "@runtime-human/game-persistence-contracts";
import {
  createCanonicalPayload,
  derivePersistenceRequestId,
  restorePersistedCheckpoint,
} from "@runtime-human/game-application";

import {
  JANUARY_COMPATIBILITY,
  JANUARY_RUN_ID,
  JANUARY_SAVE_ID,
  JANUARY_SAVE_REVISION,
  januaryBeginCommand,
} from "./fixtures/january-reference-program";

const CHECKPOINT = createMonthRunCheckpoint({
  runId: JANUARY_RUN_ID,
  saveId: JANUARY_SAVE_ID,
  baseSaveRevision: JANUARY_SAVE_REVISION,
  compatibility: JANUARY_COMPATIBILITY,
  plan: januaryBeginCommand().plan,
  rngState: januaryBeginCommand().initialRngState,
});

function readyRecord(): MonthRunRecordV1 {
  return {
    schemaVersion: "month-run-record-v1",
    runId: JANUARY_RUN_ID,
    saveId: JANUARY_SAVE_ID,
    baseSaveRevision: JANUARY_SAVE_REVISION,
    runRevision: CHECKPOINT.runRevision,
    status: "ready",
    checkpoint: createCanonicalPayload(CHECKPOINT),
    checkpointHash: CHECKPOINT.checkpointHash,
    previousCheckpointHash: null,
    compatibility: createCanonicalPayload(JANUARY_COMPATIBILITY),
    committedSaveRevision: null,
    result: null,
    createdSequence: 1,
    updatedSequence: 1,
  };
}

describe("MonthRun persistence payloads", () => {
  it("creates canonical UTF-8 payload bytes independent of insertion order", () => {
    const left = createCanonicalPayload({ emoji: "🧑‍💻", beta: 2, alpha: 1 });
    const right = createCanonicalPayload({ alpha: 1, beta: 2, emoji: "🧑‍💻" });

    expect(left).toEqual(right);
    expect(left.sha256).toBe(sha256Hex(left.json));
  });

  it("derives stable stage-separated durable request IDs", () => {
    const source = {
      outerRequestId: parseRequestId("outer-request"),
      runId: JANUARY_RUN_ID,
      sourceRunRevision: parseMonthRunRevision(3),
      sourceCheckpointHash: CHECKPOINT.checkpointHash,
    } as const;

    const first = derivePersistenceRequestId({ ...source, stage: "resume-boundary" });
    const repeated = derivePersistenceRequestId({ ...source, stage: "resume-boundary" });
    const commit = derivePersistenceRequestId({
      ...source,
      stage: "commit",
      outerRequestId: null,
    });

    expect(first).toBe(repeated);
    expect(first).not.toBe(commit);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects a persisted row whose revision disagrees with its checkpoint", () => {
    const record = {
      ...readyRecord(),
      runRevision: parseMonthRunRevision(1),
    };

    expect(restorePersistedCheckpoint(record, JANUARY_COMPATIBILITY)).toEqual({
      kind: "blocked",
      code: "StoredRecordMismatch",
      message: "Stored MonthRun row does not match its checkpoint",
    });
  });

  it("classifies non-authoritative compatibility JSON as stored corruption", () => {
    const invalidCompatibilityJson = "9007199254740992";
    const record = {
      ...readyRecord(),
      compatibility: parseCanonicalPayload({
        schemaVersion: "canonical-payload-v1",
        json: invalidCompatibilityJson,
        sha256: sha256Hex(invalidCompatibilityJson),
      }),
    };

    expect(restorePersistedCheckpoint(record, JANUARY_COMPATIBILITY)).toEqual({
      kind: "blocked",
      code: "CorruptedCheckpoint",
      message: "Stored MonthRun compatibility is not authoritative JSON",
    });
  });
});
