import { JANUARY_1990_RNG_EXECUTION_PROFILES_V1 } from "@runtime-human/game-core";

import { SIMULATION_POLICY_IDS, type SimulationPolicyIdV1 } from "./simulation-types";

export const SIMULATION_CORPUS_VERSION_V1 = "runtime-human-sim-corpus-v1" as const;

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

export const JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1 = Object.freeze({
  corpusVersion: SIMULATION_CORPUS_VERSION_V1,
  scenarioId: "january-1990" as const,
  seedRange: Object.freeze({ start: 1, end: 64 }),
  policies: Object.freeze([...SIMULATION_POLICY_IDS]),
  executionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
}) satisfies SimulationCorpusV1;
