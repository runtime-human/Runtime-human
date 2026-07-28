import { describe, expect, it } from "vitest";

import { parseJanuary1990ResultSummary } from "@runtime-human/game-application";
import {
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  type January1990ResultV1,
} from "@runtime-human/game-core";

function validResult() {
  return {
    schemaVersion: "january-1990-result-v1",
    month: "1990-01",
    projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
    outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
    programmingOutcome: {
      schemaVersion: "january-1990-programming-outcome-v1",
      month: "1990-01",
      projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
      workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
      defectEventId: JANUARY_1990_CONTENT_IDS.logicErrorEvent,
      outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
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
          skillId: JANUARY_1990_CONTENT_IDS.programWritingSkill,
          amount: 2,
          reasonCode: JANUARY_1990_REASON_CODES.inputOutputProject,
        },
      ],
    },
  } satisfies January1990ResultV1;
}

describe("January 1990 result summary", () => {
  it("projects a valid committed result into an immutable typed summary", () => {
    const summary = parseJanuary1990ResultSummary(validResult());

    expect(summary).toEqual({
      month: "1990-01",
      projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
      outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
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

    expect(() =>
      parseJanuary1990ResultSummary({
        ...result,
        programmingOutcome: {
          ...result.programmingOutcome,
          projectId: JANUARY_1990_CONTENT_IDS.gwBasicTechnology,
        },
      }),
    ).toThrow(/identity/u);
  });

  it("rejects non-canonical January IDs and evidence", () => {
    const result = validResult();

    expect(() =>
      parseJanuary1990ResultSummary({
        ...result,
        projectId: "invented-project",
        programmingOutcome: {
          ...result.programmingOutcome,
          projectId: "invented-project",
        },
      }),
    ).toThrow(/project/u);

    expect(() =>
      parseJanuary1990ResultSummary({
        ...result,
        programmingOutcome: {
          ...result.programmingOutcome,
          workPackageId: "invented-work-package",
        },
      }),
    ).toThrow(/content ID/u);

    expect(() =>
      parseJanuary1990ResultSummary({
        ...result,
        programmingOutcome: {
          ...result.programmingOutcome,
          evidence: [
            {
              ...result.programmingOutcome.evidence[0],
              skillId: "invented-skill",
            },
          ],
        },
      }),
    ).toThrow(/skillId/u);
  });

  it.each([
    ["clarity", -1],
    ["clarity", 11],
    ["correctness", 12],
    ["reliability", 10],
    ["reliability", 1.5],
  ] as const)("rejects %s score value %s outside its real range", (metric, value) => {
    const result = validResult();

    expect(() =>
      parseJanuary1990ResultSummary({
        ...result,
        programmingOutcome: {
          ...result.programmingOutcome,
          qualityScores: {
            ...result.programmingOutcome.qualityScores,
            [metric]: value,
          },
        },
      }),
    ).toThrow(/score/u);
  });
});
