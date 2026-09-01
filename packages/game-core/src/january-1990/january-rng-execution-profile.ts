import { RNG_DERIVATION_MANIFEST_V1, type Fingerprint } from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import type { January1990BalanceV1 } from "./january-balance";
import { createJanuary1990RulesFingerprint } from "./january-compatibility";

export const JANUARY_1990_RNG_EXECUTION_PROFILES_V1 = Object.freeze({
  legacySequential: Object.freeze({
    id: "legacy-sequential-v1" as const,
    checkpointRngStateSemantics: "mutable-sequential-cursor-v1" as const,
  }),
  hierarchical: Object.freeze({
    id: "hierarchical-v1" as const,
    checkpointRngStateSemantics: "immutable-month-root-v1" as const,
  }),
});

export type January1990RngExecutionProfileId =
  (typeof JANUARY_1990_RNG_EXECUTION_PROFILES_V1)[keyof typeof JANUARY_1990_RNG_EXECUTION_PROFILES_V1]["id"];

export function createJanuary1990RulesFingerprintForExecutionProfile(
  balance: January1990BalanceV1,
  profileId: January1990RngExecutionProfileId,
): Fingerprint {
  const legacyRulesFingerprint = createJanuary1990RulesFingerprint(balance);
  if (profileId === JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id) {
    return legacyRulesFingerprint;
  }
  if (profileId !== JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id) {
    throw new TypeError(`Unsupported January 1990 RNG execution profile: ${String(profileId)}`);
  }

  return fingerprint("january-1990-rules-execution-profile-v1", {
    legacyRulesFingerprint,
    rngExecutionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical,
    rngDerivationManifest: RNG_DERIVATION_MANIFEST_V1,
  });
}
