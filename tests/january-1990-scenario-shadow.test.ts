import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { projectJanuary1990Content } from "@runtime-human/game-application";
import {
  createJanuary1990MonthSteps,
  fingerprint,
  JANUARY_1990_DECISION_IDS,
  JANUARY_1990_DEFAULT_BALANCE,
  JANUARY_1990_RNG_CALL_BUDGET,
} from "@runtime-human/game-core";
import {
  certifyScenarioProgramV1,
  compileScenarioProgramV1,
  resolveScenarioCapabilitiesV1,
} from "@runtime-human/game-devtools";
import {
  MVP_CASUAL_SCENARIO_POLICY_V1,
  type ScenarioCapabilityRegistryV1,
  type ScenarioExecutionPolicyV1,
} from "@runtime-human/game-schema";

import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

const EVIDENCE_ROOT = resolve(import.meta.dirname, "../tools/scenario-shadow/january-1990");

async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(resolve(EVIDENCE_ROOT, name), "utf8")) as T;
}

async function buildShadowEvidence() {
  const source = await loadJson<ScenarioAuthoringDocument>("source.json");
  const capabilityRegistry = await loadJson<ScenarioCapabilityRegistryV1>("registry.json");
  const policy = await loadJson<ScenarioExecutionPolicyV1>("policy.json");

  const compiled = compileScenarioProgramV1(source, { fingerprint });
  expect(compiled.kind).toBe("success");
  if (compiled.kind !== "success") throw new Error("January shadow source did not compile");

  const resolved = resolveScenarioCapabilitiesV1(compiled.program, capabilityRegistry, {
    fingerprint,
  });
  expect(resolved.kind).toBe("success");
  if (resolved.kind !== "success") throw new Error("January shadow capabilities did not resolve");

  const certified = certifyScenarioProgramV1(
    compiled.program,
    policy,
    { fingerprint },
    resolved.capabilities,
  );
  expect(certified.kind).toBe("success");
  if (certified.kind !== "success") throw new Error("January shadow program did not certify");

  return {
    source,
    policy,
    program: compiled.program,
    capabilities: resolved.capabilities,
    certificate: certified.certificate,
  };
}

describe("January 1990 ScenarioProgram shadow proof", () => {
  it("maps the nine authoritative MonthRun steps onto eight closed shadow instructions", async () => {
    const shadow = await buildShadowEvidence();
    const contentRegistry = await loadJanuaryTestRegistry();
    const context = projectJanuary1990Content(contentRegistry);
    const authoritativeSteps = createJanuary1990MonthSteps(context, JANUARY_1990_DEFAULT_BALANCE);

    expect(authoritativeSteps).toHaveLength(9);
    expect(shadow.program.instructions.map((instruction) => instruction.op)).toEqual([
      "decision",
      "provider",
      "decision",
      "provider",
      "random-content",
      "decision",
      "provider",
      "complete",
    ]);
    expect(
      shadow.program.instructions
        .filter((instruction) => instruction.op === "decision")
        .map((instruction) => instruction.decisionId),
    ).toEqual([
      JANUARY_1990_DECISION_IDS.access,
      JANUARY_1990_DECISION_IDS.learning,
      JANUARY_1990_DECISION_IDS.defect,
    ]);
  });

  it("uses an explicit fingerprinted January policy instead of weakening the casual profile", async () => {
    const shadow = await buildShadowEvidence();

    expect(shadow.policy).toEqual({
      schemaVersion: "scenario-execution-policy-v1",
      policyId: "january-1990-shadow-proof-v1",
      requireAcyclic: true,
      blockingDecisionsMax: 3,
    });
    expect(shadow.certificate.blockingDecisionsMin).toBe(3);
    expect(shadow.certificate.blockingDecisionsMax).toBe(3);

    const casual = certifyScenarioProgramV1(
      shadow.program,
      MVP_CASUAL_SCENARIO_POLICY_V1,
      { fingerprint },
      shadow.capabilities,
    );
    expect(casual.kind).toBe("failure");
    if (casual.kind === "failure") {
      expect(casual.diagnostics.map(({ code }) => code)).toContain("SCN010");
    }
  });

  it("proves the shadow RNG bound equals January's authoritative two-call budget", async () => {
    const shadow = await buildShadowEvidence();
    const authoritativeRngCalls = Object.values(JANUARY_1990_RNG_CALL_BUDGET).reduce<number>(
      (total, calls) => total + calls,
      0,
    );

    expect(authoritativeRngCalls).toBe(2);
    expect(shadow.certificate.rngCallsMax).toBe(authoritativeRngCalls);
    expect(shadow.certificate.providerCallsMax).toBe(3);
    expect(shadow.certificate.transitionBudgetMax).toBe(8);
    expect(shadow.certificate.completionGuaranteed).toBe(true);
    expect(shadow.certificate.bounded).toBe(true);
  });

  it("rebuilds the committed shadow evidence byte-for-byte", async () => {
    const shadow = await buildShadowEvidence();
    const committed = await readFile(resolve(EVIDENCE_ROOT, "evidence.json"), "utf8");
    const evidence = {
      schemaVersion: "january-1990-scenario-shadow-evidence-v1",
      authority: {
        month: "1990-01",
        program: "january-1990-v1",
        monthRunStepCount: 9,
        blockingDecisions: 3,
        rngCallsMax: 2,
      },
      shadow: {
        scenarioId: shadow.program.scenarioId,
        instructionCount: shadow.program.instructions.length,
        transitionBudgetMax: shadow.certificate.transitionBudgetMax,
        blockingDecisionsMin: shadow.certificate.blockingDecisionsMin,
        blockingDecisionsMax: shadow.certificate.blockingDecisionsMax,
        providerCallsMax: shadow.certificate.providerCallsMax,
        rngCallsMax: shadow.certificate.rngCallsMax,
        completionGuaranteed: shadow.certificate.completionGuaranteed,
        bounded: shadow.certificate.bounded,
        sourceFingerprint: shadow.program.sourceFingerprint,
        programFingerprint: shadow.program.programFingerprint,
        rulesFingerprint: shadow.capabilities.rulesFingerprint,
        policyFingerprint: shadow.certificate.policyFingerprint,
        certificateFingerprint: shadow.certificate.certificateFingerprint,
      },
    };

    expect(committed).toBe(`${JSON.stringify(evidence, null, 2)}\n`);
  });
});
