import {
  compareSimulationReportsV1,
  parseSimulationReportV1,
  type SimulationCompareMetricIdV1,
  type SimulationCompareResultV1,
} from "./simulation-compare";
import {
  januaryRngEvidenceEqual,
  parseJanuaryRngEvidenceV1,
} from "./january-rng-evidence";
import {
  SIMULATION_REPORT_SCHEMA_VERSION_V2,
  type SimulationReportV2,
} from "./january-simulation-v2";
import {
  SIMULATION_REPORT_SCHEMA_VERSION,
  type SimulationReportV1,
} from "./simulation-types";

export type SimulationReportDiagnosticV2 = Readonly<{ code: "REPORT_INVALID"; message: string }>;

export type SimulationReportParseResultV2 =
  | Readonly<{ kind: "ok"; report: SimulationReportV2 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly SimulationReportDiagnosticV2[] }>;

export function parseSimulationReportV2(value: unknown): SimulationReportParseResultV2 {
  const report = closedRecord(value, [
    "aggregates",
    "contentFingerprint",
    "invariantFailures",
    "policies",
    "rngEvidence",
    "runs",
    "rulesetFingerprint",
    "schemaVersion",
    "seedRange",
  ]);
  if (report === null) {
    return invalid("Simulation report must be a plain object with the closed v2 field set");
  }
  if (report.schemaVersion !== SIMULATION_REPORT_SCHEMA_VERSION_V2) {
    return invalid(
      `Simulation report schemaVersion must be ${SIMULATION_REPORT_SCHEMA_VERSION_V2}`,
    );
  }

  const evidence = parseJanuaryRngEvidenceV1(report.rngEvidence);
  if (evidence.kind !== "ok") {
    return invalid(`Simulation report rngEvidence is invalid: ${evidence.message}`);
  }

  const legacy = parseSimulationReportV1({
    schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION,
    rulesetFingerprint: report.rulesetFingerprint,
    contentFingerprint: report.contentFingerprint,
    policies: report.policies,
    seedRange: report.seedRange,
    runs: report.runs,
    aggregates: report.aggregates,
    invariantFailures: report.invariantFailures,
  });
  if (legacy.kind !== "ok") return legacy;

  return {
    kind: "ok",
    report: Object.freeze({
      schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V2,
      rulesetFingerprint: legacy.report.rulesetFingerprint,
      contentFingerprint: legacy.report.contentFingerprint,
      rngEvidence: evidence.evidence,
      policies: legacy.report.policies,
      seedRange: legacy.report.seedRange,
      runs: legacy.report.runs,
      aggregates: legacy.report.aggregates,
      invariantFailures: legacy.report.invariantFailures,
    }),
  };
}

export function compareSimulationReportsV2(
  input: Readonly<{
    baseline: SimulationReportV2;
    candidate: SimulationReportV2;
    thresholds?: Readonly<Partial<Record<SimulationCompareMetricIdV1, number>>> | undefined;
  }>,
): SimulationCompareResultV1 {
  if (!januaryRngEvidenceEqual(input.baseline.rngEvidence, input.candidate.rngEvidence)) {
    return {
      kind: "failure",
      diagnostics: [
        {
          code: "COMPARE_INCOMPATIBLE",
          message: "Reports carry different January RNG authority/shadow evidence identities",
        },
      ],
    };
  }
  return compareSimulationReportsV1({
    baseline: projectToV1(input.baseline),
    candidate: projectToV1(input.candidate),
    thresholds: input.thresholds,
  });
}

function projectToV1(report: SimulationReportV2): SimulationReportV1 {
  return {
    schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION,
    rulesetFingerprint: report.rulesetFingerprint,
    contentFingerprint: report.contentFingerprint,
    policies: report.policies,
    seedRange: report.seedRange,
    runs: report.runs,
    aggregates: report.aggregates,
    invariantFailures: report.invariantFailures,
  };
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

function invalid(message: string): SimulationReportParseResultV2 {
  return { kind: "invalid", diagnostics: [{ code: "REPORT_INVALID", message }] };
}
