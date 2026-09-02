import type {
  ScenarioAuthoringDocument,
  ScenarioAuthoringNode,
} from "@runtime-human/game-authoring-schema";
import type {
  Fingerprint,
  ScenarioInstructionV1,
  ScenarioProgramV1,
} from "@runtime-human/game-schema";

import type { StructuredDiagnosticV1 } from "../diagnostics/gamectl-diagnostics";
import { analyzeScenario } from "./analyze-scenario";

const SOURCE_FINGERPRINT_NAMESPACE = "scenario-source-v1";
const PROGRAM_FINGERPRINT_NAMESPACE = "scenario-program-v1";
const PROGRAM_SCHEMA_VERSION: ScenarioProgramV1["schemaVersion"] = "scenario-program-v1";

export type ScenarioCompilerPrimitives = Readonly<{
  fingerprint(namespace: string, value: unknown): Fingerprint;
}>;

export type CompileScenarioProgramV1Result =
  | Readonly<{ kind: "success"; program: ScenarioProgramV1 }>
  | Readonly<{ kind: "failure"; diagnostics: readonly StructuredDiagnosticV1[] }>;

export function compileScenarioProgramV1(
  scenario: ScenarioAuthoringDocument,
  primitives: ScenarioCompilerPrimitives,
): CompileScenarioProgramV1Result {
  if (typeof primitives.fingerprint !== "function") {
    throw new TypeError("Scenario compiler primitives must provide fingerprint");
  }

  const diagnostics = analyzeScenario(scenario);
  if (diagnostics.length > 0) return { kind: "failure", diagnostics };

  const nodeIds = Object.keys(scenario.nodes).toSorted(compareText);
  const pcByNode = new Map(nodeIds.map((nodeId, pc) => [nodeId, pc] as const));
  const providerTable = collectProviderIds(scenario, nodeIds);
  const predicateTable = collectPredicateIds(scenario, nodeIds);
  const contentPoolTable = collectContentPoolIds(scenario, nodeIds);
  const providerIndex = indexTable(providerTable);
  const predicateIndex = indexTable(predicateTable);
  const contentPoolIndex = indexTable(contentPoolTable);

  const instructions = nodeIds.map((nodeId) => {
    const node = scenario.nodes[nodeId];
    if (node === undefined)
      throw new TypeError(`Scenario node ${nodeId} disappeared during compile`);
    return compileInstruction(node, pcByNode, providerIndex, predicateIndex, contentPoolIndex);
  });

  const sourceFingerprint = primitives.fingerprint(SOURCE_FINGERPRINT_NAMESPACE, scenario);
  const executable = {
    schemaVersion: PROGRAM_SCHEMA_VERSION,
    scenarioId: scenario.id,
    entryPc: requireIndex(pcByNode, scenario.entry, "entry node"),
    instructions,
    providerTable,
    predicateTable,
    contentPoolTable,
    sourceFingerprint,
  } as const;
  const programFingerprint = primitives.fingerprint(PROGRAM_FINGERPRINT_NAMESPACE, executable);

  return {
    kind: "success",
    program: {
      ...executable,
      programFingerprint,
    },
  };
}

function compileInstruction(
  node: ScenarioAuthoringNode,
  pcByNode: ReadonlyMap<string, number>,
  providerIndex: ReadonlyMap<string, number>,
  predicateIndex: ReadonlyMap<string, number>,
  contentPoolIndex: ReadonlyMap<string, number>,
): ScenarioInstructionV1 {
  switch (node.kind) {
    case "decision":
      return {
        op: "decision",
        decisionId: node.decisionId,
        nextPc: requireTargetPc(pcByNode, node.next, "decision.next"),
      };
    case "provider":
      return {
        op: "provider",
        providerIndex: requireIndex(providerIndex, node.providerId, "provider id"),
        nextPc: requireTargetPc(pcByNode, node.next, "provider.next"),
      };
    case "random-content":
      return {
        op: "random-content",
        contentPoolIndex: requireIndex(contentPoolIndex, node.poolId, "content pool id"),
        nextPc: requireTargetPc(pcByNode, node.next, "random-content.next"),
      };
    case "gate":
      return {
        op: "gate",
        predicateIndex: requireIndex(predicateIndex, node.predicateId, "predicate id"),
        passPc: requireTargetPc(pcByNode, node.pass, "gate.pass"),
        failPc: requireTargetPc(pcByNode, node.fail, "gate.fail"),
      };
    case "branch":
      return {
        op: "branch",
        branches: node.branches.map((branch) => ({
          predicateIndex: requireIndex(predicateIndex, branch.predicateId, "predicate id"),
          targetPc: requireIndex(pcByNode, branch.target, "branch target"),
        })),
        fallbackPc: requireTargetPc(pcByNode, node.fallback, "branch.fallback"),
      };
    case "complete":
      return { op: "complete" };
  }
}

function collectProviderIds(
  scenario: ScenarioAuthoringDocument,
  nodeIds: readonly string[],
): readonly string[] {
  return collectSortedUnique(
    nodeIds.flatMap((nodeId) => {
      const node = scenario.nodes[nodeId];
      return node?.kind === "provider" ? [node.providerId] : [];
    }),
  );
}

function collectPredicateIds(
  scenario: ScenarioAuthoringDocument,
  nodeIds: readonly string[],
): readonly string[] {
  return collectSortedUnique(
    nodeIds.flatMap((nodeId) => {
      const node = scenario.nodes[nodeId];
      if (node?.kind === "gate") return [node.predicateId];
      if (node?.kind === "branch") return node.branches.map((branch) => branch.predicateId);
      return [];
    }),
  );
}

function collectContentPoolIds(
  scenario: ScenarioAuthoringDocument,
  nodeIds: readonly string[],
): readonly string[] {
  return collectSortedUnique(
    nodeIds.flatMap((nodeId) => {
      const node = scenario.nodes[nodeId];
      return node?.kind === "random-content" ? [node.poolId] : [];
    }),
  );
}

function collectSortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted(compareText);
}

function indexTable(values: readonly string[]): ReadonlyMap<string, number> {
  return new Map(values.map((value, index) => [value, index] as const));
}

function requireTargetPc(
  pcByNode: ReadonlyMap<string, number>,
  target: string | undefined,
  subject: string,
): number {
  if (target === undefined) throw new TypeError(`Missing ${subject} after successful analysis`);
  return requireIndex(pcByNode, target, subject);
}

function requireIndex(index: ReadonlyMap<string, number>, value: string, subject: string): number {
  const resolved = index.get(value);
  if (resolved === undefined) throw new TypeError(`Unresolved ${subject}: ${value}`);
  return resolved;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
