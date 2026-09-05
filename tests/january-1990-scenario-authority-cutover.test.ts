import { describe, expect, it } from "vitest";

import {
  createJanuary1990AuthorityCutoverRuntime,
  createJanuary1990InitialSaveSnapshot,
  createJanuary1990Runtime,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";
import {
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";
import { loadJanuaryScenarioArtifactV1 } from "./helpers/january-1990-scenario-artifact";
import {
  loadJanuaryTestRegistry,
  requireJanuaryWaiting,
  resumeJanuary,
} from "./helpers/january-1990-runtime-fixture";

describe("January 1990 scenario authority cutover", () => {
  it("publishes the exact certified Stage E artifact as runtime data", async () => {
    expect(JANUARY_1990_SCENARIO_ARTIFACT).toEqual(await loadJanuaryScenarioArtifactV1());
  });

  it("uses scenario authority for a new run", async () => {
    const registry = await loadJanuaryTestRegistry();
    const saveId = parseSaveId("save-january-scenario-cutover-new");
    const runId = parseMonthRunId("run-january-scenario-cutover-new");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const runtime = createJanuary1990AuthorityCutoverRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact: JANUARY_1990_SCENARIO_ARTIFACT,
    });

    const loaded = await runtime.load(saveId);
    expect(loaded.kind).toBe("idle");
    const started = requireJanuaryWaiting(
      await runtime.begin({
        requestId: parseRequestId("begin-january-scenario-cutover-new"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );

    expect(started.checkpoint.compatibility.rulesFingerprint).toBe(
      runtime.compatibility.rulesFingerprint,
    );
    expect(started.checkpoint.compatibility.rulesFingerprint).not.toBe(
      createJanuary1990Runtime({
        persistence: harness.service,
        contentRegistry: registry,
      }).compatibility.rulesFingerprint,
    );
  });

  it("drains an existing legacy run without rewriting its compatibility identity", async () => {
    const registry = await loadJanuaryTestRegistry();
    const saveId = parseSaveId("save-january-scenario-cutover-legacy");
    const runId = parseMonthRunId("run-january-scenario-cutover-legacy");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const legacy = createJanuary1990Runtime({
      persistence: harness.service,
      contentRegistry: registry,
    });
    const legacyBoundary = requireJanuaryWaiting(
      await legacy.begin({
        requestId: parseRequestId("begin-january-scenario-cutover-legacy"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );
    const cutover = createJanuary1990AuthorityCutoverRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact: JANUARY_1990_SCENARIO_ARTIFACT,
    });

    const loaded = requireJanuaryWaiting(await cutover.load(saveId));
    expect(loaded.checkpoint.checkpointHash).toBe(legacyBoundary.checkpoint.checkpointHash);
    expect(loaded.checkpoint.compatibility.rulesFingerprint).toBe(
      legacy.compatibility.rulesFingerprint,
    );

    const resumed = requireJanuaryWaiting(
      await resumeJanuary(cutover, loaded, {
        requestId: "resume-january-scenario-cutover-legacy",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(resumed.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");
    expect(resumed.checkpoint.compatibility.rulesFingerprint).toBe(
      legacy.compatibility.rulesFingerprint,
    );
  });
});
