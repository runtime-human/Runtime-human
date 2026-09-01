import { describe, expect, it } from "vitest";

import {
  projectJanuary1990Content,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import {
  createJanuary1990RulesFingerprint,
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
  Xoshiro256StarStar,
} from "@runtime-human/game-core";
import type { Fingerprint } from "@runtime-human/game-schema";
import {
  compareSimulationReportsV2,
  createJanuary1990SimulationV2,
  createJanuary1990SimulationV3,
  GAME_REPRO_SCHEMA_VERSION_V2,
  GAME_REPRO_SCHEMA_VERSION_V3,
  JANUARY_RNG_EVIDENCE_SCHEMA_VERSION,
  JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
  JANUARY_RNG_EVIDENCE_V1,
  JANUARY_RNG_EVIDENCE_V2,
  parseGameReproV2,
  parseGameReproV3,
  parseJanuaryRngEvidenceV1,
  parseJanuaryRngEvidenceV2,
  replayJanuaryReproV2,
  replayJanuaryReproV3,
  SIMULATION_POLICY_IDS,
  SIMULATION_REPORT_SCHEMA_VERSION_V2,
  SIMULATION_REPORT_SCHEMA_VERSION_V3,
  type GameReproV2,
  type GameReproV3,
  type JanuaryRngEvidenceV1,
  type JanuaryRngEvidenceV2,
  type SimulationReportV2,
} from "@runtime-human/game-simulation";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const GOLDEN_SHADOW_FINGERPRINT =
  "f013a1155f4829ba20a112b12e1edb906288ecc27468808c1fb87d0b45ab15bd";
const TERMINAL_CHECKPOINT_HASH =
  "10a2fbda782646a739e5a54b7c71cd5feee2b815886510fe62be47febd30314f" as Fingerprint;

const registry = await loadJanuaryTestRegistry();
const context = projectJanuary1990Content(registry);
const balance = JANUARY_1990_DEFAULT_BALANCE;
const rulesetFingerprint = createJanuary1990RulesFingerprint(balance);
const hierarchicalRulesetFingerprint = createJanuary1990RulesFingerprintForExecutionProfile(
  balance,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
);
const simulation = createJanuary1990SimulationV2({
  context,
  balance,
  saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
});

function createRepro(rngEvidence: JanuaryRngEvidenceV1 = JANUARY_RNG_EVIDENCE_V1): GameReproV2 {
  return {
    schemaVersion: GAME_REPRO_SCHEMA_VERSION_V2,
    fixtureId: "january-start",
    rulesetFingerprint,
    rngEvidence,
    seed: "42",
    commands: [
      { kind: "answer", decisionId: "january-1990/access", value: "home-pc" },
      { kind: "answer", decisionId: "january-1990/learning", value: "read-and-run" },
      { kind: "answer", decisionId: "january-1990/defect", value: "inspect-listing" },
    ],
    expected: { kind: "success", terminalCheckpointHash: TERMINAL_CHECKPOINT_HASH },
  };
}

function withDifferentGolden(): JanuaryRngEvidenceV1 {
  return {
    ...JANUARY_RNG_EVIDENCE_V1,
    shadow: {
      ...JANUARY_RNG_EVIDENCE_V1.shadow,
      goldenReportFingerprint: "a".repeat(64) as Fingerprint,
    },
  };
}

function createHierarchicalRepro(
  rngEvidence: JanuaryRngEvidenceV2 = JANUARY_RNG_EVIDENCE_V2,
): GameReproV3 {
  return {
    schemaVersion: GAME_REPRO_SCHEMA_VERSION_V3,
    fixtureId: "january-hierarchical-protocol-rejection",
    rulesetFingerprint: hierarchicalRulesetFingerprint,
    rngEvidence,
    seed: "42",
    commands: [],
    expected: { kind: "failure", failureClass: "protocol-rejected" },
  };
}

describe("January RNG evidence v1", () => {
  it("materializes the frozen authority/shadow identity from the C1 contract", () => {
    expect(JANUARY_RNG_EVIDENCE_V1).toEqual({
      schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION,
      authority: { mode: "legacy-sequential-v1" },
      shadow: {
        mode: "hierarchical-v1",
        derivationManifest: {
          algorithm: "xoshiro256ss-v1",
          derivationVersion: "hierarchical-v1",
          hashAlgorithm: "sha256-v1",
          serializationVersion: "canonical-json-v1",
        },
        reportSchemaVersion: "january-rng-shadow-report-v1",
        declaredCallBudget: { content: 0, narrative: 1, outcome: 1 },
        goldenReportFingerprint: GOLDEN_SHADOW_FINGERPRINT,
      },
    });
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V1)).toBe(true);
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V1.authority)).toBe(true);
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V1.shadow)).toBe(true);
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V1.shadow.declaredCallBudget)).toBe(true);

    const parsed = parseJanuaryRngEvidenceV1(
      JSON.parse(JSON.stringify(JANUARY_RNG_EVIDENCE_V1)) as unknown,
    );
    expect(parsed.kind).toBe("ok");
  });

  it("emits byte-stable simulation-report-v2 evidence", () => {
    const request = { seedStart: 1, seedEnd: 2, policies: [...SIMULATION_POLICY_IDS] } as const;
    const first = simulation.simulate(request);
    const second = simulation.simulate(request);

    expect(first.schemaVersion).toBe(SIMULATION_REPORT_SCHEMA_VERSION_V2);
    expect(first.rngEvidence).toEqual(JANUARY_RNG_EVIDENCE_V1);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("rejects simulation comparisons with a different RNG evidence identity", () => {
    const baseline = simulation.simulate({
      seedStart: 1,
      seedEnd: 2,
      policies: [...SIMULATION_POLICY_IDS],
    });
    const candidate: SimulationReportV2 = {
      ...baseline,
      rngEvidence: withDifferentGolden(),
    };

    const result = compareSimulationReportsV2({ baseline, candidate });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics[0]?.code).toBe("COMPARE_INCOMPATIBLE");
    }
  });

  it("replays game-repro-v2 without changing legacy authoritative semantics", () => {
    const parsed = parseGameReproV2(createRepro());
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;

    const result = replayJanuaryReproV2({
      context,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      repro: parsed.repro,
    });
    expect(result.kind).toBe("reproduced");
    if (result.kind === "reproduced") {
      expect(result.terminalCheckpointHash).toBe(TERMINAL_CHECKPOINT_HASH);
    }
  });

  it("rejects a game-repro-v2 whose RNG evidence does not match the active evidence contract", () => {
    const parsed = parseGameReproV2(createRepro(withDifferentGolden()));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;

    const result = replayJanuaryReproV2({
      context,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      repro: parsed.repro,
    });
    expect(result.kind).toBe("incompatible");
    if (result.kind === "incompatible") {
      expect(result.diagnostics[0]?.code).toBe("REPRO_RNG_EVIDENCE_MISMATCH");
    }
  });
});

describe("January hierarchical RNG authority evidence v2", () => {
  it("preserves historical v1 while materializing a closed hierarchical authority identity", () => {
    expect(JANUARY_RNG_EVIDENCE_V1.authority.mode).toBe("legacy-sequential-v1");
    expect(JANUARY_RNG_EVIDENCE_V2).toEqual({
      schemaVersion: JANUARY_RNG_EVIDENCE_SCHEMA_VERSION_V2,
      rngDerivationVersion: "hierarchical-v1",
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
    });
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V2)).toBe(true);
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V2.authority)).toBe(true);
    expect(Object.isFrozen(JANUARY_RNG_EVIDENCE_V2.authority.declaredCallBudget)).toBe(true);

    const parsed = parseJanuaryRngEvidenceV2(
      JSON.parse(JSON.stringify(JANUARY_RNG_EVIDENCE_V2)) as unknown,
    );
    expect(parsed.kind).toBe("ok");
    expect(
      parseJanuaryRngEvidenceV2({ ...JANUARY_RNG_EVIDENCE_V2, unexpected: true }).kind,
    ).toBe("invalid");
  });

  it("emits simulation-report-v3 with hierarchical rules and immutable month-root RNG state", () => {
    const hierarchical = createJanuary1990SimulationV3({
      context,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    });
    const report = hierarchical.simulate({
      seedStart: 42,
      seedEnd: 42,
      policies: ["always-first-valid"],
    });
    const run = hierarchical.runOnce({ seed: 42, policyId: "always-first-valid" });

    expect(report.schemaVersion).toBe(SIMULATION_REPORT_SCHEMA_VERSION_V3);
    expect(report.rulesetFingerprint).toBe(hierarchicalRulesetFingerprint);
    expect(report.rngEvidence).toEqual(JANUARY_RNG_EVIDENCE_V2);
    expect(run.checkpoint.compatibility.rulesFingerprint).toBe(hierarchicalRulesetFingerprint);
    expect(run.checkpoint.compatibility.determinismManifest.rulesVersion).toBe(
      "january-1990-hierarchical-rng-v1",
    );
    expect(run.checkpoint.rngState).toBe(Xoshiro256StarStar.fromSeed(42n).exportState());
  });

  it("replays game-repro-v3 only under the hierarchical authority evidence identity", () => {
    const parsed = parseGameReproV3(createHierarchicalRepro());
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;

    const result = replayJanuaryReproV3({
      context,
      balance,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      repro: parsed.repro,
    });
    expect(result.kind).toBe("reproduced");

    const legacyEvidence = parseGameReproV3({
      ...createHierarchicalRepro(),
      rngEvidence: JANUARY_RNG_EVIDENCE_V1,
    });
    expect(legacyEvidence.kind).toBe("invalid");
  });
});
