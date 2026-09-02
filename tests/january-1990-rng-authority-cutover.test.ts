import { describe, expect, it } from "vitest";

import { projectJanuary1990Content } from "@runtime-human/game-application";
import {
  createJanuary1990HierarchicalMonthSteps,
  createJanuary1990MonthPlan,
  createJanuary1990RngDomainPathsV1,
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesFingerprintForExecutionProfile,
  createMonthRunCheckpoint,
  deriveRandomSource,
  fingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  runUntilBoundary,
  transitionMonthRun,
  Xoshiro256StarStar,
  type MonthRunRunResult,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type MonthRunCheckpointV1,
} from "@runtime-human/game-schema";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const context = projectJanuary1990Content(await loadJanuaryTestRegistry());
const balance = JANUARY_1990_DEFAULT_BALANCE;
const rootState = Xoshiro256StarStar.fromSeed(42n).exportState();
const saveSchemaFingerprint = fingerprint("january-rng-cutover-test-save-schema", { version: 1 });

function hierarchicalRulesFingerprint() {
  return createJanuary1990RulesFingerprintForExecutionProfile(
    balance,
    JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
  );
}

function createInitialCheckpoint(): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId("january-hierarchical-cutover-run"),
    saveId: parseSaveId("january-hierarchical-cutover-save"),
    baseSaveRevision: parseSaveRevision(0),
    plan: createJanuary1990MonthPlan(context),
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: hierarchicalRulesFingerprint(),
      contentFingerprint: context.contentFingerprint,
      saveSchemaFingerprint,
      determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
    },
    rngState: rootState,
  });
}

function requireBoundary(result: MonthRunRunResult): MonthRunCheckpointV1 {
  expect(result.kind).toBe("boundary");
  if (result.kind !== "boundary") throw new Error("January cutover did not reach a boundary");
  return result.checkpoint;
}

function acceptAndRun(
  checkpoint: MonthRunCheckpointV1,
  requestId: string,
  decisionId: string,
  answer: Record<string, string>,
  steps: ReturnType<typeof createJanuary1990HierarchicalMonthSteps>,
): MonthRunCheckpointV1 {
  const accepted = transitionMonthRun(checkpoint, {
    type: "accept-decision",
    requestId: parseRequestId(requestId),
    decisionId: parseDecisionId(decisionId),
    answer,
  });
  expect(accepted.kind).toBe("accepted");
  if (accepted.kind !== "accepted") throw new Error("January cutover decision was rejected");
  return requireBoundary(runUntilBoundary(accepted.checkpoint, steps));
}

function readOutcomeField(
  checkpoint: MonthRunCheckpointV1,
  outcomeId: string,
  field: string,
): unknown {
  const outcome = checkpoint.materializedOutcomes.find(
    (candidate) => candidate.outcomeId === outcomeId,
  );
  if (outcome === undefined || typeof outcome.payload !== "object" || outcome.payload === null) {
    throw new Error(`January outcome ${outcomeId} is missing`);
  }
  return (outcome.payload as Record<string, unknown>)[field];
}

describe("January 1990 hierarchical RNG authority cutover", () => {
  it("uses the persisted hierarchical execution-profile compatibility identity", () => {
    const legacy = createJanuary1990RulesFingerprint(balance);
    const hierarchical = hierarchicalRulesFingerprint();

    expect(hierarchical).not.toBe(legacy);
    expect(JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST).toEqual({
      ...DETERMINISM_MANIFEST_V1,
      rulesVersion: "january-1990-hierarchical-rng-v1",
    });
    expect(Object.isFrozen(JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST)).toBe(true);
  });

  it("derives authoritative sibling streams from the immutable run root", () => {
    const steps = createJanuary1990HierarchicalMonthSteps(context, balance);
    const access = requireBoundary(runUntilBoundary(createInitialCheckpoint(), steps));
    const learning = acceptAndRun(
      access,
      "cutover-access",
      "january-1990/access",
      { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      steps,
    );
    const defect = acceptAndRun(
      learning,
      "cutover-learning",
      "january-1990/learning",
      { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
      steps,
    );

    const paths = createJanuary1990RngDomainPathsV1(context);
    const narrative = deriveRandomSource(rootState, paths.narrativeEventSelection);
    const candidates = [...context.situation.eventIds].toSorted();
    const expectedEventId = candidates[narrative.nextInt(0, candidates.length)];

    expect(readOutcomeField(defect, "january-1990/defect", "eventId")).toBe(expectedEventId);
    expect(defect.rngState).toBe(rootState);

    const completed = acceptAndRun(
      defect,
      "cutover-defect",
      "january-1990/defect",
      { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      steps,
    );

    expect(completed.status).toBe("completed");
    expect(completed.rngState).toBe(rootState);
  });
});
