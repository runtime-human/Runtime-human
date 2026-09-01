import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesFingerprintForExecutionProfile,
} from "@runtime-human/game-core";
import { JANUARY_RNG_EVIDENCE_V1 } from "@runtime-human/game-simulation";

describe("January 1990 RNG execution profile compatibility identity", () => {
  it("preserves the existing legacy rules fingerprint exactly", () => {
    const existing = createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE);
    const profiled = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id,
    );

    expect(profiled).toBe(existing);
  });

  it("assigns hierarchical execution a distinct deterministic rules fingerprint", () => {
    const legacy = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id,
    );
    const first = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );
    const second = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );

    expect(first).toBe(second);
    expect(first).not.toBe(legacy);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("publishes frozen execution semantics for both persisted interpretations", () => {
    expect(JANUARY_1990_RNG_EXECUTION_PROFILES_V1).toEqual({
      legacySequential: {
        id: "legacy-sequential-v1",
        checkpointRngStateSemantics: "mutable-sequential-cursor-v1",
      },
      hierarchical: {
        id: "hierarchical-v1",
        checkpointRngStateSemantics: "immutable-month-root-v1",
      },
    });
    expect(Object.isFrozen(JANUARY_1990_RNG_EXECUTION_PROFILES_V1)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential)).toBe(true);
    expect(Object.isFrozen(JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical)).toBe(true);
  });

  it("keeps Stage C evidence modes aligned with the Stage D execution-profile IDs", () => {
    expect(JANUARY_RNG_EVIDENCE_V1.authority.mode).toBe(
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id,
    );
    expect(JANUARY_RNG_EVIDENCE_V1.shadow.mode).toBe(
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );
  });
});
