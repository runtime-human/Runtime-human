import { describe, expect, it } from "vitest";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import {
  SCENARIO_COMPILER_POLICY_V1,
  compileScenarioV1,
  type ScenarioCompileOptionsV1,
} from "@runtime-human/game-devtools";

function scenario(
  nodes: ScenarioAuthoringDocument["nodes"],
  entry = "start",
): ScenarioAuthoringDocument {
  return {
    schemaVersion: "scenario-v1",
    id: "scenario.compiler-test",
    entry,
    nodes,
  };
}

const OPTIONS: ScenarioCompileOptionsV1 = {
  providerIds: new Set(["provider.work"]),
  predicateIds: new Set(["predicate.ready", "predicate.loop"]),
  contentPoolIds: new Set(["pool.events"]),
  policy: SCENARIO_COMPILER_POLICY_V1,
};

function validScenario(): ScenarioAuthoringDocument {
  return scenario({
    work: { kind: "provider", providerId: "provider.work", next: "gate" },
    done: { kind: "complete" },
    start: { kind: "decision", decisionId: "choose", next: "work" },
    random: { kind: "random-content", poolId: "pool.events", next: "done" },
    gate: {
      kind: "gate",
      predicateId: "predicate.ready",
      pass: "random",
      fail: "done",
    },
  });
}

describe("scenario compiler v1", () => {
  it("compiles a valid acyclic scenario into canonical program counters and tables", () => {
    const result = compileScenarioV1(validScenario(), OPTIONS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.program).toMatchObject({
      schemaVersion: "scenario-program-v1",
      scenarioId: "scenario.compiler-test",
      compilerPolicyId: "scenario-compiler-foundation-v1",
      entryPc: 3,
      providerTable: ["provider.work"],
      predicateTable: ["predicate.ready"],
      contentPoolTable: ["pool.events"],
      instructions: [
        { kind: "complete" },
        { kind: "gate", predicateIndex: 0, passPc: 2, failPc: 0 },
        { kind: "random-content", contentPoolIndex: 0, nextPc: 0 },
        { kind: "decision", decisionId: "choose", nextPc: 4 },
        { kind: "provider", providerIndex: 0, nextPc: 1 },
      ],
      certificate: {
        schemaVersion: "scenario-certificate-v1",
        reachableNodes: 5,
        instructionCount: 5,
        completionReachable: true,
        bounded: true,
        transitionBudgetMax: 4,
      },
    });
    expect(result.program.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.program.programFingerprint).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("matches the canonical compiler fingerprint golden", () => {
    const result = compileScenarioV1(validScenario(), OPTIONS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect({
      sourceFingerprint: result.program.sourceFingerprint,
      programFingerprint: result.program.programFingerprint,
    }).toEqual({
      sourceFingerprint: "0000000000000000000000000000000000000000000000000000000000000000",
      programFingerprint: "0000000000000000000000000000000000000000000000000000000000000000",
    });
  });

  it("is byte-stable when JSON object property insertion order changes", () => {
    const first = compileScenarioV1(validScenario(), OPTIONS);
    const reordered = compileScenarioV1(
      scenario({
        gate: {
          fail: "done",
          pass: "random",
          predicateId: "predicate.ready",
          kind: "gate",
        },
        random: { next: "done", poolId: "pool.events", kind: "random-content" },
        start: { next: "work", decisionId: "choose", kind: "decision" },
        done: { kind: "complete" },
        work: { next: "gate", providerId: "provider.work", kind: "provider" },
      } as ScenarioAuthoringDocument["nodes"]),
      OPTIONS,
    );

    expect(first).toEqual(reordered);
  });

  it("changes executable fingerprints when an authoritative transition changes", () => {
    const baseline = compileScenarioV1(validScenario(), OPTIONS);
    const changed = compileScenarioV1(
      scenario({
        work: { kind: "provider", providerId: "provider.work", next: "gate" },
        done: { kind: "complete" },
        start: { kind: "decision", decisionId: "choose", next: "work" },
        random: { kind: "random-content", poolId: "pool.events", next: "done" },
        gate: {
          kind: "gate",
          predicateId: "predicate.ready",
          pass: "done",
          fail: "done",
        },
      }),
      OPTIONS,
    );

    expect(baseline.ok).toBe(true);
    expect(changed.ok).toBe(true);
    if (!baseline.ok || !changed.ok) return;
    expect(changed.program.sourceFingerprint).not.toBe(baseline.program.sourceFingerprint);
    expect(changed.program.programFingerprint).not.toBe(baseline.program.programFingerprint);
  });

  it("returns analyzer diagnostics instead of compiling unresolved providers", () => {
    const result = compileScenarioV1(
      scenario({
        start: { kind: "provider", providerId: "provider.unknown", next: "done" },
        done: { kind: "complete" },
      }),
      OPTIONS,
    );

    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("SCN006");
  });

  it("rejects an unregistered random-content pool", () => {
    const result = compileScenarioV1(
      scenario({
        start: { kind: "random-content", poolId: "pool.unknown", next: "done" },
        done: { kind: "complete" },
      }),
      OPTIONS,
    );

    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "SCN101",
        category: "scenario",
        entityId: "scenario.compiler-test",
        pointer: "/nodes/start/poolId",
      }),
    ]);
  });

  it("rejects reachable cycles even when they have an exit because Stage A cannot prove a finite bound", () => {
    const result = compileScenarioV1(
      scenario({
        start: {
          kind: "branch",
          branches: [{ predicateId: "predicate.loop", target: "loop" }],
          fallback: "done",
        },
        loop: { kind: "provider", providerId: "provider.work", next: "start" },
        done: { kind: "complete" },
      }),
      OPTIONS,
    );

    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "SCN102",
        category: "scenario",
        entityId: "scenario.compiler-test",
        pointer: "/nodes/loop",
      }),
    ]);
  });
});
