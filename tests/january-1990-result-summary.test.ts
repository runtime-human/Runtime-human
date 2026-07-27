import { describe, expect, it } from "vitest";

import { parseJanuary1990ResultSummary } from "@runtime-human/game-application";

function validResult() {
  return {
    schemaVersion: "january-1990-result-v1",
    month: "1990-01",
    projectId: "personal-utility",
    outcomeEventId: "january-1990/first-program",
    programmingOutcome: {
      schemaVersion: "january-1990-programming-outcome-v1",
      month: "1990-01",
      projectId: "personal-utility",
      workPackageId: "input-output-work-package",
      defectEventId: "january-1990/defect",
      outcomeEventId: "january-1990/first-program",
      accessRoute: "home-pc",
      learningPractice: "edit-and-debug",
      defectResponse: "inspect-listing",
      qualityScores: {
        clarity: 8,
        correctness: 10,
        reliability: 7,
      },
      evidence: [
        {
          skillId: "program-writing",
          amount: 2,
          reasonCode: "input-output-project",
        },
      ],
    },
  };
}

describe("January 1990 result summary", () => {
  it("projects a valid committed result into an immutable typed summary", () => {
    const summary = parseJanuary1990ResultSummary(validResult());

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

  it("rejects fields outside the closed result contract", () => {
    expect(() =>
      parseJanuary1990ResultSummary({
        ...validResult(),
        inventedMetric: 99,
      }),
    ).toThrow(/field set/u);
  });

  it("rejects incompatible schema, month and identifiers", () => {
    expect(() =>
      parseJanuary1990ResultSummary({
        ...validResult(),
        schemaVersion: "january-1990-result-v2",
      }),
    ).toThrow(/schema or month/u);
    expect(() =>
      parseJanuary1990ResultSummary({
        ...validResult(),
        month: "1990-02",
      }),
    ).toThrow(/schema or month/u);
    expect(() =>
      parseJanuary1990ResultSummary({
        ...validResult(),
        projectId: "",
      }),
    ).toThrow(/projectId/u);
    expect(() =>
      parseJanuary1990ResultSummary({
        ...validResult(),
        outcomeEventId: "",
      }),
    ).toThrow(/outcomeEventId/u);
  });

  it("rejects an outcome that does not match the result identity", () => {
    const result = validResult();
    result.programmingOutcome.projectId = "another-project";

    expect(() => parseJanuary1990ResultSummary(result)).toThrow(/identity/u);
  });

  it.each([
    ["clarity", -1],
    ["clarity", 11],
    ["correctness", 12],
    ["reliability", 10],
    ["reliability", 1.5],
  ] as const)("rejects %s score value %s outside its real range", (metric, value) => {
    const result = validResult();
    result.programmingOutcome.qualityScores[metric] = value;

    expect(() => parseJanuary1990ResultSummary(result)).toThrow(/score/u);
  });
});
