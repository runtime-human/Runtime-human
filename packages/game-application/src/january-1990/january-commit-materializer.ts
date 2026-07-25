import {
  parseJanuary1990MonthPlan,
  snapshotAuthoritativeValue,
} from "@runtime-human/game-core";

import type { PersistedMonthRunCommitMaterializer } from "../persisted-month-run-types";

export const materializeJanuary1990Commit: PersistedMonthRunCommitMaterializer = ({
  save,
  completedCheckpoint,
}) => {
  if (completedCheckpoint.status !== "completed" || completedCheckpoint.terminalResult === null) {
    throw new TypeError("January commit requires a completed checkpoint with a terminal result");
  }
  const plan = parseJanuary1990MonthPlan(completedCheckpoint.plan);
  const previousSnapshot = parsePreviousSnapshot(save.snapshot.json);
  const outcomes = completedCheckpoint.materializedOutcomes.map((outcome) => ({
    outcomeId: outcome.outcomeId,
    scope: outcome.scope,
    payload: outcome.payload,
    payloadHash: outcome.payloadHash,
  }));

  return Object.freeze({
    snapshot: snapshotAuthoritativeValue({
      schemaVersion: "january-1990-save-snapshot-v1",
      previousSnapshot,
      completedMonth: {
        month: plan.month,
        runId: completedCheckpoint.runId,
        baseSaveRevision: completedCheckpoint.baseSaveRevision,
        completedCheckpointHash: completedCheckpoint.checkpointHash,
        terminalResult: completedCheckpoint.terminalResult,
        outcomes,
      },
    }),
    result: snapshotAuthoritativeValue({
      schemaVersion: "january-1990-commit-result-v1",
      month: plan.month,
      runId: completedCheckpoint.runId,
      checkpointHash: completedCheckpoint.checkpointHash,
      terminalResult: completedCheckpoint.terminalResult,
    }),
  });
};

function parsePreviousSnapshot(json: string) {
  try {
    return snapshotAuthoritativeValue(JSON.parse(json) as unknown);
  } catch (error) {
    throw new TypeError(
      `Persisted save snapshot is not valid authoritative JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
