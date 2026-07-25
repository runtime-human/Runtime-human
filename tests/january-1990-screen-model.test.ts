import { describe, expect, it } from "vitest";

import { buildJanuaryScreenModel } from "../apps/desktop/src/january/january-screen-model";
import type { January1990RuntimeView } from "@runtime-human/game-application";
import {
  parseFingerprint,
  parseMonthRunId,
  parseMonthRunRevision,
  parseSaveId,
  parseSaveRevision,
} from "@runtime-human/game-schema";

const saveId = parseSaveId("save-january-screen-model");
const runId = parseMonthRunId("run-january-screen-model");
const checkpointHash = parseFingerprint(
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
);

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

    expect(buildJanuaryScreenModel(decisionView("access-decision")).choices).toEqual([
      { value: "home-pc", label: "Домашний компьютер" },
      { value: "shared-school-pc", label: "Школьный компьютер по расписанию" },
    ]);
    expect(buildJanuaryScreenModel(decisionView("learning-decision")).choices).toEqual([
      { value: "read-and-run", label: "Перепечатать и запустить" },
      { value: "edit-and-debug", label: "Изменять и отлаживать" },
    ]);
    expect(buildJanuaryScreenModel(decisionView("defect-decision")).choices).toEqual([
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
      result: {
        schemaVersion: "january-1990-result-v1",
        month: "1990-01",
        projectId: "core.project-archetype.personal-utility",
        outcomeEventId: "core.event.program-runs",
        programmingOutcome: {
          schemaVersion: "january-1990-programming-outcome-v1",
          qualityScores: { clarity: 8, correctness: 10, reliability: 7 },
        },
      },
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
