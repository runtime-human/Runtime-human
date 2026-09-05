import { describe, expect, it } from "vitest";

import {
  createJanuary1990AuthorityCutoverRuntime,
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";
import { parseSaveId } from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";
import { loadJanuaryTestRegistry } from "./helpers/january-1990-runtime-fixture";

describe("January 1990 authority session boundary", () => {
  it("rejects reuse of one authority runtime for another save", async () => {
    const registry = await loadJanuaryTestRegistry();
    const saveId = parseSaveId("save-january-authority-session-primary");
    const otherSaveId = parseSaveId("save-january-authority-session-other");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const runtime = createJanuary1990AuthorityCutoverRuntime({
      persistence: harness.service,
      contentRegistry: registry,
      artifact: JANUARY_1990_SCENARIO_ARTIFACT,
    });

    await expect(runtime.load(saveId)).resolves.toMatchObject({ kind: "idle" });
    await expect(runtime.load(otherSaveId)).rejects.toThrow(
      "January authority runtime is already bound to another save",
    );
  });
});
