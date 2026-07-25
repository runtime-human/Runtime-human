import { describe, expect, it } from "vitest";

import * as gameCore from "@runtime-human/game-core";
import type { January1990ContentContext } from "@runtime-human/game-core";
import type { DecisionId, Fingerprint } from "@runtime-human/game-schema";

type January1990MonthPlanV1 = Readonly<{
  schemaVersion: "january-1990-month-plan-v1";
  month: "1990-01";
  program: "january-1990-v1";
  contentFingerprint: Fingerprint;
  requiredChunkIds: readonly ["1990s/ecosystem", "1990s/programming"];
}>;

type JanuaryAccessAnswerV1 = Readonly<{
  schemaVersion: "january-access-answer-v1";
  route: "home-pc" | "shared-school-pc";
}>;

type JanuaryLearningAnswerV1 = Readonly<{
  schemaVersion: "january-learning-answer-v1";
  practice: "read-and-run" | "edit-and-debug";
}>;

type JanuaryDefectAnswerV1 = Readonly<{
  schemaVersion: "january-defect-answer-v1";
  response: "inspect-listing" | "change-input" | "ask-for-guidance";
}>;

type JanuaryContractApi = Readonly<{
  JANUARY_1990_DECISION_IDS?: Readonly<{
    access: DecisionId;
    learning: DecisionId;
    defect: DecisionId;
  }>;
  createJanuary1990MonthPlan?: (context: January1990ContentContext) => January1990MonthPlanV1;
  parseJanuary1990MonthPlan?: (value: unknown) => January1990MonthPlanV1;
  parseJanuaryAccessAnswer?: (decisionId: unknown, value: unknown) => JanuaryAccessAnswerV1;
  parseJanuaryLearningAnswer?: (decisionId: unknown, value: unknown) => JanuaryLearningAnswerV1;
  parseJanuaryDefectAnswer?: (decisionId: unknown, value: unknown) => JanuaryDefectAnswerV1;
}>;

const api = gameCore as typeof gameCore & JanuaryContractApi;
const contentFingerprint = gameCore.fingerprint("january-1990-month-plan-test", {
  fixture: "content",
});
const contentContext = Object.freeze({
  schemaVersion: "january-1990-content-context-v1",
  month: "1990-01",
  contentFingerprint,
  requiredChunkIds: gameCore.JANUARY_1990_REQUIRED_CHUNK_IDS,
}) as unknown as January1990ContentContext;

function requireFunction<T extends (...args: never[]) => unknown>(
  value: T | undefined,
  name: string,
): T {
  expect(value, `${name} must be exported from game-core`).toBeTypeOf("function");
  return value as T;
}

describe("January 1990 MonthPlan contracts", () => {
  it("derives the exact immutable plan from the verified content context", () => {
    const createPlan = requireFunction(
      api.createJanuary1990MonthPlan,
      "createJanuary1990MonthPlan",
    );

    const plan = createPlan(contentContext);

    expect(plan).toEqual({
      schemaVersion: "january-1990-month-plan-v1",
      month: "1990-01",
      program: "january-1990-v1",
      contentFingerprint,
      requiredChunkIds: ["1990s/ecosystem", "1990s/programming"],
    });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.requiredChunkIds)).toBe(true);
  });

  it("parses only the exact immutable MonthPlan contract", () => {
    const parsePlan = requireFunction(api.parseJanuary1990MonthPlan, "parseJanuary1990MonthPlan");
    const validPlan = {
      schemaVersion: "january-1990-month-plan-v1",
      month: "1990-01",
      program: "january-1990-v1",
      contentFingerprint,
      requiredChunkIds: ["1990s/ecosystem", "1990s/programming"],
    };

    const plan = parsePlan(validPlan);

    expect(plan).toEqual(validPlan);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.requiredChunkIds)).toBe(true);
    expect(() => parsePlan({ ...validPlan, extra: true })).toThrow(TypeError);
    expect(() => parsePlan({ ...validPlan, program: "another-program" })).toThrow(TypeError);
    expect(() => parsePlan({ ...validPlan, contentFingerprint: "not-a-fingerprint" })).toThrow(
      TypeError,
    );
    expect(() =>
      parsePlan({
        ...validPlan,
        requiredChunkIds: ["1990s/programming", "1990s/ecosystem"],
      }),
    ).toThrow(TypeError);
  });

  it("publishes the exact stable decision IDs", () => {
    expect(api.JANUARY_1990_DECISION_IDS).toEqual({
      access: "january-1990/access",
      learning: "january-1990/learning",
      defect: "january-1990/defect",
    });
    expect(Object.isFrozen(api.JANUARY_1990_DECISION_IDS)).toBe(true);
  });

  it("parses only the closed access answer contract", () => {
    const parse = requireFunction(api.parseJanuaryAccessAnswer, "parseJanuaryAccessAnswer");
    const decisionId = api.JANUARY_1990_DECISION_IDS?.access;

    const answer = parse(decisionId, {
      schemaVersion: "january-access-answer-v1",
      route: "home-pc",
    });

    expect(answer).toEqual({
      schemaVersion: "january-access-answer-v1",
      route: "home-pc",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parse(decisionId, {
        schemaVersion: "january-access-answer-v1",
        route: "home-pc",
        extra: true,
      }),
    ).toThrow(TypeError);
    expect(() =>
      parse("january-1990/learning", {
        schemaVersion: "january-access-answer-v1",
        route: "home-pc",
      }),
    ).toThrow(TypeError);
  });

  it("parses only the closed learning answer contract", () => {
    const parse = requireFunction(api.parseJanuaryLearningAnswer, "parseJanuaryLearningAnswer");
    const decisionId = api.JANUARY_1990_DECISION_IDS?.learning;

    const answer = parse(decisionId, {
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    });

    expect(answer).toEqual({
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parse(decisionId, {
        schemaVersion: "january-learning-answer-v1",
        practice: "browse-online",
      }),
    ).toThrow(TypeError);
  });

  it("parses only the closed defect-response answer contract", () => {
    const parse = requireFunction(api.parseJanuaryDefectAnswer, "parseJanuaryDefectAnswer");
    const decisionId = api.JANUARY_1990_DECISION_IDS?.defect;

    const answer = parse(decisionId, {
      schemaVersion: "january-defect-answer-v1",
      response: "inspect-listing",
    });

    expect(answer).toEqual({
      schemaVersion: "january-defect-answer-v1",
      response: "inspect-listing",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parse(decisionId, {
        schemaVersion: "january-defect-answer-v1",
        response: "ignore-defect",
      }),
    ).toThrow(TypeError);
  });
});
