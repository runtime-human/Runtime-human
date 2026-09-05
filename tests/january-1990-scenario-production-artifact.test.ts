import { describe, expect, it } from "vitest";

import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";
import { canonicalizeAuthoritative } from "@runtime-human/game-core";

import { buildJanuaryScenarioArtifact } from "../scripts/check-january-scenario-artifact";

describe("January 1990 production scenario artifact", () => {
  it("matches the canonical compiled, resolved and certified artifact", async () => {
    const built = await buildJanuaryScenarioArtifact();

    expect(canonicalizeAuthoritative(JANUARY_1990_SCENARIO_ARTIFACT)).toBe(
      canonicalizeAuthoritative(built),
    );
  });
});
