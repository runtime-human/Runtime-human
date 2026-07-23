import { describe, expect, it } from "vitest";

import {
  buildBeginPersistedMonthRunCommand,
  createPersistedMonthRunOrchestrator,
} from "@runtime-human/game-application";
import { createMonthRunCheckpoint, fingerprint } from "@runtime-human/game-core";

import {
  JANUARY_COMPATIBILITY,
  JANUARY_RUN_ID,
  JANUARY_SAVE_ID,
  JANUARY_SAVE_REVISION,
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

function createOrchestrator(
  harness: ReturnType<typeof createHarness>,
  compatibility = JANUARY_COMPATIBILITY,
  onStep?: () => void,
) {
  return createPersistedMonthRunOrchestrator({
    persistence: harness.service,
    steps: JANUARY_STEPS.map((step) => (checkpoint) => {
      onStep?.();
      return step(checkpoint);
    }),
    expectedCompatibility: compatibility,
    materializeCommit: materializeJanuaryCommit,
  });
}

describe("persisted MonthRun restart recovery", () => {
  it("continues a persisted ready checkpoint to the next durable boundary", async () => {
    const harness = createHarness();
    const begin = januaryBeginCommand();
    const ready = createMonthRunCheckpoint({
      runId: JANUARY_RUN_ID,
      saveId: JANUARY_SAVE_ID,
      baseSaveRevision: JANUARY_SAVE_REVISION,
      compatibility: JANUARY_COMPATIBILITY,
      plan: begin.plan,
      rngState: begin.initialRngState,
    });
    await harness.service.beginMonthRun(buildBeginPersistedMonthRunCommand(begin, ready));

    const recovered = await createOrchestrator(harness).load(JANUARY_SAVE_ID);

    expect(recovered.kind).toBe("waiting-decision");
    expect(harness.getRun(JANUARY_RUN_ID)?.status).toBe("suspended");
  });

  it("restores a suspended decision without rerunning deterministic steps", async () => {
    const harness = createHarness();
    const first = createOrchestrator(harness);
    const started = await first.begin(januaryBeginCommand());
    if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");
    let stepCount = 0;

    const recovered = await createOrchestrator(
      harness,
      JANUARY_COMPATIBILITY,
      () => {
        stepCount += 1;
      },
    ).load(JANUARY_SAVE_ID);

    expect(recovered.kind).toBe("waiting-decision");
    if (recovered.kind !== "waiting-decision") throw new Error("expected recovered decision");
    expect(recovered.checkpoint.checkpointHash).toBe(started.checkpoint.checkpointHash);
    expect(stepCount).toBe(0);
  });

  it(
    "commits a completed boundary after restart without duplicating the save revision",
    async () => {
      const harness = createHarness();
      const first = createOrchestrator(harness);
      const started = await first.begin(januaryBeginCommand());
      if (started.kind !== "waiting-decision") throw new Error("expected decision boundary");

      harness.loseNextAcknowledgement("storeMonthRunBoundary");
      await first.resume(januaryResumeCommand(started.checkpoint));
      expect(harness.getRun(JANUARY_RUN_ID)?.status).toBe("completed");

      const recovered = await createOrchestrator(harness).load(JANUARY_SAVE_ID);
      const repeated = await createOrchestrator(harness).load(JANUARY_SAVE_ID);

      expect(recovered.kind).toBe("committed");
      expect(repeated.kind).toBe("idle");
      expect(harness.getSave().revision).toBe(1);
      expect(harness.getStats().commitMutations).toBe(1);
    },
  );

  it("blocks read-only recovery before invoking gameplay steps or mutations", async () => {
    const harness = createHarness();
    harness.setRecoveryStatus({
      schemaVersion: "recovery-status-v1",
      status: "corrupted",
      writable: false,
      backupAvailable: true,
    });
    let stepCount = 0;
    const before = harness.getStats();

    const result = await createOrchestrator(
      harness,
      JANUARY_COMPATIBILITY,
      () => {
        stepCount += 1;
      },
    ).begin(januaryBeginCommand());

    expect(result).toMatchObject({ kind: "blocked", reason: "recovery" });
    expect(stepCount).toBe(0);
    expect(harness.getStats()).toEqual(before);
  });

  it("blocks an incompatible stored checkpoint before invoking gameplay steps", async () => {
    const harness = createHarness();
    const first = createOrchestrator(harness);
    await first.begin(januaryBeginCommand());
    let stepCount = 0;
    const incompatible = {
      ...JANUARY_COMPATIBILITY,
      contentFingerprint: fingerprint("different-content", 1),
    };

    const result = await createOrchestrator(
      harness,
      incompatible,
      () => {
        stepCount += 1;
      },
    ).load(JANUARY_SAVE_ID);

    expect(result).toMatchObject({
      kind: "blocked",
      reason: "incompatible-checkpoint",
    });
    expect(stepCount).toBe(0);
  });
});
