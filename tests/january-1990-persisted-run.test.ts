import { describe, expect, it } from "vitest";

import { parseRequestId, parseSaveRevision } from "@runtime-human/game-schema";

import {
  createHarnessedJanuaryRuntime,
  reopenJanuaryRuntime,
  requireJanuaryCommitted,
  requireJanuaryWaiting,
  resumeJanuary,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

describe("January 1990 persisted runtime composition", () => {
  it("persists all three decisions and commits the deterministic month exactly once", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const { harness, runtime, saveId, runId } = source;

    const access = await startJanuary(runtime, saveId, runId);
    expect(access.checkpoint.programCounter).toBe(2);
    expect(access.checkpoint.pendingDecision?.decisionId).toBe("january-1990/access");

    const learning = requireJanuaryWaiting(
      await resumeJanuary(runtime, access, {
        requestId: "resume-january-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(learning.checkpoint.programCounter).toBe(4);
    expect(learning.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");

    const defect = requireJanuaryWaiting(
      await resumeJanuary(runtime, learning, {
        requestId: "resume-january-learning",
        answer: { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
      }),
    );
    expect(defect.checkpoint.programCounter).toBe(7);
    expect(defect.checkpoint.pendingDecision?.decisionId).toBe("january-1990/defect");

    const committed = requireJanuaryCommitted(
      await resumeJanuary(runtime, defect, {
        requestId: "resume-january-defect",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );

    expect(committed.checkpoint.status).toBe("committed");
    expect(committed.checkpoint.programCounter).toBe(9);
    expect(harness.getSave().revision).toBe(1);
    expect(harness.getSave().lastCommittedRunId).toBe(runId);
    expect(harness.getRun(runId)?.status).toBe("committed");
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 4,
      commitMutations: 1,
    });
    expect(JSON.parse(harness.getSave().snapshot.json)).toMatchObject({
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        month: "1990-01",
        runId,
        terminalResult: {
          schemaVersion: "january-1990-result-v1",
        },
      },
    });
  });

  it("reuses durable receipts and rejects request-ID payload conflicts", async () => {
    const { harness, runtime, saveId, runId } = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(runtime, saveId, runId, "idempotent-begin");

    const duplicateBegin = requireJanuaryWaiting(
      await runtime.begin({
        requestId: parseRequestId("idempotent-begin"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );
    expect(duplicateBegin.checkpoint.checkpointHash).toBe(access.checkpoint.checkpointHash);
    expect(harness.getStats().beginMutations).toBe(1);

    const learning = requireJanuaryWaiting(
      await resumeJanuary(runtime, access, {
        requestId: "idempotent-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    const duplicateResume = requireJanuaryWaiting(
      await resumeJanuary(runtime, access, {
        requestId: "idempotent-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(duplicateResume.checkpoint.checkpointHash).toBe(learning.checkpoint.checkpointHash);

    const conflict = await resumeJanuary(runtime, access, {
      requestId: "idempotent-access",
      answer: { schemaVersion: "january-access-answer-v1", route: "shared-school-pc" },
    });
    expect(conflict).toMatchObject({
      kind: "rejected",
      error: { code: "RequestPayloadConflict", retryable: false },
    });
    expect(harness.getStats().boundaryMutations).toBe(2);
  });

  it("reopens at a durable boundary without checkpoint drift", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(source.runtime, source.saveId, source.runId);

    const reopened = reopenJanuaryRuntime(source);
    const loaded = requireJanuaryWaiting(await reopened.load(source.saveId));

    expect(loaded.checkpoint.checkpointHash).toBe(access.checkpoint.checkpointHash);
    expect(loaded.checkpoint.rngState).toBe(access.checkpoint.rngState);
    expect(loaded.checkpoint.pendingDecision).toEqual(access.checkpoint.pendingDecision);
  });
});
