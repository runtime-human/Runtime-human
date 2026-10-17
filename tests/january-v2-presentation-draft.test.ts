import { describe, expect, it } from "vitest";

import {
  JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
} from "@runtime-human/game-core";
import {
  assertJanuaryV2PresentationDraft,
  JANUARY_V2_PRESENTATION_DRAFT_VERSION,
  type JanuaryV2PresentationDraft,
} from "@runtime-human/game-content-compiler";

function draft(): JanuaryV2PresentationDraft {
  return {
    schemaVersion: JANUARY_V2_PRESENTATION_DRAFT_VERSION,
    approaches: [
      {
        id: "investigate-first",
        label: "Проверить самостоятельно",
        forecast: "Разобраться без подсказки, но можно не успеть",
        availability: "available",
        tradeOffs: [
          { axis: "independent-experience", polarity: "gain", text: "Самостоятельная работа" },
          { axis: "finish-chance", polarity: "cost", text: "Есть риск не закончить" },
        ],
      },
      {
        id: "ask-for-help",
        label: "Получить подсказку",
        forecast: "Больше шансов справиться, но результат будет с помощью",
        availability: "available",
        tradeOffs: [
          { axis: "finish-chance", polarity: "gain", text: "Чаще удаётся закончить" },
          { axis: "independent-experience", polarity: "cost", text: "Помощь снижает самостоятельность" },
        ],
      },
      {
        id: "reduce-scope",
        label: "Сократить объём",
        forecast: "Закончить сейчас, оставив часть задачи на потом",
        availability: "available",
        tradeOffs: [
          { axis: "release-timing", polarity: "gain", text: "Можно выпустить сейчас" },
          { axis: "scope", polarity: "cost", text: "Останется известное ограничение" },
        ],
      },
      {
        id: "defer-or-recover",
        label: "Отложить выпуск",
        forecast: "Перенести завершение ради качества",
        availability: "available",
        tradeOffs: [
          { axis: "quality", polarity: "gain", text: "Качество сохраняется" },
          { axis: "release-timing", polarity: "cost", text: "Выпуск будет позднее" },
        ],
      },
    ],
  };
}

function check(value: unknown): void {
  assertJanuaryV2PresentationDraft(
    value,
    JANUARY_V2_PROVISIONAL_APPROACH_TABLE,
    JANUARY_V2_DEFAULT_CONTEXT_BALANCE,
  );
}

function change(
  index: number,
  transform: (approach: Record<string, unknown>) => void,
): unknown {
  const value = structuredClone(draft()) as unknown as {
    approaches: Record<string, unknown>[];
  };
  transform(value.approaches[index]!);
  return value;
}

describe("REF-02B1a January v2 approach-card truthfulness preflight", () => {
  it("accepts only the four bounded, semantically witnessed cards", () => {
    const value = draft();
    expect(() => check(value)).not.toThrow();
    expect(() => check(structuredClone(value))).not.toThrow();
  });

  it("rejects incorrect advantages, not merely malformed marker IDs", () => {
    expect(() =>
      check(
        change(0, (item) => {
          item.tradeOffs = [
            { axis: "finish-chance", polarity: "gain", text: "Больше шансов" },
            { axis: "independent-experience", polarity: "gain", text: "Без подсказки" },
          ];
        }),
      ),
    ).toThrow(/Unproven/u);
    expect(() =>
      check(
        change(3, (item) => {
          item.tradeOffs = [
            { axis: "release-timing", polarity: "gain", text: "Выпуск сейчас" },
            { axis: "quality", polarity: "gain", text: "Качество сохраняется" },
          ];
        }),
      ),
    ).toThrow(/Unproven/u);
    expect(() =>
      check(
        change(2, (item) => {
          item.tradeOffs = [
            { axis: "scope", polarity: "gain", text: "Объём проще" },
            { axis: "scope", polarity: "cost", text: "Есть ограничение" },
          ];
        }),
      ),
    ).toThrow(/Unproven/u);
  });

  it("fails closed for no cost/unknown, repeated axes, three markers and unknown axes", () => {
    expect(() =>
      check(change(2, (item) => {
        item.tradeOffs = [{ axis: "release-timing", polarity: "gain", text: "Выпустить сейчас" }];
      })),
    ).toThrow(/no cost/u);
    expect(() =>
      check(change(2, (item) => {
        item.tradeOffs = [
          { axis: "scope", polarity: "cost", text: "Известное ограничение" },
          { axis: "scope", polarity: "cost", text: "Недостаток" },
        ];
      })),
    ).toThrow(/Duplicate/u);
    expect(() =>
      check(change(1, (item) => {
        item.tradeOffs = [
          { axis: "finish-chance", polarity: "gain", text: "Шанс выше" },
          { axis: "independent-experience", polarity: "cost", text: "Зависит от помощи" },
          { axis: "release-timing", polarity: "cost", text: "Медленнее" },
        ];
      })),
    ).toThrow(/one or two/u);
    expect(() =>
      check(change(1, (item) => {
        item.tradeOffs = [
          { axis: "reputation", polarity: "gain", text: "Вырастет известность" },
          { axis: "independent-experience", polarity: "cost", text: "С помощью" },
        ];
      })),
    ).toThrow(/Unknown/u);
  });

  it("rejects numbers, internal metrics, NPC roles, superlatives and overlong text", () => {
    for (const text of [
      "Шанс 90%",
      "Растёт Debugging",
      "Поможет наставник",
      "Поможет mentor",
      "Самый лучший подход",
      "Слишком " + "длинный".repeat(24),
    ]) {
      expect(() => check(change(1, (item) => { item.forecast = text; }))).toThrow();
    }
  });

  it("rejects prototype keys, extra fields, duplicate/unknown/omitted approaches", () => {
    const extra = structuredClone(draft()) as unknown as Record<string, unknown>;
    extra.extra = "ignored?";
    expect(() => check(extra)).toThrow(/closed/u);

    const duplicate = structuredClone(draft()) as unknown as {
      approaches: { id: string }[];
    };
    duplicate.approaches[1]!.id = "investigate-first";
    expect(() => check(duplicate)).toThrow(/canonical/u);

    const omitted = structuredClone(draft()) as unknown as { approaches: unknown[] };
    omitted.approaches.pop();
    expect(() => check(omitted)).toThrow(/exactly four/u);

    const fifth = structuredClone(draft()) as unknown as { approaches: unknown[] };
    fifth.approaches.push(fifth.approaches[0]);
    expect(() => check(fifth)).toThrow(/exactly four/u);

    const polluted = structuredClone(draft()) as unknown as {
      approaches: Record<string, unknown>[];
    };
    polluted.approaches[0]!.tradeOffs = [
      { axis: "finish-chance", polarity: "cost", text: "Может задержаться", extra: true },
    ];
    expect(() => check(polluted)).toThrow(/closed/u);
  });

  it("does not accept unmodeled unknown predictions or guarantee a future release", () => {
    expect(() =>
      check(change(3, (item) => {
        item.tradeOffs = [
          { axis: "quality", polarity: "gain", text: "Качество сохранится" },
          { axis: "quality", polarity: "unknown", text: "Результат неясен" },
        ];
      })),
    ).toThrow(/Duplicate/u);
    expect(() =>
      check(change(3, (item) => {
        item.tradeOffs = [
          { axis: "quality", polarity: "gain", text: "Качество сохранится" },
          { axis: "finish-chance", polarity: "unknown", text: "Выпуск неясен" },
        ];
      })),
    ).toThrow(/Unproven/u);
  });
});
