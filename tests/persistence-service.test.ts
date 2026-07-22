import { createPersistenceService, PERSISTENCE_COMMANDS } from "@runtime-human/game-application";
import type { PersistenceInvokePort } from "@runtime-human/game-application";
import {
  parseCreateSaveCommand,
  type CreateSaveCommandV1,
} from "@runtime-human/game-persistence-contracts";

const HASH = "a".repeat(64);

const createSaveCommand: CreateSaveCommandV1 = parseCreateSaveCommand({
  schemaVersion: "create-save-command-v1",
  requestId: "create-save-request-1",
  saveId: "save-1",
  saveSchemaFingerprint: HASH,
  snapshot: {
    schemaVersion: "canonical-payload-v1",
    json: "{}",
    sha256: HASH,
  },
});

const acceptedCreateSave = {
  kind: "accepted",
  value: {
    schemaVersion: "create-save-accepted-v1",
    save: {
      schemaVersion: "save-record-v1",
      saveId: "save-1",
      revision: 0,
      saveSchemaFingerprint: HASH,
      snapshot: {
        schemaVersion: "canonical-payload-v1",
        json: "{}",
        sha256: HASH,
      },
      lastCommittedRunId: null,
      createdSequence: 1,
      updatedSequence: 1,
    },
  },
} as const;

type InvokeCall = Readonly<{
  command: string;
  arguments_: Readonly<Record<string, unknown>>;
}>;

function createInvokeFake(responses: readonly unknown[]): Readonly<{
  invoke: PersistenceInvokePort;
  calls: InvokeCall[];
}> {
  const remaining = [...responses];
  const calls: InvokeCall[] = [];
  const invoke: PersistenceInvokePort = async <T>(
    command: string,
    arguments_: Readonly<Record<string, unknown>>,
  ): Promise<T> => {
    calls.push({ command, arguments_ });
    if (remaining.length === 0) {
      throw new Error("Persistence invoke fake has no configured response");
    }
    return remaining.shift() as T;
  };
  return { invoke, calls };
}

describe("persistence application service", () => {
  it("uses the exact command name and argument envelope", async () => {
    const fake = createInvokeFake([acceptedCreateSave]);
    const service = createPersistenceService(fake.invoke);

    const result = await service.createSave(createSaveCommand);

    expect(result).toEqual(acceptedCreateSave);
    expect(fake.calls).toEqual([
      {
        command: PERSISTENCE_COMMANDS.createSave,
        arguments_: { command: createSaveCommand },
      },
    ]);
  });

  it("preserves the request ID across an explicit retry", async () => {
    const duplicate = { ...acceptedCreateSave, kind: "duplicate" } as const;
    const fake = createInvokeFake([acceptedCreateSave, duplicate]);
    const service = createPersistenceService(fake.invoke);

    await service.createSave(createSaveCommand);
    const retried = await service.createSave(createSaveCommand);

    expect(retried.kind).toBe("duplicate");
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[0]?.arguments_).toEqual({ command: createSaveCommand });
    expect(fake.calls[1]?.arguments_).toEqual({ command: createSaveCommand });
  });

  it("rejects an unknown response union instead of trusting the invoke generic", async () => {
    const fake = createInvokeFake([{ kind: "unexpected" }]);
    const service = createPersistenceService(fake.invoke);

    await expect(service.createSave(createSaveCommand)).rejects.toThrow(
      "Unknown persistence mutation result kind",
    );
  });

  it("parses recovery responses and rejects unknown fields", async () => {
    const validFake = createInvokeFake([
      {
        kind: "found",
        value: {
          schemaVersion: "recovery-status-v1",
          status: "healthy",
          writable: true,
          backupAvailable: false,
        },
      },
    ]);
    const service = createPersistenceService(validFake.invoke);

    await expect(
      service.getRecoveryStatus({ schemaVersion: "get-recovery-status-query-v1" }),
    ).resolves.toEqual({
      kind: "found",
      value: {
        schemaVersion: "recovery-status-v1",
        status: "healthy",
        writable: true,
        backupAvailable: false,
      },
    });

    const invalidFake = createInvokeFake([
      {
        kind: "found",
        value: {
          schemaVersion: "recovery-status-v1",
          status: "healthy",
          writable: true,
          backupAvailable: false,
          leakedPath: "C:/private/runtime-human.sqlite3",
        },
      },
    ]);
    const invalidService = createPersistenceService(invalidFake.invoke);

    await expect(
      invalidService.getRecoveryStatus({ schemaVersion: "get-recovery-status-query-v1" }),
    ).rejects.toThrow("recovery status contains unknown or missing fields");
  });
});
