import { describe, expect, it } from "vitest";

import {
  createMonthRunCheckpoint,
  fingerprint,
  restoreMonthRunCheckpoint,
  transitionMonthRun,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
  type AuthoritativeJsonValue,
  type MonthRunCheckpointV1,
  type MonthRunEventV1,
} from "@runtime-human/game-schema";

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);

function initialCheckpoint(): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId("run-transition"),
    saveId: parseSaveId("save-transition"),
    baseSaveRevision: parseSaveRevision(0),
    plan: { month: 1 },
    rngState: RNG_STATE,
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: fingerprint("rules", 1),
      contentFingerprint: fingerprint("content", 1),
      saveSchemaFingerprint: fingerprint("save-schema", 1),
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
  });
}

function accept(checkpoint: MonthRunCheckpointV1, event: MonthRunEventV1) {
  const result = transitionMonthRun(checkpoint, event);
  expect(result.kind).toBe("accepted");
  if (result.kind !== "accepted") throw new Error("expected accepted transition");
  expect(result.checkpoint.runRevision).toBe(checkpoint.runRevision + 1);
  expect(result.checkpoint.stepIndex).toBe(checkpoint.stepIndex + 1);
  expect(result.checkpoint.previousCheckpointHash).toBe(checkpoint.checkpointHash);
  return result.checkpoint;
}

describe("MonthRun transition reducer", () => {
  it("executes the complete legal path with immutable hash-linked revisions", () => {
    const ready = initialCheckpoint();
    const running = accept(ready, { type: "start" });
    const materialized = accept(running, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize",
      provisionalState: { quality: 7 },
      rngState: RNG_STATE,
    });
    const suspended = accept(materialized, {
      type: "suspend-for-decision",
      decision: {
        decisionId: parseDecisionId("decision-1"),
        kind: "scope-choice",
        prompt: { options: ["quality", "speed"] },
        answerSchemaFingerprint: fingerprint("answer-schema", 1),
      },
    });
    const resumed = accept(suspended, {
      type: "accept-decision",
      requestId: parseRequestId("resume-1"),
      decisionId: parseDecisionId("decision-1"),
      answer: { option: "quality" },
    });
    const completed = accept(resumed, { type: "complete", result: { quality: 8 } });
    const committed = accept(completed, { type: "mark-committed" });

    expect([
      ready.status,
      running.status,
      materialized.status,
      suspended.status,
      resumed.status,
      completed.status,
      committed.status,
    ]).toEqual(["ready", "running", "running", "suspended", "running", "completed", "committed"]);
    expect([
      ready.programCounter,
      running.programCounter,
      materialized.programCounter,
      suspended.programCounter,
      resumed.programCounter,
      completed.programCounter,
      committed.programCounter,
    ]).toEqual([0, 1, 2, 3, 3, 4, 4]);
  });

  it("returns duplicates without changing checkpoint identity or revision", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const event = {
      type: "materialize-outcome" as const,
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize" as const,
      provisionalState: { quality: 7 },
      rngState: RNG_STATE,
    };
    const first = accept(running, event);
    const duplicate = transitionMonthRun(first, event);

    expect(duplicate).toEqual({ kind: "duplicate", checkpoint: first });
    expect(duplicate.checkpoint).toBe(first);
  });

  it("rejects terminal transitions and conflicting materializations without mutation", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const first = accept(running, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize",
      provisionalState: { quality: 7 },
      rngState: RNG_STATE,
    });
    const conflict = transitionMonthRun(first, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 9 },
      phase: "materialize",
      provisionalState: { quality: 9 },
      rngState: RNG_STATE,
    });
    expect(conflict.kind).toBe("rejected");
    expect(conflict.checkpoint).toBe(first);
    if (conflict.kind === "rejected") {
      expect(conflict.error.code).toBe("MaterializationConflict");
    }

    const completed = accept(first, { type: "complete", result: { quality: 7 } });
    const illegal = transitionMonthRun(completed, {
      type: "advance-step",
      phase: "finalize",
      provisionalState: {},
    });
    expect(illegal.kind).toBe("rejected");
    expect(illegal.checkpoint).toBe(completed);
    if (illegal.kind === "rejected") expect(illegal.error.code).toBe("IllegalTransition");
  });

  it("returns typed InvalidCommand for malformed runtime event data", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const invalidPayload = Number.NaN as unknown as AuthoritativeJsonValue;
    const result = transitionMonthRun(running, {
      type: "materialize-outcome",
      outcomeId: "",
      scope: "project/p1/hidden",
      payload: invalidPayload,
      phase: "materialize",
      provisionalState: {},
      rngState: RNG_STATE,
    });

    expect(result.kind).toBe("rejected");
    expect(result.checkpoint).toBe(running);
    if (result.kind === "rejected") expect(result.error.code).toBe("InvalidCommand");
  });

  it("rejects forged null terminal results", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const result = transitionMonthRun(running, {
      type: "complete",
      result: null,
    } as unknown as MonthRunEventV1);

    expect(result.kind).toBe("rejected");
    expect(result.checkpoint).toBe(running);
    if (result.kind === "rejected") expect(result.error.code).toBe("InvalidCommand");
  });

  it("revalidates branded identifiers at the runtime boundary", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const suspended = accept(running, {
      type: "suspend-for-decision",
      decision: {
        decisionId: parseDecisionId("decision-runtime"),
        kind: "scope-choice",
        prompt: { options: ["quality", "speed"] },
        answerSchemaFingerprint: fingerprint("answer-schema", 1),
      },
    });
    const result = transitionMonthRun(suspended, {
      type: "accept-decision",
      requestId: "contains whitespace",
      decisionId: "decision-runtime",
      answer: { option: "quality" },
    } as unknown as MonthRunEventV1);

    expect(result.kind).toBe("rejected");
    expect(result.checkpoint).toBe(suspended);
    if (result.kind === "rejected") expect(result.error.code).toBe("InvalidCommand");
  });

  it("rejects running transitions into the blocking decision phase", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const result = transitionMonthRun(running, {
      type: "advance-step",
      phase: "await-decision",
      provisionalState: {},
    });

    expect(result.kind).toBe("rejected");
    expect(result.checkpoint).toBe(running);
    if (result.kind === "rejected") expect(result.error.code).toBe("InvalidCommand");
  });

  it("creates a restorable recovery checkpoint without discarding provisional state", () => {
    const running = accept(initialCheckpoint(), { type: "start" });
    const materialized = accept(running, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize",
      provisionalState: { quality: 7, workUnits: 3 },
      rngState: RNG_STATE,
    });
    const completed = accept(materialized, { type: "complete", result: { quality: 7 } });
    const recoveryReason = { code: "commit-failed" };
    const recovery = accept(completed, {
      type: "require-recovery",
      reason: recoveryReason,
    });
    const restored = restoreMonthRunCheckpoint(JSON.parse(JSON.stringify(recovery)));

    expect(recovery.status).toBe("recovery-required");
    expect(recovery.terminalResult).toBeNull();
    expect(recovery.terminalReason).toEqual(recoveryReason);
    expect(recovery.provisionalState).toEqual(completed.provisionalState);
    expect(restored).toEqual({ kind: "ok", checkpoint: recovery });
  });
});
