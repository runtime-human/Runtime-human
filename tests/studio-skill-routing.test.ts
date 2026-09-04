import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { selectSkills } from "../scripts/studio/context-lib.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const skillMap = JSON.parse(
  readFileSync(resolve(repoRoot, ".studio", "skill-map.json"), "utf8"),
) as {
  skills: Array<{ name: string; status: "active" | "planned" }>;
};

describe("Studio domain skill routing", () => {
  it("routes balance work to the active balance skill", () => {
    expect(selectSkills(["balance"], "R2", skillMap.skills)).toEqual(["runtime-balance"]);
  });

  it("routes simulation work to the active simulation skill", () => {
    expect(selectSkills(["simulation"], "R2", skillMap.skills)).toEqual(["runtime-simulation"]);
  });

  it("routes harness/tooling work to the active harness skill", () => {
    expect(selectSkills(["tooling"], "R1", skillMap.skills)).toEqual(["runtime-harness"]);
  });

  it("keeps scenario on the generic implementation skill until Wave 10 exists", () => {
    expect(selectSkills(["scenario"], "R2", skillMap.skills)).toEqual(["runtime-implement"]);
  });

  it("prepends architecture review for R3 while preserving the domain skill", () => {
    expect(selectSkills(["balance"], "R3", skillMap.skills)).toEqual([
      "runtime-architecture",
      "runtime-balance",
    ]);
  });
});
