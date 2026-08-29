import type { January1990ContentContext } from "./january-content-context";
import type { January1990ContentId } from "./january-content-ids";
import { JANUARY_1990_CONTENT_IDS } from "./january-content-ids";
import {
  JANUARY_1990_DEFAULT_BALANCE,
  deriveJanuaryQualityScoreMaximums,
  type January1990BalanceV1,
} from "./january-balance";
import {
  parseJanuaryProvisionalState,
  type JanuaryEvidenceV1,
  type JanuaryProvisionalStateV1,
  type JanuaryQualityScoresV1,
} from "./january-provisional-state";
import { JANUARY_1990_REASON_CODES } from "./january-reason-codes";

export const JANUARY_1990_QUALITY_SCORE_MAXIMUMS = deriveJanuaryQualityScoreMaximums(
  JANUARY_1990_DEFAULT_BALANCE.quality,
);

/**
 * Stable save-contract maxima used when parsing stored results; materialization
 * validates against the maxima derived from the active balance instead.
 */
const DEFAULT_RESULT_QUALITY_SCORE_MAXIMUMS = JANUARY_1990_QUALITY_SCORE_MAXIMUMS;

export type JanuaryProgrammingOutcomeV1 = Readonly<{
  schemaVersion: "january-1990-programming-outcome-v1";
  month: "1990-01";
  projectId: January1990ContentId;
  workPackageId: January1990ContentId;
  defectEventId: January1990ContentId;
  outcomeEventId: January1990ContentId;
  accessRoute: "home-pc" | "shared-school-pc";
  learningPractice: "read-and-run" | "edit-and-debug";
  defectResponse: "inspect-listing" | "change-input" | "ask-for-guidance";
  qualityScores: JanuaryQualityScoresV1;
  evidence: readonly JanuaryEvidenceV1[];
}>;

export type January1990ResultV1 = Readonly<{
  schemaVersion: "january-1990-result-v1";
  month: "1990-01";
  projectId: January1990ContentId;
  outcomeEventId: January1990ContentId;
  programmingOutcome: JanuaryProgrammingOutcomeV1;
}>;

const RESULT_KEYS = Object.freeze([
  "month",
  "outcomeEventId",
  "programmingOutcome",
  "projectId",
  "schemaVersion",
] as const);

const PROGRAMMING_OUTCOME_KEYS = Object.freeze([
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

export function parseJanuary1990Result(
  value: unknown,
  qualityScoreMaximums: JanuaryQualityScoresV1 = DEFAULT_RESULT_QUALITY_SCORE_MAXIMUMS,
): January1990ResultV1 {
  const result = requireRecord(value, RESULT_KEYS, "result");
  if (result.schemaVersion !== "january-1990-result-v1" || result.month !== "1990-01") {
    throw new TypeError("January result schema or month is incompatible");
  }

  const projectId = requireExactContentId(
    result.projectId,
    JANUARY_1990_CONTENT_IDS.personalUtilityProject,
    "result projectId",
  );
  const outcomeEventId = requireExactContentId(
    result.outcomeEventId,
    JANUARY_1990_CONTENT_IDS.programRunsEvent,
    "result outcomeEventId",
  );
  const programmingOutcomeRecord = requireRecord(
    result.programmingOutcome,
    PROGRAMMING_OUTCOME_KEYS,
    "programming outcome",
  );
  if (
    programmingOutcomeRecord.projectId !== projectId ||
    programmingOutcomeRecord.outcomeEventId !== outcomeEventId
  ) {
    throw new TypeError("January result identity does not match its programming outcome");
  }

  const programmingOutcome = parseJanuaryProgrammingOutcome(
    programmingOutcomeRecord,
    qualityScoreMaximums,
  );
  return Object.freeze({
    schemaVersion: "january-1990-result-v1",
    month: "1990-01",
    projectId,
    outcomeEventId,
    programmingOutcome,
  });
}

export function materializeJanuaryProgrammingState(
  state: JanuaryProvisionalStateV1,
  outcomeRoll: number,
  balance: January1990BalanceV1,
): Readonly<{
  qualityScores: JanuaryQualityScoresV1;
  evidence: readonly JanuaryEvidenceV1[];
}> {
  requireOutcomeRoll(outcomeRoll, balance.quality.outcomeRoll);
  const accessRoute = requireValue(state.accessRoute, "access route");
  const learningPractice = requireValue(state.learningPractice, "learning practice");
  const defectResponse = requireValue(state.defectResponse, "defect response");
  return Object.freeze({
    qualityScores: createQualityScores(
      balance.quality,
      accessRoute,
      learningPractice,
      defectResponse,
      outcomeRoll,
    ),
    evidence: createEvidence(balance.skillEvidence, accessRoute, learningPractice, defectResponse),
  });
}

export function createJanuaryProgrammingOutcomeFromState(
  context: January1990ContentContext,
  state: JanuaryProvisionalStateV1,
): JanuaryProgrammingOutcomeV1 {
  const accessRoute = requireValue(state.accessRoute, "access route");
  const learningPractice = requireValue(state.learningPractice, "learning practice");
  const workPackageId = requireValue(state.workPackageId, "work package");
  const defectEventId = requireValue(state.defectEventId, "defect event");
  const defectResponse = requireValue(state.defectResponse, "defect response");
  const qualityScores = requireValue(state.qualityScores, "quality scores");
  if (state.evidence.length === 0) {
    throw new TypeError("January programming evidence is missing before finalization");
  }

  requireContextId(context.project.id, JANUARY_1990_CONTENT_IDS.personalUtilityProject, "project");
  requireContextId(workPackageId, JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage, "work package");
  requireContextId(
    context.events.find((event) => event.id === JANUARY_1990_CONTENT_IDS.programRunsEvent)?.id,
    JANUARY_1990_CONTENT_IDS.programRunsEvent,
    "program-runs event",
  );

  return freezeProgrammingOutcome({
    schemaVersion: "january-1990-programming-outcome-v1",
    month: "1990-01",
    projectId: context.project.id,
    workPackageId,
    defectEventId,
    outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
    accessRoute,
    learningPractice,
    defectResponse,
    qualityScores,
    evidence: state.evidence,
  });
}

export function createJanuary1990Result(
  programmingOutcome: JanuaryProgrammingOutcomeV1,
  qualityScoreMaximums: JanuaryQualityScoresV1 = DEFAULT_RESULT_QUALITY_SCORE_MAXIMUMS,
): January1990ResultV1 {
  return parseJanuary1990Result(
    {
      schemaVersion: "january-1990-result-v1",
      month: "1990-01",
      projectId: programmingOutcome.projectId,
      outcomeEventId: programmingOutcome.outcomeEventId,
      programmingOutcome,
    },
    qualityScoreMaximums,
  );
}

function parseJanuaryProgrammingOutcome(
  record: Readonly<Record<string, unknown>>,
  qualityScoreMaximums: JanuaryQualityScoresV1,
): JanuaryProgrammingOutcomeV1 {
  if (
    record.schemaVersion !== "january-1990-programming-outcome-v1" ||
    record.month !== "1990-01"
  ) {
    throw new TypeError("January programming outcome schema or month is incompatible");
  }

  const state = parseJanuaryProvisionalState({
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute: record.accessRoute,
    learningPractice: record.learningPractice,
    workPackageId: record.workPackageId,
    defectEventId: record.defectEventId,
    defectResponse: record.defectResponse,
    evidence: record.evidence,
    qualityScores: record.qualityScores,
  });
  const accessRoute = requireValue(state.accessRoute, "access route");
  const learningPractice = requireValue(state.learningPractice, "learning practice");
  const workPackageId = requireValue(state.workPackageId, "work package");
  const defectEventId = requireValue(state.defectEventId, "defect event");
  const defectResponse = requireValue(state.defectResponse, "defect response");
  const qualityScores = requireValue(state.qualityScores, "quality scores");

  requireContextId(workPackageId, JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage, "work package");
  if (
    defectEventId !== JANUARY_1990_CONTENT_IDS.logicErrorEvent &&
    defectEventId !== JANUARY_1990_CONTENT_IDS.syntaxErrorEvent
  ) {
    throw new TypeError("January defectEventId is not part of the completed-month contract");
  }
  if (state.evidence.length === 0) {
    throw new TypeError("January programming evidence must be a non-empty array");
  }
  requireQualityScoreMaximums(qualityScores, qualityScoreMaximums);

  return freezeProgrammingOutcome({
    schemaVersion: "january-1990-programming-outcome-v1",
    month: "1990-01",
    projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
    workPackageId,
    defectEventId,
    outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
    accessRoute,
    learningPractice,
    defectResponse,
    qualityScores,
    evidence: state.evidence,
  });
}

function requireQualityScoreMaximums(
  scores: JanuaryQualityScoresV1,
  maximums: JanuaryQualityScoresV1,
): void {
  requireScoreMaximum(scores.clarity, maximums.clarity, "clarity");
  requireScoreMaximum(scores.correctness, maximums.correctness, "correctness");
  requireScoreMaximum(scores.reliability, maximums.reliability, "reliability");
}

function requireScoreMaximum(value: number, maximum: number, field: string): void {
  if (value > maximum) {
    throw new TypeError(`January ${field} score must be a safe integer between 0 and ${maximum}`);
  }
}

function requireExactContentId(
  value: unknown,
  expected: January1990ContentId,
  label: string,
): January1990ContentId {
  if (value !== expected) {
    throw new TypeError(`January ${label} does not match the approved context`);
  }
  return expected;
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

function createQualityScores(
  quality: January1990BalanceV1["quality"],
  accessRoute: JanuaryProgrammingOutcomeV1["accessRoute"],
  learningPractice: JanuaryProgrammingOutcomeV1["learningPractice"],
  defectResponse: JanuaryProgrammingOutcomeV1["defectResponse"],
  outcomeRoll: number,
): JanuaryQualityScoresV1 {
  const accessModifiers = quality.access[accessRoute];
  const learningModifiers = quality.learning[learningPractice];
  const defectModifiers = quality.defectResponse[defectResponse];
  if (
    accessModifiers === undefined ||
    learningModifiers === undefined ||
    defectModifiers === undefined
  ) {
    throw new TypeError("January quality balance table is missing an approved enum row");
  }

  return Object.freeze({
    clarity:
      quality.base.clarity + learningModifiers.clarity + defectModifiers.clarity + outcomeRoll,
    correctness:
      quality.base.correctness +
      learningModifiers.correctness +
      defectModifiers.correctness +
      outcomeRoll,
    reliability:
      quality.base.reliability +
      accessModifiers.reliability +
      defectModifiers.reliability +
      outcomeRoll,
  });
}

function createEvidence(
  skillEvidence: January1990BalanceV1["skillEvidence"],
  accessRoute: JanuaryProgrammingOutcomeV1["accessRoute"],
  learningPractice: JanuaryProgrammingOutcomeV1["learningPractice"],
  defectResponse: JanuaryProgrammingOutcomeV1["defectResponse"],
): readonly JanuaryEvidenceV1[] {
  const programWritingAmount = skillEvidence.programWriting[learningPractice];
  const debuggingAmount = skillEvidence.debugging[defectResponse];
  const toolUseAmount = skillEvidence.toolUse[accessRoute];
  if (
    programWritingAmount === undefined ||
    debuggingAmount === undefined ||
    toolUseAmount === undefined
  ) {
    throw new TypeError("January skill evidence balance table is missing an approved enum row");
  }

  return Object.freeze([
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.programWritingSkill,
      amount: programWritingAmount,
      reasonCode: JANUARY_1990_REASON_CODES.inputOutputProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
      amount: debuggingAmount,
      reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.toolUseSkill,
      amount: toolUseAmount,
      reasonCode:
        accessRoute === "home-pc"
          ? JANUARY_1990_REASON_CODES.homePcAccess
          : JANUARY_1990_REASON_CODES.sharedSchoolPcAccess,
    }),
  ]);
}

function freezeProgrammingOutcome(
  outcome: JanuaryProgrammingOutcomeV1,
): JanuaryProgrammingOutcomeV1 {
  return Object.freeze({
    ...outcome,
    qualityScores: Object.freeze({ ...outcome.qualityScores }),
    evidence: Object.freeze(outcome.evidence.map((item) => Object.freeze({ ...item }))),
  });
}

function requireOutcomeRoll(
  value: number,
  bounds: Readonly<{ minimum: number; maximum: number }>,
): void {
  if (!Number.isSafeInteger(value) || value < bounds.minimum || value > bounds.maximum) {
    throw new RangeError(
      `January outcome roll must be a safe integer between ${bounds.minimum} and ${bounds.maximum}`,
    );
  }
}

function requireValue<T>(value: T | null, label: string): T {
  if (value === null) throw new TypeError(`January ${label} is missing before finalization`);
  return value;
}

function requireContextId(
  actual: January1990ContentId | undefined,
  expected: January1990ContentId,
  label: string,
): void {
  if (actual !== expected) {
    throw new TypeError(`January ${label} does not match the approved context`);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
