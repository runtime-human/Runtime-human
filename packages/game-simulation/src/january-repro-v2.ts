import type { January1990BalanceV1, January1990ContentContext } from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";

import {
  GAME_REPRO_SCHEMA_VERSION,
  parseGameReproV1,
  replayJanuaryReproV1,
  type GameReplayTraceV1,
  type GameReproCommandV1,
  type GameReproDiagnosticV1,
  type GameReproExpectedV1,
  type GameReproV1,
} from "./january-repro";
import {
  JANUARY_RNG_EVIDENCE_V1,
  januaryRngEvidenceEqual,
  parseJanuaryRngEvidenceV1,
  type JanuaryRngEvidenceV1,
} from "./january-rng-evidence";

export const GAME_REPRO_SCHEMA_VERSION_V2 = "game-repro-v2" as const;

export type GameReproV2 = Readonly<{
  schemaVersion: typeof GAME_REPRO_SCHEMA_VERSION_V2;
  fixtureId: string;
  rulesetFingerprint: Fingerprint;
  rngEvidence: JanuaryRngEvidenceV1;
  seed: string;
  commands: readonly GameReproCommandV1[];
  expected: GameReproExpectedV1;
}>;

export type GameReproDiagnosticV2 =
  | GameReproDiagnosticV1
  | Readonly<{
      code: "REPRO_RNG_EVIDENCE_MISMATCH";
      message: string;
    }>;

export type GameReproReplayResultV2 =
  | Readonly<{ kind: "reproduced"; terminalCheckpointHash: Fingerprint; trace?: GameReplayTraceV1 }>
  | Readonly<{
      kind: "not-reproduced";
      diagnostics: readonly GameReproDiagnosticV2[];
      trace?: GameReplayTraceV1;
    }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV2[] }>
  | Readonly<{ kind: "incompatible"; diagnostics: readonly GameReproDiagnosticV2[] }>;

export function parseGameReproV2(
  value: unknown,
):
  | Readonly<{ kind: "ok"; repro: GameReproV2 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV2[] }> {
  const repro = closedRecord(value, [
    "commands",
    "expected",
    "fixtureId",
    "rngEvidence",
    "rulesetFingerprint",
    "schemaVersion",
    "seed",
  ]);
  if (repro === null || repro.schemaVersion !== GAME_REPRO_SCHEMA_VERSION_V2) {
    return invalid(`Repro schemaVersion must be ${GAME_REPRO_SCHEMA_VERSION_V2}`);
  }

  const evidence = parseJanuaryRngEvidenceV1(repro.rngEvidence);
  if (evidence.kind !== "ok") {
    return invalid(`Repro rngEvidence is invalid: ${evidence.message}`);
  }

  const legacy = parseGameReproV1({
    schemaVersion: GAME_REPRO_SCHEMA_VERSION,
    fixtureId: repro.fixtureId,
    rulesetFingerprint: repro.rulesetFingerprint,
    seed: repro.seed,
    commands: repro.commands,
    expected: repro.expected,
  });
  if (legacy.kind !== "ok") return legacy;

  return {
    kind: "ok",
    repro: Object.freeze({
      schemaVersion: GAME_REPRO_SCHEMA_VERSION_V2,
      fixtureId: legacy.repro.fixtureId,
      rulesetFingerprint: legacy.repro.rulesetFingerprint,
      rngEvidence: evidence.evidence,
      seed: legacy.repro.seed,
      commands: legacy.repro.commands,
      expected: legacy.repro.expected,
    }),
  };
}

export function replayJanuaryReproV2(
  input: Readonly<{
    context: January1990ContentContext;
    balance: January1990BalanceV1;
    saveSchemaFingerprint: Fingerprint;
    repro: GameReproV2;
    captureTrace?: boolean;
  }>,
): GameReproReplayResultV2 {
  if (!januaryRngEvidenceEqual(input.repro.rngEvidence, JANUARY_RNG_EVIDENCE_V1)) {
    return {
      kind: "incompatible",
      diagnostics: [
        {
          code: "REPRO_RNG_EVIDENCE_MISMATCH",
          message: "Repro January RNG authority/shadow evidence does not match the active contract",
        },
      ],
    };
  }

  const legacy: GameReproV1 = {
    schemaVersion: GAME_REPRO_SCHEMA_VERSION,
    fixtureId: input.repro.fixtureId,
    rulesetFingerprint: input.repro.rulesetFingerprint,
    seed: input.repro.seed,
    commands: input.repro.commands,
    expected: input.repro.expected,
  };
  return replayJanuaryReproV1({
    context: input.context,
    balance: input.balance,
    saveSchemaFingerprint: input.saveSchemaFingerprint,
    repro: legacy,
    ...(input.captureTrace === undefined ? {} : { captureTrace: input.captureTrace }),
  });
}

function closedRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isPlainRecord(value)) return null;
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key))) {
    return null;
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function invalid(message: string): {
  kind: "invalid";
  diagnostics: readonly GameReproDiagnosticV2[];
} {
  return { kind: "invalid", diagnostics: [{ code: "REPRO_INVALID", message }] };
}
