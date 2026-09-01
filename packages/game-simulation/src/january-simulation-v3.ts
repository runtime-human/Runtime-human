import { JANUARY_1990_RNG_EXECUTION_PROFILES_V1 } from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";

import {
  createJanuary1990Simulation,
  type CreateJanuary1990SimulationInput,
} from "./january-simulation";
import { JANUARY_RNG_EVIDENCE_V2, type JanuaryRngEvidenceV2 } from "./january-rng-evidence-v2";
import type {
  JanuarySimulationTerminalRunV1,
  SimulationAggregatesV1,
  SimulationInvariantFailureV1,
  SimulationPolicyIdV1,
  SimulationRequestV1,
} from "./simulation-types";

export const SIMULATION_REPORT_SCHEMA_VERSION_V3 = "simulation-report-v3" as const;

export type SimulationReportV3 = Readonly<{
  schemaVersion: typeof SIMULATION_REPORT_SCHEMA_VERSION_V3;
  rulesetFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  rngEvidence: JanuaryRngEvidenceV2;
  policies: readonly SimulationPolicyIdV1[];
  seedRange: Readonly<{ start: number; end: number }>;
  runs: number;
  aggregates: SimulationAggregatesV1;
  invariantFailures: readonly SimulationInvariantFailureV1[];
}>;

export type January1990SimulationV3 = Readonly<{
  simulate(request: SimulationRequestV1): SimulationReportV3;
  runOnce(
    input: Readonly<{ seed: number; policyId: SimulationPolicyIdV1 }>,
  ): JanuarySimulationTerminalRunV1;
}>;

export function createJanuary1990SimulationV3(
  input: CreateJanuary1990SimulationInput,
): January1990SimulationV3 {
  const hierarchical = createJanuary1990Simulation({
    ...input,
    rngExecutionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
  });
  return Object.freeze({
    simulate(request) {
      const report = hierarchical.simulate(request);
      return Object.freeze({
        schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V3,
        rulesetFingerprint: report.rulesetFingerprint,
        contentFingerprint: report.contentFingerprint,
        rngEvidence: JANUARY_RNG_EVIDENCE_V2,
        policies: Object.freeze([...report.policies]),
        seedRange: Object.freeze({ ...report.seedRange }),
        runs: report.runs,
        aggregates: report.aggregates,
        invariantFailures: report.invariantFailures,
      });
    },
    runOnce(input_) {
      return hierarchical.runOnce(input_);
    },
  });
}
