import { describe, expect, it } from "vitest";

import type { Fingerprint } from "@runtime-human/game-schema";
import {
  JANUARY_RNG_EVIDENCE_V2,
  SIMULATION_POLICY_IDS,
  type SimulationReportV4,
} from "@runtime-human/game-simulation";

const FINGERPRINT_A = "a".repeat(64) as Fingerprint;
const FINGERPRINT_B = "b".repeat(64) as Fingerprint;
const FINGERPRINT_C = "c".repeat(64) as Fingerprint;
const FINGERPRINT_D = "d".repeat(64) as Fingerprint;

type DiffRow = Readonly<{
  key: string;
  baseline: number | string | null;
  candidate: number | string | null;
  delta?: number | undefined;
}>;

type SimulationDiffV1Shape = Readonly<{
  schemaVersion: "simulation-diff-v1";
  verdict: "pass" | "pass-with-changes" | "fail";
  hardInvariantChanges: readonly DiffRow[];
  metricChanges: readonly DiffRow[];
  distributionChanges: readonly DiffRow[];
  fingerprintChanges: readonly DiffRow[];
}>;

type SimulationDiffResultV1Shape =
  | Readonly<{ kind: "ok"; diff: SimulationDiffV1Shape }>
  | Readonly<{ kind: "failure"; diagnostics: readonly { code: string; message: string }[] }>;

type SimulationReportV4ParseResultShape =
  | Readonly<{ kind: "ok"; report: SimulationReportV4 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly { code: string; message: string }[] }>;

type StageBModule = Readonly<{
  diffSimulationReportsV1: (
    input: Readonly<{ baseline: unknown; candidate: unknown }>,
  ) => SimulationDiffResultV1Shape;
  parseSimulationReportV4: (value: unknown) => SimulationReportV4ParseResultShape;
}>;

async function loadStageB(): Promise<StageBModule> {
  const module = (await import("@runtime-human/game-simulation")) as Record<string, unknown>;
  expect(typeof module.diffSimulationReportsV1).toBe("function");
  expect(typeof module.parseSimulationReportV4).toBe("function");
  return module as StageBModule;
}

function reportV4(
  overrides: Readonly<{
    rulesetFingerprint?: Fingerprint;
    contentFingerprint?: Fingerprint;
    corpusFingerprint?: Fingerprint;
    corpusId?: string;
    scenarioId?: string;
    programFingerprint?: Fingerprint;
    certificateFingerprint?: Fingerprint;
    completedRuns?: number;
    softLocks?: number;
    terminalFailures?: number;
    invalidStates?: number;
    monthsPlayed?: number;
    blockingDecisions?: number;
    stateTransitions?: number;
    accessRoute?: Readonly<Record<string, number>>;
    invariantFailures?: SimulationReportV4["invariantFailures"];
  }> = {},
): SimulationReportV4 {
  return {
    schemaVersion: "simulation-report-v4",
    rulesetFingerprint: overrides.rulesetFingerprint ?? FINGERPRINT_A,
    contentFingerprint: overrides.contentFingerprint ?? FINGERPRINT_B,
    rngEvidence: JANUARY_RNG_EVIDENCE_V2,
    policies: [...SIMULATION_POLICY_IDS],
    seedRange: { start: 1, end: 1 },
    runs: 3,
    aggregates: {
      completedRuns: overrides.completedRuns ?? 3,
      softLocks: overrides.softLocks ?? 0,
      terminalFailures: overrides.terminalFailures ?? 0,
      invalidStates: overrides.invalidStates ?? 0,
      monthsPlayed: overrides.monthsPlayed ?? 3,
      blockingDecisions: overrides.blockingDecisions ?? 9,
      stateTransitions: overrides.stateTransitions ?? 36,
      scoreBounds: {
        clarity: { minimum: 7, maximum: 10 },
        correctness: { minimum: 7, maximum: 11 },
        reliability: { minimum: 6, maximum: 8 },
      },
      choiceDistribution: {
        accessRoute: overrides.accessRoute ?? { "home-pc": 3 },
        learningPractice: { "read-and-run": 3 },
        defectResponse: { "inspect-listing": 3 },
      },
    },
    invariantFailures: overrides.invariantFailures ?? [],
    corpus: {
      schemaVersion: "simulation-corpus-v1",
      corpusId: overrides.corpusId ?? "january-1990-canonical-v1",
      fingerprint: overrides.corpusFingerprint ?? FINGERPRINT_C,
    },
    scenario: {
      scenarioId: overrides.scenarioId ?? "january-1990.shadow-proof",
      programFingerprint: overrides.programFingerprint ?? FINGERPRINT_A,
      certificateFingerprint: overrides.certificateFingerprint ?? FINGERPRINT_B,
    },
  };
}

function expectOk(result: SimulationDiffResultV1Shape): SimulationDiffV1Shape {
  expect(result.kind).toBe("ok");
  if (result.kind !== "ok") throw new Error("expected simulation diff success");
  return result.diff;
}

describe("ENGINE-03 SimulationDiffV1", () => {
  it("is byte-stable and reports pass for identical canonical reports", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const baseline = reportV4();
    const first = expectOk(diffSimulationReportsV1({ baseline, candidate: reportV4() }));
    const second = expectOk(diffSimulationReportsV1({ baseline, candidate: reportV4() }));

    expect(first).toMatchObject({
      schemaVersion: "simulation-diff-v1",
      verdict: "pass",
      hardInvariantChanges: [],
      metricChanges: [],
      distributionChanges: [],
      fingerprintChanges: [],
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("reports fingerprint changes without rejecting gameplay changes", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const diff = expectOk(
      diffSimulationReportsV1({
        baseline: reportV4(),
        candidate: reportV4({
          rulesetFingerprint: FINGERPRINT_D,
          contentFingerprint: FINGERPRINT_C,
          programFingerprint: FINGERPRINT_D,
          certificateFingerprint: FINGERPRINT_C,
        }),
      }),
    );

    expect(diff.verdict).toBe("pass-with-changes");
    expect(diff.fingerprintChanges.map((row) => row.key)).toEqual([
      "rulesetFingerprint",
      "contentFingerprint",
      "scenario.programFingerprint",
      "scenario.certificateFingerprint",
    ]);
    expect(diff.hardInvariantChanges).toEqual([]);
  });

  it("keeps gameplay and distribution changes informational", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const diff = expectOk(
      diffSimulationReportsV1({
        baseline: reportV4(),
        candidate: reportV4({
          stateTransitions: 39,
          accessRoute: { "borrowed-pc": 1, "home-pc": 2 },
        }),
      }),
    );

    expect(diff.verdict).toBe("pass-with-changes");
    expect(diff.metricChanges).toEqual([
      { key: "stateTransitions", baseline: 36, candidate: 39, delta: 3 },
    ]);
    expect(diff.distributionChanges).toEqual([
      { key: "accessRoute.borrowed-pc", baseline: 0, candidate: 1, delta: 1 },
      { key: "accessRoute.home-pc", baseline: 3, candidate: 2, delta: -1 },
    ]);
    expect(diff.hardInvariantChanges).toEqual([]);
  });

  it("fails on hard invariant violations without gating balance movement", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const diff = expectOk(
      diffSimulationReportsV1({
        baseline: reportV4(),
        candidate: reportV4({ completedRuns: 2, softLocks: 1, stateTransitions: 39 }),
      }),
    );

    expect(diff.verdict).toBe("fail");
    expect(diff.hardInvariantChanges).toEqual([
      { key: "incompleteRuns", baseline: 0, candidate: 1, delta: 1 },
      { key: "softLocks", baseline: 0, candidate: 1, delta: 1 },
    ]);
    expect(diff.metricChanges).toContainEqual({
      key: "stateTransitions",
      baseline: 36,
      candidate: 39,
      delta: 3,
    });
  });

  it("fails closed for incompatible corpus identity", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const result = diffSimulationReportsV1({
      baseline: reportV4(),
      candidate: reportV4({ corpusFingerprint: FINGERPRINT_D }),
    });

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.diagnostics[0]?.code).toBe("DIFF_INCOMPATIBLE");
  });

  it("treats structurally valid foreign RNG authority as incompatible, not malformed", async () => {
    const { diffSimulationReportsV1 } = await loadStageB();
    const baseline = reportV4();
    const foreignRngReport = {
      ...baseline,
      rngEvidence: {
        ...baseline.rngEvidence,
        authority: {
          ...baseline.rngEvidence.authority,
          declaredCallBudget: {
            ...baseline.rngEvidence.authority.declaredCallBudget,
            outcome: baseline.rngEvidence.authority.declaredCallBudget.outcome + 1,
          },
        },
      },
    };

    const result = diffSimulationReportsV1({ baseline: foreignRngReport, candidate: reportV4() });

    expect(result.kind).toBe("failure");
    if (result.kind !== "failure") return;
    expect(result.diagnostics[0]?.code).toBe("DIFF_INCOMPATIBLE");
  });

  it("validates the closed v4 report boundary before comparison", async () => {
    const { parseSimulationReportV4 } = await loadStageB();
    expect(parseSimulationReportV4(reportV4()).kind).toBe("ok");
    expect(parseSimulationReportV4({ ...reportV4(), extra: true }).kind).toBe("invalid");
    expect(
      parseSimulationReportV4({
        ...reportV4(),
        corpus: { ...reportV4().corpus, fingerprint: "not-a-fingerprint" },
      }).kind,
    ).toBe("invalid");
  });
});
