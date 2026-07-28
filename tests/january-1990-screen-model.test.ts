import { describe, expect, it } from "vitest";

import type { January1990RuntimeView } from "@runtime-human/game-application";
import { fingerprint } from "@runtime-human/game-core";
import {
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

import { createJanuary1990ResultFixture } from "../apps/desktop/src/january/january-result.fixture";
import { buildJanuaryScreenModel } from "../apps/desktop/src/january/january-screen-model";

const saveId = parseSaveId("save-january-screen-model");
const runId = parseMonthRunId("run-january-screen-model");
const checkpointHash = fingerprint("january-screen-checkpoint-test", { version: 1 });

function decisionView(
  kind: "access-decision" | "learning-decision" | "defect-decision",
): January1990RuntimeView {
  return {
    kind,
    saveId,
    runId,
    runRevision: parseMonthRunRevision(1),
    checkpointHash,
    prompt: { schemaVersion: `${kind}-prompt-v1` },
  };
}

function choiceLabels(kind: "access-decision" | "learning-decision" | "defect-decision") {
  return buildJanuaryScreenModel(decisionView(kind)).choices.map(({ value, label }) => ({
    value,
    label,
  }));
}

describe("January 1990 desktop screen model", () => {
  it("exposes the programmer-first January flow in Russian", () => {
    expect(
      buildJanuaryScreenModel({
        kind: "idle",
        saveId,
        saveRevision: parseSaveRevision(0),
      }),
    ).toMatchObject({
      title: "Январь 1990",
      primaryAction: { kind: "start", label: "Начать январь" },
    });

    expect(choiceLabels("access-decision")).toEqual([
      { value: "home-pc", label: "Домашний компьютер" },
      { value: "shared-school-pc", label: "Школьный компьютер по расписанию" },
    ]);
    expect(choiceLabels("learning-decision")).toEqual([
      { value: "read-and-run", label: "Перепечатать и запустить" },
      { value: "edit-and-debug", label: "Изменять и отлаживать" },
    ]);
    expect(choiceLabels("defect-decision")).toEqual([
      { value: "inspect-listing", label: "Проверить листинг" },
      { value: "change-input", label: "Изменить входные данные" },
      { value: "ask-for-guidance", label: "Попросить объяснение" },
    ]);
  });

  it("projects committed quality scores and retryable failures", () => {
    const committed = buildJanuaryScreenModel({
      kind: "committed",
      saveId,
      runId,
      saveRevision: parseSaveRevision(1),
      checkpointHash,
      result: createJanuary1990ResultFixture(),
    });
    expect(committed).toMatchObject({
      title: "Первая программа готова",
      qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
    });

    expect(
      buildJanuaryScreenModel({
        kind: "rejected",
        code: "TransportFailure",
        message: "Ответ не получен",
        retryable: true,
      }),
    ).toMatchObject({
      title: "Связь прервалась",
      primaryAction: { kind: "retry", label: "Повторить безопасно" },
    });
  });
});
