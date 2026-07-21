import { describe, expect, it } from "vitest";

import {
  checkMonthRunCompatibility,
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
  type MonthRunCheckpointV1,
  type MonthRunEventV1,
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

function initialCheckpoint(runId = "run-1"): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId(runId),
    saveId: parseSaveId("save-1"),
    baseSaveRevision: parseSaveRevision(3),
    compatibility,
    plan: { month: 1 },
    rngState: RNG_STATE,
  });
}

function accept(checkpoint: MonthRunCheckpointV1, event: MonthRunEventV1): MonthRunCheckpointV1 {
  const result = transitionMonthRun(checkpoint, event);
  expect(result.kind).toBe("accepted");
  if (result.kind !== "accepted") throw new Error("expected accepted transition");
  return result.checkpoint;
}

function withoutOuterHash(checkpoint: MonthRunCheckpointV1) {
  const { checkpointHash, ...withoutHash } = checkpoint;
  expect(checkpointHash).toMatch(/^[0-9a-f]{64}$/u);
  return withoutHash;
}

function withOuterHash<T extends object>(payload: T) {
  return {
    ...payload,
    checkpointHash: fingerprint("month-run-checkpoint-v1", payload),
  };
}

describe("MonthRun checkpoints", () => {
  it("creates and restores a self-verifying initial checkpoint with a golden hash", () => {
    const checkpoint = initialCheckpoint();

    expect(checkpoint.status).toBe("ready");
    expect(checkpoint.runRevision).toBe(0);
    expect(checkpoint.stepIndex).toBe(0);
    expect(checkpoint.programCounter).toBe(0);
    expect(checkpoint.terminalReason).toBeNull();
    expect(checkpoint.previousCheckpointHash).toBeNull();
    expect(checkpoint.checkpointHash).toBe(
      "836c04505addd677afed22911abe00cd7e72516d16269c5362f851f87331922a",
    );
    expect(restoreMonthRunCheckpoint(JSON.parse(JSON.stringify(checkpoint)))).toEqual({
      kind: "ok",
      checkpoint,
    });
  });

  it("compares every compatibility component exactly", () => {
    expect(checkMonthRunCompatibility(compatibility, compatibility)).toEqual({
      kind: "compatible",
    });

    expect(
      checkMonthRunCompatibility(compatibility, {
        ...compatibility,
        contentFingerprint: fingerprint("other-content", { version: 2 }),
      }),
    ).toEqual({
      kind: "incompatible",
      mismatches: ["contentFingerprint"],
    });
  });

  it("rejects a checkpoint changed without rehashing", () => {
    const checkpoint = initialCheckpoint("run-2");

    expect(restoreMonthRunCheckpoint({ ...checkpoint, programCounter: 99 })).toMatchObject({
      kind: "error",
      code: "CorruptedCheckpoint",
    });
  });

  it("rejects internally inconsistent counters even with a valid outer hash", () => {
    const running = accept(initialCheckpoint("run-counter"), { type: "start" });
    const mismatchedRevision = withOuterHash({
      ...withoutOuterHash(running),
      stepIndex: running.stepIndex + 1,
    });
    const impossibleProgramCounter = withOuterHash({
      ...withoutOuterHash(running),
      programCounter: running.stepIndex + 1,
    });

    expect(restoreMonthRunCheckpoint(mismatchedRevision)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
    expect(restoreMonthRunCheckpoint(impossibleProgramCounter)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });

  it("rejects unknown fields instead of silently stripping them", () => {
    const checkpoint = initialCheckpoint("run-unknown-fields");

    expect(restoreMonthRunCheckpoint({ ...checkpoint, unexpected: true })).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
    expect(
      restoreMonthRunCheckpoint({
        ...checkpoint,
        compatibility: { ...checkpoint.compatibility, unexpected: true },
      }),
    ).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
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

  it("rejects an internally inconsistent materialized outcome even with a valid outer hash", () => {
    const running = accept(initialCheckpoint("run-outcome"), { type: "start" });
    const materialized = accept(running, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize",
      provisionalState: { quality: 7 },
      rngState: RNG_STATE,
    });
    const tampered = withOuterHash({
      ...withoutOuterHash(materialized),
      materializedOutcomes: [
        {
          ...materialized.materializedOutcomes[0]!,
          payloadHash: fingerprint("tampered-outcome", { quality: 7 }),
        },
      ],
    });

    expect(restoreMonthRunCheckpoint(tampered)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });

  it("rejects persisted outcome tokens containing whitespace even with a valid outer hash", () => {
    const running = accept(initialCheckpoint("run-invalid-token"), { type: "start" });
    const materialized = accept(running, {
      type: "materialize-outcome",
      outcomeId: "outcome-1",
      scope: "project/p1/hidden",
      payload: { quality: 7 },
      phase: "materialize",
      provisionalState: { quality: 7 },
      rngState: RNG_STATE,
    });
    const tampered = withOuterHash({
      ...withoutOuterHash(materialized),
      materializedOutcomes: [
        {
          ...materialized.materializedOutcomes[0]!,
          scope: "project hidden",
        },
      ],
    });

    expect(restoreMonthRunCheckpoint(tampered)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });

  it("rejects an internally inconsistent accepted answer even with a valid outer hash", () => {
    const running = accept(initialCheckpoint("run-answer"), { type: "start" });
    const suspended = accept(running, {
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
    const tampered = withOuterHash({
      ...withoutOuterHash(resumed),
      acceptedDecisions: [
        {
          ...resumed.acceptedDecisions[0]!,
          answerHash: fingerprint("tampered-answer", { option: "quality" }),
        },
      ],
    });

    expect(restoreMonthRunCheckpoint(tampered)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });

  it("rejects duplicate accepted request IDs even when decision IDs differ", () => {
    const running = accept(initialCheckpoint("run-duplicate-request"), { type: "start" });
    const suspended = accept(running, {
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
      requestId: parseRequestId("resume-shared"),
      decisionId: parseDecisionId("decision-1"),
      answer: { option: "quality" },
    });
    const secondAnswer = { option: "speed" };
    const tampered = withOuterHash({
      ...withoutOuterHash(resumed),
      acceptedDecisions: [
        ...resumed.acceptedDecisions,
        {
          requestId: parseRequestId("resume-shared"),
          decisionId: parseDecisionId("decision-2"),
          answer: secondAnswer,
          answerHash: fingerprint("month-run-decision-answer-v1", secondAnswer),
        },
      ],
    });

    expect(restoreMonthRunCheckpoint(tampered)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });

  it("rejects an unsupported determinism manifest even with a valid outer hash", () => {
    const checkpoint = initialCheckpoint("run-manifest");
    const tampered = withOuterHash({
      ...withoutOuterHash(checkpoint),
      compatibility: {
        ...checkpoint.compatibility,
        determinismManifest: {
          ...checkpoint.compatibility.determinismManifest,
          rngAlgorithm: "unsupported-rng",
        },
      },
    });

    expect(restoreMonthRunCheckpoint(tampered)).toMatchObject({
      kind: "error",
      code: "InvalidCheckpoint",
    });
  });
});
