import type { Fingerprint, MonthRunCheckpointV1 } from "@runtime-human/game-schema";

import type { MonthRunStep } from "../month-run/runner";
import { createJanuary1990RulesFingerprint } from "./january-compatibility";
import type { January1990BalanceV1 } from "./january-balance";
import type { January1990ContentContext } from "./january-content-context";
import {
  createJanuary1990MonthSteps as createUncheckedJanuary1990MonthSteps,
  type January1990RngAuthority,
} from "./january-month-steps";
import { parseJanuary1990MonthPlan } from "./january-month-plan";
import {
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "./january-rng-execution-profile";

export function createJanuary1990ValidatedMonthSteps(
  context: January1990ContentContext,
  balance: January1990BalanceV1,
): readonly MonthRunStep[] {
  return createValidatedJanuary1990MonthSteps(context, balance, "legacy-sequential-v1");
}

export function createJanuary1990HierarchicalValidatedMonthSteps(
  context: January1990ContentContext,
  balance: January1990BalanceV1,
): readonly MonthRunStep[] {
  return createValidatedJanuary1990MonthSteps(context, balance, "hierarchical-v1");
}

function createValidatedJanuary1990MonthSteps(
  context: January1990ContentContext,
  balance: January1990BalanceV1,
  rngAuthority: January1990RngAuthority,
): readonly MonthRunStep[] {
  const steps = createUncheckedJanuary1990MonthSteps(context, balance, rngAuthority);
  if (steps.length !== 9 || steps.some((step) => typeof step !== "function")) {
    throw new TypeError("January 1990 requires the exact nine-step table");
  }
  const expectedRulesFingerprint = rulesFingerprint(balance, rngAuthority);

  return Object.freeze(
    steps.map((step) => (checkpoint: MonthRunCheckpointV1) => {
      validateJanuaryCheckpoint(context, checkpoint, expectedRulesFingerprint);
      return step(checkpoint);
    }),
  );
}

function rulesFingerprint(
  balance: January1990BalanceV1,
  rngAuthority: January1990RngAuthority,
): Fingerprint {
  return rngAuthority === "hierarchical-v1"
    ? createJanuary1990RulesFingerprintForExecutionProfile(
        balance,
        JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
      )
    : createJanuary1990RulesFingerprint(balance);
}

function validateJanuaryCheckpoint(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
  expectedRulesFingerprint: Fingerprint,
): void {
  const plan = parseJanuary1990MonthPlan(checkpoint.plan);

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
