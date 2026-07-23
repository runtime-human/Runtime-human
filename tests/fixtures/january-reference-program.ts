import { fingerprint, type MonthRunStep } from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
  type BeginMonthCommandV1,
  type MonthRunCheckpointV1,
  type ResumeMonthCommandV1,
} from "@runtime-human/game-schema";
import type { SaveRecordV1 } from "@runtime-human/game-persistence-contracts";

export const JANUARY_SAVE_ID = parseSaveId("save-january-1990");
export const JANUARY_RUN_ID = parseMonthRunId("run-january-1990");
export const JANUARY_DECISION_ID = parseDecisionId("decision-january-approach");
export const JANUARY_SAVE_REVISION = parseSaveRevision(0);

export const JANUARY_COMPATIBILITY = {
  checkpointSchema: "month-run-checkpoint-v1" as const,
  rulesFingerprint: fingerprint("january-reference-rules", 1),
  contentFingerprint: fingerprint("january-reference-content", 1),
  saveSchemaFingerprint: fingerprint("january-reference-save", 1),
  determinismManifest: DETERMINISM_MANIFEST_V1,
};

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);

export const JANUARY_STEPS: readonly MonthRunStep[] = [
  () => ({ type: "start" }),
  (checkpoint) => ({
    type: "materialize-outcome",
    outcomeId: "january-computer-access",
    scope: "learning-access",
    payload: { access: "shared-home-computer", month: "1990-01" },
    phase: "materialize",
    provisionalState: { accessReady: true },
    rngState: checkpoint.rngState,
  }),
  () => ({
    type: "suspend-for-decision",
    decision: {
      decisionId: JANUARY_DECISION_ID,
      kind: "programming-approach",
      prompt: {
        title: "Первая программа",
        options: ["independent", "guided"],
      },
      answerSchemaFingerprint: fingerprint("january-answer-schema", 1),
    },
  }),
  (checkpoint) => ({
    type: "complete",
    result: {
      month: "1990-01",
      answer: checkpoint.acceptedDecisions.at(-1)?.answer ?? null,
      outcomeIds: checkpoint.materializedOutcomes.map((outcome) => outcome.outcomeId),
    },
  }),
];

export function januaryBeginCommand(requestId = "begin-january-1990"): BeginMonthCommandV1 {
  return {
    schemaVersion: "begin-month-command-v1",
    requestId: parseRequestId(requestId),
    saveId: JANUARY_SAVE_ID,
    expectedSaveRevision: JANUARY_SAVE_REVISION,
    runId: JANUARY_RUN_ID,
    plan: { month: "1990-01", program: "january-reference-v1" },
    compatibility: JANUARY_COMPATIBILITY,
    initialRngState: RNG_STATE,
  };
}

export function januaryResumeCommand(
  checkpoint: MonthRunCheckpointV1,
  requestId = "resume-january-1990",
): ResumeMonthCommandV1 {
  return {
    schemaVersion: "resume-month-command-v1",
    requestId: parseRequestId(requestId),
    saveId: JANUARY_SAVE_ID,
    runId: JANUARY_RUN_ID,
    expectedRunRevision: parseMonthRunRevision(checkpoint.runRevision),
    decisionId: JANUARY_DECISION_ID,
    answer: { option: "independent" },
  };
}

export function materializeJanuaryCommit(
  input: Readonly<{
    save: SaveRecordV1;
    completedCheckpoint: MonthRunCheckpointV1;
  }>,
) {
  return {
    snapshot: {
      schemaVersion: "january-save-v1",
      completedMonth: "1990-01",
      previousRevision: input.save.revision,
      terminalResult: input.completedCheckpoint.terminalResult,
    },
    result: {
      month: "1990-01",
      runId: input.completedCheckpoint.runId,
      terminalResult: input.completedCheckpoint.terminalResult,
    },
  } as const;
}
