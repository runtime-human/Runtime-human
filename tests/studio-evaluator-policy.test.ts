import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const evaluatorScript = join(repoRoot, "scripts", "studio", "evaluator-plan.mjs");

function evaluate(args: string[]) {
  return spawnSync(process.execPath, [evaluatorScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function evaluateJson(args: string[]) {
  const result = evaluate([...args, "--json"]);
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return {
    result,
    output: JSON.parse(result.stdout) as {
      schemaVersion: string;
      mode: string;
      enforceable: boolean;
      changeClass: string;
      requestedRisk: string;
      effectiveRisk: string;
      elevated: boolean;
      deterministicGate: string;
      tester: { mode: string; profile: string | null };
      reviewer: { mode: string; profile: string | null };
      crossFamily: { mode: string; profile: string | null };
    },
  };
}

describe("Studio adaptive evaluator planner", () => {
  it("keeps low-risk docs sampling in non-enforcing shadow mode", () => {
    const { result, output } = evaluateJson([
      "--change-class",
      "docs-generated-only",
      "--risk",
      "R1",
    ]);

    expect(output).toMatchObject({
      schemaVersion: "runtime-human-evaluator-plan-v1",
      mode: "shadow",
      enforceable: false,
      changeClass: "docs-generated-only",
      requestedRisk: "R1",
      effectiveRisk: "R1",
      elevated: false,
      tester: { mode: "none", profile: null },
      reviewer: { mode: "sampled", profile: "lunaReviewer" },
      crossFamily: { mode: "none", profile: null },
    });
    expect(result.stdout).not.toContain("gpt-5.6");
  });

  it("requires independent tester and reviewer for gameplay", () => {
    const { output } = evaluateJson(["--change-class", "gameplay", "--risk", "R2"]);
    expect(output).toMatchObject({
      effectiveRisk: "R2",
      tester: { mode: "required", profile: "lunaTester" },
      reviewer: { mode: "required", profile: "lunaReviewer" },
      crossFamily: { mode: "conditional", profile: "crossFamilyReviewer" },
    });
  });

  it("promotes persistence/schema/determinism work to mandatory R3 evaluation", () => {
    const { output } = evaluateJson([
      "--change-class",
      "persistence-schema-determinism",
      "--risk",
      "R2",
    ]);
    expect(output).toMatchObject({
      requestedRisk: "R2",
      effectiveRisk: "R3",
      elevated: true,
      tester: { mode: "required", profile: "lunaTester" },
      reviewer: { mode: "required", profile: "r3Reviewer" },
    });
  });

  it("rejects an unknown change class", () => {
    const result = evaluate(["--change-class", "unknown", "--risk", "R1", "--json"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Unknown change class");
  });

  it("rejects an unknown risk", () => {
    const result = evaluate(["--change-class", "gameplay", "--risk", "R9", "--json"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Unknown risk");
  });
});
