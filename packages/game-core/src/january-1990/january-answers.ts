import type { DecisionId } from "@runtime-human/game-schema";

import { JANUARY_1990_DECISION_IDS } from "./january-decisions";

export type JanuaryAccessAnswerV1 = Readonly<{
  schemaVersion: "january-access-answer-v1";
  route: "home-pc" | "shared-school-pc";
}>;

export type JanuaryLearningAnswerV1 = Readonly<{
  schemaVersion: "january-learning-answer-v1";
  practice: "read-and-run" | "edit-and-debug";
}>;

export type JanuaryDefectAnswerV1 = Readonly<{
  schemaVersion: "january-defect-answer-v1";
  response: "inspect-listing" | "change-input" | "ask-for-guidance";
}>;

export function parseJanuaryAccessAnswer(
  decisionId: unknown,
  value: unknown,
): JanuaryAccessAnswerV1 {
  requireDecisionId(decisionId, JANUARY_1990_DECISION_IDS.access, "access");
  const record = requireExactRecord(value, ["route", "schemaVersion"], "access answer");
  if (record.schemaVersion !== "january-access-answer-v1") {
    throw new TypeError("January access answer has an incompatible schemaVersion");
  }
  if (record.route !== "home-pc" && record.route !== "shared-school-pc") {
    throw new TypeError("January access route must be home-pc or shared-school-pc");
  }
  return Object.freeze({
    schemaVersion: "january-access-answer-v1",
    route: record.route,
  });
}

export function parseJanuaryLearningAnswer(
  decisionId: unknown,
  value: unknown,
): JanuaryLearningAnswerV1 {
  requireDecisionId(decisionId, JANUARY_1990_DECISION_IDS.learning, "learning");
  const record = requireExactRecord(value, ["practice", "schemaVersion"], "learning answer");
  if (record.schemaVersion !== "january-learning-answer-v1") {
    throw new TypeError("January learning answer has an incompatible schemaVersion");
  }
  if (record.practice !== "read-and-run" && record.practice !== "edit-and-debug") {
    throw new TypeError("January learning practice must be read-and-run or edit-and-debug");
  }
  return Object.freeze({
    schemaVersion: "january-learning-answer-v1",
    practice: record.practice,
  });
}

export function parseJanuaryDefectAnswer(
  decisionId: unknown,
  value: unknown,
): JanuaryDefectAnswerV1 {
  requireDecisionId(decisionId, JANUARY_1990_DECISION_IDS.defect, "defect");
  const record = requireExactRecord(value, ["response", "schemaVersion"], "defect answer");
  if (record.schemaVersion !== "january-defect-answer-v1") {
    throw new TypeError("January defect answer has an incompatible schemaVersion");
  }
  if (
    record.response !== "inspect-listing" &&
    record.response !== "change-input" &&
    record.response !== "ask-for-guidance"
  ) {
    throw new TypeError(
      "January defect response must be inspect-listing, change-input or ask-for-guidance",
    );
  }
  return Object.freeze({
    schemaVersion: "january-defect-answer-v1",
    response: record.response,
  });
}

function requireDecisionId(value: unknown, expected: DecisionId, boundary: string): void {
  if (value !== expected) {
    throw new TypeError(`January ${boundary} answer does not match the pending decision`);
  }
}

function requireExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`January ${label} must be a plain JSON object`);
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).toSorted(compareText);
  if (!sameStrings(actualKeys, expectedKeys)) {
    throw new TypeError(`January ${label} field set does not match the closed contract`);
  }
  return record;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
