# Storybook workflow

## 1. Роль в проекте

Storybook — обязательная development surface Runtime Human, объединяющая:

- isolated UI development;
- design-system documentation;
- content preview;
- reproducible fixtures;
- interaction testing;
- accessibility testing;
- visual regression;
- безопасный контекст для UI-агентов.

Storybook не является отдельным продуктом и не содержит собственную бизнес-логику.

## 2. Размещение

Рекомендуемая структура:

```text
apps/desktop/
  .storybook/
packages/game-ui/
  src/components/**
  src/stories/**
packages/game-ui-fixtures/
  src/**
```

Допускается хранить story рядом с компонентом. Общие сложные fixtures выносятся в отдельный package, чтобы их могли использовать Storybook, Vitest, Playwright и Content Studio.

## 3. Version policy

- Storybook 10.x;
- exact pin в `package.json`/lockfile;
- обновление minor выполняется отдельным dependency PR;
- migration CLI не запускается без review diff;
- addons ограничиваются официальными или отдельно одобренными.

Базовые addons:

- essentials;
- a11y;
- Vitest;
- при необходимости themes/viewport.

Chromatic не является обязательным dependency или сервисом.

## 4. Граница безопасности

Storybook работает только с:

- pure components;
- read models;
- typed mocks;
- deterministic fixtures;
- in-memory adapters.

Запрещены:

- реальные SQL connections;
- production save directory;
- updater/signing commands;
- произвольный filesystem;
- shell execution;
- network calls без явного mock;
- production secrets.

Tauri API заменяется интерфейсами application facade и test adapters.

## 5. Taxonomy stories

### Primitives

- Button;
- IconButton;
- Input;
- Select;
- Tabs;
- Tooltip;
- Dialog;
- Progress;
- Badge;
- Toast.

### Game components

- ResourceBar;
- CharacterSummary;
- ActivityCard;
- TechnologyCard;
- JobOfferCard;
- ProjectCard;
- EventCard;
- DecisionDialog;
- MonthlyReport;
- TimelineEntry;
- SaveSlotCard;
- RecoveryPanel.

### Pages/compositions

- Life screen — January 1990;
- Career screen;
- Projects screen;
- Open Source screen;
- Company screen;
- Save/Recovery flow.

## 6. Обязательные состояния

Для каждого нетривиального компонента:

- default;
- loading;
- empty;
- disabled/locked;
- warning;
- error;
- overflow/long text;
- maximum values;
- minimum values;
- keyboard focus;
- reduced motion;
- high contrast;
- 200% text scale.

Для event/decision UI дополнительно:

- 1, 2, 3 и 4 choices;
- disabled choice с объяснением;
- delayed consequence marker;
- critical event;
- repeated NPC;
- long Russian localization;
- missing optional illustration;
- recovery after interrupted MonthRun.

## 7. Fixtures

Fixture должен:

- иметь stable ID;
- быть serializable;
- не использовать текущую дату;
- не использовать `Math.random`;
- ссылаться на versioned schema;
- быть пригодным для screenshot и interaction test;
- содержать комментарий о покрываемом edge case.

Пример именования:

```text
fixture.event.first-computer-offer.v1
fixture.decision.school-contest.long-ru.v1
fixture.month-report.january-1990.v1
```

## 8. Interaction tests

`play`-функции проверяют пользовательское поведение, а не внутреннее состояние React:

- keyboard navigation;
- focus trap/restore;
- выбор решения;
- disabled reason;
- open/close dialog;
- error acknowledgement;
- transition to next read model.

Interaction tests запускаются локально и в CI через Storybook Vitest integration.

## 9. Accessibility

`parameters.a11y.test = 'error'` применяется к canonical stories после стабилизации компонента.

Обязательно проверяются:

- accessible name;
- roles;
- focus order;
- keyboard operation;
- contrast;
- status announcements;
- отсутствие color-only meaning;
- отсутствие drag-only interaction.

Автоматическая проверка не заменяет ручной Narrator review критических flows.

## 10. Visual regression

Baselines создаются в фиксированной среде:

- pinned OS/container image;
- pinned browser;
- bundled fonts;
- fixed locale;
- fixed viewport;
- animations disabled/reduced;
- deterministic data;
- separate baselines per supported OS where necessary.

Storybook stories являются источником состояний, а screenshot orchestration выполняется Playwright либо Vitest Browser в контролируемой CI.

## 11. Storybook и Content Studio

Storybook не заменяет будущий Content Studio.

- Storybook показывает, как контент выглядит и ведёт себя.
- Content Studio создаёт/редактирует/валидирует контент и графы цепочек.

Оба используют одинаковые schemas и fixtures.

## 12. Storybook MCP

Storybook MCP может быть включён в development environment для AI-агентов после выполнения условий:

- component registry стабилен;
- stories не содержат secrets;
- privileged Tauri commands недоступны;
- MCP запускается только локально;
- write actions ограничены рабочей веткой;
- агент обязан запускать focused interaction/a11y tests после изменений.

MCP не входит в release build.

## 13. CI jobs

```text
storybook-build
storybook-test
storybook-a11y
storybook-visual
```

`storybook-build` и `storybook-test` — blocking для UI PR.

Visual diff может требовать human approval при сознательном изменении дизайна, но baseline нельзя обновлять автоматически без review.

## 14. Definition of Done

Reusable UI-компонент готов, если:

- есть canonical и edge stories;
- нет прямой зависимости от Tauri/SQL;
- interaction tests покрывают нетривиальное поведение;
- accessibility checks проходят;
- visual baseline создан для layout-critical state;
- long RU text и 200% scale проверены;
- fixtures могут быть переиспользованы Playwright/Content Studio.