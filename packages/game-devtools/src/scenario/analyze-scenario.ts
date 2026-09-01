import {
  SCENARIO_IDENTIFIER_PATTERN,
  type ScenarioAuthoringDocument,
  type ScenarioAuthoringNode,
} from "@runtime-human/game-authoring-schema";

import type { StructuredDiagnosticV1 } from "../diagnostics/gamectl-diagnostics";

const IDENTIFIER = new RegExp(SCENARIO_IDENTIFIER_PATTERN, "u");

export type AnalyzeScenarioOptions = Readonly<{
  providerIds?: ReadonlySet<string>;
  predicateIds?: ReadonlySet<string>;
}>;

type NodeTarget = Readonly<{
  target: string;
  pointerSuffix: string;
}>;

export function analyzeScenario(
  scenario: ScenarioAuthoringDocument,
  options: AnalyzeScenarioOptions = {},
): readonly StructuredDiagnosticV1[] {
  const diagnostics: StructuredDiagnosticV1[] = [];
  const nodeIds = Object.keys(scenario.nodes).toSorted(compareText);
  const nodeSet = new Set(nodeIds);

  if (!IDENTIFIER.test(scenario.id)) {
    diagnostics.push(
      diagnostic(
        scenario,
        "SCN004",
        "Scenario id does not match the closed identifier contract",
        "/id",
      ),
    );
  }

  for (const nodeId of nodeIds) {
    const node = scenario.nodes[nodeId];
    if (!IDENTIFIER.test(nodeId)) {
      diagnostics.push(
        diagnostic(
          scenario,
          "SCN004",
          `Scenario node id ${JSON.stringify(nodeId)} does not match the closed identifier contract`,
          `/nodes/${escapePointer(nodeId)}`,
        ),
      );
    }
    if (node === undefined) continue;
    validateNodeSemantics(scenario, nodeId, node, options, diagnostics);
    for (const target of targetsOf(node)) {
      if (!nodeSet.has(target.target)) {
        diagnostics.push(
          diagnostic(
            scenario,
            "SCN003",
            `Scenario transition targets missing node ${JSON.stringify(target.target)}`,
            `/nodes/${escapePointer(nodeId)}${target.pointerSuffix}`,
          ),
        );
      }
    }
  }

  if (!nodeSet.has(scenario.entry)) {
    diagnostics.push(
      diagnostic(
        scenario,
        "SCN003",
        `Scenario entry targets missing node ${JSON.stringify(scenario.entry)}`,
        "/entry",
      ),
    );
  } else {
    const adjacency = buildAdjacency(scenario, nodeIds, nodeSet);
    const reachable = collectReachable(scenario.entry, adjacency);
    for (const nodeId of nodeIds) {
      if (!reachable.has(nodeId)) {
        diagnostics.push(
          diagnostic(
            scenario,
            "SCN001",
            `Scenario node ${JSON.stringify(nodeId)} is unreachable from entry ${JSON.stringify(
              scenario.entry,
            )}`,
            `/nodes/${escapePointer(nodeId)}`,
          ),
        );
      }
    }

    const canReachCompletion = collectCanReachCompletion(scenario, adjacency, nodeIds);
    for (const cycle of findStronglyConnectedCycles(adjacency, reachable)) {
      if (cycle.some((nodeId) => canReachCompletion.has(nodeId))) continue;
      const anchor = cycle[0];
      diagnostics.push(
        diagnostic(
          scenario,
          "SCN005",
          `Reachable scenario cycle has no path to completion: ${cycle.join(", ")}`,
          `/nodes/${escapePointer(anchor)}`,
        ),
      );
    }
  }

  return diagnostics.toSorted(compareDiagnostic);
}

function validateNodeSemantics(
  scenario: ScenarioAuthoringDocument,
  nodeId: string,
  node: ScenarioAuthoringNode,
  options: AnalyzeScenarioOptions,
  diagnostics: StructuredDiagnosticV1[],
): void {
  const pointer = `/nodes/${escapePointer(nodeId)}`;

  if (node.kind !== "complete" && !hasRequiredTransition(node)) {
    diagnostics.push(
      diagnostic(
        scenario,
        "SCN002",
        `Scenario ${node.kind} node ${JSON.stringify(nodeId)} is missing a required outgoing transition`,
        pointer,
      ),
    );
  }

  if (node.kind === "branch" && node.fallback === undefined) {
    diagnostics.push(
      diagnostic(
        scenario,
        "SCN008",
        `Scenario branch ${JSON.stringify(nodeId)} requires an explicit fallback`,
        `${pointer}/fallback`,
      ),
    );
  }

  if (node.kind === "provider" && options.providerIds !== undefined) {
    if (!options.providerIds.has(node.providerId)) {
      diagnostics.push(
        diagnostic(
          scenario,
          "SCN006",
          `Scenario provider ${JSON.stringify(node.providerId)} is not registered`,
          `${pointer}/providerId`,
        ),
      );
    }
  }

  if (options.predicateIds === undefined) return;
  if (node.kind === "gate" && !options.predicateIds.has(node.predicateId)) {
    diagnostics.push(
      diagnostic(
        scenario,
        "SCN007",
        `Scenario predicate ${JSON.stringify(node.predicateId)} is not registered`,
        `${pointer}/predicateId`,
      ),
    );
  }
  if (node.kind === "branch") {
    node.branches.forEach((branch, index) => {
      if (options.predicateIds?.has(branch.predicateId)) return;
      diagnostics.push(
        diagnostic(
          scenario,
          "SCN007",
          `Scenario predicate ${JSON.stringify(branch.predicateId)} is not registered`,
          `${pointer}/branches/${index}/predicateId`,
        ),
      );
    });
  }
}

function hasRequiredTransition(node: ScenarioAuthoringNode): boolean {
  switch (node.kind) {
    case "decision":
    case "provider":
    case "random-content":
      return node.next !== undefined;
    case "gate":
      return node.pass !== undefined && node.fail !== undefined;
    case "branch":
      return node.branches.length > 0 && node.fallback !== undefined;
    case "complete":
      return true;
  }
}

function targetsOf(node: ScenarioAuthoringNode): readonly NodeTarget[] {
  switch (node.kind) {
    case "decision":
    case "provider":
    case "random-content":
      return node.next === undefined ? [] : [{ target: node.next, pointerSuffix: "/next" }];
    case "gate":
      return [
        ...(node.pass === undefined ? [] : [{ target: node.pass, pointerSuffix: "/pass" }]),
        ...(node.fail === undefined ? [] : [{ target: node.fail, pointerSuffix: "/fail" }]),
      ];
    case "branch":
      return [
        ...node.branches.map((branch, index) => ({
          target: branch.target,
          pointerSuffix: `/branches/${index}/target`,
        })),
        ...(node.fallback === undefined
          ? []
          : [{ target: node.fallback, pointerSuffix: "/fallback" }]),
      ];
    case "complete":
      return [];
  }
}

function buildAdjacency(
  scenario: ScenarioAuthoringDocument,
  nodeIds: readonly string[],
  nodeSet: ReadonlySet<string>,
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map<string, readonly string[]>();
  for (const nodeId of nodeIds) {
    const node = scenario.nodes[nodeId];
    const targets = node === undefined ? [] : targetsOf(node).map((entry) => entry.target);
    adjacency.set(
      nodeId,
      [...new Set(targets.filter((target) => nodeSet.has(target)))].toSorted(compareText),
    );
  }
  return adjacency;
}

function collectReachable(
  entry: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const pending = [entry];
  for (let index = 0; index < pending.length; index += 1) {
    const nodeId = pending[index];
    if (nodeId === undefined || reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      if (!reachable.has(target)) pending.push(target);
    }
  }
  return reachable;
}

function collectCanReachCompletion(
  scenario: ScenarioAuthoringDocument,
  adjacency: ReadonlyMap<string, readonly string[]>,
  nodeIds: readonly string[],
): ReadonlySet<string> {
  const reverse = new Map<string, string[]>();
  for (const nodeId of nodeIds) reverse.set(nodeId, []);
  for (const [source, targets] of adjacency) {
    for (const target of targets) reverse.get(target)?.push(source);
  }
  for (const sources of reverse.values()) sources.sort(compareText);

  const result = new Set<string>();
  const pending = nodeIds.filter((nodeId) => scenario.nodes[nodeId]?.kind === "complete");
  for (let index = 0; index < pending.length; index += 1) {
    const nodeId = pending[index];
    if (nodeId === undefined || result.has(nodeId)) continue;
    result.add(nodeId);
    for (const source of reverse.get(nodeId) ?? []) {
      if (!result.has(source)) pending.push(source);
    }
  }
  return result;
}

function findStronglyConnectedCycles(
  adjacency: ReadonlyMap<string, readonly string[]>,
  reachable: ReadonlySet<string>,
): readonly (readonly string[])[] {
  let nextIndex = 0;
  const indexByNode = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (nodeId: string): void => {
    indexByNode.set(nodeId, nextIndex);
    lowLink.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const target of adjacency.get(nodeId) ?? []) {
      if (!reachable.has(target)) continue;
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
    component.sort(compareText);
    const selfLoop =
      component.length === 1 &&
      (adjacency.get(component[0] ?? "") ?? []).includes(component[0] ?? "");
    if (component.length > 1 || selfLoop) components.push(component);
  };

  for (const nodeId of [...reachable].toSorted(compareText)) {
    if (!indexByNode.has(nodeId)) visit(nodeId);
  }
  return components.toSorted((left, right) => compareText(left[0] ?? "", right[0] ?? ""));
}

function diagnostic(
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
