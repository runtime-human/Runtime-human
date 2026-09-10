import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectJanuary1990Content,
} from "@runtime-human/game-application";
import {
  createJanuary1990HierarchicalMonthSteps,
  createJanuary1990MonthPlan,
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "@runtime-human/game-core";
import * as simulationApi from "@runtime-human/game-simulation";
import {
  createJanuary1990AnswerProviders,
  JANUARY_RNG_EVIDENCE_V2,
  replayJanuaryReproV3,
  runJanuaryCommandSequence,
  type GameReproCommandV1,
  type GameReproV3,
  type JanuarySimulationTerminalRunV1,
} from "@runtime-human/game-simulation";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

type GamectlIo = Readonly<{ stdout: (line: string) => void; stderr: (line: string) => void }>;
type GamectlCliModule = Readonly<{
  runGamectlCli: (argv: readonly string[], io: GamectlIo) => Promise<number>;
}>;

const tempDirectories: string[] = [];
const balance = JANUARY_1990_DEFAULT_BALANCE;
const repositoryRoot = path.resolve(import.meta.dirname, "..");
const gamectlModuleUrl = new URL("../scripts/gamectl.ts", import.meta.url).href;

async function runGamectlCli(argv: readonly string[], io: GamectlIo): Promise<number> {
  const module = (await import(gamectlModuleUrl)) as GamectlCliModule;
  return module.runGamectlCli(argv, io);
}

function collectIo(): GamectlIo & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  };
}

async function createHierarchicalRun(answerCount: number): Promise<JanuarySimulationTerminalRunV1> {
  const context = projectJanuary1990Content(await loadJanuaryTestRegistry());
  const answers = createJanuary1990AnswerProviders({
    policyId: "always-first-valid",
    seed: 42,
    fixtureAnswers: {},
  }).slice(0, answerCount);
  return runJanuaryCommandSequence({
    runnerId: "always-first-valid",
    seed: 42,
    contentFingerprint: context.contentFingerprint,
    steps: createJanuary1990HierarchicalMonthSteps(context, balance),
    plan: createJanuary1990MonthPlan(context),
    rulesetFingerprint: createJanuary1990RulesFingerprintForExecutionProfile(
      balance,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    ),
    determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    answers,
  });
}

function commandFromAcceptedDecision(
  accepted: JanuarySimulationTerminalRunV1["checkpoint"]["acceptedDecisions"][number],
): GameReproCommandV1 {
  const answer = accepted.answer as Readonly<Record<string, unknown>>;
  const value =
    typeof answer.route === "string"
      ? answer.route
      : typeof answer.practice === "string"
        ? answer.practice
        : typeof answer.response === "string"
          ? answer.response
          : null;
  if (value === null) throw new Error(`Unsupported accepted answer for ${accepted.decisionId}`);
  return {
    kind: "answer",
    decisionId: accepted.decisionId as GameReproCommandV1["decisionId"],
    value,
  };
}

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
});

describe("ENGINE-03G deterministic simulation failure repro", () => {
  it("materializes an applicable hierarchical failure from the actual accepted decision prefix", async () => {
    const run = await createHierarchicalRun(1);
    expect(run.terminalState).toBe("protocol-rejected");
    expect(run.checkpoint.acceptedDecisions).toHaveLength(1);

    const materialize = Reflect.get(
      simulationApi,
      "materializeJanuarySimulationFailureReproV3",
    ) as unknown;
    expect(materialize).toBeTypeOf("function");
    if (typeof materialize !== "function") return;

    const result = materialize({
      fixtureId: "january-1990.shadow-proof",
      run,
    }) as Readonly<{ kind: string; repro?: GameReproV3 }>;

    expect(result.kind).toBe("materialized");
    expect(result.repro).toBeDefined();
    if (result.repro === undefined) throw new Error("materialized result has no repro");
    expect(result.repro.schemaVersion).toBe("game-repro-v3");
    expect(result.repro.seed).toBe("42");
    expect(result.repro.commands).toEqual([
      {
        kind: "answer",
        decisionId: "january-1990/access",
        value: "home-pc",
      },
    ]);
    expect(result.repro.expected).toEqual({
      kind: "failure",
      failureClass: "protocol-rejected",
    });

    const context = projectJanuary1990Content(await loadJanuaryTestRegistry());
    const replay = replayJanuaryReproV3({
      context,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      repro: result.repro,
    });
    expect(replay.kind).toBe("reproduced");
  });

  it("replays a valid game-repro-v3 through the public gamectl boundary", async () => {
    const run = await createHierarchicalRun(3);
    expect(run.terminalState).toBe("completed");

    const repro: GameReproV3 = {
      schemaVersion: "game-repro-v3",
      fixtureId: "january-1990.shadow-proof",
      rulesetFingerprint: run.checkpoint.compatibility.rulesFingerprint,
      rngEvidence: JANUARY_RNG_EVIDENCE_V2,
      seed: run.seed,
      commands: run.checkpoint.acceptedDecisions.map(commandFromAcceptedDecision),
      expected: {
        kind: "success",
        terminalCheckpointHash: run.checkpoint.checkpointHash,
      },
    };

    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-engine-03g-"));
    tempDirectories.push(directory);
    const reproPath = path.join(directory, "hierarchical.repro.json");
    await writeFile(reproPath, JSON.stringify(repro, null, 2), "utf8");

    const io = collectIo();
    const exitCode = await runGamectlCli(
      ["replay", reproPath, "--root", repositoryRoot, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const envelope = JSON.parse(io.out.join("\n")) as {
      command: string;
      ok: boolean;
      result?: { kind?: string; terminalCheckpointHash?: string };
    };
    expect(envelope.command).toBe("replay");
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.kind).toBe("reproduced");
    expect(envelope.result?.terminalCheckpointHash).toBe(run.checkpoint.checkpointHash);
  });
});
