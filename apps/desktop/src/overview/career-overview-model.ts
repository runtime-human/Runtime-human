import type { January1990QualityScores } from "@runtime-human/game-application";
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
  if (view.kind === "idle") {
    return Object.freeze({
      kind: "new-career",
      saveId: view.saveId,
    });
  }

  throw new TypeError(`Unsupported Career Overview session state: ${view.kind}`);
}
