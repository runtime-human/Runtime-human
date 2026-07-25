import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCanonicalPayload,
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  type PersistenceService,
} from "@runtime-human/game-application";
import type { CreateSaveCommandV1, SaveRecordV1 } from "@runtime-human/game-persistence-contracts";
import { parseSaveId, parseSaveRevision } from "@runtime-human/game-schema";

import { ensureJanuarySave } from "../apps/desktop/src/january/bootstrap-january-save";
import { createDesktopJanuarySession } from "../apps/desktop/src/january/create-desktop-january-session";
import {
  loadJanuaryContentRegistry,
  type JanuaryContentFetchPort,
} from "../apps/desktop/src/january/load-january-content";
import {
  createHarnessedJanuaryRuntime,
  startJanuary,
} from "./helpers/january-1990-runtime-fixture";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");

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
