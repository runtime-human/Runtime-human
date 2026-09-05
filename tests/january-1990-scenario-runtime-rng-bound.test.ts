import { describe, expect, it, vi } from "vitest";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990MonthPlan,
  createJanuary1990ScenarioMonthSteps,
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import {
  createJanuary1990AnswerProviders,
  REPRO_RUNNER_ID,
  runJanuaryCommandSequence,
} from "@runtime-human/game-simulation";

import { loadJanuaryScenarioArtifactV1 } from "./helpers/january-1990-scenario-artifact";
import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const RNG_PROOF_SEEDS = Array.from({ length: 64 }, (_, seed) => seed);

describe("January 1990 certified scenario runtime RNG bound", () => {
  it("observes actual adapter RNG calls within the certificate bound across the controlled corpus", async () => {
    const registry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(registry);
    const artifact = await loadJanuaryScenarioArtifactV1();
    if (artifact.certificate.rngCallsMax === "unknown") {
      throw new Error("January scenario certificate must expose a numeric RNG call bound");
    }
    const rngCallsMax = artifact.certificate.rngCallsMax;
    const plan = createJanuary1990MonthPlan(context);
    const steps = createJanuary1990ScenarioMonthSteps(
      context,
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const rulesetFingerprint = createJanuary1990ScenarioRuntimeRulesFingerprint(
      JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    );
    const nextInt = vi.spyOn(Xoshiro256StarStar.prototype, "nextInt");

    try {
      for (const seed of RNG_PROOF_SEEDS) {
        const answers = createJanuary1990AnswerProviders({
          policyId: null,
          seed,
          fixtureAnswers: {
            access: "home-pc",
            learning: "read-and-run",
            response: "inspect-listing",
          },
        });
        const callsBefore = nextInt.mock.calls.length;
        const run = runJanuaryCommandSequence({
          runnerId: REPRO_RUNNER_ID,
          seed,
          contentFingerprint: context.contentFingerprint,
          steps,
          plan,
          rulesetFingerprint,
          determinismManifest: JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
          saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
          answers,
        });
        const observedCalls = nextInt.mock.calls.length - callsBefore;

        expect(run.terminalState).toBe("completed");
        expect(observedCalls).toBeLessThanOrEqual(rngCallsMax);
        expect(observedCalls).toBe(rngCallsMax);
      }
    } finally {
      nextInt.mockRestore();
    }
  });
});
