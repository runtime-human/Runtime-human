import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  MAX_CANONICAL_PAYLOAD_BYTES,
  parseBeginPersistedMonthRunCommand,
  parseCanonicalPayload,
  parseCommitPersistedMonthRunCommand,
  parseCreateSaveCommand,
  parseStoreMonthRunBoundaryCommand,
} from "@runtime-human/game-persistence-contracts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(
  readFileSync(resolve(ROOT, "fixtures/persistence/month-run-persistence-v1.json"), "utf8"),
) as Record<string, unknown>;

describe("persistence contracts", () => {
  it("parses the shared golden commands", () => {
    expect(parseCreateSaveCommand(fixture.createSaveCommand)).toEqual(fixture.createSaveCommand);
    expect(parseBeginPersistedMonthRunCommand(fixture.beginMonthRunCommand)).toEqual(
      fixture.beginMonthRunCommand,
    );
    expect(parseStoreMonthRunBoundaryCommand(fixture.storeBoundaryCommand)).toEqual(
      fixture.storeBoundaryCommand,
    );
    expect(parseCommitPersistedMonthRunCommand(fixture.commitMonthRunCommand)).toEqual(
      fixture.commitMonthRunCommand,
    );
  });

  it("rejects unknown command fields", () => {
    expect(() =>
      parseCreateSaveCommand({
        ...(fixture.createSaveCommand as object),
        futureField: true,
      }),
    ).toThrow(/unknown or missing fields/u);
  });

  it("rejects invalid canonical payload JSON and hash syntax", () => {
    const valid = (fixture.createSaveCommand as { snapshot: Record<string, unknown> }).snapshot;

    expect(() => parseCanonicalPayload({ ...valid, json: "{" })).toThrow(/valid JSON/u);
    expect(() => parseCanonicalPayload({ ...valid, sha256: "A".repeat(64) })).toThrow(
      /lowercase SHA-256/u,
    );
  });

  it("enforces the canonical payload byte budget", () => {
    expect(() =>
      parseCanonicalPayload({
        schemaVersion: "canonical-payload-v1",
        json: `"${"a".repeat(MAX_CANONICAL_PAYLOAD_BYTES)}"`,
        sha256: "0".repeat(64),
      }),
    ).toThrow(/payload byte limit/u);
  });

  it("rejects unsafe revisions before persistence", () => {
    expect(() =>
      parseBeginPersistedMonthRunCommand({
        ...(fixture.beginMonthRunCommand as object),
        expectedSaveRevision: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(/SaveRevision/u);
  });

  it("stores only durable MonthRun boundary statuses", () => {
    expect(() =>
      parseStoreMonthRunBoundaryCommand({
        ...(fixture.storeBoundaryCommand as object),
        status: "running",
      }),
    ).toThrow(/durable MonthRun boundary/u);
  });

  it("rejects begin envelopes that disagree with the checkpoint identity", () => {
    const command = fixture.beginMonthRunCommand as Record<string, unknown>;

    expect(() => parseBeginPersistedMonthRunCommand({ ...command, saveId: "save-other" })).toThrow(
      /checkpoint saveId/u,
    );
    expect(() => parseBeginPersistedMonthRunCommand({ ...command, runId: "run-other" })).toThrow(
      /checkpoint runId/u,
    );
    expect(() =>
      parseBeginPersistedMonthRunCommand({ ...command, expectedSaveRevision: 1 }),
    ).toThrow(/checkpoint baseSaveRevision/u);
  });

  it("rejects begin compatibility that disagrees with the checkpoint", () => {
    const command = fixture.beginMonthRunCommand as Record<string, unknown>;
    const compatibility = command.compatibility as Record<string, unknown>;

    expect(() =>
      parseBeginPersistedMonthRunCommand({
        ...command,
        compatibility: {
          ...compatibility,
          json: '{"checkpointSchema":"month-run-checkpoint-v1"}',
          sha256: "0".repeat(64),
        },
      }),
    ).toThrow(/checkpoint compatibility/u);
  });

  it("rejects stored boundaries that disagree with the checkpoint", () => {
    const command = fixture.storeBoundaryCommand as Record<string, unknown>;

    expect(() => parseStoreMonthRunBoundaryCommand({ ...command, saveId: "save-other" })).toThrow(
      /checkpoint saveId/u,
    );
    expect(() => parseStoreMonthRunBoundaryCommand({ ...command, runId: "run-other" })).toThrow(
      /checkpoint runId/u,
    );
    expect(() => parseStoreMonthRunBoundaryCommand({ ...command, runRevision: 3 })).toThrow(
      /checkpoint runRevision/u,
    );
    expect(() => parseStoreMonthRunBoundaryCommand({ ...command, status: "completed" })).toThrow(
      /checkpoint status/u,
    );
  });
});
