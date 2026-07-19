import type { FoundationStatusProps } from "@runtime-human/game-ui";

export const foundationReadyFixture = {
  title: "Основание готово",
  summary:
    "Репозиторий получил воспроизводимую точку входа. Игровые системы ещё не реализованы — сейчас проверяются только стек, границы и поверхности разработки.",
  checks: [
    { id: "fixture.foundation.workspace.v1", label: "pnpm workspace", state: "ready" },
    {
      id: "fixture.foundation.typescript.v1",
      label: "TypeScript project references",
      state: "ready",
    },
    { id: "fixture.foundation.storybook.v1", label: "Storybook workshop", state: "ready" },
    { id: "fixture.foundation.persistence.v1", label: "SQLite и MonthRun", state: "planned" },
  ],
} as const satisfies FoundationStatusProps;

export const foundationLongRussianFixture = {
  title: "Техническое основание для длинного пути программиста",
  summary:
    "Этот специально длинный русскоязычный текст проверяет переносы, масштабирование и читаемость без сокращений, скрывающих смысл. Интерфейс должен оставаться понятным даже тогда, когда пояснение честно описывает ограничения текущего этапа и не обещает уже реализованную игру.",
  checks: [
    {
      id: "fixture.foundation.long-boundaries.v1",
      label: "Публичные границы пакетов без прямого доступа UI к формулам игрового ядра",
      state: "ready",
    },
    {
      id: "fixture.foundation.long-recovery.v1",
      label: "Сохранение, восстановление и приостановленный MonthRun будут добавлены отдельным PR",
      state: "planned",
    },
  ],
} as const satisfies FoundationStatusProps;
