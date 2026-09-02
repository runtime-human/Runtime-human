import type {
  Fingerprint,
  ScenarioCertificateV1,
  ScenarioExecutionPolicyV1,
  ScenarioInstructionV1,
  ScenarioProgramV1,
  ScenarioResolvedCapabilitiesV1,
} from "@runtime-human/game-schema";

import type { StructuredDiagnosticV1 } from "../diagnostics/gamectl-diagnostics";

const POLICY_FINGERPRINT_NAMESPACE = "scenario-execution-policy-v1";
const CERTIFICATE_FINGERPRINT_NAMESPACE = "scenario-certificate-v1";
const POLICY_SCHEMA_VERSION: ScenarioExecutionPolicyV1["schemaVersion"] =
  "scenario-execution-policy-v1";
const CERTIFICATE_SCHEMA_VERSION: ScenarioCertificateV1["schemaVersion"] =
  "scenario-certificate-v1";
const POLICY_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;

export type ScenarioCertificationPrimitives = Readonly<{
  fingerprint(namespace: string, value: unknown): Fingerprint;
}>;

export type CertifyScenarioProgramV1Result =
  | Readonly<{ kind: "success"; certificate: ScenarioCertificateV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly StructuredDiagnosticV1[] }>;

type PathBounds = Readonly<{
  transitionBudgetMax: number;
  blockingDecisionsMin: number;
  blockingDecisionsMax: number;
  providerCallsMax: number;
  rngCallsMax: number | "unknown";
}>;

export function certifyScenarioProgramV1(
  program: ScenarioProgramV1,
  policy: ScenarioExecutionPolicyV1,
  primitives: ScenarioCertificationPrimitives,
  capabilities?: ScenarioResolvedCapabilitiesV1,
): CertifyScenarioProgramV1Result {
  validatePolicy(policy);
  validatePrimitives(primitives);

  const programDiagnostic = validateProgram(program);
  if (programDiagnostic !== null) return failure(programDiagnostic);

  if (capabilities !== undefined) {
    const capabilityDiagnostic = validateResolvedCapabilities(program, capabilities);
    if (capabilityDiagnostic !== null) return failure(capabilityDiagnostic);
  }

  const reachable = collectReachable(program);
  if (reachable.size !== program.instructions.length) {
    return failure(
      diagnostic(
        program,
        "SCN011",
        "Compiled scenario program contains unreachable instructions",
        "/instructions",
      ),
    );
  }

  const cycleAnchor = findCycleAnchor(program, reachable);
  if (cycleAnchor !== null) {
    return failure(
      diagnostic(
        program,
        "SCN009",
        "Scenario execution cannot be certified because a reachable cycle has no explicit static bound",
        `/instructions/${cycleAnchor}`,
      ),
    );
  }

  const bounds = computePathBounds(program, capabilities);
  if (bounds.blockingDecisionsMax > policy.blockingDecisionsMax) {
    return failure(
      diagnostic(
        program,
        "SCN010",
        `Scenario requires up to ${bounds.blockingDecisionsMax} blocking decisions but policy ${JSON.stringify(policy.policyId)} allows ${policy.blockingDecisionsMax}`,
        "/policy/blockingDecisionsMax",
      ),
    );
  }

  const policyFingerprint = primitives.fingerprint(POLICY_FINGERPRINT_NAMESPACE, policy);
  const body = {
    schemaVersion: CERTIFICATE_SCHEMA_VERSION,
    programFingerprint: program.programFingerprint,
    policyId: policy.policyId,
    policyFingerprint,
    ...(capabilities === undefined ? {} : { rulesFingerprint: capabilities.rulesFingerprint }),
    instructionCount: program.instructions.length,
    completionGuaranteed: true,
    bounded: true,
    transitionBudgetMax: bounds.transitionBudgetMax,
    blockingDecisionsMin: bounds.blockingDecisionsMin,
    blockingDecisionsMax: bounds.blockingDecisionsMax,
    providerCallsMax: bounds.providerCallsMax,
    rngCallsMax: bounds.rngCallsMax,
  } as const;

  return {
    kind: "success",
    certificate: Object.freeze({
      ...body,
      certificateFingerprint: primitives.fingerprint(CERTIFICATE_FINGERPRINT_NAMESPACE, body),
    }),
  };
}

function validatePolicy(policy: ScenarioExecutionPolicyV1): void {
  if (policy.schemaVersion !== POLICY_SCHEMA_VERSION) {
    throw new TypeError("Unsupported scenario execution policy schema");
  }
  if (policy.requireAcyclic !== true) {
    throw new TypeError("Scenario execution policy v1 must require acyclic execution");
  }
  if (!POLICY_ID.test(policy.policyId) || policy.policyId.length > 160) {
    throw new TypeError(
      "Scenario execution policy id does not match the closed identifier contract",
    );
  }
  if (!Number.isSafeInteger(policy.blockingDecisionsMax) || policy.blockingDecisionsMax < 0) {
    throw new TypeError("Scenario blocking decision limit must be a non-negative safe integer");
  }
}

function validatePrimitives(primitives: ScenarioCertificationPrimitives): void {
  if (typeof primitives.fingerprint !== "function") {
    throw new TypeError("Scenario certification requires an authoritative fingerprint primitive");
  }
}

function validateResolvedCapabilities(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1,
): StructuredDiagnosticV1 | null {
  if (capabilities.programFingerprint !== program.programFingerprint) {
    return diagnostic(
      program,
      "SCN012",
      "Resolved scenario capabilities target a different executable program",
      "/programFingerprint",
    );
  }

  if (!sameIds(capabilities.providers, program.providerTable)) {
    return diagnostic(
      program,
      "SCN012",
      "Resolved scenario provider descriptors do not match the executable provider table",
      "/providerTable",
    );
  }

  if (!sameIds(capabilities.predicates, program.predicateTable)) {
    return diagnostic(
      program,
      "SCN012",
      "Resolved scenario predicate descriptors do not match the executable predicate table",
      "/predicateTable",
    );
  }

  if (
    !Number.isSafeInteger(capabilities.randomContentRngBudgetPerInstruction) ||
    capabilities.randomContentRngBudgetPerInstruction < 0
  ) {
    return diagnostic(
      program,
      "SCN012",
      "Resolved random-content RNG budget must be a non-negative safe integer",
      "/randomContentRngBudgetPerInstruction",
    );
  }

  return null;
}

function sameIds(
  descriptors: readonly Readonly<{ id: string }>[],
  expectedIds: readonly string[],
): boolean {
  if (descriptors.length !== expectedIds.length) return false;
  return descriptors.every((descriptor, index) => descriptor.id === expectedIds[index]);
}

function validateProgram(program: ScenarioProgramV1): StructuredDiagnosticV1 | null {
  if (!isPc(program.entryPc, program.instructions.length)) {
    return diagnostic(program, "SCN011", "Compiled scenario entry PC is invalid", "/entryPc");
  }

  for (let pc = 0; pc < program.instructions.length; pc += 1) {
    const instruction = program.instructions[pc];
    if (instruction === undefined) {
      return diagnostic(
        program,
        "SCN011",
        `Compiled scenario instruction ${pc} is missing`,
        `/instructions/${pc}`,
      );
    }
    const successors = successorsOf(instruction);
    if (instruction.op !== "complete" && successors.length === 0) {
      return diagnostic(
        program,
        "SCN011",
        `Compiled scenario instruction ${pc} has no executable successor`,
        `/instructions/${pc}`,
      );
    }
    for (const target of successors) {
      if (!isPc(target, program.instructions.length)) {
        return diagnostic(
          program,
          "SCN011",
          `Compiled scenario instruction ${pc} targets invalid PC ${target}`,
          `/instructions/${pc}`,
        );
      }
    }
  }

  return null;
}

function isPc(value: number, instructionCount: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value < instructionCount;
}

function collectReachable(program: ScenarioProgramV1): ReadonlySet<number> {
  const reachable = new Set<number>();
  const pending = [program.entryPc];
  for (let index = 0; index < pending.length; index += 1) {
    const pc = pending[index];
    if (pc === undefined || reachable.has(pc)) continue;
    reachable.add(pc);
    const instruction = program.instructions[pc];
    if (instruction === undefined) continue;
    for (const target of successorsOf(instruction)) {
      if (!reachable.has(target)) pending.push(target);
    }
  }
  return reachable;
}

function findCycleAnchor(
  program: ScenarioProgramV1,
  reachable: ReadonlySet<number>,
): number | null {
  const state = new Uint8Array(program.instructions.length);

  const visit = (pc: number): number | null => {
    state[pc] = 1;
    const instruction = program.instructions[pc];
    if (instruction === undefined) return pc;
    for (const target of successorsOf(instruction).toSorted((left, right) => left - right)) {
      if (!reachable.has(target)) continue;
      if (state[target] === 1) return target;
      if (state[target] === 0) {
        const cycle = visit(target);
        if (cycle !== null) return cycle;
      }
    }
    state[pc] = 2;
    return null;
  };

  for (const pc of [...reachable].toSorted((left, right) => left - right)) {
    if (state[pc] !== 0) continue;
    const cycle = visit(pc);
    if (cycle !== null) return cycle;
  }
  return null;
}

function computePathBounds(
  program: ScenarioProgramV1,
  capabilities: ScenarioResolvedCapabilitiesV1 | undefined,
): PathBounds {
  const memo = new Map<number, PathBounds>();
  const providerRngBudgets = new Map(
    capabilities?.providers.map(
      (descriptor) => [descriptor.id, descriptor.rngBudgetMax] as const,
    ) ?? [],
  );

  const visit = (pc: number): PathBounds => {
    const cached = memo.get(pc);
    if (cached !== undefined) return cached;
    const instruction = program.instructions[pc];
    if (instruction === undefined) {
      throw new TypeError(`Scenario certificate cannot read instruction ${pc}`);
    }

    const ownDecision = instruction.op === "decision" ? 1 : 0;
    const ownProvider = instruction.op === "provider" ? 1 : 0;
    const ownRng = rngBudgetForInstruction(program, instruction, capabilities, providerRngBudgets);
    const successors = successorsOf(instruction);

    if (successors.length === 0) {
      const terminal = Object.freeze({
        transitionBudgetMax: 1,
        blockingDecisionsMin: ownDecision,
        blockingDecisionsMax: ownDecision,
        providerCallsMax: ownProvider,
        rngCallsMax: ownRng,
      });
      memo.set(pc, terminal);
      return terminal;
    }

    const children = successors.map(visit);
    const bounds = Object.freeze({
      transitionBudgetMax: 1 + Math.max(...children.map((child) => child.transitionBudgetMax)),
      blockingDecisionsMin:
        ownDecision + Math.min(...children.map((child) => child.blockingDecisionsMin)),
      blockingDecisionsMax:
        ownDecision + Math.max(...children.map((child) => child.blockingDecisionsMax)),
      providerCallsMax: ownProvider + Math.max(...children.map((child) => child.providerCallsMax)),
      rngCallsMax: addRngBudget(
        ownRng,
        children.map((child) => child.rngCallsMax),
      ),
    });
    memo.set(pc, bounds);
    return bounds;
  };

  return visit(program.entryPc);
}

function rngBudgetForInstruction(
  program: ScenarioProgramV1,
  instruction: ScenarioInstructionV1,
  capabilities: ScenarioResolvedCapabilitiesV1 | undefined,
  providerRngBudgets: ReadonlyMap<string, number>,
): number | "unknown" {
  if (instruction.op === "provider") {
    if (capabilities === undefined) return "unknown";
    const providerId = program.providerTable[instruction.providerIndex];
    if (providerId === undefined) return "unknown";
    return providerRngBudgets.get(providerId) ?? "unknown";
  }
  if (instruction.op === "random-content") {
    return capabilities?.randomContentRngBudgetPerInstruction ?? "unknown";
  }
  return 0;
}

function addRngBudget(
  own: number | "unknown",
  children: readonly (number | "unknown")[],
): number | "unknown" {
  if (own === "unknown") return "unknown";

  let childMax = 0;
  for (const child of children) {
    if (child === "unknown") return "unknown";
    childMax = Math.max(childMax, child);
  }
  return own + childMax;
}

function successorsOf(instruction: ScenarioInstructionV1): readonly number[] {
  switch (instruction.op) {
    case "decision":
    case "provider":
    case "random-content":
      return [instruction.nextPc];
    case "gate":
      return instruction.passPc === instruction.failPc
        ? [instruction.passPc]
        : [instruction.passPc, instruction.failPc];
    case "branch":
      return [
        ...new Set([
          ...instruction.branches.map((branch) => branch.targetPc),
          instruction.fallbackPc,
        ]),
      ];
    case "complete":
      return [];
  }
}

function diagnostic(
  program: ScenarioProgramV1,
  code: string,
  message: string,
  pointer: string,
): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code,
    severity: "error",
    category: "scenario",
    entityId: program.scenarioId,
    pointer,
    message,
  };
}

function failure(diagnosticValue: StructuredDiagnosticV1): CertifyScenarioProgramV1Result {
  return { kind: "failure", diagnostics: [diagnosticValue] };
}
