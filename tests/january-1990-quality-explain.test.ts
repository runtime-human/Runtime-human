import { describe, expect, it } from "vitest";

import {
  materializeJanuaryProgrammingState,
  parseJanuaryProvisionalState,
  JANUARY_1990_DEFAULT_BALANCE,
  deriveJanuaryQualityScoreMaximums,
} from "@runtime-human/game-core";
import {
  deriveJanuaryOutcomeRollV1,
  explainJanuaryQualityV1,
  JANUARY_QUALITY_EXPLAIN_RULE_VERSION,
  QUALITY_EXPLAIN_SCHEMA_VERSION,
  type JanuaryOutcomeSelectionV1,
} from "@runtime-human/game-simulation";

const ACCESS_ROUTES = ["home-pc", "shared-school-pc"] as const;
const LEARNING_PRACTICES = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_RESPONSES = ["inspect-listing", "change-input", "ask-for-guidance"] as const;
const ROLLS = [0, 1, 2] as const;

const DIMENSIONS = ["clarity", "correctness", "reliability"] as const;

function materializeScores(selection: JanuaryOutcomeSelectionV1, roll: number) {
  const state = parseJanuaryProvisionalState({
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute: selection.access,
    learningPractice: selection.learning,
    workPackageId: null,
    defectEventId: null,
    defectResponse: selection.response,
    evidence: [],
    qualityScores: null,
  });
  return materializeJanuaryProgrammingState(state, roll, JANUARY_1990_DEFAULT_BALANCE)
    .qualityScores;
}

describe("January quality explain v1", () => {
  it("matches the plan example for the canonical outcome", () => {
    const explained = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
      access: "home-pc",
      learning: "edit-and-debug",
      response: "inspect-listing",
      roll: 1,
    });
    expect(explained.kind).toBe("ok");
    if (explained.kind !== "ok") return;
    expect(explained.explanation.schemaVersion).toBe(QUALITY_EXPLAIN_SCHEMA_VERSION);
    expect(explained.explanation.ruleVersion).toBe(JANUARY_QUALITY_EXPLAIN_RULE_VERSION);
    expect(explained.explanation.result).toEqual({
      clarity: 9,
      correctness: 10,
      reliability: 7,
    });
    expect(explained.explanation.contributions).toEqual([
      { reasonCode: "quality.base", clarity: 3, correctness: 3, reliability: 3 },
      { reasonCode: "quality.access.home-pc", reliability: 2 },
      { reasonCode: "quality.learning.edit-and-debug", clarity: 3, correctness: 3 },
      {
        reasonCode: "quality.response.inspect-listing",
        clarity: 2,
        correctness: 3,
        reliability: 1,
      },
      { reasonCode: "quality.roll", clarity: 1, correctness: 1, reliability: 1 },
    ]);
  });

  it("reproduces the composition arithmetic for every closed input combination", () => {
    for (const access of ACCESS_ROUTES) {
      for (const learning of LEARNING_PRACTICES) {
        for (const response of DEFECT_RESPONSES) {
          for (const roll of ROLLS) {
            const explained = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
              access,
              learning,
              response,
              roll,
            });
            expect(explained.kind).toBe("ok");
            if (explained.kind !== "ok") continue;
            expect(explained.explanation.result).toEqual(
              materializeScores({ access, learning, response }, roll),
            );
          }
        }
      }
    }
  });

  it("keeps contributions additive to the result per dimension", () => {
    const explained = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
      access: "shared-school-pc",
      learning: "read-and-run",
      response: "change-input",
      roll: 2,
    });
    expect(explained.kind).toBe("ok");
    if (explained.kind !== "ok") return;
    for (const dimension of DIMENSIONS) {
      const sum = explained.explanation.contributions.reduce(
        (total, contribution) => total + (contribution[dimension] ?? 0),
        0,
      );
      expect(sum).toBe(explained.explanation.result[dimension]);
    }
  });

  it("derives the outcome roll back from materialized scores", () => {
    for (const access of ACCESS_ROUTES) {
      for (const learning of LEARNING_PRACTICES) {
        for (const response of DEFECT_RESPONSES) {
          for (const roll of ROLLS) {
            const scores = materializeScores({ access, learning, response }, roll);
            const derived = deriveJanuaryOutcomeRollV1(
              JANUARY_1990_DEFAULT_BALANCE,
              { access, learning, response },
              scores,
            );
            expect(derived).toEqual({ kind: "ok", roll });
          }
        }
      }
    }
  });

  it("rejects mismatched score decompositions", () => {
    const derived = deriveJanuaryOutcomeRollV1(
      JANUARY_1990_DEFAULT_BALANCE,
      { access: "home-pc", learning: "read-and-run", response: "inspect-listing" },
      { clarity: 7, correctness: 8, reliability: 7 },
    );
    expect(derived.kind).toBe("invalid");
    if (derived.kind !== "invalid") return;
    expect(derived.diagnostics[0]?.code).toBe("EXPLAIN_OUTCOME_MISMATCH");
  });

  it("rejects incomplete or out-of-range inputs", () => {
    const unknownRow = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
      access: "internet-cafe",
      learning: "read-and-run",
      response: "inspect-listing",
      roll: 1,
    } as unknown as Parameters<typeof explainJanuaryQualityV1>[1]);
    expect(unknownRow.kind).toBe("invalid");
    if (unknownRow.kind === "invalid") {
      expect(unknownRow.diagnostics[0]?.code).toBe("EXPLAIN_INPUT_INVALID");
    }

    const rollTooHigh = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
      access: "home-pc",
      learning: "read-and-run",
      response: "inspect-listing",
      roll: 3,
    });
    expect(rollTooHigh.kind).toBe("invalid");
    if (rollTooHigh.kind === "invalid") {
      expect(rollTooHigh.diagnostics[0]?.code).toBe("EXPLAIN_ROLL_OUT_OF_RANGE");
    }

    const rollNotInteger = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
      access: "home-pc",
      learning: "read-and-run",
      response: "inspect-listing",
      roll: 1.5,
    });
    expect(rollNotInteger.kind).toBe("invalid");
  });

  it("derives maxima consistent with explained best-case results", () => {
    const maxima = deriveJanuaryQualityScoreMaximums(JANUARY_1990_DEFAULT_BALANCE.quality);
    for (const access of ACCESS_ROUTES) {
      for (const learning of LEARNING_PRACTICES) {
        for (const response of DEFECT_RESPONSES) {
          const explained = explainJanuaryQualityV1(JANUARY_1990_DEFAULT_BALANCE, {
            access,
            learning,
            response,
            roll: 2,
          });
          if (explained.kind !== "ok") continue;
          for (const dimension of DIMENSIONS) {
            expect(explained.explanation.result[dimension]).toBeLessThanOrEqual(maxima[dimension]);
          }
        }
      }
    }
  });
});
