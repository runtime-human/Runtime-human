import { describe, expect, it } from "vitest";

import {
  createHarnessedJanuaryRuntime,
  reachJanuaryDefectBoundary,
  requireJanuaryCommitted,
  requireJanuaryWaiting,
  resumeJanuary,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

describe("January 1990 persisted exactly-once recovery", () => {
  it("recovers a lost begin acknowledgement without a second run", async () => {
    const source = await createHarnessedJanuaryRuntime();
    source.harness.loseNextAcknowledgement("beginMonthRun");

    const lost = await source.runtime.begin({
      requestId: (await import("@runtime-human/game-schema")).parseRequestId("lost-january-begin"),
      saveId: source.saveId,
      expectedSaveRevision: (await import("@runtime-human/game-schema")).parseSaveRevision(0),
      runId: source.runId,
      seed: 42n,
    });
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });

    const retried = requireJanuaryWaiting(await source.runtime.retry());
    expect(retried.checkpoint.programCounter).toBe(2);
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });

  it("recovers a lost boundary acknowledgement without duplicate progress", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(source.runtime, source.saveId, source.runId);
    source.harness.loseNextAcknowledgement("storeMonthRunBoundary");

    const lost = await resumeJanuary(source.runtime, access, {
      requestId: "lost-january-access-boundary",
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    });
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });

    const retried = requireJanuaryWaiting(await source.runtime.retry());
    expect(retried.checkpoint.programCounter).toBe(4);
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 2,
      commitMutations: 0,
    });
  });

  it("recovers after commit-before-reply and never advances the save twice", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const defect = await reachJanuaryDefectBoundary(
      source.runtime,
      source.saveId,
      source.runId,
    );
    source.harness.loseNextAcknowledgement("commitMonthRun");

    const lost = await resumeJanuary(source.runtime, defect, {
      requestId: "lost-january-commit",
      answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
    });
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });
    expect(source.harness.getSave().revision).toBe(1);
    expect(source.harness.getStats().commitMutations).toBe(1);

    const recovered = requireJanuaryCommitted(await source.runtime.retry());
    expect(recovered.save.revision).toBe(1);
    expect(recovered.run.status).toBe("committed");

    const duplicate = requireJanuaryCommitted(
      await resumeJanuary(source.runtime, defect, {
        requestId: "lost-january-commit",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );
    expect(duplicate.save.revision).toBe(1);
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 4,
      commitMutations: 1,
    });
  });
});
