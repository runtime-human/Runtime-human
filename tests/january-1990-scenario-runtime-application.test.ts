import { describe, expect, it } from "vitest";

import {
  createJanuary1990InitialSaveSnapshot,
  createJanuary1990Runtime,
  createJanuary1990ScenarioRuntime,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import {
  createJanuary1990HierarchicalMonthSteps,
  createJanuary1990MonthPlan,
  createJanuary1990RulesFingerprintForExecutionProfile,
  createJanuary1990ScenarioMonthSteps,
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";
import {
  createJanuary1990AnswerProviders,
  runJanuaryCommandSequence,
  SIMULATION_POLICY_IDS,
} from "@runtime-human/game-simulation";

import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";
import {
  loadJanuaryScenarioArtifactV1,
  loadJanuaryScenarioDispatchProbeArtifactV1,
} from "./helpers/january-1990-scenario-artifact";
import {
  loadJanuaryTestRegistry,
  requireJanuaryWaiting,
  resumeJanuary,
} from "./helpers/january-1990-runtime-fixture";

const EQUIVALENCE_SEEDS = Array.from({ length: 64 }, (_, seed) => seed);
const PROVIDER_OUTCOME_IDS = new Set([
  "january-1990/access",
  "january-1990/work",
  "january-1990/programming-outcome",
]);

describe("January 1990 opt-in certified scenario runtime", () => {
  it("persists and reloads through the existing MonthRun protocol while incompatible runtimes fail closed", async () => {
    const registry = await loadJanuaryTestRegistry();
    const artifact = await loadJanuaryScenarioArtifactV1();
    const saveId = parseSaveId("save-january-scenario-runtime");
    const runId = parseMonthRunId("run-january-scenario-runtime");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const scenarioRuntime = createJanuary1990ScenarioRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact,
    });

    const started = await scenarioRuntime.begin({
      requestId: parseRequestId("begin-january-scenario-runtime"),
      saveId,
      expectedSaveRevision: parseSaveRevision(0),
      runId,
      seed: 42n,
    });
    expect(started.kind).toBe("waiting-decision");
    if (started.kind !== "waiting-decision") return;
    expect(started.checkpoint.pendingDecision?.decisionId).toBe("january-1990/access");

    const reopened = createJanuary1990ScenarioRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact,
    });
    const loaded = await reopened.load(saveId);
    expect(loaded.kind).toBe("waiting-decision");
    if (loaded.kind === "waiting-decision") {
      expect(loaded.checkpoint.checkpointHash).toBe(started.checkpoint.checkpointHash);
      expect(loaded.checkpoint.compatibility.rulesFingerprint).toBe(
        scenarioRuntime.compatibility.rulesFingerprint,
      );
    }

    const ordinaryRuntime = createJanuary1990Runtime({
      persistence: harness.service,
      contentRegistry: registry,
    });
    expect(ordinaryRuntime.compatibility.rulesFingerprint).not.toBe(
      scenarioRuntime.compatibility.rulesFingerprint,
    );
    const ordinaryLoad = await ordinaryRuntime.load(saveId);
    expect(ordinaryLoad).toMatchObject({
      kind: "blocked",
      reason: "incompatible-checkpoint",
    });

    const alternateArtifact = await loadJanuaryScenarioDispatchProbeArtifactV1();
    const alternateScenarioRuntime = createJanuary1990ScenarioRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact: alternateArtifact,
    });
    expect(alternateScenarioRuntime.compatibility.rulesFingerprint).not.toBe(
      scenarioRuntime.compatibility.rulesFingerprint,
    );
    const alternateLoad = await alternateScenarioRuntime.load(saveId);
    expect(alternateLoad).toMatchObject({
      kind: "blocked",
      reason: "incompatible-checkpoint",
    });
  });

  it("replays a duplicate scenario resume exactly once through the existing persisted protocol", async () => {
    const registry = await loadJanuaryTestRegistry();
    const artifact = await loadJanuaryScenarioArtifactV1();
    const saveId = parseSaveId("save-january-scenario-duplicate-resume");
    const runId = parseMonthRunId("run-january-scenario-duplicate-resume");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const scenarioRuntime = createJanuary1990ScenarioRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact,
    });
    const started = requireJanuaryWaiting(
      await scenarioRuntime.begin({
        requestId: parseRequestId("begin-january-scenario-duplicate-resume"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );
    const resumeInput = {
      requestId: "resume-january-scenario-access-once",
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    } as const;

    const first = requireJanuaryWaiting(await resumeJanuary(scenarioRuntime, started, resumeInput));
    const duplicate = requireJanuaryWaiting(
      await resumeJanuary(scenarioRuntime, started, resumeInput),
    );

    expect(first.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");
    expect(duplicate.checkpoint.checkpointHash).toBe(first.checkpoint.checkpointHash);
    expect(duplicate.checkpoint.acceptedDecisions).toEqual(first.checkpoint.acceptedDecisions);
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 2,
      commitMutations: 0,
    });
  });

  it("matches authoritative hierarchical January gameplay semantics and certificate bounds on the cutover corpus", async () => {
    const registry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(registry);
    const artifact = await loadJanuaryScenarioArtifactV1();
    const plan = createJanuary1990MonthPlan(context);
    const ordinarySteps = createJanuary1990HierarchicalMonthSteps(
      context,
      JANUARY_1990_DEFAULT_BALANCE,
    );
    const scenarioSteps = createJanuary1990ScenarioMonthSteps(
      context,
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const ordinaryRules = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );
    const scenarioRules = createJanuary1990ScenarioRuntimeRulesFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );

    for (const seed of EQUIVALENCE_SEEDS) {
      for (const policyId of SIMULATION_POLICY_IDS) {
        const answers = createJanuary1990AnswerProviders({
          policyId,
          seed,
          fixtureAnswers: {},
        });
        const ordinary = runJanuaryCommandSequence({
          runnerId: policyId,
          seed,
          contentFingerprint: context.contentFingerprint,
          steps: ordinarySteps,
          plan,
          rulesetFingerprint: ordinaryRules,
          determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
          saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
          answers,
        });
        const scenario = runJanuaryCommandSequence({
          runnerId: policyId,
          seed,
          contentFingerprint: context.contentFingerprint,
          steps: scenarioSteps,
          plan,
          rulesetFingerprint: scenarioRules,
          determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
          saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
          answers,
        });

        expect(ordinary.terminalState).toBe("completed");
        expect(scenario.terminalState).toBe("completed");
        expect(scenario.metrics.blockingDecisions).toBeLessThanOrEqual(
          artifact.certificate.blockingDecisionsMax,
        );
        expect(scenario.checkpoint.programCounter - 1).toBeLessThanOrEqual(
          artifact.certificate.transitionBudgetMax,
        );
        expect(
          scenario.checkpoint.materializedOutcomes.filter(({ outcomeId }) =>
            PROVIDER_OUTCOME_IDS.has(outcomeId),
          ),
        ).toHaveLength(artifact.certificate.providerCallsMax);
        expect(
          scenario.checkpoint.materializedOutcomes.filter(
            ({ outcomeId }) => outcomeId === "january-1990/defect",
          ),
        ).toHaveLength(1);
        expect(scenario.checkpoint.terminalResult).toEqual(ordinary.checkpoint.terminalResult);
        expect(scenario.checkpoint.provisionalState).toEqual(ordinary.checkpoint.provisionalState);
        expect(scenario.checkpoint.materializedOutcomes).toEqual(
          ordinary.checkpoint.materializedOutcomes,
        );
        expect(scenario.checkpoint.rngState).toEqual(ordinary.checkpoint.rngState);
        expect(
          scenario.checkpoint.acceptedDecisions.map(({ decisionId, answer }) => ({
            decisionId,
            answer,
          })),
        ).toEqual(
          ordinary.checkpoint.acceptedDecisions.map(({ decisionId, answer }) => ({
            decisionId,
            answer,
          })),
        );
      }
    }
  });
});
