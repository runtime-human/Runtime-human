import {
  createCanonicalPayload,
  createJanuary1990InitialSaveSnapshot,
  createJanuary1990Runtime,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  type PersistenceService,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import type {
  BeginPersistedMonthRunCommandV1,
  CommitPersistedMonthRunCommandV1,
  CreateSaveCommandV1,
  StoreMonthRunBoundaryCommandV1,
} from "@runtime-human/game-persistence-contracts";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseRequestId,
  parseSaveId,
  parseSaveRevision,
  type AuthoritativeJsonValue,
} from "@runtime-human/game-schema";

import { createInMemoryPersistenceHarness } from "./in-memory-persistence-service";
import { loadJanuaryTestRegistry } from "./january-1990-runtime-fixture";

export type January1990PersistenceFlowFixture = Readonly<{
  schemaVersion: "january-1990-persistence-flow-v1";
  createSave: CreateSaveCommandV1;
  begin: BeginPersistedMonthRunCommandV1;
  boundaries: readonly StoreMonthRunBoundaryCommandV1[];
  commit: CommitPersistedMonthRunCommandV1;
  expectations: Readonly<{
    boundaryProgramCounters: readonly [2, 4, 7, 9];
    boundaryStatuses: readonly ["suspended", "suspended", "suspended", "completed"];
    committedProgramCounter: 9;
    finalSaveRevision: 1;
    finalRunStatus: "committed";
    completedCheckpointHash: string;
    committedCheckpointHash: string;
  }>;
}>;

export async function generateJanuary1990PersistenceFlowFixture(): Promise<January1990PersistenceFlowFixture> {
  const saveId = parseSaveId("save-january-1990-production-flow");
  const runId = parseMonthRunId("run-january-1990-production-flow");
  const harness = createInMemoryPersistenceHarness({
    saveId,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    initialSnapshot: createJanuary1990InitialSaveSnapshot(),
  });
  const beginCommands: BeginPersistedMonthRunCommandV1[] = [];
  const boundaryCommands: StoreMonthRunBoundaryCommandV1[] = [];
  const commitCommands: CommitPersistedMonthRunCommandV1[] = [];
  const persistence = recordPersistence(
    harness.service,
    beginCommands,
    boundaryCommands,
    commitCommands,
  );
  const runtime = createJanuary1990Runtime({
    persistence,
    contentRegistry: await loadJanuaryTestRegistry(),
  });

  const access = requireWaiting(
    await runtime.begin({
      requestId: parseRequestId("january-production-flow-begin"),
      saveId,
      expectedSaveRevision: parseSaveRevision(0),
      runId,
      seed: 42n,
    }),
  );
  const learning = requireWaiting(
    await resume(runtime, access.checkpoint.runRevision, access.checkpoint.pendingDecision?.decisionId, {
      schemaVersion: "january-access-answer-v1",
      route: "home-pc",
    }, "january-production-flow-access"),
  );
  const defect = requireWaiting(
    await resume(runtime, learning.checkpoint.runRevision, learning.checkpoint.pendingDecision?.decisionId, {
      schemaVersion: "january-learning-answer-v1",
      practice: "edit-and-debug",
    }, "january-production-flow-learning"),
  );
  const committed = await resume(
    runtime,
    defect.checkpoint.runRevision,
    defect.checkpoint.pendingDecision?.decisionId,
    {
      schemaVersion: "january-defect-answer-v1",
      response: "inspect-listing",
    },
    "january-production-flow-defect",
  );
  if (committed.kind !== "committed") {
    throw new Error(`January persistence flow ended as ${committed.kind}`);
  }

  const createSave: CreateSaveCommandV1 = Object.freeze({
    schemaVersion: "create-save-command-v1",
    requestId: parseRequestId(
      fingerprint("january-1990-production-flow-create-save-v1", { saveId }),
    ),
    saveId,
    saveSchemaFingerprint: JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
    snapshot: createCanonicalPayload(createJanuary1990InitialSaveSnapshot()),
  });
  const begin = requireSingle(beginCommands, "begin command");
  const commit = requireSingle(commitCommands, "commit command");
  if (boundaryCommands.length !== 4) {
    throw new Error(`Expected four January boundary commands, received ${boundaryCommands.length}`);
  }
  const counters = boundaryCommands.map(readProgramCounter);
  const statuses = boundaryCommands.map((command) => command.status);
  if (counters.join(",") !== "2,4,7,9") {
    throw new Error(`January boundary counters changed to ${counters.join(",")}`);
  }
  if (statuses.join(",") !== "suspended,suspended,suspended,completed") {
    throw new Error(`January boundary statuses changed to ${statuses.join(",")}`);
  }

  return Object.freeze({
    schemaVersion: "january-1990-persistence-flow-v1",
    createSave,
    begin,
    boundaries: Object.freeze([...boundaryCommands]),
    commit,
    expectations: Object.freeze({
      boundaryProgramCounters: Object.freeze([2, 4, 7, 9] as const),
      boundaryStatuses: Object.freeze([
        "suspended",
        "suspended",
        "suspended",
        "completed",
      ] as const),
      committedProgramCounter: 9,
      finalSaveRevision: 1,
      finalRunStatus: "committed",
      completedCheckpointHash: boundaryCommands[3]?.checkpointHash ?? "",
      committedCheckpointHash: readCheckpointHash(commit.committedCheckpoint.json),
    }),
  });

  async function resume(
    januaryRuntime: typeof runtime,
    runRevision: number,
    decisionId: string | undefined,
    answer: AuthoritativeJsonValue,
    requestId: string,
  ) {
    if (decisionId === undefined) throw new Error(`January decision is missing for ${requestId}`);
    return januaryRuntime.resume({
      requestId: parseRequestId(requestId),
      saveId,
      runId,
      expectedRunRevision: parseMonthRunRevision(runRevision),
      decisionId,
      answer,
    });
  }
}

function recordPersistence(
  source: PersistenceService,
  beginCommands: BeginPersistedMonthRunCommandV1[],
  boundaryCommands: StoreMonthRunBoundaryCommandV1[],
  commitCommands: CommitPersistedMonthRunCommandV1[],
): PersistenceService {
  return {
    ...source,
    async beginMonthRun(command) {
      beginCommands.push(command);
      return source.beginMonthRun(command);
    },
    async storeMonthRunBoundary(command) {
      boundaryCommands.push(command);
      return source.storeMonthRunBoundary(command);
    },
    async commitMonthRun(command) {
      commitCommands.push(command);
      return source.commitMonthRun(command);
    },
  };
}

function requireWaiting(
  result: Awaited<ReturnType<ReturnType<typeof createJanuary1990Runtime>["begin"]>>,
) {
  if (result.kind !== "waiting-decision") {
    throw new Error(`Expected January decision boundary, received ${result.kind}`);
  }
  return result;
}

function requireSingle<T>(values: readonly T[], label: string): T {
  if (values.length !== 1 || values[0] === undefined) {
    throw new Error(`Expected one ${label}, received ${values.length}`);
  }
  return values[0];
}

function readProgramCounter(command: StoreMonthRunBoundaryCommandV1): number {
  const parsed = JSON.parse(command.checkpoint.json) as unknown;
  if (!isRecord(parsed) || !Number.isSafeInteger(parsed.programCounter)) {
    throw new TypeError("Stored January checkpoint programCounter is invalid");
  }
  return parsed.programCounter as number;
}

function readCheckpointHash(json: string): string {
  const parsed = JSON.parse(json) as unknown;
  if (!isRecord(parsed) || typeof parsed.checkpointHash !== "string") {
    throw new TypeError("Committed January checkpoint hash is invalid");
  }
  return parsed.checkpointHash;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
