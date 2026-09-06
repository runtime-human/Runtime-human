import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { resolveZones, selectSkills } from "../scripts/studio/context-lib.mjs";

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

function readConfig(path: string) {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
}

describe("Studio model routing", () => {
  it("routes normal R2 review to a fresh read-only Luna max evaluator", () => {
    expect(route(["--zone", "ui", "--risk", "R2", "--review"])).toMatchObject({
      mode: "review",
      effectiveRisk: "R2",
      profile: "lunaReviewer",
      provider: "codex",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
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
    expect(route(["--zone", "ui", "--risk", "R2", "--review", "--cross-family"])).toMatchObject({
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
      reasoningEffort: "medium",
      readOnly: true,
      freshContext: true,
    });
  });
});

describe("Studio domain skill routing", () => {
  it("activates only domain skills backed by current repository capabilities", () => {
    const skillMap = readConfig(".studio/skill-map.json") as {
      skills: Array<{ name: string; status: string }>;
    };
    const status = new Map(skillMap.skills.map((entry) => [entry.name, entry.status]));

    expect(status.get("runtime-balance")).toBe("active");
    expect(status.get("runtime-scenario")).toBe("active");
    expect(status.get("runtime-simulation")).toBe("active");
    expect(status.get("runtime-harness")).toBe("planned");
    expect(status.get("runtime-persistence")).toBe("planned");
  });

  it("routes balance, scenario and simulation work to their dedicated active skills", () => {
    const skillMap = readConfig(".studio/skill-map.json") as {
      skills: Array<{ name: string; status: string }>;
    };

    expect(selectSkills(["balance"], "R2", skillMap.skills)).toEqual(["runtime-balance"]);
    expect(selectSkills(["scenario"], "R2", skillMap.skills)).toEqual(["runtime-scenario"]);
    expect(selectSkills(["simulation"], "R2", skillMap.skills)).toEqual([
      "runtime-simulation",
    ]);
  });

  it(
    "does not add generic runtime-implement when a dedicated domain owns overlapping tooling",
    () => {
      const active = [
        { name: "runtime-architecture", status: "active" },
        { name: "runtime-implement", status: "active" },
        { name: "runtime-scenario", status: "active" },
      ];

      expect(selectSkills(["scenario", "tooling"], "R2", active)).toEqual([
        "runtime-scenario",
      ]);
    },
  );

  it("keeps R3 architecture review ahead of the owning domain skill", () => {
    const skillMap = readConfig(".studio/skill-map.json") as {
      skills: Array<{ name: string; status: string }>;
    };

    expect(selectSkills(["scenario"], "R3", skillMap.skills)).toEqual([
      "runtime-architecture",
      "runtime-scenario",
    ]);
  });

  it("classifies scenario authoring and tooling paths into the scenario zone", () => {
    const config = readConfig(".studio/zones.json") as {
      zones: Array<{ id: string; paths: string[]; minimumRisk: string }>;
    };
    const paths = [
      "packages/game-authoring-schema/src/scenario-schema.ts",
      "packages/game-devtools/src/scenario/compiler.ts",
      "scripts/gamectl-scenario.ts",
      "scripts/check-january-scenario-artifact.ts",
    ];
    const resolution = resolveZones(paths, config.zones, { fallbackZone: "tooling" });
    const scenario = resolution.selected.find((entry) => entry.id === "scenario");

    expect(scenario?.matched).toEqual([...paths].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("classifies balance schema and validator paths into the balance zone", () => {
    const config = readConfig(".studio/zones.json") as {
      zones: Array<{ id: string; paths: string[]; minimumRisk: string }>;
    };
    const paths = [
      "packages/game-authoring-schema/src/balance-schema.ts",
      "scripts/validate-balance.ts",
    ];
    const resolution = resolveZones(paths, config.zones, { fallbackZone: "tooling" });
    const balance = resolution.selected.find((entry) => entry.id === "balance");

    expect(balance?.matched).toEqual([...paths].sort((a, b) => a.localeCompare(b, "en")));
  });
});
