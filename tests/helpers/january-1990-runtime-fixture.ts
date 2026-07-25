import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createJanuary1990Runtime,
  type January1990Runtime,
  type PersistedMonthRunResult,
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
  type Fingerprint,
  type MonthRunId,
  type SaveId,
} from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./in-memory-persistence-service";

const CONTENT_ROOT = join(process.cwd(), "apps", "desktop", "public", "content");
const CONTENT_RUNTIME = createCompiledContentRuntime({
  canonicalize: canonicalizeAuthoritative,
  fingerprint,
});

export const JANUARY_TEST_SAVE_SCHEMA_FINGERPRINT = fingerprint("january-1990-save-schema-test", {
  version: 1,
});

export type JanuaryWaitingResult = Extract<PersistedMonthRunResult, { kind: "waiting-decision" }>;
export type JanuaryCommittedResult = Extract<PersistedMonthRunResult, { kind: "committed" }>;

export async function loadJanuaryTestRegistry(): Promise<ContentRegistry> {
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

export async function createHarnessedJanuaryRuntime(
  input: Readonly<{
    saveId?: SaveId;
    runId?: MonthRunId;
    saveSchemaFingerprint?: Fingerprint;
    registry?: ContentRegistry;
  }> = {},
) {
  const saveId = input.saveId ?? parseSaveId("save-january-1990-runtime");
  const runId = input.runId ?? parseMonthRunId("run-january-1990-runtime");
  const saveSchemaFingerprint = input.saveSchemaFingerprint ?? JANUARY_TEST_SAVE_SCHEMA_FINGERPRINT;
  const harness = createInMemoryPersistenceHarness({
    saveId,
    saveSchemaFingerprint,
    initialSnapshot: { schemaVersion: "initial-save-v1" },
  });
  const registry = input.registry ?? (await loadJanuaryTestRegistry());
  const runtime = createJanuary1990Runtime({
    persistence: harness.service,
    contentRegistry: registry,
    saveSchemaFingerprint,
  });
  return { harness, runtime, saveId, runId, registry, saveSchemaFingerprint };
}

export function reopenJanuaryRuntime(
  source: Awaited<ReturnType<typeof createHarnessedJanuaryRuntime>>,
  input: Readonly<{
    registry?: ContentRegistry;
    saveSchemaFingerprint?: Fingerprint;
  }> = {},
): January1990Runtime {
  return createJanuary1990Runtime({
    persistence: source.harness.service,
    contentRegistry: input.registry ?? source.registry,
    saveSchemaFingerprint: input.saveSchemaFingerprint ?? source.saveSchemaFingerprint,
  });
}

export function requireJanuaryWaiting(result: PersistedMonthRunResult): JanuaryWaitingResult {
  if (result.kind !== "waiting-decision") {
    throw new Error(`Expected persisted January decision boundary, received ${result.kind}`);
  }
  return result;
}

export function requireJanuaryCommitted(result: PersistedMonthRunResult): JanuaryCommittedResult {
  if (result.kind !== "committed") {
    throw new Error(`Expected committed January MonthRun, received ${result.kind}`);
  }
  return result;
}

export async function startJanuary(
  runtime: January1990Runtime,
  saveId: SaveId,
  runId: MonthRunId,
  requestId = "begin-january-runtime",
): Promise<JanuaryWaitingResult> {
  return requireJanuaryWaiting(
    await runtime.begin({
      requestId: parseRequestId(requestId),
      saveId,
      expectedSaveRevision: parseSaveRevision(0),
      runId,
      seed: 42n,
    }),
  );
}

export async function resumeJanuary(
  runtime: January1990Runtime,
  boundary: JanuaryWaitingResult,
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

export async function reachJanuaryLearningBoundary(
  runtime: January1990Runtime,
  saveId: SaveId,
  runId: MonthRunId,
): Promise<JanuaryWaitingResult> {
  const access = await startJanuary(runtime, saveId, runId);
  return requireJanuaryWaiting(
    await resumeJanuary(runtime, access, {
      requestId: "resume-january-access",
      answer: { schemaVersion: "january-access-answer-v1", route: "home-pc" },
    }),
  );
}

export async function reachJanuaryDefectBoundary(
  runtime: January1990Runtime,
  saveId: SaveId,
  runId: MonthRunId,
): Promise<JanuaryWaitingResult> {
  const learning = await reachJanuaryLearningBoundary(runtime, saveId, runId);
  return requireJanuaryWaiting(
    await resumeJanuary(runtime, learning, {
      requestId: "resume-january-learning",
      answer: { schemaVersion: "january-learning-answer-v1", practice: "edit-and-debug" },
    }),
  );
}
