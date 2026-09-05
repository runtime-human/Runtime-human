import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCanonicalPayload,
  createJanuary1990InitialSaveSnapshot,
  createJanuary1990ScenarioCompatibility,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  projectJanuary1990Content,
  type PersistenceService,
} from "@runtime-human/game-application";
import {
  assertJanuary1990ScenarioRuntimeArtifactV1,
  JANUARY_1990_DEFAULT_BALANCE,
} from "@runtime-human/game-core";
import type { CreateSaveCommandV1, SaveRecordV1 } from "@runtime-human/game-persistence-contracts";
import {
  parseSaveId,
  parseSaveRevision,
  type ScenarioArtifactV1,
} from "@runtime-human/game-schema";

import { ensureJanuarySave } from "../apps/desktop/src/january/bootstrap-january-save";
import {
  createDesktopJanuarySession,
  type CreateDesktopJanuarySessionInput,
} from "../apps/desktop/src/january/create-desktop-january-session";
import {
  loadJanuaryContentRegistry,
  type JanuaryContentFetchPort,
} from "../apps/desktop/src/january/load-january-content";
import {
  createHarnessedJanuaryRuntime,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");
const SCENARIO_ARTIFACT_PATH = join(
  process.cwd(),
  "apps",
  "desktop",
  "public",
  "scenarios",
  "january-1990.json",
);

type ScenarioDesktopSessionInput = CreateDesktopJanuarySessionInput &
  Readonly<{
    runtimeMode: "scenario";
    fetchScenarioArtifact: JanuaryContentFetchPort;
  }>;

function createSaveRecord(): SaveRecordV1 {
  const saveId = parseSaveId("save-january-desktop-bootstrap");
  return {
    schemaVersion: "save-record-v1",
    saveId,
    revision: parseSaveRevision(0),
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    snapshot: createCanonicalPayload(createJanuary1990InitialSaveSnapshot()),
    lastCommittedRunId: null,
    createdSequence: 1,
    updatedSequence: 1,
  };
}

function createPersistenceStub(
  input: Readonly<{
    save: SaveRecordV1;
    loadKind: "found" | "not-found";
    createdCommands: CreateSaveCommandV1[];
  }>,
): PersistenceService {
  const unsupported = async (): Promise<never> => {
    throw new Error("Unexpected persistence operation in bootstrap test");
  };
  let createCount = 0;
  return {
    async createSave(command) {
      input.createdCommands.push(command);
      createCount += 1;
      return {
        kind: createCount === 1 ? "accepted" : "duplicate",
        value: {
          schemaVersion: "create-save-accepted-v1",
          save: input.save,
        },
      };
    },
    async loadSave() {
      return input.loadKind === "found"
        ? { kind: "found", value: input.save }
        : { kind: "not-found" };
    },
    beginMonthRun: unsupported,
    loadMonthRun: unsupported,
    loadActiveMonthRun: unsupported,
    storeMonthRunBoundary: unsupported,
    commitMonthRun: unsupported,
    createBackup: unsupported,
    getRecoveryStatus: unsupported,
  };
}

const fetchPublishedContent: JanuaryContentFetchPort = async (url) => {
  const relative = url.replace(/^\/content\//u, "");
  try {
    const body = await readFile(join(CONTENT_ROOT, ...relative.split("/")), "utf8");
    return { ok: true, status: 200, text: async () => body };
  } catch {
    return { ok: false, status: 404, text: async () => "" };
  }
};

async function loadPublishedScenarioArtifact(): Promise<ScenarioArtifactV1> {
  const artifact = JSON.parse(await readFile(SCENARIO_ARTIFACT_PATH, "utf8")) as ScenarioArtifactV1;
  assertJanuary1990ScenarioRuntimeArtifactV1(artifact);
  return artifact;
}

function createPublishedScenarioFetch(onFetch?: (url: string) => void): JanuaryContentFetchPort {
  return async (url) => {
    onFetch?.(url);
    if (url !== "/scenarios/january-1990.json") {
      return { ok: false, status: 404, text: async () => "" };
    }
    return {
      ok: true,
      status: 200,
      text: async () => readFile(SCENARIO_ARTIFACT_PATH, "utf8"),
    };
  };
}

describe("January 1990 desktop bootstrap", () => {
  it("keeps an existing canonical save and does not create another one", async () => {
    const save = createSaveRecord();
    const createdCommands: CreateSaveCommandV1[] = [];
    const persistence = createPersistenceStub({ save, loadKind: "found", createdCommands });

    await ensureJanuarySave(persistence, save.saveId);

    expect(createdCommands).toEqual([]);
  });

  it("uses one deterministic create-save request for safe duplicate bootstrap", async () => {
    const save = createSaveRecord();
    const createdCommands: CreateSaveCommandV1[] = [];
    const persistence = createPersistenceStub({ save, loadKind: "not-found", createdCommands });

    await ensureJanuarySave(persistence, save.saveId);
    await ensureJanuarySave(persistence, save.saveId);

    expect(createdCommands).toHaveLength(2);
    expect(createdCommands[0]?.requestId).toBe(createdCommands[1]?.requestId);
    expect(createdCommands[0]).toMatchObject({
      saveId: save.saveId,
      saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
      snapshot: createCanonicalPayload(createJanuary1990InitialSaveSnapshot()),
    });
  });

  it("loads the published January registry and resumes the active boundary", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const access = await startJanuary(source.runtime, source.saveId, source.runId);

    const session = await createDesktopJanuarySession({
      persistence: source.harness.service,
      fetchContent: fetchPublishedContent,
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    });

    expect(session.view).toMatchObject({
      kind: "access-decision",
      runRevision: access.checkpoint.runRevision,
      checkpointHash: access.checkpoint.checkpointHash,
    });
  });

  it("uses the certified scenario compatibility when scenario mode is explicitly selected", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const fetchedUrls: string[] = [];
    const artifact = await loadPublishedScenarioArtifact();
    const projected = projectJanuary1990Content(source.registry);
    const expectedCompatibility = createJanuary1990ScenarioCompatibility({
      contentFingerprint: projected.contentFingerprint,
      balance: JANUARY_1990_DEFAULT_BALANCE,
      artifact,
    });
    const input: ScenarioDesktopSessionInput = {
      persistence: source.harness.service,
      fetchContent: fetchPublishedContent,
      fetchScenarioArtifact: createPublishedScenarioFetch((url) => fetchedUrls.push(url)),
      runtimeMode: "scenario",
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    };

    const session = await createDesktopJanuarySession(input);
    await session.start();

    expect(fetchedUrls).toEqual(["/scenarios/january-1990.json"]);
    expect(source.harness.getRun(source.runId)?.compatibility).toEqual(expectedCompatibility);
  });

  it("rejects a malformed scenario artifact before any MonthRun mutation", async () => {
    const source = await createHarnessedJanuaryRuntime();
    const input: ScenarioDesktopSessionInput = {
      persistence: source.harness.service,
      fetchContent: fetchPublishedContent,
      fetchScenarioArtifact: async () => ({
        ok: true,
        status: 200,
        text: async () => '{"schemaVersion":"scenario-artifact-v1"}',
      }),
      runtimeMode: "scenario",
      saveId: source.saveId,
      runId: source.runId,
      seed: 42n,
    };

    await expect(createDesktopJanuarySession(input)).rejects.toThrow(/January scenario runtime/u);
    expect(source.harness.getStats()).toEqual({
      beginMutations: 0,
      boundaryMutations: 0,
      commitMutations: 0,
    });
  });

  it("fails closed when the compiled-content manifest cannot be loaded", async () => {
    await expect(
      loadJanuaryContentRegistry(async () => ({
        ok: false,
        status: 503,
        text: async () => "",
      })),
    ).rejects.toThrow("/content/manifest.json: HTTP 503");
  });
});
