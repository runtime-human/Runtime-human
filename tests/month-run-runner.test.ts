import { describe, expect, it } from "vitest";

import {
  createMonthRunCheckpoint,
  fingerprint,
  restoreMonthRunCheckpoint,
  runUntilBoundary,
  transitionMonthRun,
  type MonthRunStep,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);

function initialCheckpoint(): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId("run-runner"),
    saveId: parseSaveId("save-runner"),
    baseSaveRevision: parseSaveRevision(0),
    plan: { month: 1 },
    rngState: RNG_STATE,
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: fingerprint("runner-rules", 1),
      contentFingerprint: fingerprint("runner-content", 1),
      saveSchemaFingerprint: fingerprint("runner-save", 1),
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
  });
}

const completingSteps: readonly MonthRunStep[] = [
  () => ({ type: "start" }),
  () => ({
    type: "materialize-outcome",
    outcomeId: "outcome-1",
    scope: "project/p1/hidden",
    payload: { quality: 7 },
    phase: "materialize",
    provisionalState: { quality: 7 },
    rngState: RNG_STATE,
  }),
  () => ({ type: "complete", result: { quality: 7 } }),
];

describe("MonthRun runner", () => {
  it("stops immediately at a suspension boundary", () => {
    const sentinel = vi.fn(() => {
      throw new Error("step after suspension must not run");
    });
    const steps: readonly MonthRunStep[] = [
      () => ({ type: "start" }),
      () => ({
        type: "suspend-for-decision",
        decision: {
          decisionId: parseDecisionId("decision-1"),
          kind: "scope-choice",
          prompt: { options: ["quality", "speed"] },
          answerSchemaFingerprint: fingerprint("answer-schema", 1),
        },
      }),
      sentinel,
    ];

    const result = runUntilBoundary(initialCheckpoint(), steps);

    expect(result.kind).toBe("boundary");
    expect(result.checkpoint.status).toBe("suspended");
    expect(sentinel).not.toHaveBeenCalled();
  });

  it("returns a budget error with the original checkpoint", () => {
    const checkpoint = initialCheckpoint();
    const steps: readonly MonthRunStep[] = [
      () => ({ type: "start" }),
      () => ({ type: "advance-step", phase: "materialize", provisionalState: {} }),
      () => ({ type: "advance-step", phase: "materialize", provisionalState: {} }),
      () => ({ type: "advance-step", phase: "materialize", provisionalState: {} }),
    ];

    const result = runUntilBoundary(checkpoint, steps, 2);

    expect(result.kind).toBe("rejected");
    expect(result.checkpoint).toBe(checkpoint);
    if (result.kind === "rejected") {
      expect(result.error.code).toBe("TransitionBudgetExceeded");
    }
  });

  it("matches uninterrupted execution after restore at every transition", () => {
    const uninterrupted = runUntilBoundary(initialCheckpoint(), completingSteps);
    expect(uninterrupted.kind).toBe("boundary");

    let restored = initialCheckpoint();
    while (restored.status !== "completed") {
      const event = completingSteps[restored.stepIndex]!(restored);
      const transition = transitionMonthRun(restored, event);
      expect(transition.kind).toBe("accepted");
      if (transition.kind !== "accepted") throw new Error("expected accepted transition");
      const roundTrip = restoreMonthRunCheckpoint(
        JSON.parse(JSON.stringify(transition.checkpoint)),
      );
      expect(roundTrip.kind).toBe("ok");
      if (roundTrip.kind !== "ok") throw new Error("expected restored checkpoint");
      restored = roundTrip.checkpoint;
    }

    expect(restored).toEqual(uninterrupted.checkpoint);
    expect(restored.checkpointHash).toBe(uninterrupted.checkpoint.checkpointHash);
  });
});
