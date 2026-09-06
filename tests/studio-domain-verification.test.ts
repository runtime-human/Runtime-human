import { describe, expect, it } from "vitest";

import { buildTierCommands } from "../scripts/studio/harness-lib.mjs";

function planFor(zoneId: string, tier: "V0" | "V1" = "V0") {
  return buildTierCommands(tier, {
    resolution: {
      selected: [{ id: zoneId, matched: [`${zoneId}/example`] }],
      unmatched: [],
      ignored: [],
    },
    zoneIds: [zoneId],
    projects: [],
    tests: [],
    storybook: false,
    rust: false,
    contentCompiler: zoneId === "balance" || zoneId === "scenario",
    exclusiveConflict: false,
  });
}

function flatten(plan: ReturnType<typeof buildTierCommands>) {
  return plan.commands?.map((command) => command.join(" ")) ?? [];
}

describe("Studio domain-aware verification", () => {
  it("adds balance validation for balance changes at focused tiers", () => {
    for (const tier of ["V0", "V1"] as const) {
      expect(flatten(planFor("balance", tier))).toContain("pnpm balance:check");
    }
  });

  it("adds scenario validation for scenario changes at focused tiers", () => {
    for (const tier of ["V0", "V1"] as const) {
      expect(flatten(planFor("scenario", tier))).toContain("pnpm scenario:check");
    }
  });

  it("does not invent a simulation check command that the repository does not expose", () => {
    const commands = flatten(planFor("simulation"));

    expect(commands).not.toContain("pnpm simulation:check");
    expect(commands.some((command) => command.startsWith("pnpm exec vitest run tests"))).toBe(true);
  });
});
