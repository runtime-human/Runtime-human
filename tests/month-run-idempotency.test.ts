import { describe, expect, it } from "vitest";

import { fingerprint, type MonthRunStep } from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
  type BeginMonthCommandV1,
  type MonthRunCheckpointV1,
  type ResumeMonthCommandV1,
} from "@runtime-human/game-schema";

import {
  createMonthRunReferenceHarness,
  type MonthRunReferenceCommandResult,
} from "./support/month-run-reference-harness";

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);
const decisionId = parseDecisionId("decision-idempotency");
const compatibility = {
  checkpointSchema: "month-run-checkpoint-v1" as const,
  rulesFingerprint: fingerprint("idempotency-rules", 1),
  contentFingerprint: fingerprint("idempotency-content", 1),
  saveSchemaFingerprint: fingerprint("idempotency-save", 1),
  determinismManifest: DETERMINISM_MANIFEST_V1,
};

const steps: readonly MonthRunStep[] = [
  () => ({ type: "start" }),
  () => ({
    type: "suspend-for-decision",
    decision: {
      decisionId,
      kind: "scope-choice",
      prompt: { options: ["quality", "speed"] },
      answerSchemaFingerprint: fingerprint("answer-schema", 1),
    },
  }),
  () => {
    throw new Error("accepted decision is persisted outside scripted steps");
  },
  () => ({ type: "complete", result: { quality: 8 } }),
];

function beginCommand(plan: BeginMonthCommandV1["plan"] = { month: 1 }): BeginMonthCommandV1 {
  return {
    schemaVersion: "begin-month-command-v1",
    requestId: parseRequestId("begin-1"),
    saveId: parseSaveId("save-idempotency"),
    expectedSaveRevision: parseSaveRevision(4),
    runId: parseMonthRunId("run-idempotency"),
    plan,
    compatibility,
    initialRngState: RNG_STATE,
  };
}

function resumeCommand(answer: ResumeMonthCommandV1["answer"] = { option: "quality" }): ResumeMonthCommandV1 {
  return {
    schemaVersion: "resume-month-command-v1",
    requestId: parseRequestId("resume-1"),
    saveId: parseSaveId("save-idempotency"),
    runId: parseMonthRunId("run-idempotency"),
    expectedRunRevision: parseMonthRunRevision(2),
    decisionId,
    answer,
  };
}

function requireCheckpoint(result: MonthRunReferenceCommandResult): MonthRunCheckpointV1 {
  expect(result.checkpoint).not.toBeNull();
  if (result.checkpoint === null) throw new Error("expected checkpoint");
  return result.checkpoint;
}

describe("MonthRun reference idempotency", () => {
  it("returns the stored result for an identical begin and rejects payload reuse", () => {
    const harness = createMonthRunReferenceHarness({
      steps,
      saveRevision: parseSaveRevision(4),
    });
    const first = harness.begin(beginCommand());
    const duplicate = harness.begin(beginCommand());
    const conflict = harness.begin(beginCommand({ month: 2 }));

    expect(duplicate).toBe(first);
    expect(conflict.kind).toBe("rejected");
    if (conflict.kind === "rejected") {
      expect(conflict.error.code).toBe("RequestPayloadConflict");
    }
  });

  it("persists an accepted answer once and returns the same resume receipt", () => {
    const harness = createMonthRunReferenceHarness({
      steps,
      saveRevision: parseSaveRevision(4),
    });
    const started = harness.begin(beginCommand());
    expect(requireCheckpoint(started).status).toBe("suspended");

    const first = harness.resume(resumeCommand());
    const duplicate = harness.resume(resumeCommand());
    const completed = requireCheckpoint(first);

    expect(completed.status).toBe("completed");
    expect(duplicate).toBe(first);
    expect(harness.load(parseMonthRunId("run-idempotency"))).toBe(completed);
  });

  it("rejects a stale resume before applying the answer", () => {
    const harness = createMonthRunReferenceHarness({
      steps,
      saveRevision: parseSaveRevision(4),
    });
    harness.begin(beginCommand());
    const stale = harness.resume({
      ...resumeCommand(),
      requestId: parseRequestId("resume-stale"),
      expectedRunRevision: parseMonthRunRevision(1),
    });

    expect(stale.kind).toBe("rejected");
    if (stale.kind === "rejected") expect(stale.error.code).toBe("RunRevisionConflict");
  });
});
