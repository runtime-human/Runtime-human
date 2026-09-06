import {
  createJanuary1990ScenarioMonthSteps,
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  fingerprint,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "@runtime-human/game-core";
import type { Fingerprint, ScenarioArtifactV1 } from "@runtime-human/game-schema";

import {
  createJanuary1990SimulationForResolvedRuntime,
  type CreateJanuary1990SimulationInput,
} from "./january-simulation";
import { promoteJanuary1990SimulationV3, type SimulationReportV3 } from "./january-simulation-v3";
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

export type SimulationScenarioIdentityV1 = Readonly<{
  programFingerprint: Fingerprint;
  rulesFingerprint: Fingerprint;
  policyFingerprint: Fingerprint;
  certificateFingerprint: Fingerprint;
}>;

export type SimulationCorpusRunV1 = Readonly<{
  schemaVersion: typeof SIMULATION_CORPUS_RUN_SCHEMA_VERSION_V1;
  corpus: SimulationCorpusV1;
  corpusFingerprint: Fingerprint;
  scenarioIdentity: SimulationScenarioIdentityV1;
  report: SimulationReportV3;
}>;

export type CreateJanuary1990CanonicalSimulationInput = CreateJanuary1990SimulationInput &
  Readonly<{
    artifact: ScenarioArtifactV1;
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
  input: CreateJanuary1990CanonicalSimulationInput,
): SimulationCorpusRunV1 {
  const corpus = JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1;
  const scenarioIdentity = createScenarioIdentity(input.artifact);
  const simulation = createJanuary1990SimulationForResolvedRuntime(input, {
    steps: createJanuary1990ScenarioMonthSteps(input.context, input.balance, input.artifact),
    rulesetFingerprint: createJanuary1990ScenarioRuntimeRulesFingerprint(
      input.balance,
      input.artifact,
    ),
    determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  });
  const report = promoteJanuary1990SimulationV3(simulation).simulate({
    seedStart: corpus.seedRange.start,
    seedEnd: corpus.seedRange.end,
    policies: [...corpus.policies],
  });

  return Object.freeze({
    schemaVersion: SIMULATION_CORPUS_RUN_SCHEMA_VERSION_V1,
    corpus,
    corpusFingerprint: JANUARY_1990_CANONICAL_SIMULATION_CORPUS_FINGERPRINT_V1,
    scenarioIdentity,
    report,
  });
}

function createScenarioIdentity(artifact: ScenarioArtifactV1): SimulationScenarioIdentityV1 {
  return Object.freeze({
    programFingerprint: artifact.program.programFingerprint,
    rulesFingerprint: artifact.capabilities.rulesFingerprint,
    policyFingerprint: artifact.certificate.policyFingerprint,
    certificateFingerprint: artifact.certificate.certificateFingerprint,
  });
}
