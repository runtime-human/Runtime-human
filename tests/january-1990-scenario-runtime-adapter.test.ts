import { describe, expect, it } from "vitest";

import { projectJanuary1990Content } from "@runtime-human/game-application";
import {
  checkMonthRunCompatibility,
  createJanuary1990MonthPlan,
  createJanuary1990RulesFingerprintForExecutionProfile,
  createJanuary1990ScenarioMonthSteps,
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  createMonthRunCheckpoint,
  fingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  runUntilBoundary,
  transitionMonthRun,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type MonthRunCompatibilityV1,
  type ScenarioArtifactV1,
} from "@runtime-human/game-schema";

import {
  loadJanuaryScenarioArtifactV1,
  loadJanuaryScenarioDispatchProbeArtifactV1,
  loadJanuaryScenarioDuplicateDecisionProbeArtifactV1,
  loadJanuaryScenarioDuplicateProviderProbeArtifactV1,
} from "./helpers/january-1990-scenario-artifact";
import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

async function fixture() {
  const registry = await loadJanuaryTestRegistry();
  const context = projectJanuary1990Content(registry);
  const artifact = await loadJanuaryScenarioArtifactV1();
  return { context, artifact };
}

function compatibility(
  rulesFingerprint: MonthRunCompatibilityV1["rulesFingerprint"],
  contentFingerprint: MonthRunCompatibilityV1["contentFingerprint"],
): MonthRunCompatibilityV1 {
  return {
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint,
    contentFingerprint,
    saveSchemaFingerprint: fingerprint("scenario-runtime-test-save-schema-v1", {}),
    determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  };
}

describe("January 1990 certified scenario MonthRun adapter", () => {
  it("maps certified scenario instructions onto the existing MonthRun decision protocol", async () => {
    const { context, artifact } = await fixture();
    const rulesFingerprint = createJanuary1990ScenarioRuntimeRulesFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const steps = createJanuary1990ScenarioMonthSteps(
      context,
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const checkpoint = createMonthRunCheckpoint({
      runId: parseMonthRunId("scenario-adapter-run"),
      saveId: parseSaveId("scenario-adapter-save"),
      baseSaveRevision: parseSaveRevision(0),
      plan: createJanuary1990MonthPlan(context),
      compatibility: compatibility(rulesFingerprint, context.contentFingerprint),
      rngState: Xoshiro256StarStar.fromSeed(42n).exportState(),
    });

    const access = runUntilBoundary(checkpoint, steps);
    expect(access.kind).toBe("boundary");
    if (access.kind !== "boundary") return;
    expect(access.checkpoint.status).toBe("suspended");
    expect(access.checkpoint.pendingDecision?.decisionId).toBe("january-1990/access");
    expect(access.checkpoint.programCounter).toBe(2);

    const accepted = transitionMonthRun(access.checkpoint, {
      type: "accept-decision",
      requestId: parseRequestId("scenario-adapter-access-answer"),
      decisionId: access.checkpoint.pendingDecision!.decisionId,
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    });
    expect(accepted.kind).toBe("accepted");
    if (accepted.kind !== "accepted") return;

    const learning = runUntilBoundary(accepted.checkpoint, steps);
    expect(learning.kind).toBe("boundary");
    if (learning.kind !== "boundary") return;
    expect(learning.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");
    expect(learning.checkpoint.programCounter).toBe(4);
  });

  it("dispatches the certified instruction order instead of replaying the legacy January step table", async () => {
    const registry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(registry);
    const artifact = await loadJanuaryScenarioDispatchProbeArtifactV1();
    const createSteps = () =>
      createJanuary1990ScenarioMonthSteps(context, JANUARY_1990_DEFAULT_BALANCE, artifact);

    expect(createSteps).not.toThrow();
    const steps = createSteps();
    const rulesFingerprint = createJanuary1990ScenarioRuntimeRulesFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const checkpoint = createMonthRunCheckpoint({
      runId: parseMonthRunId("scenario-dispatch-probe-run"),
      saveId: parseSaveId("scenario-dispatch-probe-save"),
      baseSaveRevision: parseSaveRevision(0),
      plan: createJanuary1990MonthPlan(context),
      compatibility: compatibility(rulesFingerprint, context.contentFingerprint),
      rngState: Xoshiro256StarStar.fromSeed(42n).exportState(),
    });

    const access = runUntilBoundary(checkpoint, steps);
    expect(access.kind).toBe("boundary");
    if (access.kind !== "boundary") return;
    expect(access.checkpoint.pendingDecision?.decisionId).toBe("january-1990/access");
    expect(access.checkpoint.programCounter).toBe(2);

    const accepted = transitionMonthRun(access.checkpoint, {
      type: "accept-decision",
      requestId: parseRequestId("scenario-dispatch-probe-access-answer"),
      decisionId: access.checkpoint.pendingDecision!.decisionId,
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    });
    expect(accepted.kind).toBe("accepted");
    if (accepted.kind !== "accepted") return;

    const learning = runUntilBoundary(accepted.checkpoint, steps);
    expect(learning.kind).toBe("boundary");
    if (learning.kind !== "boundary") return;
    expect(learning.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");
    expect(learning.checkpoint.programCounter).toBe(3);
  });

  it("rejects certified artifacts that duplicate required January bindings", async () => {
    const registry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(registry);
    const duplicateDecision = await loadJanuaryScenarioDuplicateDecisionProbeArtifactV1();
    const duplicateProvider = await loadJanuaryScenarioDuplicateProviderProbeArtifactV1();

    expect(() =>
      createJanuary1990ScenarioMonthSteps(
        context,
        JANUARY_1990_DEFAULT_BALANCE,
        duplicateDecision,
      ),
    ).toThrow();
    expect(() =>
      createJanuary1990ScenarioMonthSteps(
        context,
        JANUARY_1990_DEFAULT_BALANCE,
        duplicateProvider,
      ),
    ).toThrow();
  });

  it("binds scenario program, capability rules, policy and certificate into compatibility identity", async () => {
    const { context, artifact } = await fixture();
    const scenarioRules = createJanuary1990ScenarioRuntimeRulesFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const ordinaryRules = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );

    expect(
      createJanuary1990ScenarioRuntimeRulesFingerprint(JANUARY_1990_DEFAULT_BALANCE, artifact),
    ).toBe(scenarioRules);
    expect(scenarioRules).not.toBe(ordinaryRules);
    expect(
      checkMonthRunCompatibility(
        compatibility(ordinaryRules, context.contentFingerprint),
        compatibility(scenarioRules, context.contentFingerprint),
      ),
    ).toMatchObject({ kind: "incompatible", mismatches: ["rulesFingerprint"] });
  });

  it("fails closed when the certified January artifact is internally rebound or structurally changed", async () => {
    const { context, artifact } = await fixture();
    const rebound: ScenarioArtifactV1 = {
      ...artifact,
      certificate: {
        ...artifact.certificate,
        policyFingerprint: fingerprint("tampered-january-policy-v1", {}),
      },
    };
    const changedProgram: ScenarioArtifactV1 = {
      ...artifact,
      program: {
        ...artifact.program,
        providerTable: artifact.program.providerTable.toReversed(),
      },
    };

    expect(() =>
      createJanuary1990ScenarioMonthSteps(context, JANUARY_1990_DEFAULT_BALANCE, rebound),
    ).toThrow();
    expect(() =>
      createJanuary1990ScenarioMonthSteps(context, JANUARY_1990_DEFAULT_BALANCE, changedProgram),
    ).toThrow();
  });
});
