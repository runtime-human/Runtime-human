import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
} from "@runtime-human/game-application";
import { JANUARY_1990_SCENARIO_ARTIFACT } from "@runtime-human/game-content";
import {
  createJanuary1990ScenarioRuntimeRulesFingerprint,
  JANUARY_1990_DEFAULT_BALANCE,
} from "@runtime-human/game-core";
import { parseMonthRunId, parseSaveId } from "@runtime-human/game-schema";

import { createDesktopJanuarySession } from "../apps/desktop/src/january/create-desktop-january-session";
import type { JanuaryContentFetchPort } from "../apps/desktop/src/january/load-january-content";
import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

const fetchPublishedContent: JanuaryContentFetchPort = async (url) => {
  const relative = url.replace(/^\/content\//u, "");
  try {
    const body = await readFile(join(CONTENT_ROOT, ...relative.split("/")), "utf8");
    return { ok: true, status: 200, text: async () => body };
  } catch {
    return { ok: false, status: 404, text: async () => "" };
  }
};

describe("desktop January scenario authority", () => {
  it("starts a fresh January run with the certified scenario compatibility identity", async () => {
    const saveId = parseSaveId("save-desktop-january-scenario-authority");
    const runId = parseMonthRunId("run-desktop-january-scenario-authority");
    const harness = createInMemoryPersistenceHarness({
      saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      initialSnapshot: createJanuary1990InitialSaveSnapshot(),
    });
    const session = await createDesktopJanuarySession({
      persistence: harness.service,
      fetchContent: fetchPublishedContent,
      saveId,
      runId,
      seed: 42n,
    });

    const view = await session.start();
    expect(view.kind).toBe("access-decision");

    const active = await harness.service.loadActiveMonthRun({ saveId });
    expect(active.kind).toBe("found");
    if (active.kind !== "found") return;
    expect(active.value.checkpoint.compatibility.rulesFingerprint).toBe(
      createJanuary1990ScenarioRuntimeRulesFingerprint(
        JANUARY_1990_DEFAULT_BALANCE,
        JANUARY_1990_SCENARIO_ARTIFACT,
      ),
    );
  });
});
