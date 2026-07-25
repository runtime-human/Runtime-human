import {
  createJanuary1990MonthPlan,
  parseJanuaryAccessAnswer,
  parseJanuaryDefectAnswer,
  parseJanuaryLearningAnswer,
  Xoshiro256StarStar,
  type January1990ContentContext,
} from "@runtime-human/game-core";
import {
  parseDecisionId,
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
  type BeginMonthCommandV1,
  type DecisionId,
  type MonthRunCompatibilityV1,
  type MonthRunId,
  type MonthRunRevision,
  type RequestId,
  type ResumeMonthCommandV1,
  type SaveId,
  type SaveRevision,
} from "@runtime-human/game-schema";

export type January1990BeginInput = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  runId: MonthRunId;
  seed: bigint;
}>;

export type January1990ResumeInput = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
}>;

export function createJanuary1990BeginCommand(
  context: January1990ContentContext,
  compatibility: MonthRunCompatibilityV1,
  input: January1990BeginInput,
): BeginMonthCommandV1 {
  return Object.freeze({
    schemaVersion: "begin-month-command-v1",
    requestId: parseRequestId(input.requestId),
    saveId: parseSaveId(input.saveId),
    expectedSaveRevision: parseSaveRevision(input.expectedSaveRevision),
    runId: parseMonthRunId(input.runId),
    plan: createJanuary1990MonthPlan(context),
    compatibility,
    initialRngState: Xoshiro256StarStar.fromSeed(input.seed).exportState(),
  });
}

export function createJanuary1990ResumeCommand(
  input: January1990ResumeInput,
): ResumeMonthCommandV1 {
  const decisionId = parseDecisionId(input.decisionId);
  const answer = parseJanuaryDecisionAnswer(decisionId, input.answer);
  return Object.freeze({
    schemaVersion: "resume-month-command-v1",
    requestId: parseRequestId(input.requestId),
    saveId: parseSaveId(input.saveId),
    runId: parseMonthRunId(input.runId),
    expectedRunRevision: parseMonthRunRevision(input.expectedRunRevision),
    decisionId,
    answer,
  });
}

function parseJanuaryDecisionAnswer(
  decisionId: DecisionId,
  answer: AuthoritativeJsonValue,
): AuthoritativeJsonValue {
  switch (decisionId) {
    case "january-1990/access":
      return parseJanuaryAccessAnswer(decisionId, answer);
    case "january-1990/learning":
      return parseJanuaryLearningAnswer(decisionId, answer);
    case "january-1990/defect":
      return parseJanuaryDefectAnswer(decisionId, answer);
    default:
      throw new TypeError(`Decision ${decisionId} is not part of the January 1990 runtime`);
  }
}
