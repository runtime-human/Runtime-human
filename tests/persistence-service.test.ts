import { createPersistenceService, PERSISTENCE_COMMANDS } from "@runtime-human/game-application";
import type { PersistenceInvokePort } from "@runtime-human/game-application";
import type { CreateSaveCommandV1 } from "@runtime-human/game-persistence-contracts";

const HASH = "a".repeat(64);

const createSaveCommand = {
  schemaVersion: "create-save-command-v1",
  requestId: "create-save-request-1",
  saveId: "save-1",
  saveSchemaFingerprint: HASH,
  snapshot: {
    schemaVersion: "canonical-payload-v1",
    json: "{}",
    sha256: HASH,
  },
} as CreateSaveCommandV1;

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

describe("persistence application service", () => {
  it("uses the exact command name and argument envelope", async () => {
    const invoke = vi.fn(async () => acceptedCreateSave) as PersistenceInvokePort;
    const service = createPersistenceService(invoke);

    const result = await service.createSave(createSaveCommand);

    expect(result).toEqual(acceptedCreateSave);
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(PERSISTENCE_COMMANDS.createSave, {
      command: createSaveCommand,
    });
  });

  it("preserves the request ID across an explicit retry", async () => {
    const duplicate = { ...acceptedCreateSave, kind: "duplicate" } as const;
    const invoke = vi
      .fn()
      .mockResolvedValueOnce(acceptedCreateSave)
      .mockResolvedValueOnce(duplicate) as PersistenceInvokePort;
    const service = createPersistenceService(invoke);

    await service.createSave(createSaveCommand);
    const retried = await service.createSave(createSaveCommand);

    expect(retried.kind).toBe("duplicate");
    expect(invoke.mock.calls[0]?.[1]).toEqual({ command: createSaveCommand });
    expect(invoke.mock.calls[1]?.[1]).toEqual({ command: createSaveCommand });
  });

  it("rejects an unknown response union instead of trusting the invoke generic", async () => {
    const invoke = vi.fn(async () => ({ kind: "unexpected" })) as PersistenceInvokePort;
    const service = createPersistenceService(invoke);

    await expect(service.createSave(createSaveCommand)).rejects.toThrow(
      "Unknown persistence mutation result kind",
    );
  });

  it("parses recovery responses and rejects unknown fields", async () => {
    const validInvoke = vi.fn(async () => ({
      kind: "found",
      value: {
        schemaVersion: "recovery-status-v1",
        status: "healthy",
        writable: true,
        backupAvailable: false,
      },
    })) as PersistenceInvokePort;
    const service = createPersistenceService(validInvoke);

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

    const invalidService = createPersistenceService(
      vi.fn(async () => ({
        kind: "found",
        value: {
          schemaVersion: "recovery-status-v1",
          status: "healthy",
          writable: true,
          backupAvailable: false,
          leakedPath: "C:/private/runtime-human.sqlite3",
        },
      })) as PersistenceInvokePort,
    );

    await expect(
      invalidService.getRecoveryStatus({ schemaVersion: "get-recovery-status-query-v1" }),
    ).rejects.toThrow("recovery status contains unknown or missing fields");
  });
});
