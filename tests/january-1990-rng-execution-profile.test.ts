import { describe, expect, it } from "vitest";

import {
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  checkMonthRunCompatibility,
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesFingerprintForExecutionProfile,
  fingerprint,
  type January1990RngExecutionProfileId,
} from "@runtime-human/game-core";
import { JANUARY_RNG_EVIDENCE_V1 } from "@runtime-human/game-simulation";
import { DETERMINISM_MANIFEST_V1 } from "@runtime-human/game-schema";

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

  it("makes legacy and hierarchical checkpoint compatibility identities mutually incompatible", () => {
    const legacyRulesFingerprint = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id,
    );
    const hierarchicalRulesFingerprint = createJanuary1990RulesFingerprintForExecutionProfile(
      JANUARY_1990_DEFAULT_BALANCE,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    );
    const legacyCompatibility = {
      checkpointSchema: "month-run-checkpoint-v1" as const,
      rulesFingerprint: legacyRulesFingerprint,
      contentFingerprint: fingerprint("test-content", { version: 1 }),
      saveSchemaFingerprint: fingerprint("test-save-schema", { version: 1 }),
      determinismManifest: DETERMINISM_MANIFEST_V1,
    };

    expect(
      checkMonthRunCompatibility(legacyCompatibility, {
        ...legacyCompatibility,
        rulesFingerprint: hierarchicalRulesFingerprint,
      }),
    ).toEqual({
      kind: "incompatible",
      mismatches: ["rulesFingerprint"],
    });
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

  it("rejects unknown runtime execution-profile IDs instead of guessing semantics", () => {
    expect(() =>
      createJanuary1990RulesFingerprintForExecutionProfile(
        JANUARY_1990_DEFAULT_BALANCE,
        "future-v99" as January1990RngExecutionProfileId,
      ),
    ).toThrow("Unsupported January 1990 RNG execution profile: future-v99");
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
