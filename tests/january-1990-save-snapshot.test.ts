import { describe, expect, it } from "vitest";

import {
  createJanuary1990InitialSaveSnapshot,
  JANUARY_1990_SAVE_SCHEMA_FINGERPRINT,
  parseJanuary1990SaveSnapshot,
} from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import { parseMonthRunId, parseSaveRevision } from "@runtime-human/game-schema";

function storedOutcome(outcomeId: string, scope: string, payload: Record<string, unknown>) {
  return {
    outcomeId,
    scope,
    payload,
    payloadHash: fingerprint("month-run-materialized-outcome-v1", payload),
  };
}

const TERMINAL_RESULT = {
  schemaVersion: "january-1990-result-v1",
  month: "1990-01",
  projectId: "core.project-archetype.personal-utility",
  outcomeEventId: "core.event.program-runs",
  programmingOutcome: {
    schemaVersion: "january-1990-programming-outcome-v1",
    month: "1990-01",
    projectId: "core.project-archetype.personal-utility",
    workPackageId: "core.work-package.input-output",
    defectEventId: "core.event.logic-error",
    outcomeEventId: "core.event.program-runs",
    accessRoute: "home-pc",
    learningPractice: "edit-and-debug",
    defectResponse: "inspect-listing",
    qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
    evidence: [],
  },
} as const;

const COMPLETED_MONTH = {
  schemaVersion: "january-1990-completed-month-v1",
  month: "1990-01",
  runId: parseMonthRunId("run-january-save-snapshot"),
  baseSaveRevision: parseSaveRevision(0),
  completedCheckpointHash: fingerprint("january-save-checkpoint-test", { version: 1 }),
  terminalResult: TERMINAL_RESULT,
  outcomes: [
    storedOutcome("january-1990/access", "month/content", {
      schemaVersion: "january-1990-access-outcome-v1",
      route: "home-pc",
    }),
    storedOutcome("january-1990/work", "month/content", {
      schemaVersion: "january-1990-work-outcome-v1",
      goal: "input-output",
    }),
    storedOutcome("january-1990/defect", "month/narrative", {
      schemaVersion: "january-1990-defect-outcome-v1",
      eventId: "core.event.logic-error",
    }),
    storedOutcome("january-1990/programming-outcome", "month/outcome", {
      schemaVersion: "january-1990-programming-outcome-v1",
      qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
    }),
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
    expect(Object.isFrozen(snapshot.completedMonth?.terminalResult)).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth?.outcomes)).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth?.outcomes[0])).toBe(true);
    expect(Object.isFrozen(snapshot.completedMonth?.outcomes[0]?.payload)).toBe(true);
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
        terminalResult: { ...TERMINAL_RESULT, schemaVersion: "another-result-v1" },
      },
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        outcomes: COMPLETED_MONTH.outcomes.slice(0, 3),
      },
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        outcomes: [
          { ...COMPLETED_MONTH.outcomes[1] },
          { ...COMPLETED_MONTH.outcomes[0] },
          ...COMPLETED_MONTH.outcomes.slice(2),
        ],
      },
    },
    {
      schemaVersion: "january-1990-save-snapshot-v1",
      completedMonth: {
        ...COMPLETED_MONTH,
        outcomes: [
          {
            ...COMPLETED_MONTH.outcomes[0],
            payloadHash: fingerprint("wrong-outcome-hash", { version: 2 }),
          },
          ...COMPLETED_MONTH.outcomes.slice(1),
        ],
      },
    },
  ])("rejects malformed save snapshot %#", (value) => {
    expect(() => parseJanuary1990SaveSnapshot(value)).toThrow(TypeError);
  });
});
