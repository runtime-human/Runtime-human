---
title: "UI-ARCHITECTURE"
type: ui
status: draft
canon: true
updated: 2026-07-18
---

# UI Architecture

Нормативные источники:

- [ADR-012](../adr/ADR-012-storybook-ui-content-workshop.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md).

## 1. Принцип

React UI отображает typed read models и отправляет commands. Он не содержит authoritative formulas и не обращается к raw persistence/platform implementation.

Normal UI должен ощущаться как казуальная игра, а не CRM, engineering dashboard или performance-review tool.

Главный UX-критерий:

> Игрок понимает обычное решение за несколько секунд и может объяснить последствие после месяца.

## 2. Уровни раскрытия

### Normal

Основной продукт.

Показывает:

- текущую ситуацию;
- 3–5 primary objects;
- один следующий meaningful choice;
- human-readable statuses;
- причину важного изменения;
- next step.

### Details

Открывается по запросу.

Показывает:

- несколько contributing factors;
- историю важных decisions;
- quality/debt/risk explanation;
- evidence source summary;
- forecast reasons.

### Advanced/Diagnostics

Не обязателен для MVP.

Может показывать:

- internal dimensions;
- claims;
- numeric projections;
- trace/reason codes;
- compatibility/debug data.

Advanced view не меняет gameplay outcome.

## 3. State

- Authoritative state: Game Core + persistence.
- Read models: application layer.
- Transient UI state: Zustand/local component state.
- Storybook: deterministic fixtures.
- UI не дублирует full GameState.

## 4. Главная информационная иерархия

1. current professional focus;
2. main activity/project;
3. next milestone;
4. one critical constraint/warning;
5. next month/action.

Secondary:

- skills/technology;
- finance;
- health/relationships;
- history.

Игрок не должен одновременно видеть полный skill graph, evidence matrix, project backlog, debt ledger и finance dashboard.

## 5. Навигация

Baseline:

1. **Сегодня** — текущий месяц, focus, main activity, warning, `Следующий месяц`.
2. **Развитие** — skills, technology, learning и readiness summary.
3. **Проекты** — current projects и meaningful choices.
4. **Карьера** — job, vacancies и progression, когда система открыта.
5. **Жизнь** — health, relationships, housing и finance.
6. **История** — important events, milestones и releases.
7. **Настройки/Сейвы**.

Open Source, Company и Public Work становятся отдельными разделами только после открытия систем и подтверждённой необходимости. Ранний UI не резервирует пустые сложные dashboards.

## 6. Экран «Сегодня»

Всегда видны:

- дата/возраст;
- professional focus;
- одна главная activity/project;
- ближайший milestone;
- одно critical warning;
- unresolved decision;
- `Следующий месяц`.

Optional compact items:

- активное обучение;
- readiness status;
- money/health only if materially changed.

Подробные work units, context switching и history раскрываются по запросу.

## 7. Professional progression UI

Normal mode:

- awarded grade;
- one capability phrase;
- максимум 3–5 relevant skills;
- active technology familiarity;
- readiness status;
- next useful step.

Пример:

```text
Отладка — уверенный начинающий

Вы самостоятельно находите простые ошибки.
Следующий шаг: проблема, затрагивающая несколько частей программы.
```

Internal terms `mastery`, `fluency`, `evidence claim`, `gate` не обязательны в normal mode.

## 8. Project UI

Normal project card:

- goal;
- stage;
- current package;
- simple forecast;
- uncertainty band;
- three quality bands;
- debt band;
- one important issue/risk;
- next decision.

Не показываются по умолчанию:

- backlog;
- requirement graph;
- component graph;
- full debt/defect list;
- participant percentages;
- release gate matrix.

## 9. Forecast

Normal labels:

- вероятно в этом месяце;
- вероятно в следующем;
- срок пока неясен.

Uncertainty:

- низкая;
- средняя;
- высокая.

UI объясняет причину изменения прогноза. Exact probability/hidden work не показываются.

## 10. Month transition

Обычный MonthRun не требует отдельного progress screen, если завершается быстро.

Blocking decision:

- одна concrete problem;
- 2–4 options;
- clear trade-off direction;
- known/unknown consequences;
- disabled reason;
- safe suspend state.

Обычный месяц: 0–1 blocking decision. Несколько решений допустимы только как связанный milestone/crisis flow.

## 11. Monthly Report

Primary report содержит максимум 5–7 строк/карточек:

1. чему научился персонаж;
2. главный project/work outcome;
3. важное professional capability/readiness change;
4. важное life consequence;
5. заметное money change;
6. important event;
7. next step.

Routine changes grouped under `Подробнее`.

Каждая primary row отвечает:

- что изменилось;
- почему;
- что это значит;
- что можно сделать дальше.

## 12. Warnings

Statuses:

- info;
- attention;
- warning;
- critical.

На основном экране одновременно показывается не более одного primary warning и нескольких compact indicators.

Warning всегда содержит cause и possible action. Цвет не является единственным носителем смысла.

## 13. Storybook baseline

### Foundation

- typography/long RU;
- keyboard/focus;
- 200% scale;
- high contrast;
- reduced motion;
- status semantics.

### Casual core

- Today screen;
- Professional summary;
- Skill capability card;
- Project card;
- Work Package card;
- Simple forecast;
- Quality/debt bands;
- Blocking decision;
- Monthly report;
- Save/recovery.

### Edge states

- loading/empty/error;
- quiet month;
- assisted/partial/failure;
- high uncertainty;
- known issue;
- long text;
- conflicting constraints.

Evidence timeline, complex grade matrix, portfolio and incident dashboards are deferred stories until corresponding gameplay exists.

## 14. Usability gates

Новичок должен:

- понять цель first month без guide;
- понять ordinary decision за 10–20 seconds;
- правильно назвать direction trade-off;
- после MonthRun объяснить минимум две причины результата;
- найти next step;
- не воспринимать screen как CRM/dashboard.

Технический игрок должен:

- признать trade-off правдоподобным;
- видеть causality;
- не воспринимать progression как один XP;
- находить Details без необходимости использовать их всегда.

## 15. Accessibility

- keyboard-only;
- visible focus;
- focus restore;
- Narrator labels/status;
- 200% scale/reflow;
- high contrast;
- reduced motion;
- no drag-only actions;
- long Russian text fixtures.

## 16. Performance

- route-level loading;
- no full-state rerenders;
- long history virtualized only when it exists;
- read models prepared outside components;
- Storybook fixtures bounded;
- normal screen does not render hidden extended systems.

## 17. Definition of Done

UI change готово, когда:

- normal mode solves the task without advanced view;
- primary concepts fit complexity budget;
- causal explanation exists;
- routine is grouped;
- keyboard/a11y/long-RU pass;
- no raw platform/persistence access;
- relevant Storybook stories exist;
- usability question and result documented.
