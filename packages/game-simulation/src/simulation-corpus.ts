import {
  fingerprint,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";

import type { CreateJanuary1990SimulationInput } from "./january-simulation";
import {
  createJanuary1990SimulationV3,
  type SimulationReportV3,
} from "./january-simulation-v3";
import { SIMULATION_POLICY_IDS, type SimulationPolicyIdV1 } from "./simulation-types";

export const SIMULATION_CORPUS_VERSION_V1 = "runtime-human-sim-corpus-v1" as const;
export const SIMULATION_CORPUS_RUN_SCHEMA_VERSION_V1 = "simulation-corpus-run-v1" as const;

export type SimulationCorpusV1 = Readonly<{
  corpusVersion: typeof SIMULATION_CORPUS_VERSION_V1;
  scenarioId: "january-1990";
  seedRange: Readonly<{
    start: number;
    end: number;
  }>;
  policies: readonly SimulationPolicyIdV1[];
  executionProfile: "hierarchical-v1";
}>;

export type SimulationCorpusRunV1 = Readonly<{
  schemaVersion: typeof SIMULATION_CORPUS_RUN_SCHEMA_VERSION_V1;
  corpus: SimulationCorpusV1;
  corpusFingerprint: Fingerprint;
  report: SimulationReportV3;
}>;

export const JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1 = Object.freeze({
  corpusVersion: SIMULATION_CORPUS_VERSION_V1,
  scenarioId: "january-1990" as const,
  seedRange: Object.freeze({ start: 1, end: 64 }),
  policies: Object.freeze([...SIMULATION_POLICY_IDS]),
  executionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
}) satisfies SimulationCorpusV1;

export function fingerprintSimulationCorpusV1(corpus: SimulationCorpusV1): Fingerprint {
  return fingerprint("simulation-corpus-v1", corpus);
}

export const JANUARY_1990_CANONICAL_SIMULATION_CORPUS_FINGERPRINT_V1 =
  fingerprintSimulationCorpusV1(JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1);

export function runJanuary1990CanonicalSimulationV1(
  input: CreateJanuary1990SimulationInput,
): SimulationCorpusRunV1 {
  const corpus = JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1;
  const report = createJanuary1990SimulationV3(input).simulate({
    seedStart: corpus.seedRange.start,
    seedEnd: corpus.seedRange.end,
    policies: [...corpus.policies],
  });

  return Object.freeze({
    schemaVersion: SIMULATION_CORPUS_RUN_SCHEMA_VERSION_V1,
    corpus,
    corpusFingerprint: JANUARY_1990_CANONICAL_SIMULATION_CORPUS_FINGERPRINT_V1,
    report,
  });
}
