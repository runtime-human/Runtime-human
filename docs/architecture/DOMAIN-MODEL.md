# Доменная модель Runtime Human

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression & Evidence](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package Model](../adr/ADR-014-authoritative-project-work-package-model.md).

## Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. Состояние нормализовано по модулям, но MonthRun commit проверяет межмодульные invariants и записывает их атомарно.

```ts
type SaveGameState = Readonly<{
  metadata: SaveMetadata;
  character: CharacterState;
  professional: CharacterProfessionalState;
  people: Readonly<Record<PersonId, PersonState>>;
  relationships: Readonly<Record<RelationshipId, RelationshipState>>;
  employment: EmploymentState;
  activities: Readonly<Record<ActivityId, ActivityState>>;
  projects: Readonly<Record<ProjectId, ProjectState>>;
  products: Readonly<Record<ProductId, ProductState>>;
  companies: Readonly<Record<CompanyId, CompanyState>>;
  inventory: InventoryState;
  housing: HousingState;
  finance: FinanceState;
  world: WorldState;
  narrative: NarrativeState;
  achievements: AchievementState;
}>;
```

## CharacterState

Содержит identity, birth date, life stage, traits, health/capacity statuses и ключевые жизненные milestones.

Профессиональная прогрессия выделена в `CharacterProfessionalState`.

## CharacterProfessionalState

```ts
type CharacterProfessionalState = Readonly<{
  schemaVersion: ProfessionalStateSchemaVersion;
  aptitudes: ProfessionalAptitudeState;
  skills: Readonly<Record<SkillId, SkillState>>;
  technologies: Readonly<Record<TechnologyId, TechnologyProficiencyState>>;
  professionalFocus: ProfessionalFocus;
  awardedGrades: readonly ProfessionalGradeAward[];
  monthlyPractice: Readonly<Record<PracticeAggregateKey, PracticeAccumulator>>;
}>;
```

Authoritative:

- reasoning/learning aptitude;
- skill mastery/fluency;
- technology conceptual/operational familiarity;
- professional focus;
- awarded grades;
- current MonthRun practice draft.

Rebuildable:

- demonstrated/current-market readiness;
- specialization profile;
- capability cards;
- evidence indexes;
- professional reports.

## Professional Evidence

`ProfessionalEvidenceEvent` — append-only history с semantic source/context snapshot и `EvidenceClaim`.

Routine practice сворачивается в `MonthlyPracticeAggregate`.

Grade award authoritative; readiness projection rebuildable.

## Experience Providers

Education, Project, Career, Open Source, Company и Event domains владеют своим outcome lifecycle и создают `ExperienceEpisode`.

Provider не изменяет skill/technology/grade напрямую.

## ProjectState

Project Engine владеет technical truth:

```ts
type ProjectState = Readonly<{
  schemaVersion: ProjectStateSchemaVersion;
  id: ProjectId;
  archetypeId: ProjectArchetypeId;
  kind: ProjectKind;
  lifecycle: ProjectLifecycleState;
  createdAt: GameDate;
  owner: ProjectOwnerRef;
  goals: readonly ProjectGoal[];
  constraints: readonly ProjectConstraint[];
  scope: ProjectScopeState;
  technologies: readonly ProjectTechnologyRef[];
  components: Readonly<Record<ProjectComponentId, ProjectComponentState>>;
  workPackages: Readonly<Record<WorkPackageId, WorkPackageState>>;
  quality: ProjectQualityState;
  debt: TechnicalDebtState;
  defects: ProjectDefectState;
  maintenance: ProjectMaintenanceState;
  participantPlan: ProjectParticipantPlan;
  lastReleaseId?: ReleaseId;
  projectRevision: ProjectRevision;
}>;
```

ProjectState не хранит:

- product users/revenue/churn;
- open-source governance/community health;
- company payroll/hiring;
- career salary/promotion;
- character mastery/grade.

## Project lifecycle

```text
idea → discovery → active-development → released → maintenance
→ completed / archived / transferred / sold / abandoned
```

Terminal/archived project не получает normal progress.

## ProjectScopeState

Хранит небольшое число смысловых slices:

- committed;
- optional;
- deferred;
- removed tombstones;
- requirements/acceptance criteria;
- uncertainty/volatility;
- stable revision.

Scope slice не является Jira ticket.

## WorkPackageState

`WorkPackage` — минимальная authoritative единица significant technical work.

Хранит:

- objective/kind;
- scope refs;
- challenge profile;
- known remaining work;
- deterministic latent work state;
- uncertainty;
- quality targets;
- risk/technology/skill application expectations;
- dependencies;
- participant plan;
- progress/deadline;
- pending decision;
- resolved outcome;
- revision.

Lifecycle:

```text
draft → ready → active
active → blocked / suspended-for-decision / resolved / deferred / cancelled
```

`resolvedOutcome` различает completed, partial, failed, recovered.

## Project quality

Authoritative quality не является одной шкалой.

Active dimensions выбираются project archetype:

- functional correctness;
- usability/experience;
- reliability;
- performance efficiency;
- security/safety;
- maintainability;
- supportability/operability.

Каждая dimension хранит target, assessed band, confidence, trend and source.

## Technical debt

`TechnicalDebtState` содержит:

- aggregate pressure для мелкого routine debt;
- significant `TechnicalDebtRecord` с origin, category, affected scope, principal work, change drag, defect risk, confidence и mitigation state.

Debt влияет на будущую работу только через affected areas/change/support/risk, а не произвольный monthly interest.

## Defects and incidents

`ProjectDefectState` разделяет:

- latent defect risk aggregates;
- known significant defects;
- unresolved critical count;
- escaped defects/incidents через append-only history.

Minor defects могут быть агрегированы. Reload не reroll materialization.

## Releases

`ReleaseRecord` append-only immutable milestone:

- included scope/packages;
- quality/confidence snapshot;
- known issues;
- accepted debt/risk;
- rollout/support policy;
- technical outcome;
- rollback/incident state;
- contribution snapshot;
- rules/trace identifiers.

Product/Open Source/Company используют release outcome, но не переписывают technical history.

## Contribution

Project Engine отделяет:

- team/project outcome;
- direct character contribution;
- review/architecture/mentoring;
- delegated/leadership contribution;
- external/team-only result.

Только traceable contribution входит в `ExperienceEpisode`.

## Employment

Хранит employer, position/title/company level, contract, salary, schedule, work project refs, team relationships and career risks.

Employment задаёт constraints/expectations и получает project contribution/outcome summaries. Не владеет technical ProjectState или professional grade.

## ProductState

Владеет market/economic state:

- users/adoption;
- pricing/revenue/cost;
- churn;
- market fit/competition;
- support demand.

Получает `ReleaseTechnicalOutcome` и возвращает demand/support signals.

## CompanyState

Владеет ownership, employees, teams, cash, expenses, strategy, portfolio priorities, hiring/retention and organizational policies.

Company передаёт Project Engine participant capacity/ownership/budgets/tooling constraints. Не хранит duplicate project quality/debt/defects.

## Open Source extension

Владеет contributors, maintainers, governance, community health, sponsorship, forks and ownership transfer.

Использует Project Engine для technical scope/packages/quality/debt/defects/releases.

## Person and Relationship

NPC имеют stable ID и tiers active/background/archived.

Professional memory может хранить mentoring, review, shared project and technical trust facts, но canonical contribution/evidence остаётся в Project/Progression ledgers.

## Activity

Длительное занятие хранит commitment-level goal, priority, work units, dates and participants. Project work деталируется через Work Packages.

## World

```ts
type WorldState = Readonly<{
  city: HomeCityState;
  timeline: WorldTimelineState;
  currentEra: EraId;
  localMarket: LocalMarketState;
  technologyCatalogRevision: string;
  projectCapabilityRevision: string;
}>;
```

Era определяет доступные tools, distribution, collaboration, deployment and project archetypes.

## Append-only histories

- professional evidence/grade awards;
- releases;
- major scope/architecture decisions;
- incidents;
- project lifecycle milestones;
- significant contribution summaries;
- finance ledger;
- migrations/repairs.

## Rebuildable projections

- readiness/specialization;
- project health/dashboard;
- forecast cards;
- grouped risk/debt/defect summaries;
- portfolio comparison;
- release charts;
- monthly reports.

## Invariants

- date/MonthIndex do not decrease;
- money and authoritative arithmetic checked integer/fixed-point;
- terminal project/package/activity does not progress;
- package belongs to one project;
- exact latent work realization does not reroll;
- scope/dependency refs valid or tombstoned;
- partial outcome is not full delivery;
- release immutable and references valid package/scope snapshots;
- low quality confidence is not automatically low quality;
- debt drag affects only applicable areas;
- defects do not reroll on reload;
- Project Engine does not mutate professional state;
- team outcome separated from character contribution;
- product revenue/fame does not mutate technical quality/mastery;
- evidence always has source/context snapshot;
- provider outcome, ProjectState delta and evidence commit atomically;
- duplicate MonthRun/resume does not duplicate package outcome/release/episode/evidence;
- awarded grade does not demote automatically;
- derived projections reproducible from authoritative state/history.
