import type {
  AuthoritativeJsonValue,
  Fingerprint,
  MonthRunId,
  MonthRunRevision,
  SaveId,
  SaveRevision,
} from "@runtime-human/game-schema";

import type { PersistedMonthRunResult } from "../persisted-month-run-types";

export type January1990DecisionViewKind =
  | "access-decision"
  | "learning-decision"
  | "defect-decision";

export type January1990RuntimeView =
  | Readonly<{
      kind: "idle";
      saveId: SaveId | null;
      saveRevision: SaveRevision | null;
    }>
  | Readonly<{
      kind: January1990DecisionViewKind;
      saveId: SaveId;
      runId: MonthRunId;
      runRevision: MonthRunRevision;
      checkpointHash: Fingerprint;
      prompt: AuthoritativeJsonValue;
    }>
  | Readonly<{
      kind: "committed";
      saveId: SaveId;
      runId: MonthRunId;
      saveRevision: SaveRevision;
      checkpointHash: Fingerprint;
      result: AuthoritativeJsonValue;
    }>
  | Readonly<{
      kind: "terminal";
      saveId: SaveId;
      runId: MonthRunId;
      checkpointHash: Fingerprint;
      status: "failed" | "incompatible" | "recovery-required" | "abandoned";
      reason: AuthoritativeJsonValue | null;
    }>
  | Readonly<{
      kind: "blocked";
      reason:
        | "recovery"
        | "incompatible-persistence"
        | "incompatible-checkpoint"
        | "corrupted-checkpoint";
      message: string;
      saveId: SaveId | null;
      runId: MonthRunId | null;
    }>
  | Readonly<{
      kind: "rejected";
      code: string;
      message: string;
      retryable: boolean;
    }>;

export function projectJanuary1990RuntimeView(
  result: PersistedMonthRunResult,
): January1990RuntimeView {
  switch (result.kind) {
    case "idle":
      return Object.freeze({
        kind: "idle",
        saveId: result.save?.saveId ?? null,
        saveRevision: result.save?.revision ?? null,
      });
    case "waiting-decision": {
      const decision = result.checkpoint.pendingDecision;
      if (decision === null) {
        throw new TypeError("Waiting January checkpoint is missing its pending decision");
      }
      return Object.freeze({
        kind: decisionViewKind(decision.decisionId),
        saveId: result.save.saveId,
        runId: result.run.runId,
        runRevision: result.checkpoint.runRevision,
        checkpointHash: result.checkpoint.checkpointHash,
        prompt: decision.prompt,
      });
    }
    case "committed": {
      const terminalResult = result.checkpoint.terminalResult;
      if (terminalResult === null) {
        throw new TypeError("Committed January checkpoint is missing its terminal result");
      }
      return Object.freeze({
        kind: "committed",
        saveId: result.save.saveId,
        runId: result.run.runId,
        saveRevision: result.save.revision,
        checkpointHash: result.checkpoint.checkpointHash,
        result: terminalResult,
      });
    }
    case "terminal":
      if (!isTerminalFailure(result.checkpoint.status)) {
        throw new TypeError(`Unsupported January terminal status: ${result.checkpoint.status}`);
      }
      return Object.freeze({
        kind: "terminal",
        saveId: result.save.saveId,
        runId: result.run.runId,
        checkpointHash: result.checkpoint.checkpointHash,
        status: result.checkpoint.status,
        reason: result.checkpoint.terminalReason,
      });
    case "blocked":
      return Object.freeze({
        kind: "blocked",
        reason: result.reason,
        message: result.message,
        saveId: result.save?.saveId ?? null,
        runId: result.run?.runId ?? null,
      });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        code: result.error.code,
        message: result.error.message,
        retryable: result.error.retryable,
      });
  }
}

function decisionViewKind(decisionId: string): January1990DecisionViewKind {
  switch (decisionId) {
    case "january-1990/access":
      return "access-decision";
    case "january-1990/learning":
      return "learning-decision";
    case "january-1990/defect":
      return "defect-decision";
    default:
      throw new TypeError(`Unsupported January pending decision: ${decisionId}`);
  }
}

function isTerminalFailure(
  status: string,
): status is "failed" | "incompatible" | "recovery-required" | "abandoned" {
  return (
    status === "failed" ||
    status === "incompatible" ||
    status === "recovery-required" ||
    status === "abandoned"
  );
}
