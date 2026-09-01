import {
  createJanuary1990HierarchicalMonthSteps,
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  type January1990BalanceV1,
  type January1990ContentContext,
  type January1990RngExecutionProfileId,
  type JanuaryQualityScoresV1,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  type AuthoritativeJsonValue,
  type Fingerprint,
} from "@runtime-human/game-schema";

import { runJanuaryCommandSequence, type JanuaryAnswerProviderV1 } from "./january-simulation";
import {
  REPRO_RUNNER_ID,
  type JanuarySimulationTerminalRunV1,
  type SimulationTerminalStateV1,
} from "./simulation-types";

export const GAME_REPRO_SCHEMA_VERSION = "game-repro-v1" as const;

export type GameReproDecisionIdV1 =
  | "january-1990/access"
  | "january-1990/learning"
  | "january-1990/defect";

export type GameReproCommandV1 = Readonly<{
  kind: "answer";
  decisionId: GameReproDecisionIdV1;
  value: string;
}>;

export type GameReproExpectedV1 =
  | Readonly<{ kind: "success"; terminalCheckpointHash: Fingerprint }>
  | Readonly<{ kind: "failure"; failureClass: "protocol-rejected" | "soft-lock" }>;

export type GameReproV1 = Readonly<{
  schemaVersion: typeof GAME_REPRO_SCHEMA_VERSION;
  fixtureId: string;
  rulesetFingerprint: Fingerprint;
  seed: string;
  commands: readonly GameReproCommandV1[];
  expected: GameReproExpectedV1;
}>;

export type GameReproDiagnosticV1 = Readonly<{
  code:
    | "REPRO_INVALID"
    | "REPRO_RULESET_MISMATCH"
    | "REPRO_COMMAND_INVALID"
    | "REPRO_NOT_REPRODUCED";
  message: string;
}>;

export const GAME_REPLAY_TRACE_SCHEMA_VERSION = "game-replay-trace-v1" as const;

export type GameReplayTraceDecisionV1 = Readonly<{
  index: number;
  requestId: string;
  decisionId: string;
  answer: AuthoritativeJsonValue;
}>;

export type GameReplayTraceV1 = Readonly<{
  schemaVersion: typeof GAME_REPLAY_TRACE_SCHEMA_VERSION;
  seed: string;
  runnerId: typeof REPRO_RUNNER_ID;
  terminalState: SimulationTerminalStateV1;
  programCounter: number;
  decisions: readonly GameReplayTraceDecisionV1[];
  materializedQualityScores: JanuaryQualityScoresV1 | null;
}>;

export type GameReproReplayResultV1 =
  | Readonly<{ kind: "reproduced"; terminalCheckpointHash: Fingerprint; trace?: GameReplayTraceV1 }>
  | Readonly<{
      kind: "not-reproduced";
      diagnostics: readonly GameReproDiagnosticV1[];
      trace?: GameReplayTraceV1;
    }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV1[] }>
  | Readonly<{ kind: "incompatible"; diagnostics: readonly GameReproDiagnosticV1[] }>;

const DECISION_KINDS: readonly GameReproDecisionIdV1[] = [
  "january-1990/access",
  "january-1990/learning",
  "january-1990/defect",
];

const ANSWER_FIELDS: Readonly<
  Record<
    GameReproDecisionIdV1,
    { field: string; allowed: readonly string[]; schemaVersion: string }
  >
> = Object.freeze({
  "january-1990/access": Object.freeze({
    field: "route",
    allowed: ["home-pc", "shared-school-pc"],
    schemaVersion: "january-access-answer-v1",
  }),
  "january-1990/learning": Object.freeze({
    field: "practice",
    allowed: ["read-and-run", "edit-and-debug"],
    schemaVersion: "january-learning-answer-v1",
  }),
  "january-1990/defect": Object.freeze({
    field: "response",
    allowed: ["inspect-listing", "change-input", "ask-for-guidance"],
    schemaVersion: "january-defect-answer-v1",
  }),
});

export function parseGameReproV1(
  value: unknown,
):
  | Readonly<{ kind: "ok"; repro: GameReproV1 }>
  | Readonly<{ kind: "invalid"; diagnostics: readonly GameReproDiagnosticV1[] }> {
  if (!isPlainRecord(value)) {
    return invalid("REPRO_INVALID", "Repro document must be a plain JSON object");
  }
  if (value.schemaVersion !== GAME_REPRO_SCHEMA_VERSION) {
    return invalid("REPRO_INVALID", `Repro schemaVersion must be ${GAME_REPRO_SCHEMA_VERSION}`);
  }
  if (typeof value.fixtureId !== "string" || value.fixtureId.length === 0) {
    return invalid("REPRO_INVALID", "Repro fixtureId must be a non-empty string");
  }
  if (!isFingerprint(value.rulesetFingerprint)) {
    return invalid("REPRO_INVALID", "Repro rulesetFingerprint must be a 64-hex fingerprint");
  }
  if (!isSeed(value.seed)) {
    return invalid("REPRO_INVALID", "Repro seed must be a non-negative safe integer");
  }
  if (!Array.isArray(value.commands)) {
    return invalid("REPRO_INVALID", "Repro commands must be an array");
  }
  const commands: GameReproCommandV1[] = [];
  for (const command of value.commands) {
    if (!isPlainRecord(command)) {
      return invalid("REPRO_INVALID", "Repro command must be a plain JSON object");
    }
    if (command.kind !== "answer") {
      return invalid("REPRO_INVALID", "Repro command kind must be 'answer'");
    }
    if (!DECISION_KINDS.some((candidate) => candidate === command.decisionId)) {
      return invalid(
        "REPRO_COMMAND_INVALID",
        `Repro command decisionId ${JSON.stringify(command.decisionId)} is not a January decision`,
      );
    }
    const decisionId = command.decisionId as GameReproDecisionIdV1;
    const contract = ANSWER_FIELDS[decisionId];
    if (contract === undefined) {
      return invalid("REPRO_COMMAND_INVALID", `Repro command ${decisionId} is not supported`);
    }
    if (
      typeof command.value !== "string" ||
      !contract.allowed.some((candidate) => candidate === command.value)
    ) {
      return invalid(
        "REPRO_COMMAND_INVALID",
        `Repro command ${decisionId} value must be one of ${contract.allowed.join(", ")}`,
      );
    }
    commands.push(
      Object.freeze({
        kind: "answer",
        decisionId,
        value: command.value,
      }),
    );
  }

  if (!isPlainRecord(value.expected)) {
    return invalid("REPRO_INVALID", "Repro expected must be a plain JSON object");
  }
  let expected: GameReproExpectedV1;
  if (value.expected.kind === "success") {
    if (!isFingerprint(value.expected.terminalCheckpointHash)) {
      return invalid(
        "REPRO_INVALID",
        "Repro expected.terminalCheckpointHash must be a 64-hex fingerprint",
      );
    }
    expected = Object.freeze({
      kind: "success",
      terminalCheckpointHash: value.expected.terminalCheckpointHash,
    });
  } else if (
    value.expected.kind === "failure" &&
    (value.expected.failureClass === "protocol-rejected" ||
      value.expected.failureClass === "soft-lock")
  ) {
    expected = Object.freeze({
      kind: "failure",
      failureClass: value.expected.failureClass,
    });
  } else {
    return invalid("REPRO_INVALID", "Repro expected must be success or failure");
  }

  return {
    kind: "ok",
    repro: Object.freeze({
      schemaVersion: GAME_REPRO_SCHEMA_VERSION,
      fixtureId: value.fixtureId,
      rulesetFingerprint: value.rulesetFingerprint,
      seed: value.seed,
      commands: Object.freeze(commands),
      expected,
    }),
  };
}

export function replayJanuaryReproV1(
  input: Readonly<{
    context: January1990ContentContext;
    balance: January1990BalanceV1;
    saveSchemaFingerprint: Fingerprint;
    repro: GameReproV1;
    captureTrace?: boolean;
  }>,
): GameReproReplayResultV1 {
  return replayJanuaryReproForExecutionProfile(
    input,
    JANUARY_1990_RNG_EXECUTION_PROFILES_V1.legacySequential.id,
  );
}

export function replayJanuaryReproForExecutionProfile(
  input: Readonly<{
    context: January1990ContentContext;
    balance: January1990BalanceV1;
    saveSchemaFingerprint: Fingerprint;
    repro: GameReproV1;
    captureTrace?: boolean;
  }>,
  rngExecutionProfile: January1990RngExecutionProfileId,
): GameReproReplayResultV1 {
  const hierarchical = rngExecutionProfile === JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id;
  const rulesetFingerprint = createJanuary1990RulesFingerprintForExecutionProfile(
    input.balance,
    rngExecutionProfile,
  );
  if (input.repro.rulesetFingerprint !== rulesetFingerprint) {
    return {
      kind: "incompatible",
      diagnostics: [
        {
          code: "REPRO_RULESET_MISMATCH",
          message: `Repro targets ruleset ${input.repro.rulesetFingerprint} but the active ruleset is ${rulesetFingerprint}`,
        },
      ],
    };
  }

  const answers = reproAnswers(input.repro);
  if (answers === null) {
    return {
      kind: "invalid",
      diagnostics: [
        {
          code: "REPRO_COMMAND_INVALID",
          message: "Repro repeats a decision or uses an unknown kind",
        },
      ],
    };
  }

  const run = runJanuaryCommandSequence({
    runnerId: "repro-v1",
    seed: Number(input.repro.seed),
    contentFingerprint: input.context.contentFingerprint,
    steps: hierarchical
      ? createJanuary1990HierarchicalMonthSteps(input.context, input.balance)
      : createJanuary1990MonthSteps(input.context, input.balance),
    plan: createJanuary1990MonthPlan(input.context),
    rulesetFingerprint,
    determinismManifest: hierarchical
      ? JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST
      : DETERMINISM_MANIFEST_V1,
    saveSchemaFingerprint: input.saveSchemaFingerprint,
    answers,
  });
  const trace = input.captureTrace === true ? buildReplayTrace(run) : undefined;

  if (input.repro.expected.kind === "success") {
    if (run.terminalState !== "completed") {
      return notReproduced(`Run ended as ${run.terminalState} instead of completing`, trace);
    }
    if (run.checkpoint.checkpointHash !== input.repro.expected.terminalCheckpointHash) {
      return notReproduced("Terminal checkpoint hash differs from the expected fingerprint", trace);
    }
    return withTrace(run.checkpoint.checkpointHash, trace);
  }

  return run.terminalState === input.repro.expected.failureClass
    ? withTrace(run.checkpoint.checkpointHash, trace)
    : notReproduced(
        `Run ended as ${run.terminalState} instead of ${input.repro.expected.failureClass}`,
        trace,
      );
}

function buildReplayTrace(run: JanuarySimulationTerminalRunV1): GameReplayTraceV1 {
  return Object.freeze({
    schemaVersion: GAME_REPLAY_TRACE_SCHEMA_VERSION,
    seed: run.seed,
    runnerId: REPRO_RUNNER_ID,
    terminalState: run.terminalState,
    programCounter: run.checkpoint.programCounter,
    decisions: Object.freeze(
      run.checkpoint.acceptedDecisions.map((accepted, index) =>
        Object.freeze({
          index,
          requestId: accepted.requestId,
          decisionId: accepted.decisionId,
          answer: accepted.answer,
        }),
      ),
    ),
    materializedQualityScores: toQualityScores(run.metrics.qualityScores),
  });
}

function toQualityScores(
  scores: Readonly<{
    clarity: number | null;
    correctness: number | null;
    reliability: number | null;
  }>,
): JanuaryQualityScoresV1 | null {
  if (scores.clarity === null || scores.correctness === null || scores.reliability === null) {
    return null;
  }
  return Object.freeze({
    clarity: scores.clarity,
    correctness: scores.correctness,
    reliability: scores.reliability,
  });
}

function withTrace(
  terminalCheckpointHash: Fingerprint,
  trace: GameReplayTraceV1 | undefined,
): GameReproReplayResultV1 {
  return trace === undefined
    ? { kind: "reproduced", terminalCheckpointHash }
    : { kind: "reproduced", terminalCheckpointHash, trace };
}

function reproAnswers(repro: GameReproV1): readonly JanuaryAnswerProviderV1[] | null {
  const providers: JanuaryAnswerProviderV1[] = [];
  const seen = new Set<string>();
  for (const command of repro.commands) {
    if (seen.has(command.decisionId)) return null;
    seen.add(command.decisionId);
    const contract = ANSWER_FIELDS[command.decisionId];
    if (contract === undefined) return null;
    providers.push({
      kind: toSelectionKind(command.decisionId),
      provideAnswer: () =>
        ({
          schemaVersion: contract.schemaVersion,
          [contract.field]: command.value,
        }) as Record<string, string>,
    });
  }
  return Object.freeze(providers);
}

function toSelectionKind(decisionId: GameReproDecisionIdV1): JanuaryAnswerProviderV1["kind"] {
  return decisionId === "january-1990/access"
    ? "january-access"
    : decisionId === "january-1990/learning"
      ? "january-learning"
      : "january-defect";
}

function notReproduced(
  message: string,
  trace: GameReplayTraceV1 | undefined,
): GameReproReplayResultV1 {
  return trace === undefined
    ? { kind: "not-reproduced", diagnostics: [{ code: "REPRO_NOT_REPRODUCED", message }] }
    : {
        kind: "not-reproduced",
        diagnostics: [{ code: "REPRO_NOT_REPRODUCED", message }],
        trace,
      };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isFingerprint(value: unknown): value is Fingerprint {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isSeed(value: unknown): value is string {
  return typeof value === "string" && /^(0|[1-9][0-9]{0,9})$/u.test(value);
}

function invalid(
  code: GameReproDiagnosticV1["code"],
  message: string,
): { kind: "invalid"; diagnostics: readonly GameReproDiagnosticV1[] } {
  return { kind: "invalid", diagnostics: [{ code, message }] };
}
