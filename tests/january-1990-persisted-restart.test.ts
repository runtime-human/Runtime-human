import { describe, expect, it } from "vitest";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunRevision,
  parseRequestId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import {
  createHarnessedJanuaryRuntime,
  reachJanuaryDefectBoundary,
  reachJanuaryLearningBoundary,
  reopenJanuaryRuntime,
  requireJanuaryWaiting,
  resumeJanuary,
  startJanuary,
  type JanuaryWaitingResult,
} from "./helpers/january-1990-runtime-fixture";

type RestartBoundary = "access" | "learning" | "defect";
type HarnessedJanuaryRuntime = Awaited<ReturnType<typeof createHarnessedJanuaryRuntime>>;

async function reachRestartBoundary(
  source: HarnessedJanuaryRuntime,
  boundary: RestartBoundary,
): Promise<JanuaryWaitingResult> {
  switch (boundary) {
    case "access":
      return startJanuary(source.runtime, source.saveId, source.runId);
    case "learning":
      return reachJanuaryLearningBoundary(source.runtime, source.saveId, source.runId);
    case "defect":
      return reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
  }
}

describe("January 1990 persisted restart and compatibility", () => {
  it.each([
    ["access", 2],
    ["learning", 4],
    ["defect", 7],
  ] as const)("reopens the %s boundary without state drift", async (boundary, programCounter) => {
    const source = await createHarnessedJanuaryRuntime();
    const expected = await reachRestartBoundary(source, boundary);

    const reopened = reopenJanuaryRuntime(source);
    const loaded = requireJanuaryWaiting(await reopened.load(source.saveId));

    expect(loaded.checkpoint.programCounter).toBe(programCounter);
    expect(loaded.checkpoint.checkpointHash).toBe(expected.checkpoint.checkpointHash);
    expect(loaded.checkpoint.rngState).toBe(expected.checkpoint.rngState);
    expect(loaded.checkpoint.provisionalState).toEqual(expected.checkpoint.provisionalState);
    expect(loaded.checkpoint.materializedOutcomes).toEqual(
      expected.checkpoint.materializedOutcomes,
    );
    expect(loaded.checkpoint.pendingDecision).toEqual(expected.checkpoint.pendingDecision);
  });

  it("blocks a persisted run when the whole-manifest content fingerprint changes", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(source.runtime, source.saveId, source.runId);
    const incompatibleRegistry = {
      ...source.registry,
      contentFingerprint: fingerprint("different-january-content", { version: 2 }),
    };
    const reopened = reopenJanuaryRuntime(source, { registry: incompatibleRegistry });

    const result = await reopened.load(source.saveId);

    expect(result).toMatchObject({
      kind: "blocked",
      reason: "incompatible-checkpoint",
      save: { saveId: source.saveId },
      run: { runId: source.runId },
    });
    expect(source.harness.getRun(source.runId)?.checkpointHash).toBe(
      access.checkpoint.checkpointHash,
    );
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });

  it("blocks an idle save before begin when its schema fingerprint differs", async () => {
    const source = await createHarnessedJanuaryRuntime({
      saveSchemaFingerprint: fingerprint("different-save-schema", { version: 2 }),
    });

    const result = await source.runtime.load(source.saveId);

    expect(result).toMatchObject({
      kind: "blocked",
      reason: "incompatible-persistence",
      save: { saveId: source.saveId },
      run: null,
    });
    expect(source.harness.getStats()).toEqual({
      beginMutations: 0,
      boundaryMutations: 0,
      commitMutations: 0,
    });
  });

  it("rejects stale save and run revisions without mutation", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const staleBegin = await source.runtime.begin({
      requestId: parseRequestId("stale-january-begin"),
      saveId: source.saveId,
      expectedSaveRevision: parseSaveRevision(1),
      runId: source.runId,
      seed: 42n,
    });
    expect(staleBegin).toMatchObject({
      kind: "rejected",
      error: { code: "SaveRevisionConflict", retryable: false },
    });
    expect(source.harness.getStats()).toEqual({
      beginMutations: 0,
      boundaryMutations: 0,
      commitMutations: 0,
    });

    const access = await startJanuary(source.runtime, source.saveId, source.runId);
    const pendingDecision = access.checkpoint.pendingDecision;
    if (pendingDecision === null) throw new Error("January access decision is missing");
    const staleResume = await source.runtime.resume({
      requestId: parseRequestId("stale-january-resume"),
      saveId: source.saveId,
      runId: source.runId,
      expectedRunRevision: parseMonthRunRevision(access.checkpoint.runRevision + 1),
      decisionId: pendingDecision.decisionId,
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    });
    expect(staleResume).toMatchObject({
      kind: "rejected",
      error: { code: "RunRevisionConflict", retryable: false },
    });
    expect(source.harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });

    const recovered = requireJanuaryWaiting(
      await resumeJanuary(source.runtime, access, {
        requestId: "fresh-january-resume",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(recovered.checkpoint.programCounter).toBe(4);
  });
});
