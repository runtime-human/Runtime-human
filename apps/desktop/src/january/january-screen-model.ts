import {
  parseJanuary1990ResultSummary,
  type January1990RuntimeView,
} from "@runtime-human/game-application";

import type { JanuarySessionChoice, JanuarySessionView } from "./january-session-controller";

export type JanuaryScreenChoice = Readonly<{
  value: JanuarySessionChoice;
  label: string;
  description: string;
}>;

export type JanuaryScreenAction = Readonly<{
  kind: "start" | "retry";
  label: string;
}>;

export type JanuaryQualityScores = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

export type JanuaryScreenModel = Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
  detail: string | null;
  progress: number;
  choices: readonly JanuaryScreenChoice[];
  primaryAction: JanuaryScreenAction | null;
  qualityScores: JanuaryQualityScores | null;
  tone: "neutral" | "decision" | "success" | "warning" | "error";
}>;

const ACCESS_CHOICES = Object.freeze([
  Object.freeze({
    value: "home-pc" as const,
    label: "Домашний компьютер",
    description: "Больше времени за клавиатурой, но доступ зависит от семьи.",
  }),
  Object.freeze({
    value: "shared-school-pc" as const,
    label: "Школьный компьютер по расписанию",
    description: "Меньше времени, зато рядом учитель и другие ученики.",
  }),
]);

const LEARNING_CHOICES = Object.freeze([
  Object.freeze({
    value: "read-and-run" as const,
    label: "Перепечатать и запустить",
    description: "Сначала увидеть рабочую программу и понять её по частям.",
  }),
  Object.freeze({
    value: "edit-and-debug" as const,
    label: "Изменять и отлаживать",
    description: "Рискнуть, менять строки и учиться на собственных ошибках.",
  }),
]);

const DEFECT_CHOICES = Object.freeze([
  Object.freeze({
    value: "inspect-listing" as const,
    label: "Проверить листинг",
    description: "Сверить строки и найти место, где программа отклоняется от замысла.",
  }),
  Object.freeze({
    value: "change-input" as const,
    label: "Изменить входные данные",
    description: "Проверить гипотезу на другом примере и увидеть закономерность.",
  }),
  Object.freeze({
    value: "ask-for-guidance" as const,
    label: "Попросить объяснение",
    description: "Получить подсказку быстрее, но часть решения будет не самостоятельной.",
  }),
]);

export function buildJanuaryScreenModel(view: JanuarySessionView): JanuaryScreenModel {
  switch (view.kind) {
    case "loading":
      return model({
        eyebrow: "Локальное сохранение",
        title: "Загрузка января",
        summary: "Проверяем сохранение и скомпилированный исторический контент.",
        progress: 0,
        tone: "neutral",
      });
    case "idle":
      return model({
        eyebrow: "Первый месяц карьеры",
        title: "Январь 1990",
        summary:
          "Получите доступ к компьютеру, освоите GW-BASIC и напишете первую полезную программу.",
        detail:
          "Все решения сохраняются локально. Месяц можно закрыть и продолжить с последней границы.",
        progress: 0,
        primaryAction: { kind: "start", label: "Начать январь" },
        tone: "neutral",
      });
    case "access-decision":
      return model({
        eyebrow: "Шаг 1 из 3 · Доступ",
        title: "Где работать с компьютером?",
        summary: "Первый ресурс программиста — не деньги, а время за доступной машиной.",
        detail: "Выбор изменит условия обучения, но не заблокирует прохождение месяца.",
        progress: 28,
        choices: ACCESS_CHOICES,
        tone: "decision",
      });
    case "learning-decision":
      return model({
        eyebrow: "Шаг 2 из 3 · Практика",
        title: "Как изучать первую программу?",
        summary: "Перед вами листинг небольшой утилиты ввода и вывода.",
        detail: "Можно сначала повторить рабочий пример или сразу начать экспериментировать.",
        progress: 52,
        choices: LEARNING_CHOICES,
        tone: "decision",
      });
    case "defect-decision":
      return model({
        eyebrow: "Шаг 3 из 3 · Отладка",
        title: "Программа работает неверно",
        summary: "Первый дефект — это проверка не памяти, а способа рассуждать.",
        detail: "Ответ повлияет на ясность, корректность и надёжность результата.",
        progress: 76,
        choices: DEFECT_CHOICES,
        tone: "decision",
      });
    case "committed":
      return model({
        eyebrow: "Месяц завершён",
        title: "Первая программа готова",
        summary:
          "Результат сохранён атомарно. Январский прогресс больше не зависит от повторной отправки команды.",
        detail: `Ревизия сохранения: ${view.saveRevision}.`,
        progress: 100,
        qualityScores: readQualityScores(view),
        tone: "success",
      });
    case "terminal":
      return model({
        eyebrow: "Выполнение остановлено",
        title: "Январь завершён без коммита",
        summary: "Сохранённое состояние требует проверки перед продолжением.",
        detail: `Статус: ${view.status}.`,
        progress: 100,
        tone: "warning",
      });
    case "blocked":
      return model({
        eyebrow: "Защитная остановка",
        title: blockedTitle(view.reason),
        summary: view.message,
        detail: "Сохранение не изменено. Исправьте причину и загрузите его повторно.",
        progress: 0,
        tone: "warning",
      });
    case "rejected":
      return model({
        eyebrow: view.retryable ? "Безопасный повтор" : "Команда отклонена",
        title: view.retryable ? "Связь прервалась" : "Действие не выполнено",
        summary: view.message,
        detail: `Код: ${view.code}.`,
        progress: 0,
        primaryAction: view.retryable ? { kind: "retry", label: "Повторить безопасно" } : null,
        tone: "error",
      });
  }
}

function model(
  input: Partial<JanuaryScreenModel> &
    Pick<JanuaryScreenModel, "eyebrow" | "title" | "summary" | "progress" | "tone">,
): JanuaryScreenModel {
  return Object.freeze({
    eyebrow: input.eyebrow,
    title: input.title,
    summary: input.summary,
    detail: input.detail ?? null,
    progress: input.progress,
    choices: input.choices ?? Object.freeze([]),
    primaryAction: input.primaryAction ?? null,
    qualityScores: input.qualityScores ?? null,
    tone: input.tone,
  });
}

function readQualityScores(
  view: Extract<January1990RuntimeView, { kind: "committed" }>,
): JanuaryQualityScores | null {
  try {
    return parseJanuary1990ResultSummary(view.result).qualityScores;
  } catch {
    return null;
  }
}

function blockedTitle(reason: Extract<January1990RuntimeView, { kind: "blocked" }>["reason"]) {
  switch (reason) {
    case "recovery":
      return "Хранилище требует восстановления";
    case "incompatible-persistence":
      return "Формат сохранения несовместим";
    case "incompatible-checkpoint":
      return "Контент или правила изменились";
    case "corrupted-checkpoint":
      return "Контрольная точка повреждена";
  }
}
