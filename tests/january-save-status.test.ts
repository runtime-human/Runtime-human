import { describe, expect, it } from "vitest";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import type { JanuarySessionView } from "../apps/desktop/src/january/january-session-controller";
import {
  januarySaveStatusDetail,
  januarySaveStatusLabel,
  projectJanuarySaveStatus,
  type JanuarySaveStatusKind,
} from "../apps/desktop/src/january/january-save-status";

const saveId = parseSaveId("save-status-save");
const runId = parseMonthRunId("save-status-run");
const checkpointHash = fingerprint("save-status-checkpoint", { version: 1 });
const prompt = { schemaVersion: "save-status-prompt-v1" };

type Case = Readonly<{
  name: string;
  view: JanuarySessionView;
  idle: JanuarySaveStatusKind;
}>;

const CASES: readonly Case[] = [
  { name: "loading", view: { kind: "loading" }, idle: "not-confirmed" },
  {
    name: "idle without save",
    view: { kind: "idle", saveId: null, saveRevision: null },
    idle: "not-created",
  },
  {
    name: "idle with save",
    view: { kind: "idle", saveId, saveRevision: parseSaveRevision(0) },
    idle: "confirmed",
  },
  ...(["access-decision", "learning-decision", "defect-decision"] as const).map(
    (kind): Case => ({
      name: kind,
      view: { kind, saveId, runId, runRevision: parseMonthRunRevision(2), checkpointHash, prompt },
      idle: "confirmed",
    }),
  ),
  {
    name: "committed",
    view: {
      kind: "committed",
      saveId,
      runId,
      saveRevision: parseSaveRevision(1),
      checkpointHash,
      result: {},
    },
    idle: "confirmed",
  },
  ...(["failed", "incompatible", "recovery-required", "abandoned"] as const).map(
    (status): Case => ({
      name: `terminal ${status}`,
      view: { kind: "terminal", saveId, runId, checkpointHash, status, reason: null },
      idle: "attention",
    }),
  ),
  ...(
    [
      "recovery",
      "incompatible-persistence",
      "incompatible-checkpoint",
      "corrupted-checkpoint",
    ] as const
  ).map(
    (reason): Case => ({
      name: `blocked ${reason}`,
      view: { kind: "blocked", reason, message: "m", saveId, runId },
      idle: "attention",
    }),
  ),
  {
    name: "blocked without save",
    view: { kind: "blocked", reason: "recovery", message: "m", saveId: null, runId: null },
    idle: "attention",
  },
  {
    name: "rejected retryable",
    view: { kind: "rejected", code: "PersistenceUnavailable", message: "m", retryable: true },
    idle: "retry-required",
  },
  {
    name: "rejected non-retryable",
    view: { kind: "rejected", code: "DesktopBootstrapFailure", message: "m", retryable: false },
    idle: "not-confirmed",
  },
];

const CONFIRMING_KINDS = new Set(["idle with save", "committed"]);

describe("projectJanuarySaveStatus", () => {
  it.each(CASES)("maps $name when not busy", ({ view, idle }) => {
    expect(projectJanuarySaveStatus(view, false).kind).toBe(idle);
  });

  it.each(CASES)("never confirms $name while busy", ({ view }) => {
    const status = projectJanuarySaveStatus(view, true);
    expect(status.kind).toBe(view.kind === "loading" ? "checking" : "writing");
  });

  it("confirms only from views that carry a persisted revision", () => {
    for (const { name, view } of CASES) {
      const confirmed = projectJanuarySaveStatus(view, false).kind === "confirmed";
      const carriesRevision = CONFIRMING_KINDS.has(name) || view.kind.endsWith("-decision");
      expect(confirmed, name).toBe(carriesRevision);
    }
    for (const { view } of CASES) {
      if (["loading", "blocked", "terminal", "rejected"].includes(view.kind)) {
        expect(projectJanuarySaveStatus(view, false).kind).not.toBe("confirmed");
        expect(projectJanuarySaveStatus(view, true).kind).not.toBe("confirmed");
      }
    }
  });

  it("reports the revision and its scope", () => {
    expect(
      projectJanuarySaveStatus({ kind: "idle", saveId, saveRevision: parseSaveRevision(3) }, false),
    ).toEqual({ kind: "confirmed", scope: "save", revision: 3 });
    expect(
      projectJanuarySaveStatus(
        {
          kind: "learning-decision",
          saveId,
          runId,
          runRevision: parseMonthRunRevision(4),
          checkpointHash,
          prompt,
        },
        false,
      ),
    ).toEqual({ kind: "confirmed", scope: "run", revision: 4 });
  });
});

describe("januarySaveStatusLabel", () => {
  it("uses the confirmed label only for confirmed status", () => {
    for (const { view } of CASES) {
      for (const busy of [false, true]) {
        const status = projectJanuarySaveStatus(view, busy);
        const label = januarySaveStatusLabel(status);
        expect(label === "Сохранено локально").toBe(status.kind === "confirmed");
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the revision out of the label and in the detail", () => {
    const status = projectJanuarySaveStatus(
      { kind: "idle", saveId, saveRevision: parseSaveRevision(7) },
      false,
    );
    expect(januarySaveStatusLabel(status)).not.toContain("7");
    expect(januarySaveStatusDetail(status)).toBe("Версия сохранения: 7");
    expect(januarySaveStatusDetail({ kind: "attention" })).toBeUndefined();
  });
});
