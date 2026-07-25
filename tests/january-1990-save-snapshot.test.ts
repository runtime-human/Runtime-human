import { describe, expect, it } from "vitest";

import {
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  parseJanuary1990SaveSnapshot,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import { parseMonthRunId, parseSaveRevision } from "@runtime-human/game-schema";

const COMPLETED_MONTH = {
  schemaVersion: "january-1990-completed-month-v1",
  month: "1990-01",
  runId: parseMonthRunId("run-january-save-snapshot"),
  baseSaveRevision: parseSaveRevision(0),
  completedCheckpointHash: fingerprint("january-save-checkpoint-test", { version: 1 }),
  terminalResult: {
    schemaVersion: "january-1990-result-v1",
    month: "1990-01",
  },
  outcomes: [
    {
      outcomeId: "january-1990/programming-outcome",
      scope: "month/outcome",
      payload: {
        schemaVersion: "january-1990-programming-outcome-v1",
        qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
      },
      payloadHash: fingerprint("january-save-outcome-test", { version: 1 }),
    },
  ],
} as const;

describe("January 1990 save snapshot contract", () => {
  it("creates the exact immutable initial snapshot and stable schema fingerprint", () => {
    const snapshot = createJanuary1990InitialSaveSnapshot();

    expect(snapshot).toEqual({
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: null,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(JANUARY_1990_SAVE_SCHEMA_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("round-trips one completed January month as deeply immutable authoritative data", () => {
    const value = {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: COMPLETED_MONTH,
    };

    const snapshot = parseJanuary1990SaveSnapshot(JSON.parse(JSON.stringify(value)));

    expect(snapshot).toEqual(value);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth)).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth?.outcomes)).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth?.outcomes[0])).toBe(true);
  });

  it.each([
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: null,
      extra: true,
    },
    {
      schemaVersion: "another-save-schema-v1",
      completedMonth: null,
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        completedCheckpointHash: "not-a-fingerprint",
      },
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        terminalResult: null,
      },
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        outcomes: [
          {
            ...COMPLETED_MONTH.outcomes[0],
            unknown: true,
          },
        ],
      },
    },
  ])("rejects malformed save snapshot %#", (value) => {
    expect(() => parseJanuary1990SaveSnapshot(value)).toThrow(TypeError);
  });
});
