import type { January1990ContentContext } from "./january-content-context";
import type { January1990ContentId } from "./january-content-ids";
import { JANUARY_1990_CONTENT_IDS } from "./january-content-ids";
import type {
  JanuaryEvidenceV1,
  JanuaryProvisionalStateV1,
  JanuaryQualityScoresV1,
} from "./january-provisional-state";
import { JANUARY_1990_REASON_CODES } from "./january-reason-codes";

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

export function materializeJanuaryProgrammingState(
  state: JanuaryProvisionalStateV1,
  outcomeRoll: number,
): Readonly<{
  qualityScores: JanuaryQualityScoresV1;
  evidence: readonly JanuaryEvidenceV1[];
}> {
  requireOutcomeRoll(outcomeRoll);
  const accessRoute = requireValue(state.accessRoute, "access route");
  const learningPractice = requireValue(state.learningPractice, "learning practice");
  const defectResponse = requireValue(state.defectResponse, "defect response");
  return Object.freeze({
    qualityScores: createQualityScores(
      accessRoute,
      learningPractice,
      defectResponse,
      outcomeRoll,
    ),
    evidence: createEvidence(accessRoute, learningPractice, defectResponse),
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
): January1990ResultV1 {
  return Object.freeze({
    schemaVersion: "january-1990-result-v1",
    month: "1990-01",
    projectId: programmingOutcome.projectId,
    outcomeEventId: programmingOutcome.outcomeEventId,
    programmingOutcome,
  });
}

function createQualityScores(
  accessRoute: JanuaryProgrammingOutcomeV1["accessRoute"],
  learningPractice: JanuaryProgrammingOutcomeV1["learningPractice"],
  defectResponse: JanuaryProgrammingOutcomeV1["defectResponse"],
  outcomeRoll: number,
): JanuaryQualityScoresV1 {
  const accessValue = accessRoute === "home-pc" ? 2 : 1;
  const learningValue = learningPractice === "edit-and-debug" ? 3 : 2;
  const defectValue =
    defectResponse === "inspect-listing" ? 3 : defectResponse === "change-input" ? 2 : 1;

  return Object.freeze({
    clarity: 3 + learningValue + (defectResponse === "inspect-listing" ? 2 : 1) + outcomeRoll,
    correctness: 3 + learningValue + defectValue + outcomeRoll,
    reliability:
      3 + accessValue + (defectResponse === "change-input" ? 2 : 1) + outcomeRoll,
  });
}

function createEvidence(
  accessRoute: JanuaryProgrammingOutcomeV1["accessRoute"],
  learningPractice: JanuaryProgrammingOutcomeV1["learningPractice"],
  defectResponse: JanuaryProgrammingOutcomeV1["defectResponse"],
): readonly JanuaryEvidenceV1[] {
  return Object.freeze([
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.programWritingSkill,
      amount: learningPractice === "edit-and-debug" ? 2 : 1,
      reasonCode: JANUARY_1990_REASON_CODES.inputOutputProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
      amount: defectResponse === "ask-for-guidance" ? 1 : 2,
      reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.toolUseSkill,
      amount: accessRoute === "home-pc" ? 2 : 1,
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

function requireOutcomeRoll(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2) {
    throw new RangeError("January outcome roll must be a safe integer between 0 and 2");
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
  if (actual !== expected) throw new TypeError(`January ${label} does not match the approved context`);
}
