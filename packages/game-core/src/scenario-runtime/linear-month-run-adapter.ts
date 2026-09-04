import type {
  MonthRunCheckpointV1,
  MonthRunEventV1,
  ScenarioCertificateV1,
  ScenarioProgramV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

import type { MonthRunStep } from "../month-run/runner";

type DecisionEventV1 = Extract<MonthRunEventV1, Readonly<{ type: "suspend-for-decision" }>>;
type ProviderEventV1 = Extract<
  MonthRunEventV1,
  Readonly<{ type: "advance-step" | "materialize-outcome" }>
>;
type RandomContentEventV1 = Extract<MonthRunEventV1, Readonly<{ type: "materialize-outcome" }>>;
type CompleteEventV1 = Extract<MonthRunEventV1, Readonly<{ type: "complete" }>>;

export type LinearScenarioDecisionBindingV1 = (checkpoint: MonthRunCheckpointV1) => DecisionEventV1;
export type LinearScenarioProviderBindingV1 = (checkpoint: MonthRunCheckpointV1) => ProviderEventV1;
export type LinearScenarioRandomContentBindingV1 = (
  checkpoint: MonthRunCheckpointV1,
) => RandomContentEventV1;
export type LinearScenarioCompleteBindingV1 = (checkpoint: MonthRunCheckpointV1) => CompleteEventV1;

export type LinearScenarioMonthRunBindingsV1 = Readonly<{
  decisions: Readonly<Record<string, LinearScenarioDecisionBindingV1>>;
  providers: Readonly<Record<string, LinearScenarioProviderBindingV1>>;
  randomContent: Readonly<Record<string, LinearScenarioRandomContentBindingV1>>;
  complete: LinearScenarioCompleteBindingV1;
}>;

export type LinearScenarioMonthRunAdapterErrorCodeV1 =
  | "ArtifactMismatch"
  | "UnsupportedProgramShape"
  | "UnsupportedInstruction"
  | "MissingBinding";

export type LinearScenarioMonthRunAdapterErrorV1 = Readonly<{
  code: LinearScenarioMonthRunAdapterErrorCodeV1;
  message: string;
  pc?: number;
}>;

export type LinearScenarioMonthRunAdapterResultV1 =
  | Readonly<{ kind: "success"; steps: readonly MonthRunStep[] }>
  | Readonly<{ kind: "failure"; error: LinearScenarioMonthRunAdapterErrorV1 }>;

export type CreateLinearScenarioMonthRunStepsInputV1 = Readonly<{
  program: ScenarioProgramV1;
  capabilities: ScenarioResolvedCapabilitiesV1;
  certificate: ScenarioCertificateV1;
  bindings: LinearScenarioMonthRunBindingsV1;
}>;

export function createLinearScenarioMonthRunStepsV1(
  input: CreateLinearScenarioMonthRunStepsInputV1,
): LinearScenarioMonthRunAdapterResultV1 {
  const { program, capabilities, certificate, bindings } = input;

  if (program.entryPc !== 0) {
    return failure(
      "UnsupportedProgramShape",
      "Stage F linear ScenarioProgram must enter at scenario PC 0",
    );
  }

  const compiledSteps: MonthRunStep[] = [];
  for (let pc = 0; pc < program.instructions.length; pc += 1) {
    const instruction = program.instructions[pc];
    if (instruction === undefined) {
      return failure("ArtifactMismatch", `Scenario instruction ${pc} is missing`, pc);
    }

    switch (instruction.op) {
      case "decision": {
        if (instruction.nextPc !== pc + 1) return nonLinear(pc, instruction.nextPc);
        const binding = bindings.decisions[instruction.decisionId];
        if (binding === undefined) {
          return failure(
            "MissingBinding",
            `Missing trusted decision binding for ${instruction.decisionId}`,
            pc,
          );
        }
        compiledSteps.push(binding);
        break;
      }
      case "provider": {
        if (instruction.nextPc !== pc + 1) return nonLinear(pc, instruction.nextPc);
        const providerId = program.providerTable[instruction.providerIndex];
        if (providerId === undefined) {
          return failure(
            "ArtifactMismatch",
            `Provider index ${instruction.providerIndex} is not present in the program table`,
            pc,
          );
        }
        const binding = bindings.providers[providerId];
        if (binding === undefined) {
          return failure(
            "MissingBinding",
            `Missing trusted provider binding for ${providerId}`,
            pc,
          );
        }
        compiledSteps.push(binding);
        break;
      }
      case "random-content": {
        if (instruction.nextPc !== pc + 1) return nonLinear(pc, instruction.nextPc);
        const contentPoolId = program.contentPoolTable[instruction.contentPoolIndex];
        if (contentPoolId === undefined) {
          return failure(
            "ArtifactMismatch",
            `Content pool index ${instruction.contentPoolIndex} is not present in the program table`,
            pc,
          );
        }
        const binding = bindings.randomContent[contentPoolId];
        if (binding === undefined) {
          return failure(
            "MissingBinding",
            `Missing trusted random-content binding for ${contentPoolId}`,
            pc,
          );
        }
        compiledSteps.push(binding);
        break;
      }
      case "complete":
        if (pc !== program.instructions.length - 1) {
          return failure(
            "UnsupportedProgramShape",
            "Stage F linear ScenarioProgram must complete at its final instruction",
            pc,
          );
        }
        compiledSteps.push(bindings.complete);
        break;
      case "gate":
      case "branch":
        return failure(
          "UnsupportedInstruction",
          `Stage F linear runtime does not execute ${instruction.op} instructions`,
          pc,
        );
    }
  }

  const artifactError = validateArtifactBinding(program, capabilities, certificate);
  if (artifactError !== null) return { kind: "failure", error: artifactError };

  return {
    kind: "success",
    steps: Object.freeze([() => ({ type: "start" }), ...compiledSteps]),
  };
}

function validateArtifactBinding(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1,
  certificate: ScenarioCertificateV1,
): LinearScenarioMonthRunAdapterErrorV1 | null {
  if (
    capabilities.programFingerprint !== program.programFingerprint ||
    certificate.programFingerprint !== program.programFingerprint ||
    certificate.rulesFingerprint !== capabilities.rulesFingerprint
  ) {
    return {
      code: "ArtifactMismatch",
      message: "Scenario program, capabilities, and certificate are not bound to the same identity",
    };
  }

  if (
    certificate.instructionCount !== program.instructions.length ||
    certificate.transitionBudgetMax !== program.instructions.length ||
    certificate.bounded !== true ||
    certificate.completionGuaranteed !== true
  ) {
    return {
      code: "ArtifactMismatch",
      message: "Scenario certificate does not prove the exact Stage F linear instruction budget",
    };
  }

  if (
    capabilities.providers.length !== program.providerTable.length ||
    capabilities.providers.some(
      (descriptor, index) => descriptor.id !== program.providerTable[index],
    )
  ) {
    return {
      code: "ArtifactMismatch",
      message: "Resolved provider capabilities do not match the compiled provider table",
    };
  }

  if (
    capabilities.predicates.length !== program.predicateTable.length ||
    capabilities.predicates.some(
      (descriptor, index) => descriptor.id !== program.predicateTable[index],
    )
  ) {
    return {
      code: "ArtifactMismatch",
      message: "Resolved predicate capabilities do not match the compiled predicate table",
    };
  }

  return null;
}

function nonLinear(pc: number, targetPc: number): LinearScenarioMonthRunAdapterResultV1 {
  return failure(
    "UnsupportedProgramShape",
    `Stage F linear instruction ${pc} must advance to ${pc + 1}, received ${targetPc}`,
    pc,
  );
}

function failure(
  code: LinearScenarioMonthRunAdapterErrorCodeV1,
  message: string,
  pc?: number,
): LinearScenarioMonthRunAdapterResultV1 {
  return {
    kind: "failure",
    error: { code, message, ...(pc === undefined ? {} : { pc }) },
  };
}
