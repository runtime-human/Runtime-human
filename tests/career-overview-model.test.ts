import { describe, expect, it } from "vitest";

import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";
import { projectCareerOverviewView } from "../apps/desktop/src/overview/career-overview-model";

const saveId = parseSaveId("career-overview-save");
const runId = parseMonthRunId("career-overview-run");
const checkpointHash = fingerprint("career-overview-checkpoint", { version: 1 });

describe("Career Overview projection", () => {
  it("projects loading and idle January sessions", () => {
    expect(projectCareerOverviewView({ kind: "loading" })).toEqual({ kind: "loading" });
    expect(
      projectCareerOverviewView({
        kind: "idle",
        saveId,
        saveRevision: parseSaveRevision(0),
      }),
    ).toEqual({
      kind: "new-career",
      saveId,
    });
  });

  it.each([
    ["access-decision", "access", 28, 2],
    ["learning-decision", "learning", 52, 4],
    ["defect-decision", "defect", 76, 7],
  ] as const)("projects %s as the persisted %s stage", (kind, stage, progress, revision) => {
    expect(
      projectCareerOverviewView({
        kind,
        saveId,
        runId,
        runRevision: parseMonthRunRevision(revision),
        checkpointHash,
        prompt: { schemaVersion: `${kind}-prompt-v1` },
      }),
    ).toEqual({
      kind: "active-month",
      month: "1990-01",
      stage,
      progress,
      saveId,
      runId,
      runRevision: parseMonthRunRevision(revision),
    });
  });

  it("projects a committed January result with its real quality scores", () => {
    expect(
      projectCareerOverviewView({
        kind: "committed",
        saveId,
        runId,
        saveRevision: parseSaveRevision(1),
        checkpointHash,
        result: createJanuary1990ResultFixture(),
      }),
    ).toEqual({
      kind: "completed-month",
      month: "1990-01",
      saveId,
      runId,
      saveRevision: parseSaveRevision(1),
      qualityScores: {
        clarity: 8,
        correctness: 10,
        reliability: 7,
      },
    });
  });

  it("blocks a malformed committed result instead of throwing from rendering", () => {
    expect(
      projectCareerOverviewView({
        kind: "committed",
        saveId,
        runId,
        saveRevision: parseSaveRevision(1),
        checkpointHash,
        result: {
          schemaVersion: "january-1990-result-v1",
          month: "1990-01",
        },
      }),
    ).toEqual({
      kind: "blocked",
      reason: "invalid-result",
      message: "Сохранённый результат января не соответствует поддерживаемому формату.",
    });
  });

  it("preserves terminal, blocked and rejected states", () => {
    expect(
      projectCareerOverviewView({
        kind: "terminal",
        saveId,
        runId,
        checkpointHash,
        status: "recovery-required",
        reason: null,
      }),
    ).toEqual({
      kind: "terminal",
      status: "recovery-required",
      saveId,
      runId,
    });

    expect(
      projectCareerOverviewView({
        kind: "blocked",
        reason: "recovery",
        message: "Хранилище требует проверки.",
        saveId,
        runId,
      }),
    ).toEqual({
      kind: "blocked",
      reason: "recovery",
      message: "Хранилище требует проверки.",
    });

    expect(
      projectCareerOverviewView({
        kind: "rejected",
        code: "PersistenceUnavailable",
        message: "Ответ хранилища не получен.",
        retryable: true,
      }),
    ).toEqual({
      kind: "rejected",
      code: "PersistenceUnavailable",
      message: "Ответ хранилища не получен.",
      retryable: true,
    });
  });
});
