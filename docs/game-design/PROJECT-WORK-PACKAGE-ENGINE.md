---
title: "PROJECT-WORK-PACKAGE-ENGINE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Project & Technical Work Package Engine

## Статус

Нормативная межсистемная спецификация.

Ownership и consistency:

- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

Product scope:

- [Casual Simulation Design](CASUAL-SIMULATION-DESIGN.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md).

## 1. Назначение

Project Engine должен создавать понятные технические trade-offs:

- что сделать сейчас;
- что отложить;
- выпустить быстрее или улучшить результат;
- принять ограничение или потратить время на исправление;
- как неопределённость изменила срок;
- чему персонаж научился на результате.

Project Engine не является Jira, IDE, office builder или engineering dashboard.

Цепочка:

```text
project goal
→ small set of Work Packages
→ automatic progress
→ meaningful trade-off
→ compact technical outcome
→ ExperienceEpisode
```

## 2. Boundary map

Project Engine владеет технической правдой уже реализованных project mechanics.

Не владеет:

- users/revenue/market;
- community/governance;
- employment/payroll;
- skills/grade;
- narrative pacing;
- global life capacity;
- persistence implementation.

Product, Career, Company и Open Source используют typed signals и не дублируют ProjectState.

## 3. Реализационные профили

## 3.1. MVP Casual

- 1 project;
- 2 Work Packages;
- 5 player-facing stages;
- progress bands;
- one uncertainty band;
- 3 quality bands;
- one debt band;
- one risk/known issue;
- compact release state;
- one contribution summary;
- 0–1 ordinary blocking decision.

## 3.2. Recommended

- 2–5 packages;
- optional/deferred scope;
- situational quality dimensions;
- significant debt/defect records;
- simple team contribution;
- release history;
- maintenance arcs.

## 3.3. Extended

- component/requirement graphs;
- detailed latent work/forecast confidence;
- debt ledger;
- defect inventory/incidents/rollback;
- granular contribution;
- delegation policies;
- portfolio management.

Extended is not an early roadmap requirement.

## 4. Terminology

| Concept | Meaning | MVP player-facing |
|---|---|---:|
| Project | Долгоживущая техническая цель | Да |
| Project stage | Крупный этап жизненного цикла | Да |
| Work Package | Агрегированный этап значимой работы | Да |
| Progress band | Качественное состояние продвижения | Да |
| Uncertainty | Насколько плохо известен путь/объём | Да |
| Quality band | Результат по значимому качеству | Да |
| Debt band | Будущая цена быстрых/неудачных решений | Да |
| Known issue | Проблема, важная для выбора/release | Да |
| Release | Зафиксированный технический результат | Да |
| Contribution | Как участвовал персонаж | Как summary |
| Latent work | Скрытая детерминированная дополнительная работа | Нет |

## 5. Casual ProjectState

```ts
type CasualProjectState = Readonly<{
  schemaVersion: ProjectStateSchemaVersion;
  id: ProjectId;
  titleKey: LocalizationKey;
  stage: CasualProjectStage;
  goal: ProjectGoalSummary;
  packages: Readonly<Record<WorkPackageId, CasualWorkPackageState>>;
  quality: CasualQualityProfile;
  debt: DebtBand;
  risk: ProjectRiskBand;
  knownIssue?: CasualKnownIssue;
  releaseState: CasualReleaseState;
  revision: ProjectRevision;
}>;
```

Не добавляются заранее:

- components;
- requirement graph;
- participant plan;
- maintenance pressure profiles;
- defect inventories;
- rollout/support policies.

Они появляются только вместе с implemented gameplay.

## 6. Project stages

MVP player-facing stages:

```text
idea
→ development
→ release-preparation
→ released
→ maintenance / finished
```

Internal transition states могут существовать для consistency, но не становятся отдельными UI concepts без необходимости.

Archive, transfer, sale и abandonment добавляются позднее.

## 7. Scope

MVP показывает:

- main result;
- optional result;
- deferred/cut result только после meaningful choice.

Пример:

```text
Обязательно: программа принимает данные и показывает результат.
Дополнительно: корректно объясняет неправильный ввод.
```

Игрок не редактирует requirement checklist.

## 8. Work Package

```ts
type CasualWorkPackageState = Readonly<{
  id: WorkPackageId;
  projectId: ProjectId;
  kind: CasualWorkPackageKind;
  state: CasualWorkPackageLifecycle;
  objectiveKey: LocalizationKey;
  progress: ProgressBand;
  challenge: CasualChallengeBand;
  uncertainty: UncertaintyBand;
  forecast: ForecastBand;
  pendingDecisionId?: DecisionId;
  resolvedOutcome?: CasualWorkPackageOutcome;
  revision: WorkPackageRevision;
}>;
```

Kinds для MVP:

- prototype/feature;
- quality-or-fix;
- release-preparation.

Recommended добавляет integration/refactor/migration/maintenance/research/incident-response.

## 9. Progress bands

Normal mode:

```text
not-started
→ started
→ progressing
→ almost-ready
→ completed
→ needs-rework
```

Exact percentage не показывается, если uncertainty делает его ложным.

Known work and latent work могут существовать внутри deterministic state, но MVP contract может хранить только компактную realization/trace, необходимую restart.

## 10. Uncertainty and forecast

Uncertainty:

- low;
- medium;
- high.

Forecast:

- likely-this-month;
- likely-next-month;
- timing-unclear.

После discovery UI объясняет изменение:

> Появилась дополнительная работа: нужно обработать неправильный ввод.

Optimistic/likely/cautious, confidence trend и multiple reason arrays являются Recommended options.

Hidden outcome фиксируется до suspend и не reroll после restart.

## 11. Work allocation

Global commitment system передаёт доступную project capacity после life/health constraints.

MVP effective progress учитывает:

- allocated work;
- capability fit;
- clarity/uncertainty;
- tool/equipment support;
- debt drag.

```text
effectiveWork = roundHalfEven(
  allocatedWork
  × capabilityFitBps
  × clarityBps
  × toolSupportBps
  × debtBps
  / 10000^4
)
```

Coordination/continuity/team formulas добавляются с team gameplay, а не в solo Vertical Slice.

## 12. Meaningful decisions

MVP decision types:

- simplify or keep scope;
- fix or accept known limitation;
- ask for help or continue independently;
- release or delay;
- spend time on maintainability or move faster.

Routine progress does not block MonthRun.

Decision card показывает:

- concrete problem;
- 2–4 options;
- known direction of consequences;
- what is uncertain;
- reversible/irreversible status.

## 13. Quality

MVP base qualities:

- `functional` — работоспособность;
- `usability` — удобство;
- `maintainability` — поддерживаемость.

Bands:

```text
unchecked → weak → acceptable → good → excellent
```

Situational qualities:

- reliability;
- performance;
- security;
- operations/support.

Situational dimension is activated only when project/content creates a relevant decision.

MVP state:

```ts
type CasualQualityProfile = Readonly<{
  functional: QualityBand;
  usability: QualityBand;
  maintainability: QualityBand;
  situational?: readonly CasualSituationalQuality[];
}>;
```

Confidence/trend are displayed/stored only if they materially affect a choice. One authoritative quality score remains forbidden.

## 14. Technical debt

MVP band:

```text
none → minor → noticeable → heavy
```

Effects:

- future progress drag;
- higher risk;
- more maintenance;
- new trade-off/event.

Separate record exists only for significant theme:

- temporary design;
- missing verification;
- obsolete dependency;
- poorly understood critical area.

No monthly debt payment button and no full ledger in MVP.

## 15. Bugs and incidents

MVP:

- latent risk;
- known issue;
- serious incident.

Minor bugs remain aggregate.

Known issue stores only:

- human-readable problem;
- severity band;
- workaround/next action if relevant;
- relation to release.

Incident system is deferred unless the Vertical Slice content explicitly needs one.

## 16. Contribution

MVP:

- independent;
- assisted;
- team;
- review-or-leadership.

For a solo first project only independent/assisted are required.

Detailed work-unit/impact dimensions are Recommended/Extended.

Project outcome and contribution remain separate so team success does not create false craft evidence.

## 17. Release

MVP states:

- not-ready;
- ready;
- ready-with-known-limitation;
- delayed;
- released;
- failed-with-recovery.

```ts
type CasualReleaseRecord = Readonly<{
  id: ReleaseId;
  projectId: ProjectId;
  releasedAt: GameDate;
  outcomeSummary: LocalizationKey;
  quality: CasualQualityProfile;
  debt: DebtBand;
  knownIssue?: CasualKnownIssueSnapshot;
  contribution: ParticipationKind;
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

Rollout, support and rollback are added with later production projects.

## 18. Project → ExperienceEpisode

Project provider creates one episode from meaningful resolved outcome:

```ts
type CasualProjectOutcome = Readonly<{
  projectId: ProjectId;
  packageId: WorkPackageId;
  outcome: ProfessionalOutcomeKind;
  challenge: CasualChallengeBand;
  participation: ParticipationKind;
  qualitySummary: CasualQualitySummary;
  skills: readonly SkillId[];
  technologyId?: TechnologyId;
  contextFingerprint: ContextFingerprint;
}>;
```

Project Engine does not change skills or grade directly.

## 19. MonthRun

```text
project capacity
→ package progress
→ uncertainty discovery
→ optional decision/checkpoint
→ project outcome
→ compact quality/debt/risk/release update
→ ExperienceEpisode
→ progression result
→ atomic commit
```

Draft stores deterministic hidden realization and provisional outcome. Duplicate resume cannot create another result.

## 20. Player-facing screen

Normal project card shows:

- goal;
- stage;
- current package;
- forecast band;
- uncertainty;
- three quality bands;
- debt band;
- important known issue;
- next decision.

No tables, backlog or full history by default.

Example:

```text
Текстовый органайзер

Этап: разработка
Сейчас: обработка неправильного ввода
Срок: вероятно февраль
Неопределённость: средняя

Работает: хорошо
Удобство: базовое
Поддерживаемость: средняя
Долг: незначительный

Выбор: исправить ошибки сейчас или выпустить первую версию раньше.
```

## 21. Anti-exploit

- package split does not create extra evidence;
- repeating tiny projects gets diminishing novelty;
- failure does not create full delivery;
- accepted debt has future consequence;
- reload does not change hidden outcome;
- project abandon/recreate does not reroll deterministic context;
- team outcome not fully attributed to character.

## 22. Balance and playtest

MVP metrics:

- time to understand project goal;
- time to choose option;
- number of visible concepts;
- package count;
- blocking decisions/month;
- player prediction of consequence direction;
- project completion/recovery;
- desire to continue;
- no duplicate/reroll;
- no tiny-project farming.

Debt spirals, team scaling, rollbacks and portfolio balance are not MVP gates.

## 23. Vertical Slice

- one text project;
- two packages;
- three qualities;
- one uncertainty;
- one debt or known-issue branch;
- one release/delay/recovery choice;
- independent/assisted/partial/failure outcomes;
- one episode;
- deterministic restart.

## 24. Deferred

- components and requirement graph;
- detailed forecast confidence;
- debt ledger;
- defect inventory;
- incidents/rollback;
- granular contribution;
- delegation;
- maintenance pressure;
- portfolio;
- full project archetype matrix.

## 25. Invariants

- project not one progress bar;
- package not daily ticket;
- visible concepts bounded;
- quality multi-dimensional but situational;
- debt creates future consequence;
- hidden outcome deterministic;
- team/player contribution separate;
- release immutable;
- project and progression atomic;
- future state not added without implemented gameplay.

## 26. Definition of Done

MVP Project Engine готов, когда:

- игрок понимает цель и current package;
- видит максимум несколько meaningful states;
- принимает один clear trade-off;
- объясняет outcome и learning;
- routine runs automatically;
- no Jira/dashboard impression;
- restart preserves outcome;
- Storybook/usability fixtures pass casual-first gates.
