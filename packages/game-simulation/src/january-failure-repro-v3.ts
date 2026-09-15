import {
  GAME_REPRO_SCHEMA_VERSION_V3,
  parseGameReproV3,
  type GameReproV3,
} from "./january-repro-v3";
import { JANUARY_RNG_EVIDENCE_V2 } from "./january-rng-evidence-v2";
import {
  SIMULATION_POLICY_IDS,
  type JanuarySimulationTerminalRunV1,
  type SimulationPolicyIdV1,
} from "./simulation-types";
import type { GameReproCommandV1, GameReproDecisionIdV1 } from "./january-repro";

export type JanuarySimulationFailureReproMaterializationV1 =
  | Readonly<{ kind: "materialized"; repro: GameReproV3 }>
  | Readonly<{ kind: "unavailable"; message: string }>;

export function materializeJanuarySimulationFailureReproV3(
  input: Readonly<{
    fixtureId: string;
    run: JanuarySimulationTerminalRunV1;
  }>,
): JanuarySimulationFailureReproMaterializationV1 {
  if (!isSimulationPolicyId(input.run.policyId)) {
    return unavailable(`Run policy ${JSON.stringify(input.run.policyId)} is not replayable`);
  }
  if (input.run.terminalState !== "soft-lock" && input.run.terminalState !== "protocol-rejected") {
    return unavailable(`Run terminal state ${input.run.terminalState} is not a replayable failure`);
  }

  const commands: GameReproCommandV1[] = [];
  for (const accepted of input.run.checkpoint.acceptedDecisions) {
    const command = commandFromAcceptedDecision(accepted.decisionId, accepted.answer);
    if (command === null) {
      return unavailable(
        `Accepted decision ${accepted.decisionId} cannot be represented by game-repro-v3`,
      );
    }
    commands.push(command);
  }

  const repro: GameReproV3 = Object.freeze({
    schemaVersion: GAME_REPRO_SCHEMA_VERSION_V3,
    fixtureId: input.fixtureId,
    rulesetFingerprint: input.run.checkpoint.compatibility.rulesFingerprint,
    rngEvidence: JANUARY_RNG_EVIDENCE_V2,
    seed: input.run.seed,
    commands: Object.freeze(commands),
    expected: Object.freeze({
      kind: "failure",
      failureClass: input.run.terminalState,
    }),
  });
  const parsed = parseGameReproV3(repro);
  if (parsed.kind !== "ok") {
    return unavailable(parsed.diagnostics.map((diagnostic) => diagnostic.message).join("; "));
  }
  return { kind: "materialized", repro: parsed.repro };
}

function commandFromAcceptedDecision(
  decisionId: string,
  answer: unknown,
): GameReproCommandV1 | null {
  if (!isPlainRecord(answer)) return null;
  const expected = reproDecisionContract(decisionId);
  if (expected === null || answer.schemaVersion !== expected.schemaVersion) return null;
  const value = answer[expected.field];
  if (typeof value !== "string") return null;
  return Object.freeze({
    kind: "answer",
    decisionId: expected.decisionId,
    value,
  });
}

function reproDecisionContract(decisionId: string): Readonly<{
  decisionId: GameReproDecisionIdV1;
  schemaVersion: string;
  field: "route" | "practice" | "response";
}> | null {
  if (decisionId === "january-1990/access") {
    return {
      decisionId,
      schemaVersion: "january-access-answer-v1",
      field: "route",
    };
  }
  if (decisionId === "january-1990/learning") {
    return {
      decisionId,
      schemaVersion: "january-learning-answer-v1",
      field: "practice",
    };
  }
  if (decisionId === "january-1990/defect") {
    return {
      decisionId,
      schemaVersion: "january-defect-answer-v1",
      field: "response",
    };
  }
  return null;
}

function isSimulationPolicyId(value: string): value is SimulationPolicyIdV1 {
  return SIMULATION_POLICY_IDS.some((candidate) => candidate === value);
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function unavailable(message: string): Readonly<{ kind: "unavailable"; message: string }> {
  return { kind: "unavailable", message };
}
