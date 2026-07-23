import { describe, expect, it } from "vitest";

import { createPersistedMonthRunOrchestrator } from "@runtime-human/game-application";
import { parseDecisionId } from "@runtime-human/game-schema";

import {
  JANUARY_COMPATIBILITY,
  JANUARY_RUN_ID,
  JANUARY_SAVE_ID,
  JANUARY_STEPS,
  januaryBeginCommand,
  januaryResumeCommand,
  materializeJanuaryCommit,
} from "./fixtures/january-reference-program";
import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";

function createHarness() {
  return createInMemoryPersistenceHarness({
    saveId: JANUARY_SAVE_ID,
    saveSchemaFingerprint: JANUARY_COMPATIBILITY.saveSchemaFingerprint,
  });
}

function createOrchestrator(harness: ReturnType<typeof createHarness>) {
  return createPersistedMonthRunOrchestrator({
    persistence: harness.service,
    steps: JANUARY_STEPS,
    expectedCompatibility: JANUARY_COMPATIBILITY,
    materializeCommit: materializeJanuaryCommit,
  });
}

describe("persisted MonthRun orchestration", () => {
  it("persists the decision boundary and commits the month exactly once", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);

    const started = await orchestrator.begin(januaryBeginCommand());
    expect(started.kind).toBe("waiting-decision");
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");

    const completed = await orchestrator.resume(januaryResumeCommand(started.checkpoint));
    expect(completed.kind).toBe("committed");
    expect(harness.getSave().revision).toBe(1);
    expect(harness.getSave().lastCommittedRunId).toBe(JANUARY_RUN_ID);
    expect(harness.getRun(JANUARY_RUN_ID)?.status).toBe("committed");
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 2,
      commitMutations: 1,
    });
  });

  it("recovers a lost begin acknowledgement without creating a second run", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);
    harness.loseNextAcknowledgement("beginMonthRun");

    const lost = await orchestrator.begin(januaryBeginCommand());
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });

    const retried = await orchestrator.retry();
    expect(retried.kind).toBe("waiting-decision");
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });

  it("retries acknowledgement loss with the same outer request without duplicate progress", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);
    const started = await orchestrator.begin(januaryBeginCommand());
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");

    harness.loseNextAcknowledgement("storeMonthRunBoundary");
    const lost = await orchestrator.resume(januaryResumeCommand(started.checkpoint));
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });

    const retried = await orchestrator.retry();
    expect(retried.kind).toBe("committed");
    expect(harness.getSave().revision).toBe(1);
    expect(harness.getStats().commitMutations).toBe(1);
  });

  it("recovers a lost commit acknowledgement without a second save commit", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);
    const started = await orchestrator.begin(januaryBeginCommand());
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");

    harness.loseNextAcknowledgement("commitMonthRun");
    const lost = await orchestrator.resume(januaryResumeCommand(started.checkpoint));
    expect(lost).toMatchObject({
      kind: "rejected",
      error: { category: "transport", retryable: true },
    });

    const retried = await orchestrator.retry();
    expect(retried.kind).toBe("committed");
    expect(harness.getSave().revision).toBe(1);
    expect(harness.getStats().commitMutations).toBe(1);
  });

  it("does not accept a divergent competing commit as idempotent success", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);
    const started = await orchestrator.begin(januaryBeginCommand());
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");
    harness.commitNextAsCompeting({
      snapshot: { schemaVersion: "divergent-save-v1" },
      result: { schemaVersion: "divergent-result-v1" },
    });

    const result = await orchestrator.resume(januaryResumeCommand(started.checkpoint));

    expect(result).toMatchObject({
      kind: "rejected",
      error: { code: "RunAlreadyCommitted", retryable: false },
    });
    expect(harness.getStats().commitMutations).toBe(1);
  });

  it("rejects an unexpected decision without writing another boundary", async () => {
    const harness = createHarness();
    const orchestrator = createOrchestrator(harness);
    const started = await orchestrator.begin(januaryBeginCommand());
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");
    const before = harness.getStats();

    const result = await orchestrator.resume({
      ...januaryResumeCommand(started.checkpoint),
      decisionId: parseDecisionId("another-decision"),
    });

    expect(result).toMatchObject({
      kind: "rejected",
      error: { code: "UnexpectedDecision", retryable: false },
    });
    expect(harness.getStats()).toEqual(before);
  });
});
