import type { January1990ContentId } from "./january-content-ids";
import { JANUARY_1990_CONTENT_IDS } from "./january-content-ids";
import type { January1990ReasonCode } from "./january-reason-codes";
import { JANUARY_1990_REASON_CODES } from "./january-reason-codes";
import type {
  JanuaryAccessAnswerV1,
  JanuaryDefectAnswerV1,
  JanuaryLearningAnswerV1,
} from "./january-answers";

export type JanuaryEvidenceV1 = Readonly<{
  skillId: January1990ContentId;
  amount: number;
  reasonCode: January1990ReasonCode;
}>;

export type JanuaryProvisionalStateV1 = Readonly<{
  schemaVersion: "january-1990-provisional-state-v1";
  accessRoute: JanuaryAccessAnswerV1["route"] | null;
  learningPractice: JanuaryLearningAnswerV1["practice"] | null;
  workPackageId: January1990ContentId | null;
  defectEventId: January1990ContentId | null;
  defectResponse: JanuaryDefectAnswerV1["response"] | null;
  evidence: readonly JanuaryEvidenceV1[];
}>;

const STATE_KEYS = [
  "accessRoute",
  "defectEventId",
  "defectResponse",
  "evidence",
  "learningPractice",
  "schemaVersion",
  "workPackageId",
] as const;

const SKILL_IDS = new Set<January1990ContentId>([
  JANUARY_1990_CONTENT_IDS.debuggingSkill,
  JANUARY_1990_CONTENT_IDS.problemDecompositionSkill,
  JANUARY_1990_CONTENT_IDS.programReadingSkill,
  JANUARY_1990_CONTENT_IDS.programWritingSkill,
  JANUARY_1990_CONTENT_IDS.toolUseSkill,
]);

const REASON_CODES = new Set<January1990ReasonCode>(Object.values(JANUARY_1990_REASON_CODES));

export function createJanuaryInitialProvisionalState(): JanuaryProvisionalStateV1 {
  return freezeState({
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute: null,
    learningPractice: null,
    workPackageId: null,
    defectEventId: null,
    defectResponse: null,
    evidence: [],
  });
}

export function updateJanuaryProvisionalState(
  state: JanuaryProvisionalStateV1,
  changes: Partial<Omit<JanuaryProvisionalStateV1, "schemaVersion">>,
): JanuaryProvisionalStateV1 {
  return freezeState({
    ...state,
    ...changes,
    schemaVersion: "january-1990-provisional-state-v1",
  });
}

export function parseJanuaryProvisionalState(value: unknown): JanuaryProvisionalStateV1 {
  if (isEmptyRecord(value)) return createJanuaryInitialProvisionalState();
  const record = requireRecord(value, STATE_KEYS, "provisional state");
  if (record.schemaVersion !== "january-1990-provisional-state-v1") {
    throw new TypeError("January provisional state has an incompatible schemaVersion");
  }

  const accessRoute = parseNullableLiteral(
    record.accessRoute,
    ["home-pc", "shared-school-pc"] as const,
    "accessRoute",
  );
  const learningPractice = parseNullableLiteral(
    record.learningPractice,
    ["read-and-run", "edit-and-debug"] as const,
    "learningPractice",
  );
  const defectResponse = parseNullableLiteral(
    record.defectResponse,
    ["inspect-listing", "change-input", "ask-for-guidance"] as const,
    "defectResponse",
  );
  const workPackageId = parseNullableContentId(record.workPackageId, [
    JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
    JANUARY_1990_CONTENT_IDS.validationFixWorkPackage,
  ]);
  const defectEventId = parseNullableContentId(record.defectEventId, [
    JANUARY_1990_CONTENT_IDS.logicErrorEvent,
    JANUARY_1990_CONTENT_IDS.syntaxErrorEvent,
  ]);
  const evidence = parseEvidence(record.evidence);

  return freezeState({
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute,
    learningPractice,
    workPackageId,
    defectEventId,
    defectResponse,
    evidence,
  });
}

function parseEvidence(value: unknown): readonly JanuaryEvidenceV1[] {
  if (!Array.isArray(value)) throw new TypeError("January evidence must be an array");
  return Object.freeze(
    value.map((item) => {
      const record = requireRecord(item, ["amount", "reasonCode", "skillId"], "evidence item");
      if (typeof record.skillId !== "string" || !SKILL_IDS.has(record.skillId as January1990ContentId)) {
        throw new TypeError("January evidence skillId is not part of the January skill set");
      }
      if (!Number.isSafeInteger(record.amount) || (record.amount as number) <= 0) {
        throw new TypeError("January evidence amount must be a positive safe integer");
      }
      if (
        typeof record.reasonCode !== "string" ||
        !REASON_CODES.has(record.reasonCode as January1990ReasonCode)
      ) {
        throw new TypeError("January evidence reasonCode is not part of the January contract");
      }
      return Object.freeze({
        skillId: record.skillId as January1990ContentId,
        amount: record.amount as number,
        reasonCode: record.reasonCode as January1990ReasonCode,
      });
    }),
  );
}

function parseNullableContentId(
  value: unknown,
  allowed: readonly January1990ContentId[],
): January1990ContentId | null {
  if (value === null) return null;
  if (typeof value !== "string" || !allowed.includes(value as January1990ContentId)) {
    throw new TypeError("January provisional content ID is not allowed at this boundary");
  }
  return value as January1990ContentId;
}

function parseNullableLiteral<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] | null {
  if (value === null) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new TypeError(`January provisional ${field} has an invalid value`);
  }
  return value as T[number];
}

function freezeState(state: JanuaryProvisionalStateV1): JanuaryProvisionalStateV1 {
  const evidence = Object.freeze(state.evidence.map((item) => Object.freeze({ ...item })));
  return Object.freeze({ ...state, evidence });
}

function isEmptyRecord(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 0
  );
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
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).toSorted(compareText);
  const approvedKeys = [...expectedKeys].toSorted(compareText);
  if (!sameStrings(actualKeys, approvedKeys)) {
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
