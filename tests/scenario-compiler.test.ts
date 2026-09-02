import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { fingerprint } from "@runtime-human/game-core";
import type { ScenarioProgramV1 } from "@runtime-human/game-schema";
import { compileScenarioProgramV1 } from "@runtime-human/game-devtools";

const SOURCE_NAMESPACE = "scenario-source-v1";
const PROGRAM_NAMESPACE = "scenario-program-v1";

function createScenario(): ScenarioAuthoringDocument {
  return {
    schemaVersion: "scenario-v1",
    id: "compiler.fixture",
    entry: "a",
    nodes: {
      f: { kind: "complete" },
      d: {
        kind: "gate",
        predicateId: "predicate.ready",
        pass: "e",
        fail: "f",
      },
      b: {
        kind: "provider",
        providerId: "provider.project",
        next: "c",
      },
      e: {
        kind: "branch",
        branches: [{ predicateId: "predicate.alt", target: "f" }],
        fallback: "f",
      },
      a: {
        kind: "decision",
        decisionId: "decision.access",
        next: "b",
      },
      c: {
        kind: "random-content",
        poolId: "pool.narrative",
        next: "d",
      },
    },
  };
}

function expectSuccess(result: ReturnType<typeof compileScenarioProgramV1>): ScenarioProgramV1 {
  if (result.kind !== "success") {
    throw new Error(`Expected compilation success, got ${JSON.stringify(result.diagnostics)}`);
  }
  return result.program;
}

describe("ScenarioProgramV1 compiler", () => {
  it("compiles the closed authoring graph into deterministic compact program counters", () => {
    const source = createScenario();
    const program = expectSuccess(compileScenarioProgramV1(source, { fingerprint }));

    const sourceFingerprint = fingerprint(SOURCE_NAMESPACE, source);
    const executable = {
      schemaVersion: "scenario-program-v1",
      scenarioId: "compiler.fixture",
      entryPc: 0,
      instructions: [
        { op: "decision", decisionId: "decision.access", nextPc: 1 },
        { op: "provider", providerIndex: 0, nextPc: 2 },
        { op: "random-content", contentPoolIndex: 0, nextPc: 3 },
        { op: "gate", predicateIndex: 1, passPc: 4, failPc: 5 },
        {
          op: "branch",
          branches: [{ predicateIndex: 0, targetPc: 5 }],
          fallbackPc: 5,
        },
        { op: "complete" },
      ],
      providerTable: ["provider.project"],
      predicateTable: ["predicate.alt", "predicate.ready"],
      contentPoolTable: ["pool.narrative"],
      sourceFingerprint,
    } as const;

    expect(program).toEqual({
      ...executable,
      programFingerprint: fingerprint(PROGRAM_NAMESPACE, executable),
    });
  });

  it("is invariant to JSON object property order", () => {
    const source = createScenario();
    const reordered: ScenarioAuthoringDocument = {
      entry: source.entry,
      nodes: Object.fromEntries(Object.entries(source.nodes).toReversed()),
      id: source.id,
      schemaVersion: source.schemaVersion,
    };

    const first = expectSuccess(compileScenarioProgramV1(source, { fingerprint }));
    const second = expectSuccess(compileScenarioProgramV1(reordered, { fingerprint }));

    expect(second).toEqual(first);
  });

  it("changes source and program identity when an executable transition changes", () => {
    const source = createScenario();
    const changed: ScenarioAuthoringDocument = {
      ...source,
      nodes: {
        ...source.nodes,
        d: {
          kind: "gate",
          predicateId: "predicate.ready",
          pass: "f",
          fail: "e",
        },
      },
    };

    const first = expectSuccess(compileScenarioProgramV1(source, { fingerprint }));
    const second = expectSuccess(compileScenarioProgramV1(changed, { fingerprint }));

    expect(second.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(second.programFingerprint).not.toBe(first.programFingerprint);
  });

  it("fails with existing structured diagnostics instead of compiling unresolved targets", () => {
    const source: ScenarioAuthoringDocument = {
      schemaVersion: "scenario-v1",
      id: "compiler.invalid",
      entry: "a",
      nodes: {
        a: { kind: "decision", decisionId: "decision.access", next: "missing" },
      },
    };

    const result = compileScenarioProgramV1(source, { fingerprint });

    expect(result.kind).toBe("failure");
    if (result.kind === "failure") {
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("SCN003");
    }
  });
});
