import { describe, expect, it } from "vitest";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990HierarchicalRulesFingerprint,
  createJanuary1990RulesFingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import {
  compareSimulationReportsV3,
  createJanuary1990SimulationV2,
  createJanuary1990SimulationV3,
  GAME_REPRO_SCHEMA_VERSION_V3,
  JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
  JANUARY_RNG_EVIDENCE_V2,
  parseGameReproV3,
  parseJanuaryRngEvidenceV2,
  replayJanuaryReproV3,
  SIMULATION_REPORT_SCHEMA_VERSION_V3,
  type GameReproV3,
  type SimulationReportV3,
} from "@runtime-human/game-simulation";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const registry = await loadJanuaryTestRegistry();
const context = projectJanuary1990Content(registry);
const balance = JANUARY_1990_DEFAULT_BALANCE;
const input = {
  context,
  balance,
  saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
};

function commands() {
  return [
    { kind: "answer" as const, decisionId: "january-1990/access" as const, value: "home-pc" },
    {
      kind: "answer" as const,
      decisionId: "january-1990/learning" as const,
      value: "read-and-run",
    },
    {
      kind: "answer" as const,
      decisionId: "january-1990/defect" as const,
      value: "inspect-listing",
    },
  ];
}

describe("January RNG evidence after hierarchical authority cutover", () => {
  it("preserves simulation-report-v2 as the historical legacy authority contract", () => {
    const legacy = createJanuary1990SimulationV2(input).simulate({
      seedStart: 42,
      seedEnd: 42,
      policies: ["always-first-valid"],
    });

    expect(legacy.rulesetFingerprint).toBe(createJanuary1990RulesFingerprint(balance));
    expect(legacy.rngEvidence.authority.mode).toBe("legacy-sequential-v1");
  });

  it("materializes a closed hierarchical authority evidence contract", () => {
    expect(JANUARY_RNG_EVIDENCE_V2).toEqual({
      schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
      authority: {
        mode: "hierarchical-v1",
        derivationManifest: {
          algorithm: "xoshiro256ss-v1",
          derivationVersion: "hierarchical-v1",
          hashAlgorithm: "sha256-v1",
          serializationVersion: "canonical-json-v1",
        },
        declaredCallBudget: { content: 0, narrative: 1, outcome: 1 },
      },
      legacyCompatibility: {
        mode: "legacy-sequential-v1",
        policy: "fail-closed-incompatible-checkpoint-v1",
      },
    });
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V2)).toBe(true);

    const parsed = parseJanuaryRngEvidenceV2(
      JSON.parse(JSON.stringify(JANUARY_RNG_EVIDENCE_V2)) as unknown,
    );
    expect(parsed.kind).toBe("ok");
    expect(
      parseJanuaryRngEvidenceV2({ ...JANUARY_RNG_EVIDENCE_V2, unexpected: true }).kind,
    ).toBe("invalid");
  });

  it("runs simulation-report-v3 with hierarchical execution, fingerprint and immutable root", () => {
    const simulation = createJanuary1990SimulationV3(input);
    const report = simulation.simulate({
      seedStart: 42,
      seedEnd: 42,
      policies: ["always-first-valid"],
    });
    const run = simulation.runOnce({ seed: 42, policyId: "always-first-valid" });

    expect(report.schemaVersion).toBe(SIMULATION_REPORT_SCHEMA_VERSION_V3);
    expect(report.rulesetFingerprint).toBe(createJanuary1990HierarchicalRulesFingerprint(balance));
    expect(report.rngEvidence).toEqual(JANUARY_RNG_EVIDENCE_V2);
    expect(run.checkpoint.compatibility.rulesFingerprint).toBe(
      createJanuary1990HierarchicalRulesFingerprint(balance),
    );
    expect(run.checkpoint.compatibility.determinismManifest).toEqual(
      JANUARY_1990_HIERARCHICAL_DETERMINISM_MANIFEST,
    );
    expect(run.checkpoint.rngState).toBe(Xoshiro256StarStar.fromSeed(42n).exportState());
  });

  it("rejects report-v3 comparisons across different hierarchical evidence identities", () => {
    const simulation = createJanuary1990SimulationV3(input);
    const baseline = simulation.simulate({
      seedStart: 1,
      seedEnd: 2,
      policies: ["always-first-valid"],
    });
    const candidate: SimulationReportV3 = {
      ...baseline,
      rngEvidence: {
        ...JANUARY_RNG_EVIDENCE_V2,
        authority: {
          ...JANUARY_RNG_EVIDENCE_V2.authority,
          declaredCallBudget: {
            ...JANUARY_RNG_EVIDENCE_V2.authority.declaredCallBudget,
            narrative: 2,
          },
        },
      },
    };

    const result = compareSimulationReportsV3({ baseline, candidate });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics[0]?.code).toBe("COMPARE_INCOMPATIBLE");
    }
  });

  it("replays game-repro-v3 with the same hierarchical authority as the current runtime", () => {
    const simulation = createJanuary1990SimulationV3(input);
    const expectedRun = simulation.runOnce({ seed: 42, policyId: "always-first-valid" });
    expect(expectedRun.terminalState).toBe("completed");

    const repro: GameReproV3 = {
      schemaVersion: GAME_REPRO_SCHEMA_VERSION_V3,
      fixtureId: "january-hierarchical-cutover",
      rulesetFingerprint: createJanuary1990HierarchicalRulesFingerprint(balance),
      rngEvidence: JANUARY_RNG_EVIDENCE_V2,
      seed: "42",
      commands: commands(),
      expected: {
        kind: "success",
        terminalCheckpointHash: expectedRun.checkpoint.checkpointHash,
      },
    };
    const parsed = parseGameReproV3(repro);
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;

    const replay = replayJanuaryReproV3({ ...input, repro: parsed.repro, captureTrace: true });
    expect(replay.kind).toBe("reproduced");
    if (replay.kind === "reproduced") {
      expect(replay.terminalCheckpointHash).toBe(expectedRun.checkpoint.checkpointHash);
      expect(replay.trace?.terminalState).toBe("completed");
    }
  });
});
