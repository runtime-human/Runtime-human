import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const routeScript = join(repoRoot, "scripts", "studio", "route.mjs");

function route(args: string[]) {
  const result = spawnSync(process.execPath, [routeScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout);
}

describe("Studio model routing", () => {
  it("routes normal R2 review to a fresh read-only Luna xhigh evaluator", () => {
    expect(route(["--zone", "ui", "--risk", "R2", "--review"])).toMatchObject({
      mode: "review",
      effectiveRisk: "R2",
      profile: "lunaReviewer",
      provider: "codex",
      model: "gpt-5.6-luna",
      reasoningEffort: "xhigh",
      readOnly: true,
      freshContext: true,
    });
  });

  it("routes independent testing to Luna xhigh without granting implementation ownership", () => {
    expect(route(["--zone", "ui", "--risk", "R2", "--test"])).toMatchObject({
      mode: "test",
      profile: "lunaTester",
      provider: "codex",
      model: "gpt-5.6-luna",
      reasoningEffort: "xhigh",
      readOnly: true,
      freshContext: true,
    });
  });

  it("keeps GLM-5.3 as an explicit cross-family review path", () => {
    expect(
      route(["--zone", "ui", "--risk", "R2", "--review", "--cross-family"]),
    ).toMatchObject({
      mode: "review",
      crossFamily: true,
      profile: "crossFamilyReviewer",
      provider: "opencode-go",
      model: "opencode-go/glm-5.3",
      readOnly: true,
      freshContext: true,
    });
  });

  it("elevates persistence review to R3 and keeps fresh Sol authority review", () => {
    expect(route(["--zone", "persistence", "--risk", "R2", "--review"])).toMatchObject({
      mode: "review",
      requestedRisk: "R2",
      effectiveRisk: "R3",
      elevated: true,
      profile: "r3Reviewer",
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
      readOnly: true,
      freshContext: true,
    });
  });
});
