import { describe, expect, it } from "vitest";

import type { Fingerprint } from "@runtime-human/game-schema";
import {
  compareSimulationReportsV1,
  parseSimulationReportV1,
  SIMULATION_POLICY_IDS,
  type SimulationCompareReportV1,
  type SimulationReportV1,
} from "@runtime-human/game-simulation";

const FINGERPRINT_A = "a".repeat(64) as Fingerprint;
const FINGERPRINT_B = "b".repeat(64) as Fingerprint;

function baseReport(
  overrides: {
    rulesetFingerprint?: Fingerprint;
    contentFingerprint?: Fingerprint;
    aggregates?: Partial<SimulationReportV1["aggregates"]>;
    seedRange?: { start: number; end: number };
    runs?: number;
  } = {},
): SimulationReportV1 {
  const defaults: SimulationReportV1 = {
    schemaVersion: "simulation-report-v1",
    rulesetFingerprint: FINGERPRINT_A,
    contentFingerprint: FINGERPRINT_B,
    policies: [...SIMULATION_POLICY_IDS],
    seedRange: { start: 1, end: 4 },
    runs: 12,
    aggregates: {
      completedRuns: 12,
      softLocks: 0,
      terminalFailures: 0,
      invalidStates: 0,
      monthsPlayed: 12,
      blockingDecisions: 36,
      stateTransitions: 144,
      scoreBounds: {
        clarity: { minimum: 7, maximum: 10 },
        correctness: { minimum: 7, maximum: 11 },
        reliability: { minimum: 6, maximum: 8 },
      },
      choiceDistribution: {
        accessRoute: { "home-pc": 12 },
        learningPractice: { "read-and-run": 12 },
        defectResponse: { "inspect-listing": 12 },
      },
    },
    invariantFailures: [],
  };
  return {
    ...defaults,
    ...(overrides.rulesetFingerprint !== undefined
      ? { rulesetFingerprint: overrides.rulesetFingerprint }
      : {}),
    ...(overrides.contentFingerprint !== undefined
      ? { contentFingerprint: overrides.contentFingerprint }
      : {}),
    ...(overrides.seedRange !== undefined ? { seedRange: overrides.seedRange } : {}),
    ...(overrides.runs !== undefined ? { runs: overrides.runs } : {}),
    ...(overrides.aggregates !== undefined
      ? { aggregates: { ...defaults.aggregates, ...overrides.aggregates } }
      : {}),
  };
}

function dispositionOf(report: SimulationCompareReportV1, metric: string): string | undefined {
  return report.metrics.find((row) => row.metric === metric)?.disposition;
}

describe("simulation report v1 closed parser", () => {
  it("accepts a well-formed report", () => {
    const parsed = parseSimulationReportV1(baseReport({}));
    expect(parsed.kind).toBe("ok");
  });

  it("rejects broken reports", () => {
    const cases: readonly unknown[] = [
      null,
      [],
      { extra: true },
      { ...baseReport({}), unknownKey: 1 },
      { ...baseReport({}), schemaVersion: "simulation-report-v2" },
      { ...baseReport({}), rulesetFingerprint: "nothex" },
      { ...baseReport({}), runs: -1 },
      { ...baseReport({}), policies: ["speedrunner"] },
      { ...baseReport({}), policies: [] },
      { ...baseReport({}), seedRange: { start: 9, end: 1 } },
      { ...baseReport({}), aggregates: { ...baseReport({}).aggregates, completedRuns: 1.5 } },
      { ...baseReport({}), aggregates: { ...baseReport({}).aggregates, softLocks: -2 } },
      {
        ...baseReport({}),
        aggregates: {
          ...baseReport({}).aggregates,
          scoreBounds: {
            clarity: { minimum: 5, maximum: 1 },
            correctness: { minimum: null, maximum: 3 },
            reliability: { minimum: null, maximum: null },
          },
        },
      },
      {
        ...baseReport({}),
        aggregates: {
          ...baseReport({}).aggregates,
          choiceDistribution: {
            accessRoute: { "home-pc": -1 },
            learningPractice: {},
            defectResponse: {},
          },
        },
      },
      {
        ...baseReport({}),
        invariantFailures: [{ invariant: "made-up", seed: "1", policyId: "p", detail: "d" }],
      },
    ];
    for (const candidate of cases) {
      const parsed = parseSimulationReportV1(candidate);
      expect(parsed.kind).toBe("invalid");
    }
  });

  it("rejects prototype-less documents", () => {
    const parsed = parseSimulationReportV1(Object.assign(Object.create(null), baseReport({})));
    expect(parsed.kind).toBe("invalid");
  });
});

describe("simulation compare v1", () => {
  it("reports unchanged for identical reports", () => {
    const result = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({}),
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.report.regressionCount).toBe(0);
    expect(result.report.metrics.every((row) => row.disposition === "unchanged")).toBe(true);
  });

  it("marks adverse deltas as regressions and honors budgets", () => {
    const candidate = baseReport({ aggregates: { softLocks: 2, completedRuns: 11 } });
    const strict = compareSimulationReportsV1({ baseline: baseReport({}), candidate });
    expect(strict.kind).toBe("ok");
    if (strict.kind === "ok") {
      expect(dispositionOf(strict.report, "softLocks")).toBe("regression");
      expect(dispositionOf(strict.report, "completedRuns")).toBe("regression");
      expect(strict.report.regressionCount).toBe(2);
    }
    const budgeted = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate,
      thresholds: { softLocks: 2 },
    });
    expect(budgeted.kind).toBe("ok");
    if (budgeted.kind === "ok") {
      expect(dispositionOf(budgeted.report, "softLocks")).toBe("within-budget");
      expect(dispositionOf(budgeted.report, "completedRuns")).toBe("regression");
      expect(budgeted.report.regressionCount).toBe(1);
    }
  });

  it("marks favorable deltas as improved", () => {
    const result = compareSimulationReportsV1({
      baseline: baseReport({ aggregates: { softLocks: 3 } }),
      candidate: baseReport({}),
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(dispositionOf(result.report, "softLocks")).toBe("improved");
    }
  });

  it("keeps informational deltas as warnings without thresholds", () => {
    const result = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({ aggregates: { stateTransitions: 150, blockingDecisions: 40 } }),
      thresholds: { stateTransitions: 5 },
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics[0]?.code).toBe("COMPARE_THRESHOLD_INVALID");
    }
    const warning = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({ aggregates: { stateTransitions: 150 } }),
    });
    expect(warning.kind).toBe("ok");
    if (warning.kind === "ok") {
      expect(dispositionOf(warning.report, "stateTransitions")).toBe("within-budget");
      expect(warning.report.regressionCount).toBe(0);
    }
  });

  it("treats one-sided null bounds as not comparable", () => {
    const result = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({
        aggregates: {
          completedRuns: 0,
          scoreBounds: {
            clarity: { minimum: null, maximum: null },
            correctness: { minimum: null, maximum: null },
            reliability: { minimum: null, maximum: null },
          },
        },
      }),
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.report.metrics.every((row) => row.disposition === "not-comparable")).toBe(false);
    expect(dispositionOf(result.report, "clarityMaximum")).toBe("not-comparable");
    expect(dispositionOf(result.report, "completedRuns")).toBe("regression");
  });

  it("rejects cross-ruleset and cross-scope comparisons", () => {
    const foreign = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({ rulesetFingerprint: FINGERPRINT_B }),
    });
    expect(foreign.kind).toBe("failure");
    if (foreign.kind === "failure") {
      expect(foreign.diagnostics[0]?.code).toBe("COMPARE_INCOMPATIBLE");
    }
    const otherSeeds = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({ seedRange: { start: 1, end: 8 }, runs: 24 }),
    });
    expect(otherSeeds.kind).toBe("failure");
    if (otherSeeds.kind === "failure") {
      expect(otherSeeds.diagnostics[0]?.code).toBe("COMPARE_SCOPE_MISMATCH");
    }
  });

  it("rejects invalid thresholds", () => {
    const negative = compareSimulationReportsV1({
      baseline: baseReport({}),
      candidate: baseReport({}),
      thresholds: { softLocks: -1 },
    });
    expect(negative.kind).toBe("failure");
    if (negative.kind === "failure") {
      expect(negative.diagnostics[0]?.code).toBe("COMPARE_THRESHOLD_INVALID");
    }
  });
});
