# ADR-014 — Авторитетная модель Project & Work Package

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** продолжать системные анализы, самостоятельно принимать и объединять согласованные документационные PR
- **Связанные ADR:** ADR-005, ADR-006, ADR-007, ADR-010, ADR-013
- **Связанные спецификации:** `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`, `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`

## Контекст

После ADR-013 Project Engine закреплён как Experience Provider, однако оставались неопределёнными:

- authoritative project lifecycle;
- минимальная единица технической работы;
- scope/requirements ownership;
- uncertainty and forecasting;
- multidimensional quality;
- technical debt carrying cost;
- latent/materialized defects;
- releases and maintenance;
- team contribution and delegation;
- границы Project/Product/Open Source/Company/Career;
- crash-safe связь project outcome и `ExperienceEpisode`.

Если Project Engine моделировать как backlog из ежедневных tasks, игра превратится в Jira/CRM. Если оставить один progress bar, проект не сможет выражать инженерные trade-offs и давать достоверный professional evidence.

## Решение

### 1. Project Engine владеет технической правдой проекта

Project Engine authoritative для:

- project lifecycle;
- goals, constraints and scoped requirements;
- work packages;
- project-specific uncertainty and forecast state;
- quality state;
- technical debt;
- latent and known defects;
- release technical records;
- maintenance state;
- participant ownership and contribution;
- technical project outcomes.

Он не владеет:

- users/revenue/churn/competition — Product/Market;
- contributors/governance/community health — Open Source extension;
- hiring/payroll/team employment — Company;
- job/promotion/salary — Career;
- skills/mastery/grade — Professional Progression;
- event eligibility/pacing — Event Engine/Narrative Director.

### 2. Work Package является минимальной authoritative единицей значимой технической работы

`WorkPackage`:

- представляет агрегированный outcome, а не daily task/ticket;
- имеет одну понятную цель;
- содержит challenge, uncertainty, quality targets, participants and outcome space;
- обычно занимает часть месяца или несколько месяцев;
- создаёт не более нескольких значимых решений;
- изменяет authoritative ProjectState;
- может сформировать `ExperienceEpisode`.

Микротикеты, методы, файлы и routine chores не сохраняются как отдельные authoritative work packages.

### 3. Project lifecycle и Work Package lifecycle разделяются

Project lifecycle:

```text
idea → discovery → active-development → released → maintenance
→ completed / archived / transferred / sold / abandoned
```

Work Package lifecycle:

```text
draft → ready → active → blocked / suspended-for-decision
→ resolved / cancelled / deferred
```

`resolved` содержит outcome kind: completed, partial, failed, recovered.

### 4. Scope хранится как небольшое число смысловых slices

ProjectState хранит:

- goals;
- mandatory constraints;
- committed scope;
- optional scope;
- deferred scope;
- acceptance criteria;
- requirement uncertainty/volatility.

Player не управляет сотнями requirements. Blocking scope decision создаётся только при существенном изменении ценности, срока, качества, architecture или release.

### 5. Неопределённость является authoritative, но точная скрытая работа не показывается игроку

Work Package содержит:

- known remaining work;
- latent work envelope/realization;
- uncertainty dimensions;
- discovered constraints;
- forecast confidence.

Actual latent work определяется детерминированно и раскрывается по мере исследования/реализации.

UI показывает optimistic/likely/cautious forecast и причины диапазона. Exact hidden value не является player-facing contract.

### 6. Качество многомерно

Core quality dimensions:

- functional correctness;
- usability/experience;
- reliability;
- performance efficiency;
- security/safety;
- maintainability;
- supportability/operability.

Project archetype активирует обычно 3–5 dimensions.

Каждая active dimension хранит target, assessed band, confidence, trend and source. Одна универсальная шкала quality запрещена как authoritative representation.

### 7. Technical debt моделируется как pressure и significant records

Мелкий debt агрегируется в `DebtPressureAggregate`.

Значимый debt хранится как immutable/managed `TechnicalDebtRecord` с:

- origin;
- category;
- affected scope;
- principal work estimate;
- change drag;
- defect/risk amplification;
- visibility/confidence;
- intentional/unintentional marker;
- mitigation/repayment state.

Debt влияет через future work drag, risk, maintenance и constraints. Он не является моральным штрафом и не создаёт positive evidence сам по себе.

### 8. Defect model разделяет latent risk, known defects и incidents

Не каждый bug является отдельной сущностью.

Authoritative state использует:

- latent defect risk aggregates;
- significant known defects;
- escaped defects;
- incidents/regressions.

Defect injection/materialization используют versioned deterministic rules и отдельные RNG forks.

### 9. Team outcome и character contribution различаются

Project outcome не приписывается персонажу автоматически.

Contribution snapshot разделяет:

- direct implementation;
- review;
- architecture/decision;
- mentoring;
- delegated/leadership contribution;
- external/team-only result.

Delegation задаётся owner, outcome, guardrails, autonomy, review cadence and escalation threshold. Игрок не распределяет часы каждого сотрудника.

### 10. Release является immutable technical milestone

`ReleaseRecord` содержит:

- included scope/packages;
- quality/confidence snapshot;
- known issues;
- accepted debt/risk;
- rollout/support policy;
- technical outcome;
- rollback/incident state;
- contribution snapshot.

Product/Market/Open Source получают release outcome через typed contract и не переписывают technical history.

### 11. Project outcome и progression commit атомарны

Versioned MonthRun flow:

```text
capacity/constraints
→ Work Package advancement
→ uncertainty/decision checkpoint
→ project outcome
→ quality/debt/defect/release updates
→ ExperienceEpisode
→ progression assessment
→ cross-module invariants
→ atomic Rust/SQLite commit
```

Draft содержит project checkpoint, provider outcomes, episodes and progression candidates. Retry/resume не создают duplicate package outcome, release или evidence.

### 12. Детерминизм

- Все IDs stable/deterministic.
- Input collections сортируются stable IDs.
- Project randomness проходит через scoped PRNG forks.
- Forecast presentation не влияет на hidden actual work.
- Content/rules update не продолжает active package/draft без compatibility check.
- Все authoritative arithmetic integer/fixed-point.

## Последствия

### Положительные

- проекты создают инженерные решения вместо progress-bar grind;
- сохраняется casual-friendly abstraction;
- Project Engine остаётся отдельным bounded context;
- quality/debt/defects имеют долгосрочные последствия;
- делегирование масштабируется без микроменеджмента;
- project outcomes создают корректный `ExperienceEpisode`;
- save/recovery contracts становятся однозначными.

### Отрицательные

- ProjectState/save schema сложнее;
- требуется content authoring для archetypes/packages/quality profiles;
- balance simulator должен проверять debt spirals, release spam и project farming;
- UI должен показывать uncertainty и quality confidence без ложной точности.

## Отклонённые варианты

### Один progress bar проекта

Отклонён: не моделирует scope, uncertainty, quality, debt и contribution.

### Полный backlog/ticket simulator

Отклонён: создаёт микроменеджмент, контентный взрыв и CRM-like UX.

### Quality как одно число

Отклонён: скрывает trade-offs и противоречит качественной модели продукта.

### Каждый bug/debt item как отдельная карточка

Отклонён: создаёт шум и maintenance clicking.

### Progression Core владеет task outcome

Отклонён ADR-013: provider владеет domain truth.

### Company владеет ProjectState

Отклонён: pet/freelance/open-source/work projects должны использовать общий technical engine.

## Compatibility

Breaking changes:

- project/work-package state schema;
- quality/debt/defect/release schemas;
- MonthRun project phases and RNG scopes;
- project content API;
- provider outcome/episode contracts.

Active MonthRun и active Work Package требуют exact-compatible rules/content fingerprint либо controlled migration/abandon flow.

Released history, significant debt/defects and scope decisions сохраняют semantic snapshots/tombstones при missing content.

## Verification requirements

Изменение Project Engine требует:

- unit/property tests state machines and formulas;
- deterministic golden package/release traces;
- suspend/resume/idempotency tests;
- project outcome + evidence atomic commit test;
- debt/defect/release mass simulation;
- anti-exploit policies;
- UI forecast/quality causality stories;
- migration/compatibility corpus.
