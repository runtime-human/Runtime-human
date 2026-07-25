export const JANUARY_1990_REASON_CODES = Object.freeze({
  homePcAccess: "january-1990.access.home-pc",
  sharedSchoolPcAccess: "january-1990.access.shared-school-pc",
  accessWindowEvent: "january-1990.event.access-window",
  manualFoundEvent: "january-1990.event.manual-found",
  editAndDebugLearning: "january-1990.learning.edit-and-debug",
  readAndRunLearning: "january-1990.learning.read-and-run",
  programRunsOutcome: "january-1990.outcome.program-runs",
  inputOutputProject: "january-1990.project.input-output",
  validationFixProject: "january-1990.project.validation-fix",
  logicErrorSituation: "january-1990.situation.logic-error",
  syntaxErrorSituation: "january-1990.situation.syntax-error",
} as const);

export type January1990ReasonCode =
  (typeof JANUARY_1990_REASON_CODES)[keyof typeof JANUARY_1990_REASON_CODES];
