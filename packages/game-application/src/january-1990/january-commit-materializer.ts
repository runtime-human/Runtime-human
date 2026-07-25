import { parseJanuary1990MonthPlan, snapshotAuthoritativeValue } from "@runtime-human/game-core";

import type { PersistedMonthRunCommitMaterializer } from "../persisted-month-run-types";
import { parseJanuary1990SaveSnapshot } from "./january-save-snapshot";

export const materializeJanuary1990Commit: PersistedMonthRunCommitMaterializer = ({
  save,
  completedCheckpoint,
}) => {
  if (completedCheckpoint.status !== "completed" || completedCheckpoint.terminalResult === null) {
    throw new TypeError("January commit requires a completed checkpoint with a terminal result");
  }
  const previousSnapshot = parseJanuary1990SaveSnapshot(parsePersistedJson(save.snapshot.json));
  if (previousSnapshot.completedMonth !== null) {
    throw new TypeError("January save snapshot already contains a completed month");
  }
  const plan = parseJanuary1990MonthPlan(completedCheckpoint.plan);
  const snapshot = parseJanuary1990SaveSnapshot({
    schemaVersion: "january-1990-save-snapshot-v1",
    completedMonth: {
      schemaVersion: "january-1990-completed-month-v1",
      month: plan.month,
      runId: completedCheckpoint.runId,
      baseSaveRevision: completedCheckpoint.baseSaveRevision,
      completedCheckpointHash: completedCheckpoint.checkpointHash,
      terminalResult: completedCheckpoint.terminalResult,
      outcomes: completedCheckpoint.materializedOutcomes.map((outcome) => ({
        outcomeId: outcome.outcomeId,
        scope: outcome.scope,
        payload: outcome.payload,
        payloadHash: outcome.payloadHash,
      })),
    },
  });

  return Object.freeze({
    snapshot,
    result: snapshotAuthoritativeValue({
      schemaVersion: "january-1990-commit-result-v1",
      month: plan.month,
      runId: completedCheckpoint.runId,
      checkpointHash: completedCheckpoint.checkpointHash,
      terminalResult: completedCheckpoint.terminalResult,
    }),
  });
};

function parsePersistedJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    throw new TypeError(
      `Persisted save snapshot is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
