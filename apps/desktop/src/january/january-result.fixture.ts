import {
  createJanuary1990Result,
  JANUARY_1990_CONTENT_IDS,
  JANUARY_1990_REASON_CODES,
  type JanuaryProgrammingOutcomeV1,
} from "@runtime-human/game-core";

const PROGRAMMING_OUTCOME = Object.freeze({
  schemaVersion: "january-1990-programming-outcome-v1",
  month: "1990-01",
  projectId: JANUARY_1990_CONTENT_IDS.personalUtilityProject,
  workPackageId: JANUARY_1990_CONTENT_IDS.inputOutputWorkPackage,
  defectEventId: JANUARY_1990_CONTENT_IDS.logicErrorEvent,
  outcomeEventId: JANUARY_1990_CONTENT_IDS.programRunsEvent,
  accessRoute: "home-pc",
  learningPractice: "edit-and-debug",
  defectResponse: "inspect-listing",
  qualityScores: Object.freeze({
    clarity: 8,
    correctness: 10,
    reliability: 7,
  }),
  evidence: Object.freeze([
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.programWritingSkill,
      amount: 2,
      reasonCode: JANUARY_1990_REASON_CODES.inputOutputProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.debuggingSkill,
      amount: 2,
      reasonCode: JANUARY_1990_REASON_CODES.validationFixProject,
    }),
    Object.freeze({
      skillId: JANUARY_1990_CONTENT_IDS.toolUseSkill,
      amount: 2,
      reasonCode: JANUARY_1990_REASON_CODES.homePcAccess,
    }),
  ]),
} satisfies JanuaryProgrammingOutcomeV1);

export function createJanuary1990ResultFixture() {
  return createJanuary1990Result(PROGRAMMING_OUTCOME);
}
