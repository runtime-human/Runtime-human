import { describe, expect, it } from "vitest";

import {
  PERSISTENCE_COMMANDS,
  createPersistenceService,
  type PersistenceInvokePort,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import { parseSha256Hex, type CreateSaveCommandV1 } from "@runtime-human/game-persistence-contracts";
import { parseRequestId, parseSaveId } from "@runtime-human/game-schema";

const ZERO_HASH = parseSha256Hex("0".repeat(64));

function createCommand(): CreateSaveCommandV1 {
  return {
    schemaVersion: "create-save-command-v1",
    requestId: parseRequestId("create-save-adapter-1"),
    saveId: parseSaveId("save-adapter-1"),
    saveSchemaFingerprint: fingerprint("adapter-save-schema", { version: 1 }),
    snapshot: {
      schemaVersion: "canonical-payload-v1",
      json: "{}",
      sha256: ZERO_HASH,
    },
  };
}

function acceptedResponse(command: CreateSaveCommandV1): unknown {
  return {
    kind: "accepted",
    value: {
      schemaVersion: "create-save-accepted-v1",
      save: {
        schemaVersion: "save-record-v1",
        saveId: command.saveId,
        revision: 0,
        saveSchemaFingerprint: command.saveSchemaFingerprint,
        snapshot: command.snapshot,
        lastCommittedRunId: null,
        createdSequence: 1,
        updatedSequence: 1,
      },
    },
  };
}

describe("persistence application adapter", () => {
  it("uses the exact create-save command and parses the response", async () => {
    const command = createCommand();
    const calls: Array<Readonly<{ command: string; arguments_: Readonly<Record<string, unknown>> }>> = [];
    const invoke: PersistenceInvokePort = async <T>(name, arguments_) => {
      calls.push({ command: name, arguments_ });
      return acceptedResponse(command) as T;
    };

    const result = await createPersistenceService(invoke).createSave(command);

    expect(result.kind).toBe("accepted");
    expect(calls).toEqual([
      {
        command: PERSISTENCE_COMMANDS.createSave,
        arguments_: { command },
      },
    ]);
  });

  it("preserves the request ID across transport retries", async () => {
    const command = createCommand();
    const requestIds: unknown[] = [];
    const invoke: PersistenceInvokePort = async <T>(_name, arguments_) => {
      const submitted = arguments_.command as Readonly<Record<string, unknown>>;
      requestIds.push(submitted.requestId);
      return acceptedResponse(command) as T;
    };
    const service = createPersistenceService(invoke);

    await service.createSave(command);
    await service.createSave(command);

    expect(requestIds).toEqual([command.requestId, command.requestId]);
  });

  it("rejects an unknown response union before it reaches the application", async () => {
    const invoke: PersistenceInvokePort = async <T>() => ({ kind: "maybe" }) as T;
    const service = createPersistenceService(invoke);

    await expect(service.createSave(createCommand())).rejects.toThrow(
      "Unknown persistence mutation result kind",
    );
  });
});
