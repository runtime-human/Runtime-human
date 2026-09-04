import { describe, expect, it } from "vitest";

import type { ScenarioAuthoringDocument } from "@runtime-human/game-authoring-schema";
import { analyzeScenario } from "@runtime-human/game-devtools";

function scenario(
  nodes: ScenarioAuthoringDocument["nodes"],
  entry = "start",
): ScenarioAuthoringDocument {
  return {
    schemaVersion: "scenario-v1",
    id: "scenario.test",
    entry,
    nodes,
  };
}

function codes(document: ScenarioAuthoringDocument, options = {}) {
  return analyzeScenario(document, options).map((diagnostic) => diagnostic.code);
}

describe("scenario analyzer", () => {
  it("accepts a terminating connected graph", () => {
    expect(
      analyzeScenario(
        scenario({
          start: { kind: "decision", decisionId: "choose", next: "work" },
          work: { kind: "provider", providerId: "provider.work", next: "done" },
          done: { kind: "complete" },
        }),
        { providerIds: new Set(["provider.work"]) },
      ),
    ).toEqual([]);
  });

  it("accepts MonthRun-compatible decision ids", () => {
    expect(
      analyzeScenario(
        scenario({
          start: { kind: "decision", decisionId: "january-1990/access", next: "done" },
          done: { kind: "complete" },
        }),
      ),
    ).toEqual([]);
  });

  it("reports SCN004 for a decision id outside the MonthRun protocol contract", () => {
    expect(
      codes(
        scenario({
          start: { kind: "decision", decisionId: "invalid decision", next: "done" },
          done: { kind: "complete" },
        }),
      ),
    ).toContain("SCN004");
  });

  it("reports SCN001 for an unreachable node", () => {
    expect(
      codes(
        scenario({
          start: { kind: "provider", providerId: "p", next: "done" },
          unused: { kind: "complete" },
          done: { kind: "complete" },
        }),
      ),
    ).toContain("SCN001");
  });

  it("reports SCN002 when a non-complete node has no outgoing transition", () => {
    expect(codes(scenario({ start: { kind: "decision", decisionId: "choose" } }))).toContain(
      "SCN002",
    );
  });

  it("reports SCN003 for a missing target", () => {
    expect(
      codes(scenario({ start: { kind: "provider", providerId: "p", next: "missing" } })),
    ).toContain("SCN003");
  });

  it("reports SCN004 for an invalid node identifier", () => {
    expect(
      codes(
        scenario(
          {
            "Bad Node": { kind: "complete" },
          } as ScenarioAuthoringDocument["nodes"],
          "Bad Node",
        ),
      ),
    ).toContain("SCN004");
  });

  it("reports SCN005 for a reachable cycle with no path to completion", () => {
    expect(
      codes(
        scenario({
          start: { kind: "provider", providerId: "a", next: "loop" },
          loop: { kind: "provider", providerId: "b", next: "start" },
        }),
      ),
    ).toContain("SCN005");
  });

  it("does not report SCN005 for a cycle that has an exit to completion", () => {
    const result = codes(
      scenario({
        start: {
          kind: "branch",
          branches: [{ predicateId: "again", target: "loop" }],
          fallback: "done",
        },
        loop: { kind: "provider", providerId: "p", next: "start" },
        done: { kind: "complete" },
      }),
    );
    expect(result).not.toContain("SCN005");
  });

  it("reports SCN006 for an unknown provider when a provider registry is supplied", () => {
    expect(
      codes(
        scenario({
          start: { kind: "provider", providerId: "provider.unknown", next: "done" },
          done: { kind: "complete" },
        }),
        { providerIds: new Set(["provider.known"]) },
      ),
    ).toContain("SCN006");
  });

  it("reports SCN007 for an unknown predicate when a predicate registry is supplied", () => {
    expect(
      codes(
        scenario({
          start: { kind: "gate", predicateId: "predicate.unknown", pass: "done", fail: "done" },
          done: { kind: "complete" },
        }),
        { predicateIds: new Set(["predicate.known"]) },
      ),
    ).toContain("SCN007");
  });

  it("reports SCN008 when a branch has no fallback", () => {
    expect(
      codes(
        scenario({
          start: {
            kind: "branch",
            branches: [{ predicateId: "predicate.ready", target: "done" }],
          },
          done: { kind: "complete" },
        }),
      ),
    ).toContain("SCN008");
  });

  it("returns diagnostics in stable code/path order", () => {
    const diagnostics = analyzeScenario(
      scenario({
        start: {
          kind: "branch",
          branches: [{ predicateId: "missing.predicate", target: "missing" }],
        },
        unreachable: { kind: "provider", providerId: "missing.provider" },
      }),
      { providerIds: new Set(), predicateIds: new Set() },
    );
    const keys = diagnostics.map((diagnostic) => `${diagnostic.code}:${diagnostic.pointer ?? ""}`);
    expect(keys).toEqual([...keys].sort());
  });
});
