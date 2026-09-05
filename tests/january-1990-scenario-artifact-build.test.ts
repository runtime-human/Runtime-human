import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { assertJanuary1990ScenarioRuntimeArtifactV1 } from "@runtime-human/game-core";

import {
  JANUARY_SCENARIO_ARTIFACT_PATH,
  buildJanuaryScenarioArtifact,
  serializeJanuaryScenarioArtifact,
} from "../scripts/build-january-scenario-artifact";

describe("January scenario production artifact", () => {
  it("matches the committed deterministic artifact byte-for-byte", async () => {
    const built = await buildJanuaryScenarioArtifact();
    assertJanuary1990ScenarioRuntimeArtifactV1(built);
    const serialized = serializeJanuaryScenarioArtifact(built);
    console.log(`JANUARY_SCENARIO_ARTIFACT=${serialized.trimEnd()}`);

    const committed = await readFile(JANUARY_SCENARIO_ARTIFACT_PATH, "utf8");
    expect(committed).toBe(serialized);
    expect(JSON.parse(committed)).toEqual(built);
  });
});
