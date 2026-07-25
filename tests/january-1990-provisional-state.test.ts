import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  parseJanuaryProvisionalState,
  updateJanuaryProvisionalState,
} from "@runtime-human/game-core";

describe("January 1990 provisional state", () => {
  it("normalizes the initial empty checkpoint state", () => {
    const state = parseJanuaryProvisionalState({});

    expect(state).toEqual({
      schemaVersion: "january-1990-provisional-state-v1",
      accessRoute: null,
      learningPractice: null,
      workPackageId: null,
      defectEventId: null,
      defectResponse: null,
      evidence: [],
      qualityScores: null,
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.evidence)).toBe(true);
  });

  it("round-trips a completed immutable checkpoint state", () => {
    const completed = updateJanuaryProvisionalState(parseJanuaryProvisionalState({}), {
      accessRoute: "home-pc",
      learningPractice: "edit-and-debug",
      workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
      defectEventId: JANUARY_1990_CONTENT_IDS.syntaxErrorEvent,
      defectResponse: "inspect-listing",
      evidence: [
        {
          skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
          amount: 2,
          reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
        },
      ],
      qualityScores: {
        clarity: 8,
        correctness: 10,
        reliability: 7,
      },
    });

    const restored = parseJanuaryProvisionalState(JSON.parse(JSON.stringify(completed)));

    expect(restored).toEqual(completed);
    expect(Object.isFrozen(restored)).toBe(true);
    expect(Object.isFrozen(restored.evidence)).toBe(true);
    expect(Object.isFrozen(restored.evidence[0])).toBe(true);
    expect(Object.isFrozen(restored.qualityScores)).toBe(true);
  });

  it("validates public updates instead of trusting compile-time types", () => {
    const initial = parseJanuaryProvisionalState({});

    expect(() =>
      updateJanuaryProvisionalState(initial, {
        qualityScores: {
          clarity: 101,
          correctness: 8,
          reliability: 7,
        },
      }),
    ).toThrow(TypeError);
    expect(() =>
      updateJanuaryProvisionalState(initial, {
        evidence: [
          {
            skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
            amount: -1,
            reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
          },
        ],
      }),
    ).toThrow(TypeError);
  });

  it.each([
    {
      schemaVersion: "january-1990-provisional-state-v1",
      accessRoute: null,
      learningPractice: null,
      workPackageId: null,
      defectEventId: null,
      defectResponse: null,
      evidence: [],
      qualityScores: null,
      extra: true,
    },
    {
      schemaVersion: "january-1990-provisional-state-v1",
      accessRoute: "home-pc",
      learningPractice: "edit-and-debug",
      workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
      defectEventId: JANUARY_1990_CONTENT_IDS.logicErrorEvent,
      defectResponse: "inspect-listing",
      evidence: [
        {
          skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
          amount: -1,
          reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
        },
      ],
      qualityScores: null,
    },
    {
      schemaVersion: "january-1990-provisional-state-v1",
      accessRoute: "home-pc",
      learningPractice: "edit-and-debug",
      workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
      defectEventId: JANUARY_1990_CONTENT_IDS.logicErrorEvent,
      defectResponse: "inspect-listing",
      evidence: [],
      qualityScores: {
        clarity: 101,
        correctness: 8,
        reliability: 7,
      },
    },
  ])("rejects malformed checkpoint state %#", (value) => {
    expect(() => parseJanuaryProvisionalState(value)).toThrow(TypeError);
  });
});
