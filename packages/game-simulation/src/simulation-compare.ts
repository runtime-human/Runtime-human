import type { Fingerprint } from "@runtime-human/game-schema";

import {
  SIMULATION_POLICY_IDS,
  SIMULATION_REPORT_SCHEMA_VERSION,
  type SimulationInvariantFailureV1,
  type SimulationPolicyIdV1,
  type SimulationReportV1,
} from "./simulation-types";

export const SIMULATION_COMPARE_SCHEMA_VERSION = "simulation-compare-v1" as const;

export type SimulationCompareMetricIdV1 =
  | "completedRuns"
  | "softLocks"
  | "terminalFailures"
  | "invalidStates"
  | "monthsPlayed"
  | "blockingDecisions"
  | "stateTransitions"
  | "clarityMinimum"
  | "clarityMaximum"
  | "correctnessMinimum"
  | "correctnessMaximum"
  | "reliabilityMinimum"
  | "reliabilityMaximum";

export const SIMULATION_COMPARE_METRIC_IDS: readonly SimulationCompareMetricIdV1[] = [
  "completedRuns",
  "softLocks",
  "terminalFailures",
  "invalidStates",
  "monthsPlayed",
  "blockingDecisions",
  "stateTransitions",
  "clarityMinimum",
  "clarityMaximum",
  "correctnessMinimum",
  "correctnessMaximum",
  "reliabilityMinimum",
  "reliabilityMaximum",
];

export type SimulationCompareDispositionV1 =
  | "unchanged"
  | "improved"
  | "within-budget"
  | "regression"
  | "not-comparable";

export type SimulationCompareMetricRowV1 = Readonly<{
  metric: SimulationCompareMetricIdV1;
  baseline: number | null;
  candidate: number | null;
  delta: number | null;
  threshold: number | null;
  disposition: SimulationCompareDispositionV1;
}>;

export type SimulationCompareReportV1 = Readonly<{
  schemaVersion: typeof SIMULATION_COMPARE_SCHEMA_VERSION;
  rulesetFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  policies: readonly SimulationPolicyIdV1[];
  seedRange: Readonly<{ start: number; end: number }>;
  metrics: readonly SimulationCompareMetricRowV1[];
  regressionCount: number;
}>;

export type SimulationCompareFailureV1 = Readonly<{
  code: "COMPARE_INCOMPATIBLE" | "COMPARE_SCOPE_MISMATCH" | "COMPARE_THRESHOLD_INVALID";
  message: string;
}>;

export type SimulationCompareResultV1 =
  | Readonly<{ kind: "ok"; report: SimulationCompareReportV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly SimulationCompareFailureV1[] }>;

export type SimulationReportDiagnosticV1 = Readonly<{ code: "REPORT_INVALID"; message: string }>;

export type SimulationReportParseResultV1 =
  | Readonly<{ kind: "ok"; report: SimulationReportV1 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly SimulationReportDiagnosticV1[] }>;

type AdverseDirectionV1 = "higher-is-better" | "lower-is-better" | "informational";

type MetricSourceV1 =
  | Readonly<{ table: "counters"; counter: SimulationCountersV1 }>
  | Readonly<{
      table: "bounds";
      dimension: "clarity" | "correctness" | "reliability";
      bound: "minimum" | "maximum";
    }>;

type SimulationCountersV1 =
  | "completedRuns"
  | "softLocks"
  | "terminalFailures"
  | "invalidStates"
  | "monthsPlayed"
  | "blockingDecisions"
  | "stateTransitions";

const METRIC_SOURCES: Readonly<Record<SimulationCompareMetricIdV1, MetricSourceV1>> = Object.freeze(
  {
    completedRuns: Object.freeze({ table: "counters", counter: "completedRuns" }),
    softLocks: Object.freeze({ table: "counters", counter: "softLocks" }),
    terminalFailures: Object.freeze({ table: "counters", counter: "terminalFailures" }),
    invalidStates: Object.freeze({ table: "counters", counter: "invalidStates" }),
    monthsPlayed: Object.freeze({ table: "counters", counter: "monthsPlayed" }),
    blockingDecisions: Object.freeze({ table: "counters", counter: "blockingDecisions" }),
    stateTransitions: Object.freeze({ table: "counters", counter: "stateTransitions" }),
    clarityMinimum: Object.freeze({ table: "bounds", dimension: "clarity", bound: "minimum" }),
    clarityMaximum: Object.freeze({ table: "bounds", dimension: "clarity", bound: "maximum" }),
    correctnessMinimum: Object.freeze({
      table: "bounds",
      dimension: "correctness",
      bound: "minimum",
    }),
    correctnessMaximum: Object.freeze({
      table: "bounds",
      dimension: "correctness",
      bound: "maximum",
    }),
    reliabilityMinimum: Object.freeze({
      table: "bounds",
      dimension: "reliability",
      bound: "minimum",
    }),
    reliabilityMaximum: Object.freeze({
      table: "bounds",
      dimension: "reliability",
      bound: "maximum",
    }),
  },
);

const ADVERSE_DIRECTION: Readonly<Record<SimulationCompareMetricIdV1, AdverseDirectionV1>> =
  Object.freeze({
    completedRuns: "higher-is-better",
    monthsPlayed: "higher-is-better",
    softLocks: "lower-is-better",
    terminalFailures: "lower-is-better",
    invalidStates: "lower-is-better",
    blockingDecisions: "informational",
    stateTransitions: "informational",
    clarityMinimum: "informational",
    clarityMaximum: "informational",
    correctnessMinimum: "informational",
    correctnessMaximum: "informational",
    reliabilityMinimum: "informational",
    reliabilityMaximum: "informational",
  });

export function parseSimulationReportV1(value: unknown): SimulationReportParseResultV1 {
  const report = closedRecord(value, [
    "aggregates",
    "contentFingerprint",
    "invariantFailures",
    "policies",
    "runs",
    "rulesetFingerprint",
    "schemaVersion",
    "seedRange",
  ]);
  if (report === null) {
    return invalidReport("Simulation report must be a plain object with the closed v1 field set");
  }
  if (report.schemaVersion !== SIMULATION_REPORT_SCHEMA_VERSION) {
    return invalidReport(
      `Simulation report schemaVersion must be ${SIMULATION_REPORT_SCHEMA_VERSION}`,
    );
  }
  if (!isFingerprint(report.rulesetFingerprint) || !isFingerprint(report.contentFingerprint)) {
    return invalidReport("Simulation report fingerprints must be 64-hex strings");
  }
  const policies = parsePolicies(report.policies);
  if (policies === null) {
    return invalidReport(
      `Simulation report policies must be a non-empty list of ${SIMULATION_POLICY_IDS.join(", ")}`,
    );
  }
  const seedRange = parseSeedRange(report.seedRange);
  if (seedRange === null) {
    return invalidReport("Simulation report seedRange must be { start, end } safe integers");
  }
  if (!isNonNegativeSafeInteger(report.runs)) {
    return invalidReport("Simulation report runs must be a non-negative safe integer");
  }
  if (!Array.isArray(report.invariantFailures)) {
    return invalidReport("Simulation report invariantFailures must be an array");
  }
  const invariantFailures: SimulationInvariantFailureV1[] = [];
  for (const candidate of report.invariantFailures) {
    const parsed = parseInvariantFailure(candidate);
    if (parsed === null) {
      return invalidReport("Simulation report invariant failure does not match the closed shape");
    }
    invariantFailures.push(parsed);
  }
  const aggregates = parseAggregates(report.aggregates);
  if (aggregates === null) {
    return invalidReport("Simulation report aggregates do not match the closed v1 shape");
  }
  return {
    kind: "ok",
    report: Object.freeze({
      schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION,
      rulesetFingerprint: report.rulesetFingerprint,
      contentFingerprint: report.contentFingerprint,
      policies,
      seedRange,
      runs: report.runs,
      aggregates,
      invariantFailures: Object.freeze(invariantFailures),
    }),
  };
}

export function compareSimulationReportsV1(
  input: Readonly<{
    baseline: SimulationReportV1;
    candidate: SimulationReportV1;
    thresholds?: Readonly<Partial<Record<SimulationCompareMetricIdV1, number>>> | undefined;
  }>,
): SimulationCompareResultV1 {
  const scopeFailure = requireComparableScope(input.baseline, input.candidate);
  if (scopeFailure !== null) return { kind: "failure", diagnostics: [scopeFailure] };

  const thresholds = input.thresholds ?? {};
  for (const metricId of SIMULATION_COMPARE_METRIC_IDS) {
    const override = thresholds[metricId];
    if (override === undefined) continue;
    if (!isNonNegativeSafeInteger(override)) {
      return failure(
        "COMPARE_THRESHOLD_INVALID",
        `Threshold for ${metricId} must be a non-negative safe integer`,
      );
    }
    if (ADVERSE_DIRECTION[metricId] === "informational") {
      return failure(
        "COMPARE_THRESHOLD_INVALID",
        `Metric ${metricId} is informational and has no acceptance threshold`,
      );
    }
  }

  const rows = SIMULATION_COMPARE_METRIC_IDS.map((metricId) =>
    compareMetric(metricId, input.baseline, input.candidate, thresholds[metricId]),
  );
  const regressionCount = rows.filter((row) => row.disposition === "regression").length;
  return {
    kind: "ok",
    report: Object.freeze({
      schemaVersion: SIMULATION_COMPARE_SCHEMA_VERSION,
      rulesetFingerprint: input.candidate.rulesetFingerprint,
      contentFingerprint: input.candidate.contentFingerprint,
      policies: [...input.candidate.policies],
      seedRange: { ...input.candidate.seedRange },
      metrics: Object.freeze(rows),
      regressionCount,
    }),
  };
}

function compareMetric(
  metricId: SimulationCompareMetricIdV1,
  baseline: SimulationReportV1,
  candidate: SimulationReportV1,
  thresholdOverride: number | undefined,
): SimulationCompareMetricRowV1 {
  const source = METRIC_SOURCES[metricId];
  const direction = ADVERSE_DIRECTION[metricId];
  const baselineValue = readMetricValue(baseline, source);
  const candidateValue = readMetricValue(candidate, source);
  if (baselineValue === null || candidateValue === null) {
    return Object.freeze({
      metric: metricId,
      baseline: baselineValue,
      candidate: candidateValue,
      delta: null,
      threshold: null,
      disposition: "not-comparable",
    });
  }
  const delta = candidateValue - baselineValue;
  if (direction === "informational") {
    return Object.freeze({
      metric: metricId,
      baseline: baselineValue,
      candidate: candidateValue,
      delta,
      threshold: null,
      disposition: delta === 0 ? "unchanged" : "within-budget",
    });
  }
  const threshold = thresholdOverride ?? 0;
  const adverse = direction === "lower-is-better" ? delta > 0 : delta < 0;
  if (!adverse) {
    return Object.freeze({
      metric: metricId,
      baseline: baselineValue,
      candidate: candidateValue,
      delta,
      threshold,
      disposition: delta === 0 ? "unchanged" : "improved",
    });
  }
  return Object.freeze({
    metric: metricId,
    baseline: baselineValue,
    candidate: candidateValue,
    delta,
    threshold,
    disposition: Math.abs(delta) > threshold ? "regression" : "within-budget",
  });
}

function readMetricValue(report: SimulationReportV1, source: MetricSourceV1): number | null {
  if (source.table === "counters") {
    return report.aggregates[source.counter];
  }
  return report.aggregates.scoreBounds[source.dimension][source.bound];
}

function requireComparableScope(
  baseline: SimulationReportV1,
  candidate: SimulationReportV1,
): SimulationCompareFailureV1 | null {
  if (
    baseline.rulesetFingerprint !== candidate.rulesetFingerprint ||
    baseline.contentFingerprint !== candidate.contentFingerprint
  ) {
    return {
      code: "COMPARE_INCOMPATIBLE",
      message: `Reports target different rulesets (baseline ${baseline.rulesetFingerprint}, candidate ${candidate.rulesetFingerprint})`,
    };
  }
  if (
    baseline.seedRange.start !== candidate.seedRange.start ||
    baseline.seedRange.end !== candidate.seedRange.end ||
    baseline.runs !== candidate.runs ||
    baseline.policies.length !== candidate.policies.length ||
    baseline.policies.some((policy, index) => policy !== candidate.policies[index])
  ) {
    return {
      code: "COMPARE_SCOPE_MISMATCH",
      message: "Reports cover different seeds, policies or run counts and cannot be compared",
    };
  }
  return null;
}

function parseAggregates(value: unknown): SimulationReportV1["aggregates"] | null {
  const record = closedRecord(value, [
    "blockingDecisions",
    "choiceDistribution",
    "completedRuns",
    "invalidStates",
    "monthsPlayed",
    "scoreBounds",
    "softLocks",
    "stateTransitions",
    "terminalFailures",
  ]);
  if (record === null) return null;
  for (const key of [
    "completedRuns",
    "softLocks",
    "terminalFailures",
    "invalidStates",
    "monthsPlayed",
    "blockingDecisions",
    "stateTransitions",
  ] as const) {
    if (!isNonNegativeSafeInteger(record[key])) return null;
  }
  const scoreBounds = parseScoreBounds(record.scoreBounds);
  if (scoreBounds === null) return null;
  const choiceDistribution = parseChoiceDistribution(record.choiceDistribution);
  if (choiceDistribution === null) return null;
  return Object.freeze({
    completedRuns: record.completedRuns as number,
    softLocks: record.softLocks as number,
    terminalFailures: record.terminalFailures as number,
    invalidStates: record.invalidStates as number,
    monthsPlayed: record.monthsPlayed as number,
    blockingDecisions: record.blockingDecisions as number,
    stateTransitions: record.stateTransitions as number,
    scoreBounds,
    choiceDistribution,
  });
}

function parseScoreBounds(value: unknown): SimulationReportV1["aggregates"]["scoreBounds"] | null {
  const record = closedRecord(value, ["clarity", "correctness", "reliability"]);
  if (record === null) return null;
  const clarity = parseBoundPair(record.clarity);
  const correctness = parseBoundPair(record.correctness);
  const reliability = parseBoundPair(record.reliability);
  if (clarity === null || correctness === null || reliability === null) return null;
  return Object.freeze({ clarity, correctness, reliability });
}

function parseBoundPair(
  value: unknown,
): Readonly<{ minimum: number | null; maximum: number | null }> | null {
  const record = closedRecord(value, ["maximum", "minimum"]);
  if (record === null) return null;
  const minimum = record.minimum;
  const maximum = record.maximum;
  if (!isSafeIntegerOrNull(minimum) || !isSafeIntegerOrNull(maximum)) return null;
  if (minimum !== null && maximum !== null && minimum > maximum) return null;
  if ((minimum === null) !== (maximum === null)) return null;
  return Object.freeze({ minimum, maximum });
}

function parseChoiceDistribution(
  value: unknown,
): SimulationReportV1["aggregates"]["choiceDistribution"] | null {
  const record = closedRecord(value, ["accessRoute", "defectResponse", "learningPractice"]);
  if (record === null) return null;
  for (const key of ["accessRoute", "learningPractice", "defectResponse"] as const) {
    const table = record[key];
    if (
      typeof table !== "object" ||
      table === null ||
      Array.isArray(table) ||
      Object.getPrototypeOf(table) !== Object.prototype
    ) {
      return null;
    }
    for (const count of Object.values(table as Record<string, unknown>)) {
      if (!isNonNegativeSafeInteger(count)) return null;
    }
  }
  return Object.freeze({
    accessRoute: Object.freeze({ ...(record.accessRoute as Record<string, number>) }),
    learningPractice: Object.freeze({ ...(record.learningPractice as Record<string, number>) }),
    defectResponse: Object.freeze({ ...(record.defectResponse as Record<string, number>) }),
  });
}

function parseInvariantFailure(value: unknown): SimulationInvariantFailureV1 | null {
  const record = closedRecord(value, ["detail", "invariant", "policyId", "seed"]);
  if (record === null) return null;
  if (
    record.invariant !== "no-soft-lock" &&
    record.invariant !== "score-bounds" &&
    record.invariant !== "terminal-validity"
  ) {
    return null;
  }
  if (
    typeof record.seed !== "string" ||
    typeof record.policyId !== "string" ||
    typeof record.detail !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    invariant: record.invariant,
    seed: record.seed,
    policyId: record.policyId,
    detail: record.detail,
  });
}

function parsePolicies(value: unknown): readonly SimulationPolicyIdV1[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const policies: SimulationPolicyIdV1[] = [];
  for (const policy of value) {
    if (!SIMULATION_POLICY_IDS.some((candidate) => candidate === policy)) return null;
    policies.push(policy as SimulationPolicyIdV1);
  }
  return policies;
}

function parseSeedRange(value: unknown): Readonly<{ start: number; end: number }> | null {
  const record = closedRecord(value, ["end", "start"]);
  if (record === null) return null;
  if (!isNonNegativeSafeInteger(record.start) || !isNonNegativeSafeInteger(record.end)) return null;
  if (record.start > record.end) return null;
  return Object.freeze({ start: record.start, end: record.end });
}

function closedRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return null;
  }
  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record).toSorted();
  const approvedKeys = [...expectedKeys].toSorted();
  if (
    actualKeys.length !== approvedKeys.length ||
    !actualKeys.every((key, index) => key === approvedKeys[index])
  ) {
    return null;
  }
  return record;
}

function isFingerprint(value: unknown): value is Fingerprint {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSafeIntegerOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value));
}

function invalidReport(message: string): {
  kind: "invalid";
  diagnostics: readonly SimulationReportDiagnosticV1[];
} {
  return { kind: "invalid", diagnostics: [{ code: "REPORT_INVALID", message }] };
}

function failure(
  code: SimulationCompareFailureV1["code"],
  message: string,
): { kind: "failure"; diagnostics: readonly SimulationCompareFailureV1[] } {
  return { kind: "failure", diagnostics: [{ code, message }] };
}
