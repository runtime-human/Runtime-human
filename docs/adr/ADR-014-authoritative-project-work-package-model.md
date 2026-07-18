---
title: "ADR-014 — Авторитетная модель Project & Work Package"
type: adr
status: accepted
canon: true
depends_on: [ADR-005, ADR-006, ADR-007, ADR-010, ADR-013, ADR-015]
updated: 2026-07-18
---

# ADR-014 — Авторитетная модель Project & Work Package

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** использовать shared technical Project Engine и aggregated Work Packages с casual-first реализационным профилем ADR-015
- **Связанные ADR:** ADR-005, ADR-006, ADR-007, ADR-010, ADR-013, ADR-015
- **Связанные спецификации:** `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`, `docs/game-design/CASUAL-SIMULATION-DESIGN.md`

## Контекст

Project Engine должен поддерживать реальные технические trade-offs без двух крайностей:

- один progress bar, не различающий scope, uncertainty, quality и consequences;
- backlog/Jira simulator с сотнями задач, dimensions и records.

SD-002 определил правильные ownership boundaries, но максимальная модель оказалась слишком широкой для казуального Vertical Slice. ADR-015 уточняет: Project Engine сохраняет extension seams, но реализует только поля, необходимые текущему gameplay.

## Решение

### 1. Project Engine владеет технической правдой проекта

Project Engine authoritative для уже реализованных аспектов:

- project lifecycle/stage;
- goal and bounded scope;
- aggregated Work Packages;
- project uncertainty/forecast band;
- active quality state;
- technical debt band/значимые исключения;
- player-relevant defects/incidents;
- compact release records;
- character/team contribution summary;
- technical outcomes.

Он не владеет:

- users/revenue/churn/competition — Product/Market;
- contributors/governance/community health — Open Source;
- hiring/payroll/employment — Company/Career;
- skills/mastery/grade — Professional Progression;
- event pacing — Event Engine/Narrative Director.

Неиспользуемый future state не добавляется только ради полноты.

### 2. Work Package является агрегированным этапом

`WorkPackage`:

- представляет понятный outcome, а не ticket/file/method;
- имеет одну цель;
- обычно занимает часть месяца или несколько месяцев;
- создаёт не более одного обычного player-facing trade-off;
- изменяет project state;
- может сформировать `ExperienceEpisode`.

В MVP один project имеет два Work Packages; обычный casual project — 2–5.

### 3. Реализационные профили

#### MVP Casual

Player-facing project state:

- короткая goal;
- stage;
- 2 Work Packages;
- progress band;
- uncertainty band;
- три quality bands;
- debt band;
- risk/known issue;
- compact release state;
- contribution summary.

#### Recommended

После playtest:

- 2–5 packages;
- optional/deferred scope;
- situational quality dimensions;
- meaningful debt/defect records;
- release history;
- team contribution categories;
- maintenance arcs.

#### Extended

Для late-game при подтверждённой потребности:

- component/requirement graph;
- detailed latent work and forecast confidence;
- debt ledger;
- defect inventory/incidents/rollback;
- granular contribution;
- delegation policies;
- portfolio abstractions.

Extended profile не является baseline/roadmap requirement до отдельного playtest gate.

### 4. Project lifecycle раскрывается по мере необходимости

MVP player-facing lifecycle:

```text
idea → development → release-preparation → released → maintenance / finished
```

`archived`, `transferred`, `sold`, `abandoned` и сложные transition states добавляются вместе с соответствующим gameplay.

Internal state machine может иметь дополнительные technical states для consistency, но они не обязаны становиться отдельными пользовательскими стадиями.

### 5. Scope остаётся компактным

MVP хранит/показывает:

- main goal;
- committed result;
- optional result;
- deferred/removed result только при player decision.

Полный requirement graph и acceptance criteria collection не обязательны.

Player меняет scope через смысловой выбор, а не checklist editor.

### 6. Uncertainty является authoritative, но простым для игрока

MVP использует bands:

- low;
- medium;
- high.

Forecast:

- likely this month;
- likely next month;
- timing unclear.

Deterministic hidden work/roll фиксируется в MonthRun draft и не reroll после reload.

Optimistic/likely/cautious points, detailed confidence и reason arrays являются Recommended/Extended options, а не обязательным baseline.

### 7. Quality многомерно семантически, но ситуационно в реализации

Одна универсальная authoritative quality number запрещена.

MVP active dimensions:

- functional correctness / работоспособность;
- usability / удобство;
- maintainability / поддерживаемость.

Situational dimensions:

- reliability;
- performance;
- security/safety;
- supportability/operations.

Они добавляются только для relevant project archetype.

MVP state хранит band и минимальный reason/source. Confidence/trend/detail добавляются, только когда меняют decision или объяснение.

### 8. Technical debt — band + значимые исключения

MVP normal state:

```text
none → minor → noticeable → heavy
```

Debt влияет на future work, risk и maintenance.

Отдельный `TechnicalDebtRecord` создаётся только для player-relevant theme:

- temporary architecture;
- missing tests;
- obsolete dependency;
- poorly understood critical area.

Полный ledger, principal/drag breakdown и множество categories откладываются.

Debt не растёт произвольным monthly percentage и не создаёт positive evidence сам по себе.

### 9. Defects and incidents агрегируются

MVP различает:

- latent risk;
- known issue;
- serious incident.

Minor bugs агрегируются. Player-facing record создаётся только для проблемы, меняющей решение, release или future work.

Defect materialization deterministic и не reroll после reload.

### 10. Team outcome и character contribution различаются

MVP contribution summary:

- independent;
- assisted;
- team contribution;
- review/leadership contribution.

Granular work units и multiple impact dimensions не обязательны.

Team success не создаёт full direct-craft evidence автоматически.

### 11. Release является compact immutable milestone

MVP release state:

- not ready;
- ready;
- ready with known limitation;
- delayed;
- released;
- failed with recovery.

Committed `ReleaseRecord` сохраняет минимум:

- included outcome/scope summary;
- quality/risk summary;
- known issue;
- contribution summary;
- technical outcome;
- rules/trace identifiers.

Rollout/support/rollback policies добавляются только для поздних production projects.

### 12. Project outcome и progression commit атомарны

```text
capacity
→ Work Package progress
→ uncertainty/decision checkpoint
→ project outcome
→ compact quality/debt/risk/release update
→ ExperienceEpisode
→ progression assessment
→ invariants
→ atomic commit
```

Draft фиксирует hidden outcome, pending decision и provisional results. Retry/resume не создаёт duplicate package outcome, release или evidence.

### 13. Determinism и compatibility

- stable/deterministic IDs;
- stable input ordering;
- scoped PRNG;
- hidden outcome не меняется после reload;
- active package требует compatible rules/content;
- all authoritative arithmetic integer/fixed-point;
- released/history summaries сохраняют semantic snapshot.

## Последствия

### Положительные

- проекты создают trade-offs без Jira UX;
- первый playable дешевле;
- Project Engine сохраняет корректные boundaries;
- late-game expansion остаётся возможным;
- quality/debt/risk не сводятся к одному прогрессу;
- project outcome корректно связан с progression.

### Стоимость

- некоторые late-game поля потребуют migrations;
- ранний project model менее подробен;
- content должен создавать сильные агрегированные packages;
- playtest определяет, какие extensions действительно нужны.

### Риски

- чрезмерное упрощение может снова создать progress bar;
- hidden risk может казаться случайным;
- один debt band может скрывать интересные темы;
- expert player может хотеть больше details.

Риски ограничиваются meaningful decisions, causal report, Details-on-demand и ADR-015 playtest gate.

## Отклонённые варианты

### Один progress bar проекта

Отклонено: не создаёт scope/quality/risk trade-offs.

### Полный backlog/ticket simulator

Отклонено: микроменеджмент и content explosion.

### Полная SD-002 модель как Vertical Slice baseline

Отклонено ADR-015: слишком высокая реализационная и UX-стоимость до проверки gameplay.

### Quality как одно authoritative число

Отклонено: скрывает trade-offs. Compact summary label допустим только как UI projection.

### Каждый bug/debt item как отдельная карточка

Отклонено: создаёт maintenance clicking.

### Progression Core владеет project outcome

Отклонено ADR-013.

## Инварианты

- Work Package не является daily ticket;
- normal project имеет bounded packages/visible concepts;
- Project Engine владеет technical truth;
- one quality score не authoritative;
- situational dimensions не существуют без relevant gameplay;
- latent outcome не reroll;
- debt создаёт future consequence, а не monthly chore;
- minor bugs/debt aggregate;
- team result и player contribution различаются;
- committed release immutable;
- project outcome, episode и progression commit atomically;
- extended fields не добавляются без current feature/playtest evidence.

## Verification requirements

MVP Project Engine проверяет:

- понятность goal/current package;
- 0–1 ordinary blocking choice;
- deterministic uncertainty/restart;
- three quality bands and one debt/risk consequence;
- release/delay/recovery outcomes;
- no duplicate records;
- no progress-bar-only or ticket-level UX;
- monthly report causality;
- player desire to continue.

Recommended/Extended verification добавляется только вместе с соответствующим implemented scope.
