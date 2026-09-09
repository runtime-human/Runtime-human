import type { Fingerprint } from "@runtime-human/game-schema";

import {
  SIMULATION_REPORT_SCHEMA_VERSION_V4,
  type SimulationReportV4,
} from "./january-simulation-v4";
import {
  januaryRngEvidenceV2Equal,
  parseJanuaryRngEvidenceV2Structural,
} from "./january-rng-evidence-v2";
import { SIMULATION_CORPUS_SCHEMA_VERSION } from "./simulation-corpus";
import { parseSimulationReportV1 } from "./simulation-compare";

export const SIMULATION_DIFF_SCHEMA_VERSION = "simulation-diff-v1" as const;

export type SimulationDiffVerdictV1 = "pass" | "pass-with-changes" | "fail";

export type SimulationDiffNumericRowV1 = Readonly<{
  key: string;
  baseline: number | null;
  candidate: number | null;
  delta: number | null;
}>;

export type SimulationDiffFingerprintRowV1 = Readonly<{
  key:
    | "rulesetFingerprint"
    | "contentFingerprint"
    | "scenario.programFingerprint"
    | "scenario.certificateFingerprint";
  baseline: Fingerprint;
  candidate: Fingerprint;
}>;

export type SimulationDiffIdentityV1 = Readonly<{
  reportSchemaVersion: typeof SIMULATION_REPORT_SCHEMA_VERSION_V4;
  rulesetFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  corpus: SimulationReportV4["corpus"];
  scenario: SimulationReportV4["scenario"];
}>;

export type SimulationDiffV1 = Readonly<{
  schemaVersion: typeof SIMULATION_DIFF_SCHEMA_VERSION;
  baseline: SimulationDiffIdentityV1;
  candidate: SimulationDiffIdentityV1;
  hardInvariantChanges: readonly SimulationDiffNumericRowV1[];
  metricChanges: readonly SimulationDiffNumericRowV1[];
  distributionChanges: readonly SimulationDiffNumericRowV1[];
  fingerprintChanges: readonly SimulationDiffFingerprintRowV1[];
  verdict: SimulationDiffVerdictV1;
}>;

export type SimulationDiffFailureV1 = Readonly<{
  code: "DIFF_REPORT_INVALID" | "DIFF_INCOMPATIBLE" | "DIFF_SCOPE_MISMATCH";
  message: string;
}>;

export type SimulationDiffResultV1 =
  | Readonly<{ kind: "ok"; diff: SimulationDiffV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly SimulationDiffFailureV1[] }>;

export type SimulationReportDiagnosticV4 = Readonly<{
  code: "REPORT_V4_INVALID";
  message: string;
}>;

export type SimulationReportParseResultV4 =
  | Readonly<{ kind: "ok"; report: SimulationReportV4 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly SimulationReportDiagnosticV4[] }>;

type AggregateMetricKeyV1 =
  | "monthsPlayed"
  | "blockingDecisions"
  | "stateTransitions"
  | "clarityMinimum"
  | "clarityMaximum"
  | "correctnessMinimum"
  | "correctnessMaximum"
  | "reliabilityMinimum"
  | "reliabilityMaximum";

type DistributionDimensionV1 = "accessRoute" | "learningPractice" | "defectResponse";

const AGGREGATE_METRIC_KEYS: readonly AggregateMetricKeyV1[] = Object.freeze([
  "monthsPlayed",
  "blockingDecisions",
  "stateTransitions",
  "clarityMinimum",
  "clarityMaximum",
  "correctnessMinimum",
  "correctnessMaximum",
  "reliabilityMinimum",
  "reliabilityMaximum",
]);

const DISTRIBUTION_DIMENSIONS: readonly DistributionDimensionV1[] = Object.freeze([
  "accessRoute",
  "learningPractice",
  "defectResponse",
]);

export function parseSimulationReportV4(value: unknown): SimulationReportParseResultV4 {
  const report = closedRecord(value, [
    "aggregates",
    "contentFingerprint",
    "corpus",
    "invariantFailures",
    "policies",
    "rngEvidence",
    "rulesetFingerprint",
    "runs",
    "scenario",
    "schemaVersion",
    "seedRange",
  ]);
  if (report === null) {
    return invalidReportV4("Simulation report must be a plain object with the closed v4 field set");
  }
  if (report.schemaVersion !== SIMULATION_REPORT_SCHEMA_VERSION_V4) {
    return invalidReportV4(
      `Simulation report schemaVersion must be ${SIMULATION_REPORT_SCHEMA_VERSION_V4}`,
    );
  }

  const core = parseSimulationReportV1({
    schemaVersion: "simulation-report-v1",
    rulesetFingerprint: report.rulesetFingerprint,
    contentFingerprint: report.contentFingerprint,
    policies: report.policies,
    seedRange: report.seedRange,
    runs: report.runs,
    aggregates: report.aggregates,
    invariantFailures: report.invariantFailures,
  });
  if (core.kind !== "ok") {
    return invalidReportV4(core.diagnostics[0]?.message ?? "Simulation report v4 core is invalid");
  }
  if (core.report.aggregates.completedRuns > core.report.runs) {
    return invalidReportV4("Simulation report completedRuns cannot exceed runs");
  }

  const rngEvidence = parseJanuaryRngEvidenceV2Structural(report.rngEvidence);
  if (rngEvidence.kind !== "ok") return invalidReportV4(rngEvidence.message);

  const corpus = parseCorpusIdentity(report.corpus);
  if (corpus === null) return invalidReportV4("Simulation report corpus identity is invalid");

  const scenario = parseScenarioIdentity(report.scenario);
  if (scenario === null) return invalidReportV4("Simulation report scenario identity is invalid");

  return {
    kind: "ok",
    report: Object.freeze({
      schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V4,
      rulesetFingerprint: core.report.rulesetFingerprint,
      contentFingerprint: core.report.contentFingerprint,
      rngEvidence: rngEvidence.evidence,
      policies: core.report.policies,
      seedRange: core.report.seedRange,
      runs: core.report.runs,
      aggregates: core.report.aggregates,
      invariantFailures: core.report.invariantFailures,
      corpus,
      scenario,
    }),
  };
}

export function diffSimulationReportsV1(
  input: Readonly<{ baseline: unknown; candidate: unknown }>,
): SimulationDiffResultV1 {
  const baseline = parseSimulationReportV4(input.baseline);
  if (baseline.kind !== "ok") {
    return diffFailure(
      "DIFF_REPORT_INVALID",
      `Baseline simulation report is invalid: ${baseline.diagnostics[0]?.message ?? "unknown error"}`,
    );
  }
  const candidate = parseSimulationReportV4(input.candidate);
  if (candidate.kind !== "ok") {
    return diffFailure(
      "DIFF_REPORT_INVALID",
      `Candidate simulation report is invalid: ${candidate.diagnostics[0]?.message ?? "unknown error"}`,
    );
  }

  const compatibilityFailure = requireCompatibleIdentity(baseline.report, candidate.report);
  if (compatibilityFailure !== null) {
    return { kind: "failure", diagnostics: [compatibilityFailure] };
  }

  const scopeFailure = requireComparableScope(baseline.report, candidate.report);
  if (scopeFailure !== null) return { kind: "failure", diagnostics: [scopeFailure] };

  const hardInvariantChanges = compareHardInvariants(baseline.report, candidate.report);
  const metricChanges = compareMetrics(baseline.report, candidate.report);
  const distributionChanges = compareDistributions(baseline.report, candidate.report);
  const fingerprintChanges = compareFingerprints(baseline.report, candidate.report);

  const candidateHasHardFailure = hardInvariantValues(candidate.report).some(
    (row) => row.value > 0,
  );
  const hasAnyChanges =
    hardInvariantChanges.length > 0 ||
    metricChanges.length > 0 ||
    distributionChanges.length > 0 ||
    fingerprintChanges.length > 0;
  const verdict: SimulationDiffVerdictV1 = candidateHasHardFailure
    ? "fail"
    : hasAnyChanges
      ? "pass-with-changes"
      : "pass";

  return {
    kind: "ok",
    diff: Object.freeze({
      schemaVersion: SIMULATION_DIFF_SCHEMA_VERSION,
      baseline: projectIdentity(baseline.report),
      candidate: projectIdentity(candidate.report),
      hardInvariantChanges,
      metricChanges,
      distributionChanges,
      fingerprintChanges,
      verdict,
    }),
  };
}

function compareHardInvariants(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): readonly SimulationDiffNumericRowV1[] {
  const baselineRows = hardInvariantValues(baseline);
  const candidateRows = hardInvariantValues(candidate);
  return Object.freeze(
    baselineRows.flatMap((baselineRow, index) => {
      const candidateRow = candidateRows[index]!;
      if (baselineRow.value === 0 && candidateRow.value === 0) return [];
      return [numericRow(baselineRow.key, baselineRow.value, candidateRow.value)];
    }),
  );
}

function hardInvariantValues(
  report: SimulationReportV4,
): readonly Readonly<{ key: string; value: number }>[] {
  return [
    { key: "incompleteRuns", value: report.runs - report.aggregates.completedRuns },
    { key: "softLocks", value: report.aggregates.softLocks },
    { key: "terminalFailures", value: report.aggregates.terminalFailures },
    { key: "invalidStates", value: report.aggregates.invalidStates },
    { key: "invariantFailures", value: report.invariantFailures.length },
  ];
}

function compareMetrics(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): readonly SimulationDiffNumericRowV1[] {
  return Object.freeze(
    AGGREGATE_METRIC_KEYS.flatMap((key) => {
      const baselineValue = readAggregateMetric(baseline, key);
      const candidateValue = readAggregateMetric(candidate, key);
      if (baselineValue === candidateValue) return [];
      return [numericRow(key, baselineValue, candidateValue)];
    }),
  );
}

function readAggregateMetric(report: SimulationReportV4, key: AggregateMetricKeyV1): number | null {
  switch (key) {
    case "monthsPlayed":
    case "blockingDecisions":
    case "stateTransitions":
      return report.aggregates[key];
    case "clarityMinimum":
      return report.aggregates.scoreBounds.clarity.minimum;
    case "clarityMaximum":
      return report.aggregates.scoreBounds.clarity.maximum;
    case "correctnessMinimum":
      return report.aggregates.scoreBounds.correctness.minimum;
    case "correctnessMaximum":
      return report.aggregates.scoreBounds.correctness.maximum;
    case "reliabilityMinimum":
      return report.aggregates.scoreBounds.reliability.minimum;
    case "reliabilityMaximum":
      return report.aggregates.scoreBounds.reliability.maximum;
  }
}

function compareDistributions(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): readonly SimulationDiffNumericRowV1[] {
  const rows: SimulationDiffNumericRowV1[] = [];
  for (const dimension of DISTRIBUTION_DIMENSIONS) {
    const baselineDistribution = baseline.aggregates.choiceDistribution[dimension];
    const candidateDistribution = candidate.aggregates.choiceDistribution[dimension];
    const keys = [
      ...new Set([...Object.keys(baselineDistribution), ...Object.keys(candidateDistribution)]),
    ].toSorted();
    for (const key of keys) {
      const baselineValue = baselineDistribution[key] ?? 0;
      const candidateValue = candidateDistribution[key] ?? 0;
      if (baselineValue === candidateValue) continue;
      rows.push(numericRow(`${dimension}.${key}`, baselineValue, candidateValue));
    }
  }
  return Object.freeze(rows);
}

function compareFingerprints(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): readonly SimulationDiffFingerprintRowV1[] {
  const rows: SimulationDiffFingerprintRowV1[] = [];
  pushFingerprintChange(
    rows,
    "rulesetFingerprint",
    baseline.rulesetFingerprint,
    candidate.rulesetFingerprint,
  );
  pushFingerprintChange(
    rows,
    "contentFingerprint",
    baseline.contentFingerprint,
    candidate.contentFingerprint,
  );
  pushFingerprintChange(
    rows,
    "scenario.programFingerprint",
    baseline.scenario.programFingerprint,
    candidate.scenario.programFingerprint,
  );
  pushFingerprintChange(
    rows,
    "scenario.certificateFingerprint",
    baseline.scenario.certificateFingerprint,
    candidate.scenario.certificateFingerprint,
  );
  return Object.freeze(rows);
}

function pushFingerprintChange(
  rows: SimulationDiffFingerprintRowV1[],
  key: SimulationDiffFingerprintRowV1["key"],
  baseline: Fingerprint,
  candidate: Fingerprint,
): void {
  if (baseline === candidate) return;
  rows.push(Object.freeze({ key, baseline, candidate }));
}

function numericRow(
  key: string,
  baseline: number | null,
  candidate: number | null,
): SimulationDiffNumericRowV1 {
  return Object.freeze({
    key,
    baseline,
    candidate,
    delta: baseline === null || candidate === null ? null : candidate - baseline,
  });
}

function requireCompatibleIdentity(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): SimulationDiffFailureV1 | null {
  if (
    baseline.corpus.schemaVersion !== candidate.corpus.schemaVersion ||
    baseline.corpus.corpusId !== candidate.corpus.corpusId ||
    baseline.corpus.fingerprint !== candidate.corpus.fingerprint ||
    baseline.scenario.scenarioId !== candidate.scenario.scenarioId ||
    !januaryRngEvidenceV2Equal(baseline.rngEvidence, candidate.rngEvidence)
  ) {
    return {
      code: "DIFF_INCOMPATIBLE",
      message: "Simulation reports target incompatible corpus, scenario or RNG identities",
    };
  }
  return null;
}

function requireComparableScope(
  baseline: SimulationReportV4,
  candidate: SimulationReportV4,
): SimulationDiffFailureV1 | null {
  if (
    baseline.seedRange.start !== candidate.seedRange.start ||
    baseline.seedRange.end !== candidate.seedRange.end ||
    baseline.runs !== candidate.runs ||
    baseline.policies.length !== candidate.policies.length ||
    baseline.policies.some((policy, index) => policy !== candidate.policies[index])
  ) {
    return {
      code: "DIFF_SCOPE_MISMATCH",
      message: "Simulation reports cover different seeds, policies or run counts",
    };
  }
  return null;
}

function projectIdentity(report: SimulationReportV4): SimulationDiffIdentityV1 {
  return Object.freeze({
    reportSchemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V4,
    rulesetFingerprint: report.rulesetFingerprint,
    contentFingerprint: report.contentFingerprint,
    corpus: report.corpus,
    scenario: report.scenario,
  });
}

function parseCorpusIdentity(value: unknown): SimulationReportV4["corpus"] | null {
  const record = closedRecord(value, ["corpusId", "fingerprint", "schemaVersion"]);
  if (
    record === null ||
    record.schemaVersion !== SIMULATION_CORPUS_SCHEMA_VERSION ||
    !isStableId(record.corpusId) ||
    !isFingerprint(record.fingerprint)
  ) {
    return null;
  }
  return Object.freeze({
    schemaVersion: SIMULATION_CORPUS_SCHEMA_VERSION,
    corpusId: record.corpusId,
    fingerprint: record.fingerprint,
  });
}

function parseScenarioIdentity(value: unknown): SimulationReportV4["scenario"] | null {
  const record = closedRecord(value, [
    "certificateFingerprint",
    "programFingerprint",
    "scenarioId",
  ]);
  if (
    record === null ||
    !isStableId(record.scenarioId) ||
    !isFingerprint(record.programFingerprint) ||
    !isFingerprint(record.certificateFingerprint)
  ) {
    return null;
  }
  return Object.freeze({
    scenarioId: record.scenarioId,
    programFingerprint: record.programFingerprint,
    certificateFingerprint: record.certificateFingerprint,
  });
}

function invalidReportV4(message: string): SimulationReportParseResultV4 {
  return { kind: "invalid", diagnostics: [{ code: "REPORT_V4_INVALID", message }] };
}

function diffFailure(
  code: SimulationDiffFailureV1["code"],
  message: string,
): SimulationDiffResultV1 {
  return { kind: "failure", diagnostics: [{ code, message }] };
}

function closedRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isPlainRecord(value)) return null;
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key))) {
    return null;
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isStableId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value)
  );
}

function isFingerprint(value: unknown): value is Fingerprint {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}
