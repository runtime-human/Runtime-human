import type { Fingerprint } from "@runtime-human/game-schema";

import type { January1990ContentContext } from "./january-content-context";
import { JANUARY_1990_REQUIRED_CHUNK_IDS } from "./january-content-ids";

const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;
const PLAN_KEYS = [
  "contentFingerprint",
  "month",
  "program",
  "requiredChunkIds",
  "schemaVersion",
] as const;

export type January1990MonthPlanV1 = Readonly<{
  schemaVersion: "january-1990-month-plan-v1";
  month: "1990-01";
  program: "january-1990-v1";
  contentFingerprint: Fingerprint;
  requiredChunkIds: readonly ["1990s/ecosystem", "1990s/programming"];
}>;

export function createJanuary1990MonthPlan(
  context: January1990ContentContext,
): January1990MonthPlanV1 {
  requireJanuaryContext(context);
  return parseJanuary1990MonthPlan({
    schemaVersion: "january-1990-month-plan-v1",
    month: "1990-01",
    program: "january-1990-v1",
    contentFingerprint: context.contentFingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
  });
}

export function parseJanuary1990MonthPlan(value: unknown): January1990MonthPlanV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("January MonthPlan must be a plain JSON object");
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).toSorted(compareText);
  if (!sameStrings(actualKeys, PLAN_KEYS)) {
    throw new TypeError("January MonthPlan field set does not match the closed contract");
  }
  if (record.schemaVersion !== "january-1990-month-plan-v1") {
    throw new TypeError("January MonthPlan has an incompatible schemaVersion");
  }
  if (record.month !== "1990-01" || record.program !== "january-1990-v1") {
    throw new TypeError("January MonthPlan month or program does not match January 1990");
  }
  if (
    typeof record.contentFingerprint !== "string" ||
    !FINGERPRINT_PATTERN.test(record.contentFingerprint)
  ) {
    throw new TypeError("January MonthPlan contentFingerprint must be lowercase SHA-256");
  }
  if (!hasJanuaryChunks(record.requiredChunkIds)) {
    throw new TypeError("January MonthPlan requires the exact January content chunks");
  }

  return Object.freeze({
    schemaVersion: "january-1990-month-plan-v1",
    month: "1990-01",
    program: "january-1990-v1",
    contentFingerprint: record.contentFingerprint as Fingerprint,
    requiredChunkIds: JANUARY_1990_REQUIRED_CHUNK_IDS,
  });
}

function requireJanuaryContext(context: January1990ContentContext): void {
  if (
    context.schemaVersion !== "january-1990-content-context-v1" ||
    context.month !== "1990-01" ||
    !FINGERPRINT_PATTERN.test(context.contentFingerprint) ||
    !hasJanuaryChunks(context.requiredChunkIds)
  ) {
    throw new TypeError("January MonthPlan requires the verified January 1990 content context");
  }
}

function hasJanuaryChunks(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] === "1990s/ecosystem" &&
    value[1] === "1990s/programming"
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
