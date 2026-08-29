import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  createMonthRunCheckpoint,
  deriveJanuaryQualityScoreMaximums,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  runUntilBoundary,
  restoreMonthRunCheckpoint,
  snapshotAuthoritativeValue,
  transitionMonthRun,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import { createJanuary1990Simulation, SIMULATION_POLICY_IDS } from "@runtime-human/game-simulation";
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

const SEEDS = fc.integer({ min: 0, max: 4095 });
const NUM_RUNS = 12;

const harness = await createHarness();

async function createHarness() {
  const registry = await loadJanuaryTestRegistry();
  const context = projectJanuary1990Content(registry);
  const simulation = createJanuary1990Simulation({
    context,
    balance: JANUARY_1990_DEFAULT_BALANCE,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  });
  const steps = createJanuary1990MonthSteps(context, JANUARY_1990_DEFAULT_BALANCE);
  const plan = createJanuary1990MonthPlan(context);
  const rulesetFingerprint = createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE);
  return { context, simulation, steps, plan, rulesetFingerprint };
}

function createInitialCheckpoint(seed: number): MonthRunCheckpointV1 {
  return createMonthRunCheckpoint({
    runId: parseMonthRunId(`january-property-${seed}`),
    saveId: parseSaveId("january-property-save"),
    baseSaveRevision: parseSaveRevision(0),
    plan: harness.plan,
    compatibility: {
      checkpointSchema: "month-run-checkpoint-v1",
      rulesFingerprint: harness.rulesetFingerprint,
      contentFingerprint: harness.context.contentFingerprint,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      determinismManifest: DETERMINISM_MANIFEST_V1,
    },
    rngState: Xoshiro256StarStar.fromSeed(BigInt(seed)).exportState(),
  });
}

const FIRST_ANSWERS: readonly { decisionId: string; answer: Record<string, string> }[] = [
  {
    decisionId: JANUARY_1990_DECISION_IDS.access,
    answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
  },
  {
    decisionId: JANUARY_1990_DECISION_IDS.learning,
    answer: { schemaVersion: "january-learning-answer-v1", practice: "read-and-run" },
  },
  {
    decisionId: JANUARY_1990_DECISION_IDS.defect,
    answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
  },
];

function runToCompletion(
  seed: number,
  options: Readonly<{ reloadEveryBoundary: boolean }> = {
    reloadEveryBoundary: false,
  },
): MonthRunCheckpointV1 {
  let checkpoint = createInitialCheckpoint(seed);
  for (const { decisionId, answer } of FIRST_ANSWERS) {
    const boundary = requireBoundary(runUntilBoundary(checkpoint, harness.steps));
    checkpoint = options.reloadEveryBoundary ? reload(boundary) : boundary;
    const accepted = transitionMonthRun(checkpoint, {
      type: "accept-decision",
      requestId: parseRequestId(`january-property-${seed}-${decisionId}`),
      decisionId: parseDecisionId(decisionId),
      answer,
    });
    if (accepted.kind === "accepted") {
      checkpoint = accepted.checkpoint;
      continue;
    }
    throw new Error(
      `Property run rejected: ${accepted.kind === "rejected" ? accepted.error.code : "duplicate"}`,
    );
  }
  const completed = runUntilBoundary(checkpoint, harness.steps);
  return requireBoundary(completed);
}

function reload(checkpoint: MonthRunCheckpointV1): MonthRunCheckpointV1 {
  const serialized = JSON.parse(JSON.stringify(snapshotAuthoritativeValue(checkpoint)));
  const restored = restoreMonthRunCheckpoint(serialized);
  if (restored.kind !== "ok") throw new Error(`Restore failed: ${restored.code}`);
  return restored.checkpoint;
}

function requireBoundary(result: ReturnType<typeof runUntilBoundary>): MonthRunCheckpointV1 {
  if (result.kind !== "boundary") throw new Error(`Run did not reach a boundary: ${result.kind}`);
  return result.checkpoint;
}

describe("January 1990 simulation properties", () => {
  it("replays identically for the same seed and command sequence", () => {
    const property = fc.property(SEEDS, (seed) => {
      const first = runToCompletion(seed);
      const second = runToCompletion(seed);
      expect(second.checkpointHash).toBe(first.checkpointHash);
      expect(second.terminalResult).toEqual(first.terminalResult);
    });
    fc.assert(property, { numRuns: NUM_RUNS });
  });

  it("is equivalent to suspend-reload-resume at every decision boundary", () => {
    const property = fc.property(SEEDS, (seed) => {
      const continuous = runToCompletion(seed);
      const reloaded = runToCompletion(seed, { reloadEveryBoundary: true });
      expect(reloaded.checkpointHash).toBe(continuous.checkpointHash);
      expect(reloaded.terminalResult).toEqual(continuous.terminalResult);
    });
    fc.assert(property, { numRuns: NUM_RUNS });
  });

  it("keeps duplicate decision acceptances idempotent", () => {
    const property = fc.property(SEEDS, (seed) => {
      const boundary = requireBoundary(
        runUntilBoundary(createInitialCheckpoint(seed), harness.steps),
      );
      const [firstAnswer] = FIRST_ANSWERS;
      if (firstAnswer === undefined) throw new Error("January property command table is empty");
      const requestId = parseRequestId(`january-property-duplicate-${seed}`);
      const decisionId = parseDecisionId(firstAnswer.decisionId);
      const first = transitionMonthRun(boundary, {
        type: "accept-decision",
        requestId,
        decisionId,
        answer: firstAnswer.answer,
      });
      if (first.kind !== "accepted") {
        throw new Error(
          `First acceptance failed: ${first.kind === "rejected" ? first.error.code : "duplicate"}`,
        );
      }
      const duplicate = transitionMonthRun(first.checkpoint, {
        type: "accept-decision",
        requestId,
        decisionId,
        answer: firstAnswer.answer,
      });
      expect(duplicate.kind).toBe("duplicate");
      if (duplicate.kind !== "duplicate") return;
      expect(duplicate.checkpoint).toBe(first.checkpoint);
    });
    fc.assert(property, { numRuns: NUM_RUNS });
  });

  it("completes every policy run without soft locks", () => {
    const property = fc.property(
      SEEDS,
      fc.constantFrom(...SIMULATION_POLICY_IDS),
      (seed, policyId) => {
        const run = harness.simulation.runOnce({ seed, policyId });
        expect(run.terminalState).toBe("completed");
      },
    );
    fc.assert(property, { numRuns: NUM_RUNS });
  });

  it("keeps materialized quality scores within the derived balance maxima", () => {
    const maxima = deriveJanuaryQualityScoreMaximums(JANUARY_1990_DEFAULT_BALANCE.quality);
    const report = harness.simulation.simulate({
      seedStart: 0,
      seedEnd: 31,
      policies: [...SIMULATION_POLICY_IDS],
    });
    expect(report.runs).toBe(96);
    expect(report.invariantFailures).toEqual([]);
    expect(report.aggregates.completedRuns).toBe(96);
    expect(report.aggregates.scoreBounds.clarity.maximum).toBeLessThanOrEqual(maxima.clarity);
    expect(report.aggregates.scoreBounds.correctness.maximum).toBeLessThanOrEqual(
      maxima.correctness,
    );
    expect(report.aggregates.scoreBounds.reliability.maximum).toBeLessThanOrEqual(
      maxima.reliability,
    );
  });

  it("produces a byte-stable report for a fixed request", () => {
    const request = { seedStart: 1, seedEnd: 8, policies: [...SIMULATION_POLICY_IDS] } as const;
    const first = harness.simulation.simulate(request);
    const second = harness.simulation.simulate(request);
    expect(second).toEqual(first);
  });
});
