---
title: "PROJECT-WORK-PACKAGE-UI"
type: ui
status: draft
canon: true
updated: 2026-07-18
---

# Project & Work Package UI

## Статус

Нормативная UI-спецификация.

Источники:

- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md).

## 1. UX goal

Игрок должен быстро понять:

- что проект создаёт;
- какой этап выполняется сейчас;
- когда примерно будет результат;
- что неизвестно;
- какие три качества важны;
- какой риск/долг действительно влияет;
- какой выбор требуется.

UI не имитирует Jira, IDE, backlog, engineering dashboard или debt ledger.

## 2. Уровни раскрытия

### Normal — baseline

Показывает:

- goal;
- stage;
- current Work Package;
- simple forecast;
- uncertainty band;
- three quality bands;
- debt band;
- one known issue/risk;
- next decision;
- latest release/result.

### Details — Recommended

Добавляет:

- optional/deferred scope;
- reasons forecast changed;
- important decision history;
- significant debt/issue theme;
- compact contribution history;
- release details.

### Advanced/Diagnostics — Extended

Может показывать:

- hidden/internal work profile;
- detailed quality confidence/trend;
- debt/defect records;
- contribution dimensions;
- release trace;
- compatibility/debug data.

Not required for MVP.

## 3. Main project card

```ts
type CasualProjectCardReadModel = Readonly<{
  projectId: ProjectId;
  title: string;
  goal: string;
  stage: string;
  currentPackage?: CasualWorkPackageCard;
  forecast: string;
  uncertainty: CasualUncertaintyLabel;
  quality: CasualQualityReadModel;
  debt: CasualDebtLabel;
  knownIssue?: string;
  nextDecision?: CasualProjectDecision;
  latestResult?: string;
}>;
```

No raw ProjectState.

## 4. Visual hierarchy

1. Project title and goal.
2. Current stage/package.
3. Forecast and uncertainty.
4. Three qualities.
5. Important debt/issue.
6. Next decision.
7. Details/history link.

At most 3 project cards on primary screen. Only one expanded by default.

## 5. Work Package card

Shows:

- human objective;
- state;
- progress band;
- challenge label;
- uncertainty;
- forecast;
- blocker/decision;
- last meaningful change.

Progress labels:

- не начато;
- начато;
- продвигается;
- почти готово;
- готово;
- требует пересмотра.

No exact percentage when uncertainty makes it misleading.

## 6. Forecast

MVP labels:

- вероятно в этом месяце;
- вероятно в следующем;
- срок пока неясен.

Example:

> Вероятно в феврале. Срок изменился: появилась дополнительная обработка ошибок.

Optimistic/likely/cautious columns are not required in MVP.

## 7. Scope

Normal mode:

- основной результат;
- optional result;
- what is excluded only when relevant.

Player chooses scope through cards/dialogs, not checkbox editing.

Example:

```text
Основное: программа принимает данные и показывает результат.
Дополнительно: объясняет неправильный ввод.
```

## 8. Quality

Always visible for ordinary project:

- Работоспособность;
- Удобство;
- Поддерживаемость.

Bands:

- не проверено;
- слабое;
- приемлемое;
- хорошее;
- отличное.

Situational reliability/performance/security/operations appear only if current project/decision needs them.

No authoritative `Quality 74`. A compact label may summarize only as UI wording and must not hide three underlying bands.

## 9. Debt and issues

Debt:

- нет;
- незначительный;
- заметный;
- тяжёлый.

Normal explanation:

> Быстрое решение усложнит следующие изменения.

Known issue:

> Неправильный ввод пока приводит к непонятному результату.

No list of minor debt/bugs by default.

## 10. Release decision

MVP dialog:

- what will be released;
- one known limitation;
- overall quality/risk summary;
- options:
  - release;
  - delay and fix;
  - simplify scope;
  - continue next month.

Example:

```text
Первая версия работает, но плохо объясняет неправильный ввод.

Выпустить сейчас:
+ закончить проект в январе
- пользователю будет сложнее понять ошибку
- небольшой долг усложнит следующее изменение

Исправить:
+ лучшее качество
- выпуск переносится на февраль
```

Rollout/support/rollback matrix deferred.

## 11. Contribution

MVP labels:

- самостоятельно;
- с помощью;
- совместно с командой;
- через review/руководство.

For first solo project only first two are required.

No percentages or impact matrix.

## 12. Monthly report

Project section normally has 1–3 primary rows:

1. package/project outcome;
2. important quality/debt/issue consequence;
3. next project decision.

Professional learning is shown in progression section, not duplicated as full evidence ledger.

Example:

```text
Проект продвинулся

Основная программа готова. Обработка неправильного ввода перенесена на февраль.
Поддерживаемость снизилась до «приемлемой»: вы выбрали быстрое временное решение.
```

## 13. Multiple projects

Before company/portfolio gameplay:

- show up to three project cards;
- one project has primary focus;
- only projects needing attention rise to top;
- routine progress collapsed.

Full filters/portfolio dashboard deferred.

## 14. Storybook baseline

- Project Card: idea/development/release/finished;
- Work Package: planned/active/blocked/completed;
- Forecast: this month/next month/unclear/changed;
- Quality: basic/good/trade-off;
- Debt: none/minor/noticeable;
- Known issue;
- Release: ready/known limitation/delay/failure;
- Contribution: independent/assisted;
- Decision card;
- long RU/keyboard/200%/high contrast/Narrator.

Deferred stories:

- debt ledger;
- defect inventory;
- rollback;
- granular team contribution;
- portfolio dashboard.

## 15. Usability tests

Player should:

- explain project goal in one sentence;
- identify current package;
- understand forecast direction;
- name the quality/risk trade-off;
- choose within 10–20 seconds;
- explain consequence after MonthRun;
- not describe screen as task manager/CRM.

## 16. Definition of Done

Project UI ready when:

- goal/current work/choice visible without scrolling through tables;
- three qualities sufficient for current decision;
- debt/issue grouped;
- no false exact progress;
- normal mode does not need advanced data;
- routine grouped;
- accessibility stories pass;
- playtest confirms comprehension and desire to continue.
