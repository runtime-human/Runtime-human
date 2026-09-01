import {
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  type January1990BalanceV1,
  type January1990ContentContext,
} from "@runtime-human/game-core";
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
  JANUARY_RNG_EVIDENCE_V2,
  januaryRngEvidenceV2Equal,
  parseJanuaryRngEvidenceV2,
  type JanuaryRngEvidenceV2,
} from "./january-rng-evidence-v2";

export const GAME_REPRO_SCHEMA_VERSION_V3 = "game-repro-v3" as const;

export type GameReproV3 = Readonly<{
  schemaVersion: typeof GAME_REPRO_SCHEMA_VERSION_V3;
  fixtureId: string;
  rulesetFingerprint: Fingerprint;
  rngEvidence: JanuaryRngEvidenceV2;
  seed: string;
  commands: readonly GameReproCommandV1[];
  expected: GameReproExpectedV1;
}>;

export type GameReproDiagnosticV3 =
  | GameReproDiagnosticV1
  | Readonly<{
      code: "REPRO_RNG_EVIDENCE_MISMATCH";
      message: string;
    }>;

export type GameReproReplayResultV3 =
  | Readonly<{ kind: "reproduced"; terminalCheckpointHash: Fingerprint; trace?: GameReplayTraceV1 }>
  | Readonly<{
      kind: "not-reproduced";
      diagnostics: readonly GameReproDiagnosticV3[];
      trace?: GameReplayTraceV1;
    }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV3[] }>
  | Readonly<{ kind: "incompatible"; diagnostics: readonly GameReproDiagnosticV3[] }>;

export function parseGameReproV3(
  value: unknown,
):
  | Readonly<{ kind: "ok"; repro: GameReproV3 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV3[] }> {
  const repro = closedRecord(value, [
    "commands",
    "expected",
    "fixtureId",
    "rngEvidence",
    "rulesetFingerprint",
    "schemaVersion",
    "seed",
  ]);
  if (repro === null || repro.schemaVersion !== GAME_REPRO_SCHEMA_VERSION_V3) {
    return invalid(`Repro schemaVersion must be ${GAME_REPRO_SCHEMA_VERSION_V3}`);
  }

  const evidence = parseJanuaryRngEvidenceV2(repro.rngEvidence);
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
      schemaVersion: GAME_REPRO_SCHEMA_VERSION_V3,
      fixtureId: legacy.repro.fixtureId,
      rulesetFingerprint: legacy.repro.rulesetFingerprint,
      rngEvidence: evidence.evidence,
      seed: legacy.repro.seed,
      commands: legacy.repro.commands,
      expected: legacy.repro.expected,
    }),
  };
}

export function replayJanuaryReproV3(
  input: Readonly<{
    context: January1990ContentContext;
    balance: January1990BalanceV1;
    saveSchemaFingerprint: Fingerprint;
    repro: GameReproV3;
    captureTrace?: boolean;
  }>,
): GameReproReplayResultV3 {
  if (!januaryRngEvidenceV2Equal(input.repro.rngEvidence, JANUARY_RNG_EVIDENCE_V2)) {
    return {
      kind: "incompatible",
      diagnostics: [
        {
          code: "REPRO_RNG_EVIDENCE_MISMATCH",
          message: "Repro January RNG authority evidence does not match the active hierarchical contract",
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
    rngExecutionProfile: JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
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
  diagnostics: readonly GameReproDiagnosticV3[];
} {
  return { kind: "invalid", diagnostics: [{ code: "REPRO_INVALID", message }] };
}
