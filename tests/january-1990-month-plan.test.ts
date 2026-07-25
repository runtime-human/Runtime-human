import { describe, expect, it } from "vitest";

import {
  createJanuary1990MonthPlan,
  fingerprint,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_REQUIRED_CHUNK_IDS,
  parseJanuary1990MonthPlan,
  parseJanuaryAccessAnswer,
  parseJanuaryDefectAnswer,
  parseJanuaryLearningAnswer,
  type January1990ContentContext,
} from "@runtime-human/game-core";

const contentFingerprint = fingerprint("january-1990-month-plan-test", {
  fixture: "content",
});
const contentContext = Object.freeze({
  schemaVersion: "january-1990-content-context-v1",
  month: "1990-01",
  contentFingerprint,
  requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
}) as unknown as January1990ContentContext;

describe("January 1990 MonthPlan contracts", () => {
  it("derives the exact immutable plan from the verified content context", () => {
    const plan = createJanuary1990MonthPlan(contentContext);

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
    const validPlan = {
      schemaVersion: "january-1990-month-plan-v1",
      month: "1990-01",
      program: "january-1990-v1",
      contentFingerprint,
      requiredChunkIds: ["1990s/ecosystem", "1990s/programming"],
    };

    const plan = parseJanuary1990MonthPlan(validPlan);

    expect(plan).toEqual(validPlan);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.requiredChunkIds)).toBe(true);
    expect(() => parseJanuary1990MonthPlan({ ...validPlan, extra: true })).toThrow(TypeError);
    expect(() => parseJanuary1990MonthPlan({ ...validPlan, program: "another-program" })).toThrow(
      TypeError,
    );
    expect(() =>
      parseJanuary1990MonthPlan({
        ...validPlan,
        contentFingerprint: "not-a-fingerprint",
      }),
    ).toThrow(TypeError);
    expect(() =>
      parseJanuary1990MonthPlan({
        ...validPlan,
        requiredChunkIds: ["1990s/programming", "1990s/ecosystem"],
      }),
    ).toThrow(TypeError);
  });

  it("publishes the exact stable decision IDs", () => {
    expect(JANUARY_1990_DECISION_IDS).toEqual({
      access: "january-1990/access",
      learning: "january-1990/learning",
      defect: "january-1990/defect",
    });
    expect(Object.isFrozen(JANUARY_1990_DECISION_IDS)).toBe(true);
  });

  it("parses only the closed access answer contract", () => {
    const answer = parseJanuaryAccessAnswer(JANUARY_1990_DECISION_IDS.access, {
      schemaVersion: "january-access-answer-v1",
      route: "home-pc",
    });

    expect(answer).toEqual({
      schemaVersion: "january-access-answer-v1",
      route: "home-pc",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parseJanuaryAccessAnswer(JANUARY_1990_DECISION_IDS.access, {
        schemaVersion: "january-access-answer-v1",
        route: "home-pc",
        extra: true,
      }),
    ).toThrow(TypeError);
    expect(() =>
      parseJanuaryAccessAnswer(JANUARY_1990_DECISION_IDS.learning, {
        schemaVersion: "january-access-answer-v1",
        route: "home-pc",
      }),
    ).toThrow(TypeError);
  });

  it("parses only the closed learning answer contract", () => {
    const answer = parseJanuaryLearningAnswer(JANUARY_1990_DECISION_IDS.learning, {
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    });

    expect(answer).toEqual({
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parseJanuaryLearningAnswer(JANUARY_1990_DECISION_IDS.learning, {
        schemaVersion: "january-learning-answer-v1",
        practice: "browse-online",
      }),
    ).toThrow(TypeError);
  });

  it("parses only the closed defect-response answer contract", () => {
    const answer = parseJanuaryDefectAnswer(JANUARY_1990_DECISION_IDS.defect, {
      schemaVersion: "january-defect-answer-v1",
      response: "inspect-listing",
    });

    expect(answer).toEqual({
      schemaVersion: "january-defect-answer-v1",
      response: "inspect-listing",
    });
    expect(Object.isFrozen(answer)).toBe(true);
    expect(() =>
      parseJanuaryDefectAnswer(JANUARY_1990_DECISION_IDS.defect, {
        schemaVersion: "january-defect-answer-v1",
        response: "ignore-defect",
      }),
    ).toThrow(TypeError);
  });
});
