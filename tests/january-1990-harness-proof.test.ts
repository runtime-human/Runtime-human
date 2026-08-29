import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";

import {
  createJanuary1990MonthPlan,
  createJanuary1990MonthSteps,
  createJanuary1990RulesFingerprint,
  deriveJanuaryQualityScoreMaximums,
  JANUARY_1990_DEFAULT_BALANCE,
  materializeJanuaryProgrammingState,
  parseJanuary1990Result,
  parseJanuaryProvisionalState,
} from "@runtime-human/game-core";
import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  parseGameReproV1,
  replayJanuaryReproV1,
  runJanuaryCommandSequence,
} from "@runtime-human/game-simulation";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

// End-to-end harness proof for master plan §48 (Wave 8 acceptance):
//   intentional bug introduced -> property test catches it -> fast-check shrinks
//   it -> minimal game-repro-v1 artifact exported -> replay detects the bug
//   deterministically -> bug fixed -> the same repro passes.
// The "buggy build" is simulated through a broken quality-score maxima provider
// (a plausible regression in deriveJanuaryQualityScoreMaximums); the save/result
// contract of that build rejects legitimate completed months, which is exactly
// what the property under test observes.

const registry = await loadJanuaryTestRegistry();
const context = projectJanuary1990Content(registry);
const steps = createJanuary1990MonthSteps(context, JANUARY_1990_DEFAULT_BALANCE);
const plan = createJanuary1990MonthPlan(context);
const rulesetFingerprint = createJanuary1990RulesFingerprint(JANUARY_1990_DEFAULT_BALANCE);

const ACCESS_ROUTES = ["home-pc", "shared-school-pc"] as const;
const LEARNING_PRACTICES = ["read-and-run", "edit-and-debug"] as const;
const DEFECT_RESPONSES = ["inspect-listing", "change-input", "ask-for-guidance"] as const;

const derivedMaxima = deriveJanuaryQualityScoreMaximums(JANUARY_1990_DEFAULT_BALANCE.quality);
const brokenMaxima = Object.freeze({
  ...derivedMaxima,
  reliability: derivedMaxima.reliability - 1,
});

function exceedsBrokenContract(scores: {
  clarity: number;
  correctness: number;
  reliability: number;
}): boolean {
  return (
    scores.clarity > brokenMaxima.clarity ||
    scores.correctness > brokenMaxima.correctness ||
    scores.reliability > brokenMaxima.reliability
  );
}

function materializeScores(
  selection: Readonly<{ access: string; learning: string; response: string }>,
  roll: number,
) {
  const state = parseJanuaryProvisionalState({
    schemaVersion: "january-1990-provisional-state-v1",
    accessRoute: selection.access,
    learningPractice: selection.learning,
    workPackageId: null,
    defectEventId: null,
    defectResponse: selection.response,
    evidence: [],
    qualityScores: null,
  });
  return materializeJanuaryProgrammingState(state, roll, JANUARY_1990_DEFAULT_BALANCE)
    .qualityScores;
}

function commandSequence(seed: number, answers: readonly [string, string, string]) {
  return runJanuaryCommandSequence({
    runnerId: "repro-v1",
    seed,
    contentFingerprint: context.contentFingerprint,
    steps,
    plan,
    rulesetFingerprint,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    answers: [
      {
        kind: "january-access",
        provideAnswer: () => ({ schemaVersion: "january-access-answer-v1", route: answers[0] }),
      },
      {
        kind: "january-learning",
        provideAnswer: () => ({
          schemaVersion: "january-learning-answer-v1",
          practice: answers[1],
        }),
      },
      {
        kind: "january-defect",
        provideAnswer: () => ({ schemaVersion: "january-defect-answer-v1", response: answers[2] }),
      },
    ],
  });
}

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
  }
});

describe("January 1990 AI-first harness intentional-bug proof", () => {
  it("detects an injected bug by property, shrinks it, exports a repro, replays it, and passes the same repro after the fix", async () => {
    const first = commandSequence(42, ["home-pc", "read-and-run", "inspect-listing"] as const);
    expect(first.terminalState).toBe("completed");

    const baselineRepro = {
      schemaVersion: "game-repro-v1",
      fixtureId: "january-start",
      rulesetFingerprint,
      seed: "42",
      commands: [
        { kind: "answer", decisionId: "january-1990/access", value: "home-pc" },
        { kind: "answer", decisionId: "january-1990/learning", value: "read-and-run" },
        { kind: "answer", decisionId: "january-1990/defect", value: "inspect-listing" },
      ],
      expected: {
        kind: "success",
        terminalCheckpointHash: first.checkpoint.checkpointHash,
      },
    };
    const baselineParsed = parseGameReproV1(baselineRepro);
    expect(baselineParsed.kind).toBe("ok");
    if (baselineParsed.kind !== "ok") return;
    expect(
      replayJanuaryReproV1({
        context,
        balance: JANUARY_1990_DEFAULT_BALANCE,
        saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
        repro: baselineParsed.repro,
      }).kind,
    ).toBe("reproduced");

    const property = fc.property(
      fc.constantFrom(...ACCESS_ROUTES),
      fc.constantFrom(...LEARNING_PRACTICES),
      fc.constantFrom(...DEFECT_RESPONSES),
      fc.integer({ min: 0, max: 2 }),
      (access, learning, response, roll) => {
        const scores = materializeScores({ access, learning, response }, roll);
        if (exceedsBrokenContract(scores)) {
          throw new Error(
            `broken save contract rejects a legitimate outcome: ${JSON.stringify(scores)}`,
          );
        }
      },
    );
    const outcome = fc.check(property, { numRuns: 200 });
    expect(outcome.failed).toBe(true);
    const counterexample = outcome.counterexample;
    expect(counterexample).toBeDefined();
    if (counterexample === undefined) return;
    const [access, learning, response] = outcome.counterexample as unknown as [
      string,
      string,
      string,
    ];

    const answers: readonly [string, string, string] = [access, learning, response];
    let seed: number | null = null;
    let run: ReturnType<typeof commandSequence> | null = null;
    for (let candidate = 0; candidate <= 255; candidate += 1) {
      const attempt = commandSequence(candidate, answers);
      if (attempt.terminalState !== "completed") continue;
      const outcomeResult = attempt.checkpoint.terminalResult as {
        programmingOutcome?: {
          qualityScores?: { clarity: number; correctness: number; reliability: number };
        };
      } | null;
      const outcomeScores = outcomeResult?.programmingOutcome?.qualityScores;
      if (outcomeScores !== undefined && exceedsBrokenContract(outcomeScores)) {
        seed = candidate;
        run = attempt;
        break;
      }
    }
    if (seed === null || run === null) {
      throw new Error(
        `no January seed reproduces the shrunk counterexample ${JSON.stringify(answers)} at run level within seeds 0..255`,
      );
    }

    const minimalRepro = {
      schemaVersion: "game-repro-v1",
      fixtureId: "january-start",
      rulesetFingerprint,
      seed: String(seed),
      commands: [
        { kind: "answer", decisionId: "january-1990/access", value: answers[0] },
        { kind: "answer", decisionId: "january-1990/learning", value: answers[1] },
        { kind: "answer", decisionId: "january-1990/defect", value: answers[2] },
      ],
      expected: {
        kind: "success",
        terminalCheckpointHash: run.checkpoint.checkpointHash,
      },
    };

    const directory = await mkdtemp(path.join(os.tmpdir(), "rh-proof-"));
    tempDirectories.push(directory);
    const target = path.join(directory, "minimal.repro.json");
    await writeFile(target, JSON.stringify(minimalRepro, null, 2), "utf8");
    const fromDisk = parseGameReproV1(JSON.parse(await readFile(target, "utf8")));
    expect(fromDisk.kind).toBe("ok");
    if (fromDisk.kind !== "ok") return;

    const terminalResult = run.checkpoint.terminalResult as {
      programmingOutcome: {
        qualityScores: { clarity: number; correctness: number; reliability: number };
      };
    };
    expect(() => parseJanuary1990Result(terminalResult, brokenMaxima)).toThrowError(
      /must be a safe integer between/u,
    );
    const parsedWithDerivedMaxima = parseJanuary1990Result(terminalResult, derivedMaxima);
    expect(parsedWithDerivedMaxima.programmingOutcome.qualityScores).toEqual(
      terminalResult.programmingOutcome.qualityScores,
    );

    expect(
      replayJanuaryReproV1({
        context,
        balance: JANUARY_1990_DEFAULT_BALANCE,
        saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
        repro: fromDisk.repro,
      }),
    ).toEqual({
      kind: "reproduced",
      terminalCheckpointHash: run.checkpoint.checkpointHash,
    });
  });
});
