import { describe, expect, it } from "vitest";

import {
  createMonthRunCheckpoint,
  fingerprint,
  restoreMonthRunCheckpoint,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseMonthRunId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
} from "@runtime-human/game-schema";

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);

const compatibility = {
  checkpointSchema: "month-run-checkpoint-v1" as const,
  rulesFingerprint: fingerprint("test-rules", { version: 1 }),
  contentFingerprint: fingerprint("test-content", { version: 1 }),
  saveSchemaFingerprint: fingerprint("test-save-schema", { version: 1 }),
  determinismManifest: DETERMINISM_MANIFEST_V1,
};

describe("MonthRun checkpoints", () => {
  it("creates and restores a self-verifying initial checkpoint", () => {
    const checkpoint = createMonthRunCheckpoint({
      runId: parseMonthRunId("run-1"),
      saveId: parseSaveId("save-1"),
      baseSaveRevision: parseSaveRevision(3),
      compatibility,
      plan: { month: 1 },
      rngState: RNG_STATE,
    });

    expect(checkpoint.status).toBe("ready");
    expect(checkpoint.runRevision).toBe(0);
    expect(checkpoint.previousCheckpointHash).toBeNull();
    expect(restoreMonthRunCheckpoint(JSON.parse(JSON.stringify(checkpoint)))).toEqual({
      kind: "ok",
      checkpoint,
    });
  });

  it("rejects a checkpoint changed without rehashing", () => {
    const checkpoint = createMonthRunCheckpoint({
      runId: parseMonthRunId("run-2"),
      saveId: parseSaveId("save-1"),
      baseSaveRevision: parseSaveRevision(3),
      compatibility,
      plan: { month: 1 },
      rngState: RNG_STATE,
    });

    expect(restoreMonthRunCheckpoint({ ...checkpoint, stepIndex: 99 })).toMatchObject({
      kind: "error",
      code: "CorruptedCheckpoint",
    });
  });

  it("stores a detached authoritative snapshot", () => {
    const plan = { allocations: [{ kind: "learning", effort: 2 }] };
    const checkpoint = createMonthRunCheckpoint({
      runId: parseMonthRunId("run-3"),
      saveId: parseSaveId("save-1"),
      baseSaveRevision: parseSaveRevision(3),
      compatibility,
      plan,
      rngState: RNG_STATE,
    });

    plan.allocations[0]!.effort = 99;
    plan.allocations.push({ kind: "project", effort: 5 });

    expect(checkpoint.plan).toEqual({ allocations: [{ effort: 2, kind: "learning" }] });
  });
});
