import { describe, expect, it } from "vitest";

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
});
