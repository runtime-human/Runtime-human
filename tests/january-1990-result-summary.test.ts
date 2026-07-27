import { describe, expect, it } from "vitest";

import { parseJanuary1990ResultSummary } from "@runtime-human/game-application";

describe("January 1990 result summary", () => {
  it("projects a valid committed result into an immutable typed summary", () => {
    const summary = parseJanuary1990ResultSummary({
      schemaVersion: "january-1990-result-v1",
      month: "1990-01",
      projectId: "personal-utility",
      outcomeEventId: "january-1990/first-program",
      programmingOutcome: {
        schemaVersion: "january-1990-programming-outcome-v1",
        qualityScores: {
          clarity: 8,
          correctness: 10,
          reliability: 7,
        },
      },
    });

    expect(summary).toEqual({
      month: "1990-01",
      projectId: "personal-utility",
      outcomeEventId: "january-1990/first-program",
      qualityScores: {
        clarity: 8,
        correctness: 10,
        reliability: 7,
      },
    });
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.qualityScores)).toBe(true);
  });
});
