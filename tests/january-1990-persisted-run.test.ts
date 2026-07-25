import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as gameApplication from "@runtime-human/game-application";
import type {
  JanuaryContentRegistryPort,
  PersistedMonthRunResult,
  PersistenceService,
} from "@runtime-human/game-application";
import { canonicalizeAuthoritative, fingerprint } from "@runtime-human/game-core";
import { createCompiledContentRuntime, type ContentRegistry } from "@runtime-human/game-content";
import {
  parseDecisionId,
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
  type DecisionId,
  type Fingerprint,
  type MonthRunCompatibilityV1,
  type MonthRunId,
  type RequestId,
  type SaveId,
  type SaveRevision,
} from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./helpers/in-memory-persistence-service";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");
const CONTENT_RUNTIME = createCompiledContentRuntime({
  canonicalize: canonicalizeAuthoritative,
  fingerprint,
});
const SAVE_SCHEMA_FINGERPRINT = fingerprint("january-1990-save-schema-test", { version: 1 });

type JanuaryRuntimeBeginInput = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  runId: MonthRunId;
  seed: bigint;
}>;

type JanuaryRuntimeResumeInput = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: ReturnType<typeof parseMonthRunRevision>;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
}>;

type January1990Runtime = Readonly<{
  compatibility: MonthRunCompatibilityV1;
  load(saveId: SaveId): Promise<PersistedMonthRunResult>;
  begin(input: JanuaryRuntimeBeginInput): Promise<PersistedMonthRunResult>;
  resume(input: JanuaryRuntimeResumeInput): Promise<PersistedMonthRunResult>;
  retry(): Promise<PersistedMonthRunResult>;
}>;

type JanuaryRuntimeApi = Readonly<{
  createJanuary1990Runtime?: (
    input: Readonly<{
      persistence: PersistenceService;
      contentRegistry: JanuaryContentRegistryPort;
      saveSchemaFingerprint: Fingerprint;
    }>,
  ) => January1990Runtime;
}>;

const api = gameApplication as typeof gameApplication & JanuaryRuntimeApi;

function requireRuntimeFactory(): NonNullable<JanuaryRuntimeApi["createJanuary1990Runtime"]> {
  expect(
    api.createJanuary1990Runtime,
    "createJanuary1990Runtime must be exported from game-application",
  ).toBeTypeOf("function");
  return api.createJanuary1990Runtime as NonNullable<JanuaryRuntimeApi["createJanuary1990Runtime"]>;
}

async function loadRegistry(): Promise<ContentRegistry> {
  const manifest = CONTENT_RUNTIME.parseCompiledContentManifest(
    await readFile(join(CONTENT_ROOT, "manifest.json"), "utf8"),
  );
  const chunkIds = CONTENT_RUNTIME.selectJanuary1990ChunkIds(manifest);
  const chunks = await Promise.all(
    chunkIds.map(async (chunkId) =>
      CONTENT_RUNTIME.parseCompiledContentChunk(
        await readFile(join(CONTENT_ROOT, "chunks", ...chunkId.split("/")).concat(".json"), "utf8"),
      ),
    ),
  );
  return CONTENT_RUNTIME.createContentRegistry(manifest, chunks, chunkIds);
}

function requireWaiting(
  result: PersistedMonthRunResult,
): Extract<PersistedMonthRunResult, { kind: "waiting-decision" }> {
  expect(result.kind).toBe("waiting-decision");
  if (result.kind !== "waiting-decision") throw new Error("Expected persisted decision boundary");
  return result;
}

function requireCommitted(
  result: PersistedMonthRunResult,
): Extract<PersistedMonthRunResult, { kind: "committed" }> {
  expect(result.kind).toBe("committed");
  if (result.kind !== "committed") throw new Error("Expected committed January MonthRun");
  return result;
}

async function createHarnessedRuntime() {
  const saveId = parseSaveId("save-january-1990-runtime");
  const runId = parseMonthRunId("run-january-1990-runtime");
  const harness = createInMemoryPersistenceHarness({
    saveId,
    saveSchemaFingerprint: SAVE_SCHEMA_FINGERPRINT,
    initialSnapshot: { schemaVersion: "initial-save-v1" },
  });
  const runtime = requireRuntimeFactory()({
    persistence: harness.service,
    contentRegistry: await loadRegistry(),
    saveSchemaFingerprint: SAVE_SCHEMA_FINGERPRINT,
  });
  return { harness, runtime, saveId, runId };
}

async function startJanuary(
  runtime: January1990Runtime,
  saveId: SaveId,
  runId: MonthRunId,
  requestId = "begin-january-runtime",
) {
  return requireWaiting(
    await runtime.begin({
      requestId: parseRequestId(requestId),
      saveId,
      expectedSaveRevision: parseSaveRevision(0),
      runId,
      seed: 42n,
    }),
  );
}

async function resume(
  runtime: January1990Runtime,
  boundary: Extract<PersistedMonthRunResult, { kind: "waiting-decision" }>,
  input: Readonly<{
    requestId: string;
    answer: AuthoritativeJsonValue;
  }>,
): Promise<PersistedMonthRunResult> {
  const decisionId = boundary.checkpoint.pendingDecision?.decisionId;
  if (decisionId === undefined) throw new Error("Persisted January boundary has no decision");
  return runtime.resume({
    requestId: parseRequestId(input.requestId),
    saveId: boundary.save.saveId,
    runId: boundary.run.runId,
    expectedRunRevision: parseMonthRunRevision(boundary.checkpoint.runRevision),
    decisionId: parseDecisionId(decisionId),
    answer: input.answer,
  });
}

describe("January 1990 persisted runtime composition", () => {
  it("persists all three decisions and commits the deterministic month exactly once", async () => {
    const { harness, runtime, saveId, runId } = await createHarnessedRuntime();

    const access = await startJanuary(runtime, saveId, runId);
    expect(access.checkpoint.programCounter).toBe(2);
    expect(access.checkpoint.pendingDecision?.decisionId).toBe("january-1990/access");

    const learning = requireWaiting(
      await resume(runtime, access, {
        requestId: "resume-january-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(learning.checkpoint.programCounter).toBe(4);
    expect(learning.checkpoint.pendingDecision?.decisionId).toBe("january-1990/learning");

    const defect = requireWaiting(
      await resume(runtime, learning, {
        requestId: "resume-january-learning",
        answer: { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
      }),
    );
    expect(defect.checkpoint.programCounter).toBe(7);
    expect(defect.checkpoint.pendingDecision?.decisionId).toBe("january-1990/defect");

    const committed = requireCommitted(
      await resume(runtime, defect, {
        requestId: "resume-january-defect",
        answer: { schemaVersion: "january-defect-answer-v1", response: "inspect-listing" },
      }),
    );

    expect(committed.checkpoint.status).toBe("committed");
    expect(committed.checkpoint.programCounter).toBe(9);
    expect(harness.getSave().revision).toBe(1);
    expect(harness.getSave().lastCommittedRunId).toBe(runId);
    expect(harness.getRun(runId)?.status).toBe("committed");
    expect(harness.getStats()).toEqual({
      beginMutations: 1,
      boundaryMutations: 4,
      commitMutations: 1,
    });
    expect(JSON.parse(harness.getSave().snapshot.json)).toMatchObject({
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        month: "1990-01",
        runId,
        terminalResult: {
          schemaVersion: "january-1990-result-v1",
        },
      },
    });
  });

  it("reuses durable receipts and rejects request-ID payload conflicts", async () => {
    const { harness, runtime, saveId, runId } = await createHarnessedRuntime();
    const access = await startJanuary(runtime, saveId, runId, "idempotent-begin");

    const duplicateBegin = requireWaiting(
      await runtime.begin({
        requestId: parseRequestId("idempotent-begin"),
        saveId,
        expectedSaveRevision: parseSaveRevision(0),
        runId,
        seed: 42n,
      }),
    );
    expect(duplicateBegin.checkpoint.checkpointHash).toBe(access.checkpoint.checkpointHash);
    expect(harness.getStats().beginMutations).toBe(1);

    const learning = requireWaiting(
      await resume(runtime, access, {
        requestId: "idempotent-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    const duplicateResume = requireWaiting(
      await resume(runtime, access, {
        requestId: "idempotent-access",
        answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
      }),
    );
    expect(duplicateResume.checkpoint.checkpointHash).toBe(learning.checkpoint.checkpointHash);

    const conflict = await resume(runtime, access, {
      requestId: "idempotent-access",
      answer: { schemaVersion: "january-access-answer-v1", route: "shared-school-pc" },
    });
    expect(conflict).toMatchObject({
      kind: "rejected",
      error: { code: "RequestPayloadConflict", retryable: false },
    });
    expect(harness.getStats().boundaryMutations).toBe(2);
  });

  it("reopens at a durable boundary without checkpoint drift", async () => {
    const { harness, runtime, saveId, runId } = await createHarnessedRuntime();
    const access = await startJanuary(runtime, saveId, runId);

    const reopened = requireRuntimeFactory()({
      persistence: harness.service,
      contentRegistry: await loadRegistry(),
      saveSchemaFingerprint: SAVE_SCHEMA_FINGERPRINT,
    });
    const loaded = requireWaiting(await reopened.load(saveId));

    expect(loaded.checkpoint.checkpointHash).toBe(access.checkpoint.checkpointHash);
    expect(loaded.checkpoint.rngState).toBe(access.checkpoint.rngState);
    expect(loaded.checkpoint.pendingDecision).toEqual(access.checkpoint.pendingDecision);
  });
});
