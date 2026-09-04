import { describe, expect, it } from "vitest";

import {
  createLinearScenarioMonthRunStepsV1,
  createMonthRunCheckpoint,
  fingerprint,
} from "@runtime-human/game-core";
import {
  DETERMINISM_MANIFEST_V1,
  parseDecisionId,
  parseMonthRunId,
  parseSaveId,
  parseSaveRevision,
  parseSerializedXoshiro256State,
  type ScenarioCertificateV1,
  type ScenarioProgramV1,
  type ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

const RNG_STATE = parseSerializedXoshiro256State(
  "0100000000000000020000000000000003000000000000000400000000000000",
);
const PROGRAM_FINGERPRINT = fingerprint("scenario-runtime-test-program", { version: 1 });
const RULES_FINGERPRINT = fingerprint("scenario-runtime-test-rules", { version: 1 });
const POLICY_FINGERPRINT = fingerprint("scenario-runtime-test-policy", { version: 1 });
const CERTIFICATE_FINGERPRINT = fingerprint("scenario-runtime-test-certificate", { version: 1 });

const PROGRAM: ScenarioProgramV1 = Object.freeze({
  schemaVersion: "scenario-program-v1",
  scenarioId: "adapter.linear.test",
  entryPc: 0,
  instructions: Object.freeze([
    Object.freeze({ op: "decision", decisionId: "decision-1", nextPc: 1 }),
    Object.freeze({ op: "provider", providerIndex: 0, nextPc: 2 }),
    Object.freeze({ op: "random-content", contentPoolIndex: 0, nextPc: 3 }),
    Object.freeze({ op: "complete" }),
  ]),
  providerTable: Object.freeze(["provider-1"]),
  predicateTable: Object.freeze([]),
  contentPoolTable: Object.freeze(["pool-1"]),
  sourceFingerprint: fingerprint("scenario-runtime-test-source", { version: 1 }),
  programFingerprint: PROGRAM_FINGERPRINT,
});

const CAPABILITIES: ScenarioResolvedCapabilitiesV1 = Object.freeze({
  schemaVersion: "scenario-resolved-capabilities-v1",
  programFingerprint: PROGRAM_FINGERPRINT,
  providers: Object.freeze([
    Object.freeze({
      id: "provider-1",
      version: 1,
      deterministic: true,
      rngBudgetMax: 0,
      effectDomain: "progression",
    }),
  ]),
  predicates: Object.freeze([]),
  randomContentRngBudgetPerInstruction: 1,
  rulesFingerprint: RULES_FINGERPRINT,
});

const CERTIFICATE: ScenarioCertificateV1 = Object.freeze({
  schemaVersion: "scenario-certificate-v1",
  programFingerprint: PROGRAM_FINGERPRINT,
  policyId: "adapter-linear-test-v1",
  policyFingerprint: POLICY_FINGERPRINT,
  rulesFingerprint: RULES_FINGERPRINT,
  instructionCount: 4,
  completionGuaranteed: true,
  bounded: true,
  transitionBudgetMax: 4,
  blockingDecisionsMin: 1,
  blockingDecisionsMax: 1,
  providerCallsMax: 1,
  rngCallsMax: 1,
  certificateFingerprint: CERTIFICATE_FINGERPRINT,
});

const CHECKPOINT = createMonthRunCheckpoint({
  runId: parseMonthRunId("run-adapter-test"),
  saveId: parseSaveId("save-adapter-test"),
  baseSaveRevision: parseSaveRevision(0),
  compatibility: {
    checkpointSchema: "month-run-checkpoint-v1",
    rulesFingerprint: RULES_FINGERPRINT,
    contentFingerprint: fingerprint("scenario-runtime-test-content", { version: 1 }),
    saveSchemaFingerprint: fingerprint("scenario-runtime-test-save", { version: 1 }),
    determinismManifest: DETERMINISM_MANIFEST_V1,
  },
  plan: { month: "test" },
  rngState: RNG_STATE,
});

function createBindings() {
  return {
    decisions: {
      "decision-1": () => ({
        type: "suspend-for-decision" as const,
        decision: {
          decisionId: parseDecisionId("decision-1"),
          kind: "adapter-test",
          prompt: { options: ["a", "b"] },
          answerSchemaFingerprint: fingerprint("scenario-runtime-test-answer", { version: 1 }),
        },
      }),
    },
    providers: {
      "provider-1": () => ({
        type: "advance-step" as const,
        phase: "materialize" as const,
        provisionalState: { provider: true },
      }),
    },
    randomContent: {
      "pool-1": () => ({
        type: "materialize-outcome" as const,
        outcomeId: "adapter-test/random",
        scope: "adapter-test/random",
        payload: { selected: "x" },
        phase: "resolve" as const,
        provisionalState: { random: "x" },
        rngState: RNG_STATE,
      }),
    },
    complete: () => ({ type: "complete" as const, result: { done: true } }),
  };
}

function createAdapter(program: ScenarioProgramV1 = PROGRAM) {
  return createLinearScenarioMonthRunStepsV1({
    program,
    capabilities: CAPABILITIES,
    certificate: CERTIFICATE,
    bindings: createBindings(),
  });
}

describe("linear ScenarioProgram -> MonthRun adapter", () => {
  it("prepends the implicit MonthRun start and dispatches closed typed bindings in scenario PC order", () => {
    const result = createAdapter();

    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error(result.error.message);

    expect(result.steps).toHaveLength(5);
    expect(result.steps[0]!(CHECKPOINT)).toEqual({ type: "start" });
    expect(result.steps[1]!(CHECKPOINT).type).toBe("suspend-for-decision");
    expect(result.steps[2]!(CHECKPOINT).type).toBe("advance-step");
    expect(result.steps[3]!(CHECKPOINT).type).toBe("materialize-outcome");
    expect(result.steps[4]!(CHECKPOINT).type).toBe("complete");
  });

  it("fails closed when a linear instruction skips a scenario program counter", () => {
    const result = createAdapter({
      ...PROGRAM,
      instructions: [
        { op: "decision", decisionId: "decision-1", nextPc: 2 },
        ...PROGRAM.instructions.slice(1),
      ],
    });

    expect(result).toMatchObject({
      kind: "failure",
      error: { code: "UnsupportedProgramShape", pc: 0 },
    });
  });

  it("fails closed on gate or branch instructions in the Stage F linear profile", () => {
    const result = createAdapter({
      ...PROGRAM,
      predicateTable: ["predicate-1"],
      instructions: [
        { op: "gate", predicateIndex: 0, passPc: 1, failPc: 1 },
        ...PROGRAM.instructions.slice(1),
      ],
    });

    expect(result).toMatchObject({
      kind: "failure",
      error: { code: "UnsupportedInstruction", pc: 0 },
    });
  });

  it("fails closed when a required trusted runtime binding is missing", () => {
    const bindings = createBindings();
    const result = createLinearScenarioMonthRunStepsV1({
      program: PROGRAM,
      capabilities: CAPABILITIES,
      certificate: CERTIFICATE,
      bindings: { ...bindings, providers: {} },
    });

    expect(result).toMatchObject({
      kind: "failure",
      error: { code: "MissingBinding", pc: 1 },
    });
  });

  it("fails closed when capability or certificate identity is not bound to the exact program", () => {
    const result = createLinearScenarioMonthRunStepsV1({
      program: PROGRAM,
      capabilities: {
        ...CAPABILITIES,
        programFingerprint: fingerprint("different-program", { version: 2 }),
      },
      certificate: CERTIFICATE,
      bindings: createBindings(),
    });

    expect(result).toMatchObject({
      kind: "failure",
      error: { code: "ArtifactMismatch" },
    });
  });
});
