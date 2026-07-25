import type { MonthRunCheckpointV1 } from "@runtime-human/game-schema";

import type { MonthRunStep } from "../month-run/runner";
import { createJanuary1990RulesFingerprint } from "./january-compatibility";
import type { January1990ContentContext } from "./january-content-context";
import { createJanuary1990MonthSteps as createUncheckedJanuary1990MonthSteps } from "./january-month-steps";
import { parseJanuary1990MonthPlan } from "./january-month-plan";

export function createJanuary1990ValidatedMonthSteps(
  context: January1990ContentContext,
): readonly MonthRunStep[] {
  const steps = createUncheckedJanuary1990MonthSteps(context);
  if (steps.length !== 9 || steps.some((step) => typeof step !== "function")) {
    throw new TypeError("January 1990 requires the exact nine-step table");
  }

  return Object.freeze(
    steps.map((step) => (checkpoint: MonthRunCheckpointV1) => {
      validateJanuaryCheckpoint(context, checkpoint);
      return step(checkpoint);
    }),
  );
}

function validateJanuaryCheckpoint(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
): void {
  const plan = parseJanuary1990MonthPlan(checkpoint.plan);
  const expectedRulesFingerprint = createJanuary1990RulesFingerprint();

  if (
    plan.contentFingerprint !== context.contentFingerprint ||
    checkpoint.compatibility.contentFingerprint !== context.contentFingerprint
  ) {
    throw new TypeError("January MonthRun content fingerprint does not match the verified context");
  }
  if (checkpoint.compatibility.rulesFingerprint !== expectedRulesFingerprint) {
    throw new TypeError("January MonthRun rules fingerprint is incompatible");
  }
}
