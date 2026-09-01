import { describe, expect, it } from "vitest";

import {
  createJanuary1990BeginCommand,
  createJanuary1990InitialSaveSnapshot,
  createJanuary1990Runtime,
  createPersistedMonthRunOrchestrator,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  materializeJanuary1990Commit,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import {
  createJanuary1990HierarchicalRulesFingerprint,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type MonthRunCompatibilityV1,
} from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";
import {
  createHarnessedJanuaryRuntime,
  loadJanuaryTestRegistry,
  reachJanuaryDefectBoundary,
} from "./helpers/january-1990-runtime-fixture";

describe("January 1990 persisted hierarchical RNG authority", () => {
  it("uses hierarchical compatibility and keeps the persisted run root immutable", async () => {
    const source = await createHarnessedJanuaryRuntime();

    expect(source.runtime.compatibility).toEqual({
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: createJanuary1990HierarchicalRulesFingerprint(JANUARY_1990_DEFAULT_BALANCE),
      contentFingerprint: source.runtime.contentContext.contentFingerprint,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
    });

    const defect = await reachJanuaryDefectBoundary(source.runtime, source.saveId, source.runId);
    expect(defect.checkpoint.rngState).toBe(Xoshiro256StarStar.fromSeed(42n).exportState());
  });

  it("blocks a suspended legacy run instead of reinterpreting it", async () => {
    const registry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(registry);
    const saveId = parseSaveId("save-january-legacy-rng-cutover");
    const runId = parseMonthRunId("run-january-legacy-rng-cutover");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const legacyCompatibility = Object.freeze({
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE),
      contentFingerprint: context.contentFingerprint,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      determinismManifest: DETERMINISM_MANIFEST_V1,
    } satisfies MonthRunCompatibilityV1);
    const legacyRuntime = createPersistedMonthRunOrchestrator({
      persistence: harness.service,
      steps: createJanuary1990MonthSteps(context, JANUARY_1990_DEFAULT_BALANCE),
      expectedCompatibility: legacyCompatibility,
      materializeCommit: materializeJanuary1990Commit,
    });
    const legacyBoundary = await legacyRuntime.begin(
      createJanuary1990BeginCommand(context, legacyCompatibility, {
        requestId: parseRequestId("begin-january-legacy-rng-cutover"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );
    expect(legacyBoundary.kind).toBe("waiting-decision");

    const currentRuntime = createJanuary1990Runtime({
      persistence: harness.service,
      contentRegistry: registry,
    });
    const loaded = await currentRuntime.load(saveId);

    expect(loaded).toMatchObject({
      kind: "blocked",
      reason: "incompatible-checkpoint",
      save: { saveId },
      run: { runId },
    });
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 1,
      commitMutations: 0,
    });
  });
});
