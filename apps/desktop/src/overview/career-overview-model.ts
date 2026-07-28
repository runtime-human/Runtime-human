import {
  parseJanuary1990ResultSummary,
  type January1990QualityScores,
} from "@runtime-human/game-application";
import type {
  MonthRunId,
  MonthRunRevision,
  SaveId,
  SaveRevision,
} from "@runtime-human/game-schema";

import type { JanuarySessionView } from "../january/january-session-controller";

export type CareerOverviewView =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "new-career"; saveId: SaveId | null }>
  | Readonly<{
      kind: "active-month";
      month: "1990-01";
      stage: "access" | "learning" | "defect";
      progress: 28 | 52 | 76;
      saveId: SaveId;
      runId: MonthRunId;
      runRevision: MonthRunRevision;
    }>
  | Readonly<{
      kind: "completed-month";
      month: "1990-01";
      saveId: SaveId;
      runId: MonthRunId;
      saveRevision: SaveRevision;
      qualityScores: January1990QualityScores;
    }>
  | Readonly<{
      kind: "terminal";
      status: "failed" | "incompatible" | "recovery-required" | "abandoned";
      saveId: SaveId;
      runId: MonthRunId;
    }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "recovery"
        | "incompatible-persistence"
        | "incompatible-checkpoint"
        | "corrupted-checkpoint"
        | "invalid-result";
      message: string;
    }>
  | Readonly<{
      kind: "rejected";
      code: string;
      message: string;
      retryable: boolean;
    }>;

export function projectCareerOverviewView(view: JanuarySessionView): CareerOverviewView {
  switch (view.kind) {
    case "loading":
      return Object.freeze({ kind: "loading" });
    case "idle":
      return Object.freeze({
        kind: "new-career",
        saveId: view.saveId,
      });
    case "access-decision":
      return activeMonth(view, "access", 28);
    case "learning-decision":
      return activeMonth(view, "learning", 52);
    case "defect-decision":
      return activeMonth(view, "defect", 76);
    case "committed": {
      try {
        const summary = parseJanuary1990ResultSummary(view.result);
        return Object.freeze({
          kind: "completed-month",
          month: summary.month,
          saveId: view.saveId,
          runId: view.runId,
          saveRevision: view.saveRevision,
          qualityScores: summary.qualityScores,
        });
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        return Object.freeze({
          kind: "blocked",
          reason: "invalid-result",
          message: "Сохранённый результат января не соответствует поддерживаемому формату.",
        });
      }
    }
    case "terminal":
      return Object.freeze({
        kind: "terminal",
        status: view.status,
        saveId: view.saveId,
        runId: view.runId,
      });
    case "blocked":
      return Object.freeze({
        kind: "blocked",
        reason: view.reason,
        message: view.message,
      });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        code: view.code,
        message: view.message,
        retryable: view.retryable,
      });
  }
}

function activeMonth(
  view: Extract<
    JanuarySessionView,
    { kind: "access-decision" | "learning-decision" | "defect-decision" }
  >,
  stage: "access" | "learning" | "defect",
  progress: 28 | 52 | 76,
): Extract<CareerOverviewView, { kind: "active-month" }> {
  return Object.freeze({
    kind: "active-month",
    month: "1990-01",
    stage,
    progress,
    saveId: view.saveId,
    runId: view.runId,
    runRevision: view.runRevision,
  });
}
