export const JANUARY_1990_QUALITY_SCORE_MAXIMUMS = Object.freeze({
  clarity: 10,
  correctness: 11,
  reliability: 9,
} as const);

export type January1990QualityScores = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

export type January1990ResultSummary = Readonly<{
  month: "1990-01";
  projectId: string;
  outcomeEventId: string;
  qualityScores: January1990QualityScores;
}>;

const RESULT_FIELDS = Object.freeze([
  "month",
  "outcomeEventId",
  "programmingOutcome",
  "projectId",
  "schemaVersion",
] as const);

const PROGRAMMING_OUTCOME_FIELDS = Object.freeze([
  "accessRoute",
  "defectEventId",
  "defectResponse",
  "evidence",
  "learningPractice",
  "month",
  "outcomeEventId",
  "projectId",
  "qualityScores",
  "schemaVersion",
  "workPackageId",
] as const);
const QUALITY_SCORE_FIELDS = Object.freeze(["clarity", "correctness", "reliability"] as const);
const EVIDENCE_FIELDS = Object.freeze(["amount", "reasonCode", "skillId"] as const);

export function parseJanuary1990ResultSummary(value: unknown): January1990ResultSummary {
  const result = requireRecord(value, RESULT_FIELDS, "January result");
  if (result.schemaVersion !== "january-1990-result-v1" || result.month !== "1990-01") {
    throw new TypeError("January result schema or month is incompatible");
  }

  const projectId = requireNonEmptyString(result.projectId, "January projectId");
  const outcomeEventId = requireNonEmptyString(result.outcomeEventId, "January outcomeEventId");
  const programmingOutcome = requireRecord(
    result.programmingOutcome,
    PROGRAMMING_OUTCOME_FIELDS,
    "January programming outcome",
  );
  if (
    programmingOutcome.schemaVersion !== "january-1990-programming-outcome-v1" ||
    programmingOutcome.month !== "1990-01"
  ) {
    throw new TypeError("January programming outcome schema or month is incompatible");
  }
  if (
    programmingOutcome.projectId !== projectId ||
    programmingOutcome.outcomeEventId !== outcomeEventId
  ) {
    throw new TypeError("January result identity does not match its programming outcome");
  }

  requireNonEmptyString(programmingOutcome.workPackageId, "January workPackageId");
  requireNonEmptyString(programmingOutcome.defectEventId, "January defectEventId");
  requireOneOf(programmingOutcome.accessRoute, ["home-pc", "shared-school-pc"], "accessRoute");
  requireOneOf(
    programmingOutcome.learningPractice,
    ["read-and-run", "edit-and-debug"],
    "learningPractice",
  );
  requireOneOf(
    programmingOutcome.defectResponse,
    ["inspect-listing", "change-input", "ask-for-guidance"],
    "defectResponse",
  );
  requireEvidence(programmingOutcome.evidence);

  const qualityScores = requireRecord(
    programmingOutcome.qualityScores,
    QUALITY_SCORE_FIELDS,
    "January quality scores",
  );
  const scores = Object.freeze({
    clarity: requireScore(
      qualityScores.clarity,
      JANUARY_1990_QUALITY_SCORE_MAXIMUMS.clarity,
      "clarity",
    ),
    correctness: requireScore(
      qualityScores.correctness,
      JANUARY_1990_QUALITY_SCORE_MAXIMUMS.correctness,
      "correctness",
    ),
    reliability: requireScore(
      qualityScores.reliability,
      JANUARY_1990_QUALITY_SCORE_MAXIMUMS.reliability,
      "reliability",
    ),
  });

  return Object.freeze({
    month: "1990-01",
    projectId,
    outcomeEventId,
    qualityScores: scores,
  });
}

function requireRecord(
  value: unknown,
  expectedFields: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain JSON object`);
  }

  const record = value as Readonly<Record<string, unknown>>;
  const actualFields = Object.keys(record).toSorted(compareText);
  const approvedFields = [...expectedFields].toSorted(compareText);
  if (
    actualFields.length !== approvedFields.length ||
    !actualFields.every((field, index) => field === approvedFields[index])
  ) {
    throw new TypeError(`${label} field set does not match the closed contract`);
  }
  return record;
}

function requireEvidence(value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("January programming evidence must be a non-empty array");
  }
  for (const item of value) {
    const evidence = requireRecord(item, EVIDENCE_FIELDS, "January evidence item");
    requireNonEmptyString(evidence.skillId, "January evidence skillId");
    requireNonEmptyString(evidence.reasonCode, "January evidence reasonCode");
    if (!Number.isSafeInteger(evidence.amount) || (evidence.amount as number) <= 0) {
      throw new TypeError("January evidence amount must be a positive safe integer");
    }
  }
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requireOneOf(value: unknown, allowed: readonly string[], label: string): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new TypeError(`January ${label} is not supported`);
  }
}

function requireScore(value: unknown, maximum: number, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > maximum) {
    throw new TypeError(`January ${label} score must be a safe integer between 0 and ${maximum}`);
  }
  return value as number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
