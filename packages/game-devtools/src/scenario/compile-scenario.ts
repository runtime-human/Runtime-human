import type {
  ScenarioAuthoringDocument,
  ScenarioAuthoringNode,
} from "@runtime-human/game-authoring-schema";
import { fingerprintCompilerArtifactV1 } from "@runtime-human/game-content-compiler";

import type { StructuredDiagnosticV1 } from "../diagnostics/gamectl-diagnostics";
import { analyzeScenario } from "./analyze-scenario";

export const SCENARIO_PROGRAM_SCHEMA_VERSION = "scenario-program-v1" as const;
export const SCENARIO_CERTIFICATE_SCHEMA_VERSION = "scenario-certificate-v1" as const;

export type ScenarioCompilerPolicyV1 = Readonly<{
  id: "scenario-compiler-foundation-v1";
  requireAcyclic: true;
  requireCompletionFromEveryReachableNode: true;
}>;

export const SCENARIO_COMPILER_POLICY_V1: ScenarioCompilerPolicyV1 = Object.freeze({
  id: "scenario-compiler-foundation-v1",
  requireAcyclic: true,
  requireCompletionFromEveryReachableNode: true,
});

export type ScenarioCompileOptionsV1 = Readonly<{
  providerIds: ReadonlySet<string>;
  predicateIds: ReadonlySet<string>;
  contentPoolIds: ReadonlySet<string>;
  policy: ScenarioCompilerPolicyV1;
}>;

export type ScenarioInstructionV1 =
  | Readonly<{ kind: "decision"; decisionId: string; nextPc: number }>
  | Readonly<{ kind: "provider"; providerIndex: number; nextPc: number }>
  | Readonly<{ kind: "random-content"; contentPoolIndex: number; nextPc: number }>
  | Readonly<{
      kind: "gate";
      predicateIndex: number;
      passPc: number;
      failPc: number;
    }>
  | Readonly<{
      kind: "branch";
      branches: readonly Readonly<{ predicateIndex: number; targetPc: number }>[];
      fallbackPc: number;
    }>
  | Readonly<{ kind: "complete" }>;

export type ScenarioCertificateV1 = Readonly<{
  schemaVersion: typeof SCENARIO_CERTIFICATE_SCHEMA_VERSION;
  reachableNodes: number;
  instructionCount: number;
  completionReachable: true;
  bounded: true;
  transitionBudgetMax: number;
}>;

export type ScenarioProgramV1 = Readonly<{
  schemaVersion: typeof SCENARIO_PROGRAM_SCHEMA_VERSION;
  scenarioId: string;
  compilerPolicyId: ScenarioCompilerPolicyV1["id"];
  entryPc: number;
  instructions: readonly ScenarioInstructionV1[];
  providerTable: readonly string[];
  predicateTable: readonly string[];
  contentPoolTable: readonly string[];
  certificate: ScenarioCertificateV1;
  sourceFingerprint: string;
  programFingerprint: string;
}>;

export type ScenarioCompileResultV1 =
  | Readonly<{ ok: true; program: ScenarioProgramV1 }>
  | Readonly<{ ok: false; diagnostics: readonly StructuredDiagnosticV1[] }>;

type TargetTables = Readonly<{
  pcByNodeId: ReadonlyMap<string, number>;
  providerIndexById: ReadonlyMap<string, number>;
  predicateIndexById: ReadonlyMap<string, number>;
  contentPoolIndexById: ReadonlyMap<string, number>;
}>;

export function compileScenarioV1(
  scenario: ScenarioAuthoringDocument,
  options: ScenarioCompileOptionsV1,
): ScenarioCompileResultV1 {
  const policyDiagnostic = validatePolicy(scenario, options.policy);
  if (policyDiagnostic !== null) {
    return { ok: false, diagnostics: [policyDiagnostic] };
  }

  const analyzerDiagnostics = analyzeScenario(scenario, {
    providerIds: options.providerIds,
    predicateIds: options.predicateIds,
  });
  if (analyzerDiagnostics.length > 0) {
    return { ok: false, diagnostics: analyzerDiagnostics };
  }

  const contentPoolDiagnostics = validateContentPools(scenario, options.contentPoolIds);
  if (contentPoolDiagnostics.length > 0) {
    return { ok: false, diagnostics: contentPoolDiagnostics };
  }

  const nodeIds = Object.keys(scenario.nodes).toSorted(compareText);
  const adjacency = buildAdjacency(scenario, nodeIds);
  const cycle = findFirstCycle(adjacency, nodeIds);
  if (cycle !== null) {
    return {
      ok: false,
      diagnostics: [
        scenarioDiagnostic(
          scenario,
          "SCN102",
          "Scenario compiler foundation policy rejects reachable cycles because a finite transition bound cannot be proven",
          `/nodes/${escapePointer(cycle[0] ?? scenario.entry)}`,
        ),
      ],
    };
  }

  const pcByNodeId = new Map(nodeIds.map((nodeId, pc) => [nodeId, pc] as const));
  const providerTable = collectProviderIds(scenario).toSorted(compareText);
  const predicateTable = collectPredicateIds(scenario).toSorted(compareText);
  const contentPoolTable = collectContentPoolIds(scenario).toSorted(compareText);
  const tables: TargetTables = {
    pcByNodeId,
    providerIndexById: indexTable(providerTable),
    predicateIndexById: indexTable(predicateTable),
    contentPoolIndexById: indexTable(contentPoolTable),
  };
  const instructions = nodeIds.map((nodeId) => {
    const node = scenario.nodes[nodeId];
    if (node === undefined) {
      throw new Error(
        `Scenario compiler invariant violated: missing node ${JSON.stringify(nodeId)}`,
      );
    }
    return compileInstruction(nodeId, node, tables);
  });
  const entryPc = requiredIndex(pcByNodeId, scenario.entry, "entry node");
  const certificate: ScenarioCertificateV1 = {
    schemaVersion: SCENARIO_CERTIFICATE_SCHEMA_VERSION,
    reachableNodes: nodeIds.length,
    instructionCount: instructions.length,
    completionReachable: true,
    bounded: true,
    transitionBudgetMax: longestTransitionPath(scenario.entry, scenario, adjacency),
  };
  const sourceFingerprint = fingerprintCompilerArtifactV1("scenario-source-v1", scenario);
  const executableIdentity = {
    schemaVersion: SCENARIO_PROGRAM_SCHEMA_VERSION,
    scenarioId: scenario.id,
    compilerPolicyId: options.policy.id,
    entryPc,
    instructions,
    providerTable,
    predicateTable,
    contentPoolTable,
    certificate,
    sourceFingerprint,
  };
  const programFingerprint = fingerprintCompilerArtifactV1("scenario-program-v1", {
    compilerPolicy: options.policy,
    program: executableIdentity,
  });

  return {
    ok: true,
    program: {
      ...executableIdentity,
      programFingerprint,
    },
  };
}

function validatePolicy(
  scenario: ScenarioAuthoringDocument,
  policy: ScenarioCompilerPolicyV1,
): StructuredDiagnosticV1 | null {
  if (
    policy.id === SCENARIO_COMPILER_POLICY_V1.id &&
    policy.requireAcyclic === true &&
    policy.requireCompletionFromEveryReachableNode === true
  ) {
    return null;
  }
  return scenarioDiagnostic(scenario, "SCN103", "Unsupported scenario compiler policy", "/policy");
}

function validateContentPools(
  scenario: ScenarioAuthoringDocument,
  contentPoolIds: ReadonlySet<string>,
): readonly StructuredDiagnosticV1[] {
  return Object.keys(scenario.nodes)
    .toSorted(compareText)
    .flatMap((nodeId) => {
      const node = scenario.nodes[nodeId];
      if (node?.kind !== "random-content" || contentPoolIds.has(node.poolId)) return [];
      return [
        scenarioDiagnostic(
          scenario,
          "SCN101",
          `Scenario content pool ${JSON.stringify(node.poolId)} is not registered`,
          `/nodes/${escapePointer(nodeId)}/poolId`,
        ),
      ];
    })
    .toSorted(compareDiagnostic);
}

function compileInstruction(
  nodeId: string,
  node: ScenarioAuthoringNode,
  tables: TargetTables,
): ScenarioInstructionV1 {
  switch (node.kind) {
    case "decision":
      return {
        kind: "decision",
        decisionId: node.decisionId,
        nextPc: requiredPc(tables.pcByNodeId, node.next, nodeId, "next"),
      };
    case "provider":
      return {
        kind: "provider",
        providerIndex: requiredIndex(tables.providerIndexById, node.providerId, "provider"),
        nextPc: requiredPc(tables.pcByNodeId, node.next, nodeId, "next"),
      };
    case "random-content":
      return {
        kind: "random-content",
        contentPoolIndex: requiredIndex(tables.contentPoolIndexById, node.poolId, "content pool"),
        nextPc: requiredPc(tables.pcByNodeId, node.next, nodeId, "next"),
      };
    case "gate":
      return {
        kind: "gate",
        predicateIndex: requiredIndex(tables.predicateIndexById, node.predicateId, "predicate"),
        passPc: requiredPc(tables.pcByNodeId, node.pass, nodeId, "pass"),
        failPc: requiredPc(tables.pcByNodeId, node.fail, nodeId, "fail"),
      };
    case "branch":
      return {
        kind: "branch",
        branches: node.branches.map((branch) => ({
          predicateIndex: requiredIndex(tables.predicateIndexById, branch.predicateId, "predicate"),
          targetPc: requiredPc(tables.pcByNodeId, branch.target, nodeId, "branch target"),
        })),
        fallbackPc: requiredPc(tables.pcByNodeId, node.fallback, nodeId, "fallback"),
      };
    case "complete":
      return { kind: "complete" };
  }
}

function collectProviderIds(scenario: ScenarioAuthoringDocument): string[] {
  return uniqueIds(
    Object.values(scenario.nodes).flatMap((node) =>
      node.kind === "provider" ? [node.providerId] : [],
    ),
  );
}

function collectPredicateIds(scenario: ScenarioAuthoringDocument): string[] {
  return uniqueIds(
    Object.values(scenario.nodes).flatMap((node) => {
      if (node.kind === "gate") return [node.predicateId];
      if (node.kind === "branch") return node.branches.map((branch) => branch.predicateId);
      return [];
    }),
  );
}

function collectContentPoolIds(scenario: ScenarioAuthoringDocument): string[] {
  return uniqueIds(
    Object.values(scenario.nodes).flatMap((node) =>
      node.kind === "random-content" ? [node.poolId] : [],
    ),
  );
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function indexTable(values: readonly string[]): ReadonlyMap<string, number> {
  return new Map(values.map((value, index) => [value, index] as const));
}

function buildAdjacency(
  scenario: ScenarioAuthoringDocument,
  nodeIds: readonly string[],
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map<string, readonly string[]>();
  for (const nodeId of nodeIds) {
    const node = scenario.nodes[nodeId];
    adjacency.set(
      nodeId,
      node === undefined ? [] : [...new Set(targetsOf(node))].toSorted(compareText),
    );
  }
  return adjacency;
}

function targetsOf(node: ScenarioAuthoringNode): readonly string[] {
  switch (node.kind) {
    case "decision":
    case "provider":
    case "random-content":
      return node.next === undefined ? [] : [node.next];
    case "gate":
      return [
        ...(node.pass === undefined ? [] : [node.pass]),
        ...(node.fail === undefined ? [] : [node.fail]),
      ];
    case "branch":
      return [
        ...node.branches.map((branch) => branch.target),
        ...(node.fallback === undefined ? [] : [node.fallback]),
      ];
    case "complete":
      return [];
  }
}

function findFirstCycle(
  adjacency: ReadonlyMap<string, readonly string[]>,
  nodeIds: readonly string[],
): readonly string[] | null {
  let nextIndex = 0;
  const indexByNode = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];

  const visit = (nodeId: string): void => {
    indexByNode.set(nodeId, nextIndex);
    lowLink.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const target of adjacency.get(nodeId) ?? []) {
      if (!indexByNode.has(target)) {
        visit(target);
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, lowLink.get(target) ?? 0));
      } else if (onStack.has(target)) {
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, indexByNode.get(target) ?? 0));
      }
    }

    if (lowLink.get(nodeId) !== indexByNode.get(nodeId)) return;
    const component: string[] = [];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) break;
      onStack.delete(current);
      component.push(current);
      if (current === nodeId) break;
    }
    const sorted = component.toSorted(compareText);
    const selfLoop =
      sorted.length === 1 && (adjacency.get(sorted[0] ?? "") ?? []).includes(sorted[0] ?? "");
    if (sorted.length > 1 || selfLoop) cycles.push(sorted);
  };

  for (const nodeId of nodeIds) {
    if (!indexByNode.has(nodeId)) visit(nodeId);
  }

  return cycles.toSorted((left, right) => compareText(left[0] ?? "", right[0] ?? ""))[0] ?? null;
}

function longestTransitionPath(
  nodeId: string,
  scenario: ScenarioAuthoringDocument,
  adjacency: ReadonlyMap<string, readonly string[]>,
  memo = new Map<string, number>(),
): number {
  const cached = memo.get(nodeId);
  if (cached !== undefined) return cached;
  const node = scenario.nodes[nodeId];
  if (node?.kind === "complete") {
    memo.set(nodeId, 0);
    return 0;
  }
  const targets = adjacency.get(nodeId) ?? [];
  if (targets.length === 0) {
    throw new Error(
      `Scenario compiler invariant violated: non-terminal node ${JSON.stringify(nodeId)} has no target`,
    );
  }
  const budget =
    1 +
    Math.max(...targets.map((target) => longestTransitionPath(target, scenario, adjacency, memo)));
  memo.set(nodeId, budget);
  return budget;
}

function requiredPc(
  pcByNodeId: ReadonlyMap<string, number>,
  target: string | undefined,
  nodeId: string,
  field: string,
): number {
  if (target === undefined) {
    throw new Error(
      `Scenario compiler invariant violated: ${JSON.stringify(nodeId)} is missing ${field}`,
    );
  }
  return requiredIndex(pcByNodeId, target, `${nodeId}.${field}`);
}

function requiredIndex(indexById: ReadonlyMap<string, number>, id: string, label: string): number {
  const index = indexById.get(id);
  if (index === undefined) {
    throw new Error(
      `Scenario compiler invariant violated: unresolved ${label} ${JSON.stringify(id)}`,
    );
  }
  return index;
}

function scenarioDiagnostic(
  scenario: ScenarioAuthoringDocument,
  code: string,
  message: string,
  pointer: string,
): StructuredDiagnosticV1 {
  return {
    schemaVersion: "runtime-human-diagnostic-v1",
    code,
    severity: "error",
    category: "scenario",
    entityId: scenario.id,
    pointer,
    message,
  };
}

function compareDiagnostic(left: StructuredDiagnosticV1, right: StructuredDiagnosticV1): number {
  return compareText(left.code, right.code) || compareText(left.pointer ?? "", right.pointer ?? "");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
