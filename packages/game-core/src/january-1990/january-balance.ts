import type { Fingerprint } from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import type { JanuaryQualityScoresV1 } from "./january-provisional-state";

export const JANUARY_1990_BALANCE_SCHEMA_VERSION = "january-1990-balance-v1" as const;
export const JANUARY_1990_BALANCE_SLICE_ID = "january-1990" as const;

const BASE_SCORE_RANGE = Object.freeze({ minimum: 0, maximum: 100 } as const);
const MODIFIER_RANGE = Object.freeze({ minimum: 0, maximum: 10 } as const);
const OUTCOME_ROLL_BOUND_RANGE = Object.freeze({ minimum: 0, maximum: 10 } as const);
const EVIDENCE_AMOUNT_RANGE = Object.freeze({ minimum: 1, maximum: 10 } as const);

export type JanuaryBalanceAccessRoute = "home-pc" | "shared-school-pc";
export type JanuaryBalanceLearningPractice = "read-and-run" | "edit-and-debug";
export type JanuaryBalanceDefectResponse = "inspect-listing" | "change-input" | "ask-for-guidance";

export type JanuaryQualityModifiersV1 = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

export type JanuaryQualityBalanceV1 = Readonly<{
  base: JanuaryQualityScoresV1;
  access: Readonly<Record<JanuaryBalanceAccessRoute, JanuaryQualityModifiersV1>>;
  learning: Readonly<Record<JanuaryBalanceLearningPractice, JanuaryQualityModifiersV1>>;
  defectResponse: Readonly<Record<JanuaryBalanceDefectResponse, JanuaryQualityModifiersV1>>;
  outcomeRoll: Readonly<{ minimum: number; maximum: number }>;
}>;

export type JanuarySkillEvidenceBalanceV1 = Readonly<{
  programWriting: Readonly<Record<JanuaryBalanceLearningPractice, number>>;
  debugging: Readonly<Record<JanuaryBalanceDefectResponse, number>>;
  toolUse: Readonly<Record<JanuaryBalanceAccessRoute, number>>;
}>;

export type January1990BalanceV1 = Readonly<{
  schemaVersion: typeof JANUARY_1990_BALANCE_SCHEMA_VERSION;
  sliceId: typeof JANUARY_1990_BALANCE_SLICE_ID;
  quality: JanuaryQualityBalanceV1;
  skillEvidence: JanuarySkillEvidenceBalanceV1;
}>;

const ACCESS_ROUTES: readonly JanuaryBalanceAccessRoute[] = ["home-pc", "shared-school-pc"];
const LEARNING_PRACTICES: readonly JanuaryBalanceLearningPractice[] = [
  "read-and-run",
  "edit-and-debug",
];
const DEFECT_RESPONSES: readonly JanuaryBalanceDefectResponse[] = [
  "inspect-listing",
  "change-input",
  "ask-for-guidance",
];

export function parseJanuary1990Balance(value: unknown): January1990BalanceV1 {
  const record = requireRecord(
    value,
    ["quality", "schemaVersion", "skillEvidence", "sliceId"],
    "balance",
  );
  if (record.schemaVersion !== JANUARY_1990_BALANCE_SCHEMA_VERSION) {
    throw new TypeError("January balance schemaVersion is incompatible");
  }
  if (record.sliceId !== JANUARY_1990_BALANCE_SLICE_ID) {
    throw new TypeError("January balance sliceId does not match the closed slice contract");
  }
  return freezeBalance({
    schemaVersion: JANUARY_1990_BALANCE_SCHEMA_VERSION,
    sliceId: JANUARY_1990_BALANCE_SLICE_ID,
    quality: parseQualityBalance(record.quality),
    skillEvidence: parseSkillEvidenceBalance(record.skillEvidence),
  });
}

export function deriveJanuaryQualityScoreMaximums(
  quality: JanuaryQualityBalanceV1,
): JanuaryQualityScoresV1 {
  return Object.freeze({
    clarity: deriveQualityMaximum(quality, "clarity"),
    correctness: deriveQualityMaximum(quality, "correctness"),
    reliability: deriveQualityMaximum(quality, "reliability"),
  });
}

export function createJanuary1990BalanceFingerprint(balance: January1990BalanceV1): Fingerprint {
  return fingerprint("january-1990-balance-v1", balance);
}

export const JANUARY_1990_DEFAULT_BALANCE: January1990BalanceV1 = parseJanuary1990Balance({
  schemaVersion: JANUARY_1990_BALANCE_SCHEMA_VERSION,
  sliceId: JANUARY_1990_BALANCE_SLICE_ID,
  quality: {
    base: { clarity: 3, correctness: 3, reliability: 3 },
    access: {
      "home-pc": { clarity: 0, correctness: 0, reliability: 2 },
      "shared-school-pc": { clarity: 0, correctness: 0, reliability: 1 },
    },
    learning: {
      "read-and-run": { clarity: 2, correctness: 2, reliability: 0 },
      "edit-and-debug": { clarity: 3, correctness: 3, reliability: 0 },
    },
    defectResponse: {
      "inspect-listing": { clarity: 2, correctness: 3, reliability: 1 },
      "change-input": { clarity: 1, correctness: 2, reliability: 2 },
      "ask-for-guidance": { clarity: 1, correctness: 1, reliability: 1 },
    },
    outcomeRoll: { minimum: 0, maximum: 2 },
  },
  skillEvidence: {
    programWriting: { "read-and-run": 1, "edit-and-debug": 2 },
    debugging: { "inspect-listing": 2, "change-input": 2, "ask-for-guidance": 1 },
    toolUse: { "home-pc": 2, "shared-school-pc": 1 },
  },
});

function parseQualityBalance(value: unknown): JanuaryQualityBalanceV1 {
  const record = requireRecord(
    value,
    ["access", "base", "defectResponse", "learning", "outcomeRoll"],
    "quality balance",
  );
  const outcomeRoll = parseOutcomeRoll(record.outcomeRoll);
  return {
    base: parseBaseScores(record.base),
    access: parseModifierTable(record.access, ACCESS_ROUTES, "quality access"),
    learning: parseModifierTable(record.learning, LEARNING_PRACTICES, "quality learning"),
    defectResponse: parseModifierTable(
      record.defectResponse,
      DEFECT_RESPONSES,
      "quality defect response",
    ),
    outcomeRoll,
  };
}

function parseOutcomeRoll(value: unknown): Readonly<{ minimum: number; maximum: number }> {
  const record = requireRecord(value, ["maximum", "minimum"], "quality outcome roll");
  const minimum = requireRangeBound(record.minimum, "outcome roll minimum");
  const maximum = requireRangeBound(record.maximum, "outcome roll maximum");
  if (minimum > maximum) {
    throw new RangeError("January outcome roll minimum must not exceed its maximum");
  }
  return Object.freeze({ minimum, maximum });
}

function parseBaseScores(value: unknown): JanuaryQualityScoresV1 {
  const record = requireRecord(value, ["clarity", "correctness", "reliability"], "quality base");
  return Object.freeze({
    clarity: requireIntegerInRange(record.clarity, BASE_SCORE_RANGE, "base clarity"),
    correctness: requireIntegerInRange(record.correctness, BASE_SCORE_RANGE, "base correctness"),
    reliability: requireIntegerInRange(record.reliability, BASE_SCORE_RANGE, "base reliability"),
  });
}

function parseModifierTable(
  value: unknown,
  allowedKeys: readonly string[],
  label: string,
): Readonly<Record<string, JanuaryQualityModifiersV1>> {
  const record = requireRecord(value, allowedKeys, label);
  const result: Record<string, JanuaryQualityModifiersV1> = {};
  for (const key of allowedKeys) {
    result[key] = parseModifiers(record[key], `${label} ${key}`);
  }
  return Object.freeze(result);
}

function parseModifiers(value: unknown, label: string): JanuaryQualityModifiersV1 {
  const record = requireRecord(value, ["clarity", "correctness", "reliability"], label);
  return Object.freeze({
    clarity: requireIntegerInRange(record.clarity, MODIFIER_RANGE, `${label} clarity`),
    correctness: requireIntegerInRange(record.correctness, MODIFIER_RANGE, `${label} correctness`),
    reliability: requireIntegerInRange(record.reliability, MODIFIER_RANGE, `${label} reliability`),
  });
}

function parseSkillEvidenceBalance(value: unknown): JanuarySkillEvidenceBalanceV1 {
  const record = requireRecord(
    value,
    ["debugging", "programWriting", "toolUse"],
    "skill evidence balance",
  );
  return Object.freeze({
    programWriting: parseAmountTable(record.programWriting, LEARNING_PRACTICES, "program writing"),
    debugging: parseAmountTable(record.debugging, DEFECT_RESPONSES, "debugging"),
    toolUse: parseAmountTable(record.toolUse, ACCESS_ROUTES, "tool use"),
  });
}

function parseAmountTable(
  value: unknown,
  allowedKeys: readonly string[],
  label: string,
): Readonly<Record<string, number>> {
  const record = requireRecord(value, allowedKeys, label);
  const result: Record<string, number> = {};
  for (const key of allowedKeys) {
    result[key] = requireIntegerInRange(
      record[key],
      EVIDENCE_AMOUNT_RANGE,
      `${label} ${key} evidence amount`,
    );
  }
  return Object.freeze(result);
}

function deriveQualityMaximum(
  quality: JanuaryQualityBalanceV1,
  dimension: keyof JanuaryQualityModifiersV1,
): number {
  return (
    quality.base[dimension] +
    maxModifier(quality.access, dimension) +
    maxModifier(quality.learning, dimension) +
    maxModifier(quality.defectResponse, dimension) +
    quality.outcomeRoll.maximum
  );
}

function maxModifier(
  table: Readonly<Record<string, JanuaryQualityModifiersV1>>,
  dimension: keyof JanuaryQualityModifiersV1,
): number {
  let maximum = Number.NEGATIVE_INFINITY;
  for (const key of Object.keys(table)) {
    const value = table[key]?.[dimension];
    if (value === undefined) {
      throw new TypeError(`January quality table is missing the ${dimension} modifier`);
    }
    maximum = Math.max(maximum, value);
  }
  if (!Number.isFinite(maximum)) {
    throw new TypeError(`January quality table has no ${dimension} modifier rows`);
  }
  return maximum;
}

function requireIntegerInRange(
  value: unknown,
  range: Readonly<{ minimum: number; maximum: number }>,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < range.minimum ||
    (value as number) > range.maximum
  ) {
    throw new RangeError(
      `January ${label} must be a safe integer between ${range.minimum} and ${range.maximum}`,
    );
  }
  return value as number;
}

function requireRangeBound(value: unknown, label: string): number {
  return requireIntegerInRange(value, OUTCOME_ROLL_BOUND_RANGE, label);
}

function freezeBalance(balance: January1990BalanceV1): January1990BalanceV1 {
  return Object.freeze({
    ...balance,
    quality: freezeQualityBalance(balance.quality),
    skillEvidence: Object.freeze({ ...balance.skillEvidence }),
  });
}

function freezeQualityBalance(quality: JanuaryQualityBalanceV1): JanuaryQualityBalanceV1 {
  return Object.freeze({
    base: Object.freeze({ ...quality.base }),
    access: freezeModifierTable(quality.access),
    learning: freezeModifierTable(quality.learning),
    defectResponse: freezeModifierTable(quality.defectResponse),
    outcomeRoll: Object.freeze({ ...quality.outcomeRoll }),
  });
}

function freezeModifierTable(
  table: Readonly<Record<string, JanuaryQualityModifiersV1>>,
): Readonly<Record<string, JanuaryQualityModifiersV1>> {
  const frozen: Record<string, JanuaryQualityModifiersV1> = {};
  for (const [key, value] of Object.entries(table)) {
    frozen[key] = Object.freeze({ ...value });
  }
  return Object.freeze(frozen);
}

function requireRecord(
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
  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record).toSorted(compareText);
  const approvedKeys = [...expectedKeys].toSorted(compareText);
  if (
    actualKeys.length !== approvedKeys.length ||
    !actualKeys.every((key, index) => key === approvedKeys[index])
  ) {
    throw new TypeError(`January ${label} field set does not match the closed contract`);
  }
  return record;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
