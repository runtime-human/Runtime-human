import type {
  Fingerprint,
  MonthRunCheckpointV1,
  ScenarioArtifactV1,
  ScenarioCertificateV1,
  ScenarioInstructionV1,
  ScenarioProgramV1,
  ScenarioProviderDescriptorV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

import { fingerprint } from "../determinism/hash";
import type { MonthRunStep } from "../month-run/runner";
import type { January1990BalanceV1 } from "./january-balance";
import type { January1990ContentContext } from "./january-content-context";
import { createJanuary1990MonthSteps as createUncheckedJanuary1990MonthSteps } from "./january-month-steps";
import { parseJanuary1990MonthPlan } from "./january-month-plan";
import {
  createJanuary1990RulesFingerprintForExecutionProfile,
  JANUARY_1990_RNG_EXECUTION_PROFILES_V1,
} from "./january-rng-execution-profile";

const JANUARY_SCENARIO_RUNTIME_RULES_NAMESPACE = "january-1990-scenario-runtime-rules-v1";
const SCENARIO_PROGRAM_FINGERPRINT_NAMESPACE = "scenario-program-v1";
const SCENARIO_RULES_FINGERPRINT_NAMESPACE = "scenario-rules-v1";
const SCENARIO_CERTIFICATE_FINGERPRINT_NAMESPACE = "scenario-certificate-v1";
const JANUARY_SCENARIO_ID = "january-1990.shadow-proof";
const JANUARY_SCENARIO_POLICY_ID = "january-1990-shadow-proof-v1";
const JANUARY_SCENARIO_POLICY_FINGERPRINT =
  "4263f3937d962c8238b142358311d3a4b3e8fe51c8d79d1747a49cba1054483b" as Fingerprint;
const JANUARY_SCENARIO_INSTRUCTION_COUNT = 8;
const JANUARY_SCENARIO_DECISION_COUNT = 3;
const JANUARY_SCENARIO_PROVIDER_COUNT = 3;
const JANUARY_SCENARIO_RANDOM_CONTENT_COUNT = 1;
const JANUARY_SCENARIO_RNG_CALL_BUDGET = 2;

const ACCESS_DECISION_ID = "january-1990/access";
const LEARNING_DECISION_ID = "january-1990/learning";
const DEFECT_DECISION_ID = "january-1990/defect";
const ACCESS_PROVIDER_ID = "january-1990.access-materialize";
const WORK_PROVIDER_ID = "january-1990.work-materialize";
const PROGRAMMING_PROVIDER_ID = "january-1990.programming-outcome";
const DEFECT_CONTENT_POOL_ID = "january-1990.defect-events";

type JanuaryScenarioRuntimeStats = Readonly<{
  blockingDecisions: number;
  providerCalls: number;
  randomContentCalls: number;
  rngCalls: number;
}>;

type JanuaryMonthStepBindings = Readonly<{
  start: MonthRunStep;
  accessDecision: MonthRunStep;
  learningDecision: MonthRunStep;
  defectDecision: MonthRunStep;
  accessProvider: MonthRunStep;
  workProvider: MonthRunStep;
  programmingProvider: MonthRunStep;
  defectContent: MonthRunStep;
  complete: MonthRunStep;
}>;

export function assertJanuary1990ScenarioRuntimeArtifactV1(artifact: ScenarioArtifactV1): void {
  if (artifact.schemaVersion !== "scenario-artifact-v1") {
    throw new TypeError("January scenario runtime requires scenario-artifact-v1");
  }

  assertProgramIdentity(artifact.program);
  assertCapabilityIdentity(artifact.program, artifact.capabilities);
  const stats = assertJanuaryInstructionSurface(artifact.program, artifact.capabilities);
  assertCertificateIdentity(artifact.program, artifact.capabilities, artifact.certificate, stats);
}

export function createJanuary1990ScenarioRuntimeRulesFingerprint(
  balance: January1990BalanceV1,
  artifact: ScenarioArtifactV1,
): Fingerprint {
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  return fingerprint(JANUARY_SCENARIO_RUNTIME_RULES_NAMESPACE, {
    januaryRulesFingerprint: createJanuary1990RulesFingerprintForExecutionProfile(
      balance,
      JANUARY_1990_RNG_EXECUTION_PROFILES_V1.hierarchical.id,
    ),
    scenarioProgramFingerprint: artifact.program.programFingerprint,
    scenarioRulesFingerprint: artifact.capabilities.rulesFingerprint,
    scenarioPolicyFingerprint: artifact.certificate.policyFingerprint,
    scenarioCertificateFingerprint: artifact.certificate.certificateFingerprint,
  });
}

export function createJanuary1990ScenarioMonthSteps(
  context: January1990ContentContext,
  balance: January1990BalanceV1,
  artifact: ScenarioArtifactV1,
): readonly MonthRunStep[] {
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  const expectedRulesFingerprint = createJanuary1990ScenarioRuntimeRulesFingerprint(
    balance,
    artifact,
  );
  const bindings = createJanuaryMonthStepBindings(
    createUncheckedJanuary1990MonthSteps(context, balance, "hierarchical-v1"),
  );
  const scenarioSteps = artifact.program.instructions.map((instruction) =>
    bindScenarioInstruction(artifact.program, instruction, bindings),
  );

  return Object.freeze(
    [bindings.start, ...scenarioSteps].map((step) => (checkpoint: MonthRunCheckpointV1) => {
      validateScenarioCheckpoint(context, checkpoint, expectedRulesFingerprint);
      return step(checkpoint);
    }),
  );
}

function assertProgramIdentity(program: ScenarioProgramV1): void {
  if (
    program.schemaVersion !== "scenario-program-v1" ||
    program.scenarioId !== JANUARY_SCENARIO_ID ||
    program.entryPc !== 0 ||
    program.instructions.length !== JANUARY_SCENARIO_INSTRUCTION_COUNT
  ) {
    throw new TypeError("January scenario runtime program shape is unsupported");
  }

  const { programFingerprint, ...programBody } = program;
  if (fingerprint(SCENARIO_PROGRAM_FINGERPRINT_NAMESPACE, programBody) !== programFingerprint) {
    throw new TypeError("January scenario runtime program fingerprint is invalid");
  }
}

function assertCapabilityIdentity(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1,
): void {
  if (
    capabilities.schemaVersion !== "scenario-resolved-capabilities-v1" ||
    capabilities.programFingerprint !== program.programFingerprint ||
    capabilities.providers.length !== program.providerTable.length ||
    capabilities.predicates.length !== program.predicateTable.length ||
    program.predicateTable.length !== 0 ||
    capabilities.randomContentRngBudgetPerInstruction !== 1
  ) {
    throw new TypeError("January scenario runtime capability binding is unsupported");
  }

  for (let index = 0; index < program.providerTable.length; index += 1) {
    const providerId = program.providerTable[index];
    const descriptor = capabilities.providers[index];
    if (providerId === undefined || descriptor === undefined || descriptor.id !== providerId) {
      throw new TypeError("January scenario runtime provider binding is inconsistent");
    }
    assertJanuaryProviderDescriptor(descriptor);
  }

  const { rulesFingerprint, ...capabilityBody } = capabilities;
  if (fingerprint(SCENARIO_RULES_FINGERPRINT_NAMESPACE, capabilityBody) !== rulesFingerprint) {
    throw new TypeError("January scenario runtime capability fingerprint is invalid");
  }
}

function assertJanuaryProviderDescriptor(descriptor: ScenarioProviderDescriptorV1): void {
  const supported =
    (descriptor.id === ACCESS_PROVIDER_ID &&
      descriptor.version === 1 &&
      descriptor.deterministic === true &&
      descriptor.rngBudgetMax === 0 &&
      descriptor.effectDomain === "progression") ||
    (descriptor.id === WORK_PROVIDER_ID &&
      descriptor.version === 1 &&
      descriptor.deterministic === true &&
      descriptor.rngBudgetMax === 0 &&
      descriptor.effectDomain === "learning") ||
    (descriptor.id === PROGRAMMING_PROVIDER_ID &&
      descriptor.version === 1 &&
      descriptor.deterministic === true &&
      descriptor.rngBudgetMax === 1 &&
      descriptor.effectDomain === "project");
  if (!supported) {
    throw new TypeError(`January scenario provider ${descriptor.id} is unsupported`);
  }
}

function assertJanuaryInstructionSurface(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1,
): JanuaryScenarioRuntimeStats {
  let blockingDecisions = 0;
  let providerCalls = 0;
  let randomContentCalls = 0;
  let rngCalls = 0;
  let completionCount = 0;

  for (let pc = 0; pc < program.instructions.length; pc += 1) {
    const instruction = program.instructions[pc];
    if (instruction === undefined) {
      throw new TypeError(`January scenario instruction ${pc} is missing`);
    }

    switch (instruction.op) {
      case "decision":
        assertLinearNextPc(pc, instruction.nextPc);
        assertJanuaryDecisionId(instruction.decisionId);
        blockingDecisions += 1;
        break;
      case "provider": {
        assertLinearNextPc(pc, instruction.nextPc);
        const provider = requireTableEntry(
          program.providerTable,
          instruction.providerIndex,
          "provider",
        );
        assertJanuaryProviderId(provider);
        const descriptor = capabilities.providers[instruction.providerIndex];
        if (descriptor === undefined || descriptor.id !== provider) {
          throw new TypeError("January scenario provider descriptor is missing");
        }
        providerCalls += 1;
        rngCalls += descriptor.rngBudgetMax;
        break;
      }
      case "random-content": {
        assertLinearNextPc(pc, instruction.nextPc);
        const contentPool = requireTableEntry(
          program.contentPoolTable,
          instruction.contentPoolIndex,
          "content pool",
        );
        if (contentPool !== DEFECT_CONTENT_POOL_ID) {
          throw new TypeError(`January scenario content pool ${contentPool} is unsupported`);
        }
        randomContentCalls += 1;
        rngCalls += capabilities.randomContentRngBudgetPerInstruction;
        break;
      }
      case "complete":
        if (pc !== program.instructions.length - 1) {
          throw new TypeError("January scenario completion must be the final instruction");
        }
        completionCount += 1;
        break;
      case "gate":
      case "branch":
        throw new TypeError(`January scenario runtime instruction ${instruction.op} is unsupported`);
    }
  }

  if (
    blockingDecisions !== JANUARY_SCENARIO_DECISION_COUNT ||
    providerCalls !== JANUARY_SCENARIO_PROVIDER_COUNT ||
    randomContentCalls !== JANUARY_SCENARIO_RANDOM_CONTENT_COUNT ||
    completionCount !== 1 ||
    rngCalls !== JANUARY_SCENARIO_RNG_CALL_BUDGET
  ) {
    throw new TypeError("January scenario runtime instruction surface is unsupported");
  }

  return { blockingDecisions, providerCalls, randomContentCalls, rngCalls };
}

function assertCertificateIdentity(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1,
  certificate: ScenarioCertificateV1,
  stats: JanuaryScenarioRuntimeStats,
): void {
  if (
    certificate.schemaVersion !== "scenario-certificate-v1" ||
    certificate.programFingerprint !== program.programFingerprint ||
    certificate.rulesFingerprint !== capabilities.rulesFingerprint ||
    certificate.policyId !== JANUARY_SCENARIO_POLICY_ID ||
    certificate.policyFingerprint !== JANUARY_SCENARIO_POLICY_FINGERPRINT ||
    certificate.instructionCount !== program.instructions.length ||
    certificate.completionGuaranteed !== true ||
    certificate.bounded !== true ||
    certificate.transitionBudgetMax !== program.instructions.length ||
    certificate.blockingDecisionsMin !== stats.blockingDecisions ||
    certificate.blockingDecisionsMax !== stats.blockingDecisions ||
    certificate.providerCallsMax !== stats.providerCalls ||
    certificate.rngCallsMax !== stats.rngCalls
  ) {
    throw new TypeError("January scenario runtime certificate bounds are unsupported");
  }

  const { certificateFingerprint, ...certificateBody } = certificate;
  if (
    fingerprint(SCENARIO_CERTIFICATE_FINGERPRINT_NAMESPACE, certificateBody) !==
    certificateFingerprint
  ) {
    throw new TypeError("January scenario runtime certificate fingerprint is invalid");
  }
}

function assertLinearNextPc(pc: number, nextPc: number): void {
  if (nextPc !== pc + 1) {
    throw new TypeError(
      `January scenario runtime requires linear control flow at instruction ${pc}`,
    );
  }
}

function assertJanuaryDecisionId(decisionId: string): void {
  if (
    decisionId !== ACCESS_DECISION_ID &&
    decisionId !== LEARNING_DECISION_ID &&
    decisionId !== DEFECT_DECISION_ID
  ) {
    throw new TypeError(`January scenario decision ${decisionId} is unsupported`);
  }
}

function assertJanuaryProviderId(providerId: string): void {
  if (
    providerId !== ACCESS_PROVIDER_ID &&
    providerId !== WORK_PROVIDER_ID &&
    providerId !== PROGRAMMING_PROVIDER_ID
  ) {
    throw new TypeError(`January scenario provider ${providerId} is unsupported`);
  }
}

function createJanuaryMonthStepBindings(steps: readonly MonthRunStep[]): JanuaryMonthStepBindings {
  if (steps.length !== JANUARY_SCENARIO_INSTRUCTION_COUNT + 1) {
    throw new TypeError("January scenario adapter does not match the MonthRun binding table");
  }
  return Object.freeze({
    start: requireMonthStep(steps, 0, "start"),
    accessDecision: requireMonthStep(steps, 1, "access decision"),
    accessProvider: requireMonthStep(steps, 2, "access provider"),
    learningDecision: requireMonthStep(steps, 3, "learning decision"),
    workProvider: requireMonthStep(steps, 4, "work provider"),
    defectContent: requireMonthStep(steps, 5, "defect content"),
    defectDecision: requireMonthStep(steps, 6, "defect decision"),
    programmingProvider: requireMonthStep(steps, 7, "programming provider"),
    complete: requireMonthStep(steps, 8, "completion"),
  });
}

function bindScenarioInstruction(
  program: ScenarioProgramV1,
  instruction: ScenarioInstructionV1,
  bindings: JanuaryMonthStepBindings,
): MonthRunStep {
  switch (instruction.op) {
    case "decision":
      switch (instruction.decisionId) {
        case ACCESS_DECISION_ID:
          return bindings.accessDecision;
        case LEARNING_DECISION_ID:
          return bindings.learningDecision;
        case DEFECT_DECISION_ID:
          return bindings.defectDecision;
        default:
          throw new TypeError(`January scenario decision ${instruction.decisionId} is unsupported`);
      }
    case "provider": {
      const providerId = requireTableEntry(
        program.providerTable,
        instruction.providerIndex,
        "provider",
      );
      switch (providerId) {
        case ACCESS_PROVIDER_ID:
          return bindings.accessProvider;
        case WORK_PROVIDER_ID:
          return bindings.workProvider;
        case PROGRAMMING_PROVIDER_ID:
          return bindings.programmingProvider;
        default:
          throw new TypeError(`January scenario provider ${providerId} is unsupported`);
      }
    }
    case "random-content": {
      const contentPool = requireTableEntry(
        program.contentPoolTable,
        instruction.contentPoolIndex,
        "content pool",
      );
      if (contentPool !== DEFECT_CONTENT_POOL_ID) {
        throw new TypeError(`January scenario content pool ${contentPool} is unsupported`);
      }
      return bindings.defectContent;
    }
    case "complete":
      return bindings.complete;
    case "gate":
    case "branch":
      throw new TypeError(`January scenario runtime instruction ${instruction.op} is unsupported`);
  }
}

function requireTableEntry(
  values: readonly string[],
  index: number,
  subject: string,
): string {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new TypeError(`January scenario ${subject} index is invalid`);
  }
  const value = values[index];
  if (value === undefined) {
    throw new TypeError(`January scenario ${subject} index ${index} is unresolved`);
  }
  return value;
}

function requireMonthStep(
  steps: readonly MonthRunStep[],
  index: number,
  subject: string,
): MonthRunStep {
  const step = steps[index];
  if (step === undefined) {
    throw new TypeError(`January MonthRun ${subject} binding is missing`);
  }
  return step;
}

function validateScenarioCheckpoint(
  context: January1990ContentContext,
  checkpoint: MonthRunCheckpointV1,
  expectedRulesFingerprint: Fingerprint,
): void {
  const plan = parseJanuary1990MonthPlan(checkpoint.plan);
  if (
    plan.contentFingerprint !== context.contentFingerprint ||
    checkpoint.compatibility.contentFingerprint !== context.contentFingerprint
  ) {
    throw new TypeError("January scenario MonthRun content fingerprint is incompatible");
  }
  if (checkpoint.compatibility.rulesFingerprint !== expectedRulesFingerprint) {
    throw new TypeError("January scenario MonthRun rules fingerprint is incompatible");
  }
}
