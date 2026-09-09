import { JANUARY_1990_RNG_EXECUTION_PROFILES_V1, fingerprint } from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";

import { SIMULATION_POLICY_IDS, type SimulationPolicyIdV1 } from "./simulation-types";

export const SIMULATION_CORPUS_SCHEMA_VERSION = "simulation-corpus-v1" as const;

export type SimulationCorpusV1 = Readonly<{
  schemaVersion: typeof SIMULATION_CORPUS_SCHEMA_VERSION;
  corpusId: string;
  scenarioId: string;
  executionProfile: typeof JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id;
  seedRange: Readonly<{ start: number; end: number }>;
  policies: readonly SimulationPolicyIdV1[];
}>;

export type SimulationCorpusParseResultV1 =
  | Readonly<{ kind: "ok"; corpus: SimulationCorpusV1 }>
  | Readonly<{ kind: "invalid"; message: string }>;

const STABLE_CORPUS_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u;

export const JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1: SimulationCorpusV1 = Object.freeze({
  schemaVersion: SIMULATION_CORPUS_SCHEMA_VERSION,
  corpusId: "january-1990-canonical-v1",
  scenarioId: "january-1990.shadow-proof",
  executionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
  seedRange: Object.freeze({ start: 1, end: 64 }),
  policies: Object.freeze([...SIMULATION_POLICY_IDS]),
});

export const JANUARY_1990_CANONICAL_SIMULATION_CORPUS_FINGERPRINT = fingerprintSimulationCorpusV1(
  JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1,
);

export function parseSimulationCorpusV1(value: unknown): SimulationCorpusParseResultV1 {
  const corpus = closedRecord(value, [
    "corpusId",
    "executionProfile",
    "policies",
    "scenarioId",
    "schemaVersion",
    "seedRange",
  ]);
  if (corpus === null) return invalid("Simulation corpus must match the closed v1 field set");
  if (corpus.schemaVersion !== SIMULATION_CORPUS_SCHEMA_VERSION) {
    return invalid(`Simulation corpus schemaVersion must be ${SIMULATION_CORPUS_SCHEMA_VERSION}`);
  }
  if (!isStableCorpusId(corpus.corpusId)) return invalid("Simulation corpus corpusId is invalid");
  if (!isStableCorpusId(corpus.scenarioId))
    return invalid("Simulation corpus scenarioId is invalid");
  if (corpus.executionProfile !== JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id) {
    return invalid("Simulation corpus executionProfile must be hierarchical-v1");
  }

  const seedRange = closedRecord(corpus.seedRange, ["end", "start"]);
  if (
    seedRange === null ||
    !isSafeNonNegativeInteger(seedRange.start) ||
    !isSafeNonNegativeInteger(seedRange.end) ||
    seedRange.start > seedRange.end
  ) {
    return invalid(
      "Simulation corpus seedRange must be an ordered non-negative safe-integer range",
    );
  }

  const policies = parsePolicies(corpus.policies);
  if (policies === null) {
    return invalid(
      "Simulation corpus policies must be unique and follow canonical policy ordering",
    );
  }

  return {
    kind: "ok",
    corpus: Object.freeze({
      schemaVersion: SIMULATION_CORPUS_SCHEMA_VERSION,
      corpusId: corpus.corpusId,
      scenarioId: corpus.scenarioId,
      executionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
      seedRange: Object.freeze({ start: seedRange.start, end: seedRange.end }),
      policies: Object.freeze(policies),
    }),
  };
}

export function fingerprintSimulationCorpusV1(value: unknown): Fingerprint {
  const parsed = parseSimulationCorpusV1(value);
  if (parsed.kind !== "ok") throw new TypeError(parsed.message);
  return fingerprint("simulation-corpus-v1", parsed.corpus);
}

function parsePolicies(value: unknown): SimulationPolicyIdV1[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const policies: SimulationPolicyIdV1[] = [];
  let previousIndex = -1;
  for (const candidate of value) {
    const index = SIMULATION_POLICY_IDS.findIndex((policyId) => policyId === candidate);
    if (index <= previousIndex) return null;
    const policyId = SIMULATION_POLICY_IDS[index];
    if (policyId === undefined) return null;
    policies.push(policyId);
    previousIndex = index;
  }
  return policies;
}

function isStableCorpusId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    STABLE_CORPUS_ID.test(value)
  );
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function closedRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isPlainRecord(value)) return null;
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key)))
    return null;
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

function invalid(message: string): SimulationCorpusParseResultV1 {
  return { kind: "invalid", message };
}
