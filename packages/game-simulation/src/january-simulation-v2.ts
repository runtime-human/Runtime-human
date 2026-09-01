import type { Fingerprint } from "@runtime-human/game-schema";

import {
  createJanuary1990Simulation,
  type CreateJanuary1990SimulationInput,
} from "./january-simulation";
import { JANUARY_RNG_EVIDENCE_V1, type JanuaryRngEvidenceV1 } from "./january-rng-evidence";
import type {
  JanuarySimulationTerminalRunV1,
  SimulationAggregatesV1,
  SimulationInvariantFailureV1,
  SimulationPolicyIdV1,
  SimulationRequestV1,
} from "./simulation-types";

export const SIMULATION_REPORT_SCHEMA_VERSION_V2 = "simulation-report-v2" as const;

export type SimulationReportV2 = Readonly<{
  schemaVersion: typeof SIMULATION_REPORT_SCHEMA_VERSION_V2;
  rulesetFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  rngEvidence: JanuaryRngEvidenceV1;
  policies: readonly SimulationPolicyIdV1[];
  seedRange: Readonly<{ start: number; end: number }>;
  runs: number;
  aggregates: SimulationAggregatesV1;
  invariantFailures: readonly SimulationInvariantFailureV1[];
}>;

export type January1990SimulationV2 = Readonly<{
  simulate(request: SimulationRequestV1): SimulationReportV2;
  runOnce(
    input: Readonly<{ seed: number; policyId: SimulationPolicyIdV1 }>,
  ): JanuarySimulationTerminalRunV1;
}>;

export function createJanuary1990SimulationV2(
  input: CreateJanuary1990SimulationInput,
): January1990SimulationV2 {
  const legacy = createJanuary1990Simulation(input);
  return Object.freeze({
    simulate(request) {
      const report = legacy.simulate(request);
      return Object.freeze({
        schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V2,
        rulesetFingerprint: report.rulesetFingerprint,
        contentFingerprint: report.contentFingerprint,
        rngEvidence: JANUARY_RNG_EVIDENCE_V1,
        policies: Object.freeze([...report.policies]),
        seedRange: Object.freeze({ ...report.seedRange }),
        runs: report.runs,
        aggregates: report.aggregates,
        invariantFailures: report.invariantFailures,
      });
    },
    runOnce(input_) {
      return legacy.runOnce(input_);
    },
  });
}
