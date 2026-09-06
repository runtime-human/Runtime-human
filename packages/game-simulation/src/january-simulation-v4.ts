import { parseFingerprint, type Fingerprint } from "@runtime-human/game-schema";

import {
  createJanuary1990SimulationV3,
  type SimulationReportV3,
} from "./january-simulation-v3";
import type {
  CreateJanuary1990SimulationInput,
  January1990Simulation,
} from "./january-simulation";
import {
  fingerprintSimulationCorpusV1,
  parseSimulationCorpusV1,
  type SimulationCorpusV1,
} from "./simulation-corpus";

export const SIMULATION_REPORT_SCHEMA_VERSION_V4 = "simulation-report-v4" as const;

export type SimulationScenarioIdentityV1 = Readonly<{
  scenarioId: string;
  programFingerprint: Fingerprint;
  certificateFingerprint: Fingerprint;
}>;

export type SimulationCorpusIdentityV1 = Readonly<{
  schemaVersion: SimulationCorpusV1["schemaVersion"];
  corpusId: string;
  fingerprint: Fingerprint;
}>;

export type SimulationReportV4 = Readonly<
  Omit<SimulationReportV3, "schemaVersion"> & {
    schemaVersion: typeof SIMULATION_REPORT_SCHEMA_VERSION_V4;
    corpus: SimulationCorpusIdentityV1;
    scenario: SimulationScenarioIdentityV1;
  }
>;

export type CreateJanuary1990SimulationV4Input = CreateJanuary1990SimulationInput &
  Readonly<{
    scenarioIdentity: SimulationScenarioIdentityV1;
  }>;

export type January1990SimulationV4 = Readonly<{
  simulateCorpus(corpus: unknown): SimulationReportV4;
  runOnce: January1990Simulation["runOnce"];
}>;

export function createJanuary1990SimulationV4(
  input: CreateJanuary1990SimulationV4Input,
): January1990SimulationV4 {
  const v3 = createJanuary1990SimulationV3(input);
  const scenario = parseScenarioIdentity(input.scenarioIdentity);

  return Object.freeze({
    simulateCorpus(value: unknown): SimulationReportV4 {
      const parsed = parseSimulationCorpusV1(value);
      if (parsed.kind !== "ok") throw new TypeError(parsed.message);
      const corpus = parsed.corpus;
      if (corpus.scenarioId !== scenario.scenarioId) {
        throw new TypeError(
          `Simulation corpus scenario ${corpus.scenarioId} does not match ${scenario.scenarioId}`,
        );
      }

      const report = v3.simulate({
        seedStart: corpus.seedRange.start,
        seedEnd: corpus.seedRange.end,
        policies: corpus.policies,
      });

      return Object.freeze({
        schemaVersion: SIMULATION_REPORT_SCHEMA_VERSION_V4,
        rulesetFingerprint: report.rulesetFingerprint,
        contentFingerprint: report.contentFingerprint,
        rngEvidence: report.rngEvidence,
        policies: report.policies,
        seedRange: report.seedRange,
        runs: report.runs,
        aggregates: report.aggregates,
        invariantFailures: report.invariantFailures,
        corpus: Object.freeze({
          schemaVersion: corpus.schemaVersion,
          corpusId: corpus.corpusId,
          fingerprint: fingerprintSimulationCorpusV1(corpus),
        }),
        scenario,
      });
    },
    runOnce: v3.runOnce,
  });
}

function parseScenarioIdentity(value: SimulationScenarioIdentityV1): SimulationScenarioIdentityV1 {
  if (!isStableId(value.scenarioId)) throw new TypeError("Simulation scenarioId is invalid");
  return Object.freeze({
    scenarioId: value.scenarioId,
    programFingerprint: parseFingerprint(
      value.programFingerprint,
      "Simulation scenario program fingerprint",
    ),
    certificateFingerprint: parseFingerprint(
      value.certificateFingerprint,
      "Simulation scenario certificate fingerprint",
    ),
  });
}

function isStableId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value)
  );
}
