import type {
  MonthRunCheckpointV1,
  MonthRunEventV1,
  MonthRunProtocolError,
} from "@runtime-human/game-schema";

import { transitionMonthRun } from "./transition";

const DEFAULT_TRANSITION_BUDGET = 256;

export type MonthRunStep = (checkpoint: MonthRunCheckpointV1) => MonthRunEventV1;

export type MonthRunRunResult =
  | Readonly<{ kind: "boundary"; checkpoint: MonthRunCheckpointV1 }>
  | Readonly<{
      kind: "rejected";
      checkpoint: MonthRunCheckpointV1;
      error: MonthRunProtocolError;
    }>;

export function runUntilBoundary(
  checkpoint: MonthRunCheckpointV1,
  steps: readonly MonthRunStep[],
  maxTransitions = DEFAULT_TRANSITION_BUDGET,
): MonthRunRunResult {
  if (!Number.isSafeInteger(maxTransitions) || maxTransitions <= 0) {
    return budgetError(checkpoint, "Transition budget must be a positive safe integer");
  }
  if (isBoundary(checkpoint)) return { kind: "boundary", checkpoint };

  const original = checkpoint;
  let current = checkpoint;
  for (let count = 0; count < maxTransitions; count += 1) {
    const step = steps[current.stepIndex];
    if (step === undefined) {
      return budgetError(
        original,
        `No deterministic MonthRun step exists at index ${current.stepIndex}`,
      );
    }

    const transition = transitionMonthRun(current, step(current));
    if (transition.kind === "rejected") return transition;
    if (transition.kind === "duplicate") {
      return budgetError(original, "Deterministic MonthRun step did not advance the checkpoint");
    }

    current = transition.checkpoint;
    if (isBoundary(current)) return { kind: "boundary", checkpoint: current };
  }

  return budgetError(original, `MonthRun exceeded the transition budget of ${maxTransitions}`);
}

function isBoundary(checkpoint: MonthRunCheckpointV1): boolean {
  return checkpoint.status !== "ready" && checkpoint.status !== "running";
}

function budgetError(checkpoint: MonthRunCheckpointV1, message: string): MonthRunRunResult {
  return {
    kind: "rejected",
    checkpoint,
    error: { code: "TransitionBudgetExceeded", message },
  };
}
