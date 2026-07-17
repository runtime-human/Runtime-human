# Project & Work Package UI

## Статус

Нормативная UI-спецификация для [Project & Technical Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md) и [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md).

## 1. UX goal

Игрок должен понимать:

- что проект пытается создать;
- что сейчас делается и зачем;
- где остаётся неопределённость;
- какие quality priorities приняты;
- почему forecast изменился;
- какой debt/defect/risk действительно важен;
- что сделал сам персонаж, команда или delegated owner;
- готов ли release и какую цену имеет решение.

UI не имитирует Jira, IDE или engineering dashboard.

## 2. Progressive disclosure

### Novice mode

Shows:

- project goal/lifecycle;
- next milestone;
- 1–3 active Work Packages;
- optimistic/likely/cautious forecast;
- 3–5 active quality priorities;
- critical known issue/debt/risk;
- next meaningful choice;
- latest release/result.

### Advanced mode

Adds:

- scope slices/acceptance criteria;
- challenge dimensions;
- uncertainty reason codes;
- quality assessed band/confidence/trend;
- significant debt records;
- known defect details;
- participant/contribution breakdown;
- release gate trace;
- package/history references.

Exact hidden latent work and RNG values remain hidden outside diagnostics.

## 3. Main project screen

Hierarchy:

1. Project goal/status.
2. Current milestone and release readiness.
3. Active Work Packages.
4. Scope/quality trade-off.
5. Critical risk/debt/defect.
6. Participants/ownership.
7. History and advanced details.

Always visible:

- title/kind/lifecycle;
- owner/context;
- current milestone;
- likely forecast + confidence;
- active packages count;
- critical warning;
- primary action/decision.

## 4. Project summary read model

```ts
export type ProjectSummaryReadModel = Readonly<{
  projectId: ProjectId;
  title: string;
  kindLabel: string;
  lifecycleLabel: string;
  goalSummary: string;
  ownerSummary: string;
  milestone: ProjectMilestoneSummary;
  forecast: WorkForecastReadModel;
  activePackages: readonly WorkPackageCardReadModel[];
  qualitySummary: ProjectQualityReadModel;
  criticalItems: readonly ProjectCriticalItemReadModel[];
  releaseReadiness?: ReleaseReadinessReadModel;
  nextDecision?: ProjectDecisionReadModel;
}>;
```

No raw mutable ProjectState.

## 5. Work Package card

Shows:

- human objective;
- kind/status;
- related scope;
- challenge summary;
- progress state without fake exact percentage when hidden work exists;
- forecast range/confidence;
- owner/participants;
- quality/risk focus;
- blocker/decision;
- last meaningful change.

Progress presentation:

- “начало / продвигается / близко к завершению / требует пересмотра”;
- optional known-work progress in advanced mode;
- never guarantee completion from known progress alone when uncertainty remains.

## 6. Forecast

```ts
export type WorkForecastReadModel = Readonly<{
  optimisticLabel: string;
  likelyLabel: string;
  cautiousLabel: string;
  confidenceLabel: string;
  changedSinceLastMonth: boolean;
  changeExplanation?: string;
  reasonItems: readonly ForecastReasonReadModel[];
}>;
```

Example:

> Вероятнее всего — февраль. Диапазон расширился: обнаружена зависимость от старого формата данных.

Do not show false precision such as “87% chance in 13.4 days”.

## 7. Scope

Novice:

- committed goal slices;
- optional/deferred count;
- what release includes/excludes.

Advanced:

- requirements/acceptance criteria;
- dependencies;
- uncertainty/volatility;
- decision history.

Player changes scope through meaningful choices, not checklist editing.

## 8. Quality

Active dimensions only.

Each quality item shows:

- target in human language;
- assessed state;
- confidence separately;
- trend/cause;
- consequence if below target/unknown.

Example:

```text
Надёжность: приемлемая
Уверенность: низкая — ещё не проверены редкие сценарии
```

UI must not merge all dimensions into authoritative “Project quality 74”. A derived compact health label may summarize, but clicking reveals dimensions and it cannot be used as gameplay truth.

## 9. Technical debt

Novice shows themes:

- “быстрое решение затрудняет следующие изменения”;
- “не хватает автоматических проверок”;
- “устаревшая зависимость увеличивает риск”.

Advanced shows significant records:

- origin/decision;
- affected scope;
- estimated repayment range;
- current drag/risk;
- intentional/accidental;
- mitigation status.

Routine debt is grouped. No monthly “pay debt” maintenance click.

## 10. Defects and incidents

Novice:

- critical/significant known issues;
- grouped minor issues;
- incident/rollback banner;
- recommended response.

Advanced:

- severity/area/reproducibility/confidence;
- workaround/status;
- source release/package;
- fix package.

Latent defect risk shown only as bounded warning when player has sufficient information. Exact hidden stock never displayed.

## 11. Release decision

Focused screen/dialog:

- included/excluded scope;
- quality target/assessment/confidence;
- critical defects;
- accepted debt/risk;
- rollout/support/rollback readiness;
- forecast/opportunity cost;
- choices: release, delay, cut scope, fix critical item, cancel/rollback where applicable.

Consequences use ranges/categories, not hidden exact formula.

Critical gate cannot be bypassed unless policy exposes explicit accepted-risk choice with reason.

## 12. Contribution

Monthly/release explanation separates:

- character direct implementation;
- analysis/design;
- testing/review;
- architecture/decision;
- mentoring;
- delegated ownership;
- team/external contribution.

Example:

> Команда выпустила обновление. Ваш вклад: архитектурное решение, review и координация. Direct implementation была выполнена другим разработчиком.

This prevents false craft attribution.

## 13. Project decisions

Decision card includes:

- concrete problem;
- why now;
- options with trade-offs;
- what is known/unknown;
- reversible/irreversible indicator;
- expected scope/quality/debt/risk effects;
- disabled reasons;
- safe suspend/recovery status.

Avoid abstract options like “делать качественно / делать плохо”.

## 14. Monthly report

Project section:

1. milestone/package outcomes;
2. forecast changes and why;
3. quality/debt/defect changes;
4. release/incident;
5. character/team contribution;
6. generated professional episode/evidence explanation;
7. next decision/opportunity.

Routine progress grouped in one line.

## 15. Portfolio abstraction

For many delegated projects:

- one card per project with milestone/health/critical exception;
- filters by owner/status/risk;
- only projects requiring player decision rise to top;
- no rendering all packages/employees by default;
- drill-down on demand.

## 16. Storybook groups

### Project Core

- Project Summary — Discovery/Active/Released/Maintenance;
- Work Package — Ready/Active/Blocked/Partial/Resolved;
- Forecast — Narrow/Wide/Changed/Low Confidence;
- Scope — Committed/Optional/Deferred;
- Quality — Targets/Low Confidence/Trade-off;
- Debt — Aggregate/Significant/Intentional;
- Defect — Known/Critical/Grouped/Incident;
- Release — Ready/Blocked/Accepted Risk/Rollback;
- Contribution — Solo/Team/Assisted/Delegated.

### MonthRun and recovery

- Uncertainty decision;
- Scope/quality trade-off;
- Release decision;
- Suspended project run;
- Restart same hidden outcome;
- Duplicate answer conflict;
- Incompatible project fingerprint.

### Accessibility/edge

- keyboard-only;
- 200% text;
- long Russian labels;
- high contrast;
- reduced motion;
- screen-reader status;
- many projects portfolio;
- missing content/tombstone;
- empty/archived/failed project.

## 17. Usability tests

### Casual player

Can answer within 10 minutes:

- what project aims to do;
- what is being worked on;
- why finish date uncertain;
- which quality priority matters;
- what current decision changes;
- why team result differs from own contribution.

### Technical player

Can inspect:

- quality confidence;
- debt origin/effects;
- latent uncertainty explanation;
- release gates;
- contribution trace;
- scope/package/history without perceiving fake engineering.

### Causality

After month/release player identifies:

- why forecast moved;
- which decision created/paid debt;
- how defect/incident arose;
- why evidence was/was not created;
- what recovery path exists.

## 18. Accessibility

- keyboard navigation/focus restore;
- no color-only quality/severity;
- status announcements for forecast/decision changes;
- visible labels and target sizes;
- long RU text/reflow at 200%;
- reduced motion;
- alternatives to drag;
- tables only advanced and accessible.

## 19. Performance

- virtualize long project/release histories;
- render active summaries, not full state;
- memoize after profiling;
- large portfolio via bounded projections;
- no full-history scan per render;
- UI does not calculate project formulas.

## 20. Definition of Done

Project UI change requires:

- typed read-model/command contracts;
- novice/advanced stories;
- uncertainty/quality/debt causality;
- keyboard/a11y/long RU/200% checks;
- visual baseline for layout-critical states;
- no hidden exact work/defect exposure;
- no raw mutable state/persistence access;
- browser and desktop flow updates where integrated.
