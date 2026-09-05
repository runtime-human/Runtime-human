import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import { JANUARY_1990_DEFAULT_BALANCE } from "@runtime-human/game-core";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

type CanonicalCorpus = Readonly<{
  corpusVersion: string;
  scenarioId: string;
  seedRange: Readonly<{ start: number; end: number }>;
  policies: readonly string[];
  executionProfile: string;
}>;

type CanonicalSimulationRun = Readonly<{
  schemaVersion: string;
  corpus: CanonicalCorpus;
  corpusFingerprint: string;
  report: Readonly<{
    schemaVersion: string;
    seedRange: Readonly<{ start: number; end: number }>;
    policies: readonly string[];
    runs: number;
  }>;
}>;

const registry = await loadJanuaryTestRegistry();
const context = projectJanuary1990Content(registry);

describe("canonical simulation corpus v1", () => {
  it("publishes a versioned January corpus with stable execution scope", async () => {
    const simulation = (await import("@runtime-human/game-simulation")) as Record<string, unknown>;

    expect(simulation.JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1).toEqual({
      corpusVersion: "runtime-human-sim-corpus-v1",
      scenarioId: "january-1990",
      seedRange: { start: 1, end: 64 },
      policies: ["always-first-valid", "learning-first", "random-valid-v1"],
      executionProfile: "hierarchical-v1",
    });
  });

  it("fingerprints the complete corpus scope deterministically", async () => {
    const simulation = (await import("@runtime-human/game-simulation")) as Record<string, unknown>;
    const corpus = simulation.JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1 as CanonicalCorpus;
    const fingerprintCorpus = simulation.fingerprintSimulationCorpusV1 as
      | ((input: CanonicalCorpus) => string)
      | undefined;

    expect(fingerprintCorpus).toBeTypeOf("function");
    if (!fingerprintCorpus) return;

    const first = fingerprintCorpus(corpus);
    const second = fingerprintCorpus(corpus);
    const changed = fingerprintCorpus({
      ...corpus,
      seedRange: { ...corpus.seedRange, end: corpus.seedRange.end - 1 },
    });

    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(second).toBe(first);
    expect(changed).not.toBe(first);
  });

  it("runs the canonical corpus into a byte-stable simulation-report-v3 envelope", async () => {
    const simulation = (await import("@runtime-human/game-simulation")) as Record<string, unknown>;
    const corpus = simulation.JANUARY_1990_CANONICAL_SIMULATION_CORPUS_V1 as CanonicalCorpus;
    const runCanonical = simulation.runJanuary1990CanonicalSimulationV1 as
      | ((input: {
          context: unknown;
          balance: unknown;
          saveSchemaFingerprint: unknown;
        }) => CanonicalSimulationRun)
      | undefined;

    expect(runCanonical).toBeTypeOf("function");
    if (!runCanonical) return;

    const input = {
      context,
      balance: JANUARY_1990_DEFAULT_BALANCE,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    };
    const first = runCanonical(input);
    const second = runCanonical(input);

    expect(first.schemaVersion).toBe("simulation-corpus-run-v1");
    expect(first.corpus).toEqual(corpus);
    expect(first.corpusFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.report.schemaVersion).toBe("simulation-report-v3");
    expect(first.report.seedRange).toEqual(corpus.seedRange);
    expect(first.report.policies).toEqual(corpus.policies);
    expect(first.report.runs).toBe(192);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
