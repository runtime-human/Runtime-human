# Project & Technical Work Package Engine

## Статус

Нормативная межсистемная спецификация. Authoritative ownership и compatibility consequences зафиксированы в [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md).

Связанные документы:

- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Month Simulation](../simulation/MONTH-SIMULATION.md).

## 1. Назначение

Project Engine отвечает на вопросы:

1. Что именно создаёт или изменяет персонаж/команда?
2. Какой scope взят и что сознательно отложено?
3. Сколько работы известно и какая неопределённость остаётся?
4. Какие quality trade-offs приняты?
5. Как technical debt и defects меняют будущую работу?
6. Что вошло в release и насколько он надёжен?
7. Каков реальный вклад персонажа?
8. Как technical outcome превращается в `ExperienceEpisode`?

Центральная цепочка:

```text
Project goals/constraints
→ Scope slices
→ Work Package
→ Work allocation
→ Uncertainty/decision
→ Technical outcome
→ Quality/debt/defect/release state
→ Contribution snapshot
→ ExperienceEpisode
```

## 2. Boundary map

```text
Career ───────────── expectations/deadlines/stakeholders ─┐
Company ──────────── teams/capacity/ownership/budgets ────┤
Education ────────── learning project context ─────────────┤
Open Source ──────── community/contributor pressure ───────┤
Product/Market ───── demand/support signals ────────────────┤
                                                          ▼
                         Project & Work Package Engine
                         ├─ technical project state
                         ├─ scope/requirements
                         ├─ work packages
                         ├─ uncertainty/forecast
                         ├─ quality/debt/defects
                         ├─ release/maintenance
                         └─ contribution truth
                                                          │
        ┌─────────────────────────────────────────────────┼──────────────────────┐
        ▼                                                 ▼                      ▼
ReleaseTechnicalOutcome                         ExperienceEpisode      ProjectHistory
        ▼                                                 ▼
Product/OpenSource/Company                Professional Progression Core
```

### Project Engine владеет

- project lifecycle;
- technical goals and constraints;
- scoped requirements;
- Work Package lifecycle;
- technical uncertainty;
- project quality state;
- technical debt;
- latent/known defects and incidents;
- technical release records;
- maintenance state;
- project ownership and participant contribution;
- provider-side technical outcomes.

### Project Engine не владеет

- character skills/mastery/grade;
- job title/salary/promotion;
- company employment/payroll;
- product users/revenue/churn;
- open-source governance/community relationships;
- event selection/pacing;
- health/fatigue state;
- global allocation of character time;
- persistence implementation.

## 3. Терминология

| Понятие | Определение | Authoritative |
|---|---|---:|
| Project | Долгоживущий technical endeavour с целью, scope и lifecycle | Да |
| Project archetype | Content definition типичного project profile | Definition |
| Goal | Желаемый technical/user outcome | Да |
| Constraint | Обязательное ограничение срока, технологии, качества, бюджета или среды | Да |
| Scope slice | Небольшая смысловая часть результата, а не ticket | Да |
| Requirement | Проверяемое условие scope slice | Да |
| Work Package | Агрегированная значимая единица технической работы | Да |
| Challenge profile | Многомерная сложность package | Да |
| Uncertainty | Неполнота знания о work, requirements, integration или risks | Да |
| Forecast | Derived диапазон ожидаемого срока/работы | Derived |
| Quality target | Требуемый band по active quality dimension | Да |
| Quality assessment | Оценённый achieved band + confidence | Да |
| Technical debt | Существующее решение/состояние, увеличивающее future change cost/risk | Да |
| Latent defect risk | Агрегированная вероятность/масса ещё не выявленных дефектов | Да |
| Known defect | Материализованная значимая проблема | Да |
| Incident | Реализовавшееся operational/user consequence | Append-only + state |
| Release candidate | Подготовленное, но ещё не committed release state | Draft |
| Release record | Неизменяемый technical milestone | Append-only |
| Contribution | Traceable участие персонажа/команды в package/outcome | Да/summary |
| ExperienceEpisode | Нормализованный provider outcome для Progression Core | Draft/input |

## 4. Project lifecycle

```text
idea
→ discovery
→ active-development
→ released
→ maintenance
→ completed / archived / transferred / sold / abandoned
```

### `idea`

- цель ещё не подтверждена;
- scope rough;
- package creation ограничено discovery/prototype.

### `discovery`

- уточняются requirements, technology fit и uncertainty;
- возможен переход к active development либо отказ.

### `active-development`

- выполняются feature/refactor/migration/release packages;
- возможны параллельные packages при наличии capacity и ownership.

### `released`

- существует минимум один immutable release;
- support/feedback могут создавать maintenance/incident packages.

### `maintenance`

- проект сохраняет value, но основная работа — support, compatibility, debt and evolution.

### Terminal/transfer states

- `completed` — цель достигнута, regular work закрыта;
- `archived` — read-only historical project;
- `transferred` — ownership передан;
- `sold` — technical ownership/product rights переданы через external domain;
- `abandoned` — цель не достигнута, history/debt/consequences сохраняются.

Закрытый/archived project не получает normal progress.

## 5. Project state

```ts
export type ProjectState = Readonly<{
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

ProjectState не содержит users/revenue/community/payroll.

## 6. Scope model

```ts
export type ProjectScopeState = Readonly<{
  committed: readonly ScopeSlice[];
  optional: readonly ScopeSlice[];
  deferred: readonly ScopeSlice[];
  removed: readonly ScopeSliceTombstone[];
  revision: ScopeRevision;
}>;

export type ScopeSlice = Readonly<{
  id: ScopeSliceId;
  titleKey: LocalizationKey;
  goalRefs: readonly ProjectGoalId[];
  requirements: readonly Requirement[];
  valueBand: ValueBand;
  uncertainty: RequirementUncertaintyProfile;
  dependencies: readonly ScopeDependency[];
  acceptanceCriteria: readonly AcceptanceCriterion[];
}>;
```

### Scope rules

- baseline project показывает 3–8 meaningful slices, а не сотни tickets;
- optional/deferred scope может не получать active work;
- scope revision immutable в history;
- изменение scope создаёт decision record, если влияет на value, deadline, quality или architecture;
- split/merge slices не должны создавать evidence farming.

## 7. Work Package

Work Package — минимальная authoritative единица significant technical work.

### Baseline kinds

```text
discovery
prototype
feature
integration
quality-improvement
defect-fix
refactor
migration
release-preparation
maintenance
incident-response
research
```

### State

```ts
export type WorkPackageState = Readonly<{
  id: WorkPackageId;
  projectId: ProjectId;
  templateId?: WorkPackageTemplateId;
  kind: WorkPackageKind;
  lifecycle: WorkPackageLifecycle;
  objective: WorkPackageObjective;
  scopeRefs: readonly ScopeSliceId[];
  challenge: ChallengeProfile;
  knownRemainingWork: WorkUnit;
  latentWork: LatentWorkState;
  uncertainty: WorkPackageUncertaintyState;
  qualityTargets: QualityTargetProfile;
  riskProfile: ProjectRiskProfile;
  technologies: readonly TechnologyRequirement[];
  skillApplications: readonly SkillApplicationExpectation[];
  dependencies: readonly WorkPackageDependency[];
  participantPlan: ParticipantPlan;
  progress: WorkPackageProgressState;
  pendingDecisionId?: DecisionId;
  deadline?: GameDate;
  createdMonth: MonthIndex;
  resolvedOutcome?: WorkPackageOutcome;
  revision: WorkPackageRevision;
}>;
```

### Lifecycle

```text
draft → ready → active
active → blocked
active → suspended-for-decision
active → resolved
active → deferred
active → cancelled
blocked/suspended → active
```

`resolvedOutcome.kind`:

- completed;
- partial;
- failed;
- recovered.

`partial` является outcome, а не full delivery.

## 8. Work Package creation

Package создаётся из:

- project scope and constraints;
- archetype/package templates;
- era/tooling capabilities;
- active defects/debt/maintenance pressure;
- Career/Company/Open Source requests;
- player decision;
- deterministic provider rules.

Creation pipeline:

```text
template/context
→ semantic validation
→ challenge/quality/risk profile
→ known work estimate
→ deterministic latent work realization
→ participant plan
→ stable package ID
→ ready state
```

Package ID:

```text
hash(saveId, projectId, packageOriginId, creationMonth, ordinal, rulesVersion)
```

## 9. Uncertainty model

### Dimensions

- requirements ambiguity;
- technical novelty;
- integration uncertainty;
- legacy unknowns;
- dependency uncertainty;
- performance/reliability/security unknowns;
- coordination uncertainty;
- market/user assumptions are external signals, not Project technical truth.

### Latent work

```ts
export type LatentWorkState = Readonly<{
  realizationId: LatentWorkRealizationId;
  hiddenTotal: WorkUnit;
  revealed: WorkUnit;
  remainingHidden: WorkUnit;
  confidenceBand: ForecastConfidenceBand;
}>;
```

`hiddenTotal` authoritative, but normal UI не показывает exact value.

### Discovery

Research, prototype, integration and early implementation могут:

- уменьшить uncertainty;
- раскрыть latent work;
- уточнить challenge;
- изменить forecast;
- открыть new dependency/risk;
- создать blocking decision.

Uncertainty не должна автоматически означать негативный outcome: discovery может показать, что package проще ожидаемого.

## 10. Forecast

```ts
export type WorkForecast = Readonly<{
  optimistic: ForecastPoint;
  likely: ForecastPoint;
  cautious: ForecastPoint;
  confidence: ForecastConfidenceBand;
  reasonCodes: readonly ForecastReasonCode[];
  basedOnProjectRevision: ProjectRevision;
}>;
```

Forecast строится из:

- known remaining work;
- revealed/expected latent work;
- debt drag;
- participant capacity/capability;
- coordination and continuity;
- dependencies;
- deadline/calendar constraints.

UI не обещает exact completion date.

## 11. Work allocation and progress

Global commitment system передаёт `AllocatedProjectWork`, уже учитывающий health/fatigue/life capacity.

```ts
export type AllocatedProjectWork = Readonly<{
  projectId: ProjectId;
  packageId: WorkPackageId;
  participantContributions: readonly AllocatedParticipantWork[];
  month: MonthIndex;
}>;
```

Project-specific effective work:

```text
effectiveWork = roundHalfEven(
  allocatedWork
  × capabilityFitBps
  × clarityBps
  × toolchainBps
  × coordinationBps
  × continuityBps
  / 10000^5
)
```

### Modifier ranges — starting hypotheses

- capability fit: 2500–12500 bps;
- clarity: 3000–11000 bps;
- toolchain/process support: 5000–12000 bps;
- coordination: 3500–10500 bps;
- continuity: 4000–11000 bps.

All ranges versioned and require simulation/playtest.

### Rules

- health/fatigue multiplier не применяется второй раз;
- work package progress is integer;
- debt drag consumes effective work before scope progress;
- uncertainty discovery may reveal hidden work;
- full completion requires outcome/acceptance checks, not only zero remaining work;
- stable input ordering required.

## 12. Decisions

Meaningful package decisions:

- scope: add/cut/defer;
- quality: invest/accept risk;
- architecture/technology;
- research/mentor/review;
- build/reuse/migrate;
- defect: fix/workaround/defer;
- debt: repay/contain/accept;
- release: ship/delay/cut/rollback;
- ownership/delegation;
- incident response.

Routine implementation does not create blocking decisions.

Decision becomes blocking when:

- outcome cannot be selected safely by policy;
- commitment/ownership changes;
- significant scope/quality/debt/risk accepted;
- release/rollback required;
- ethical/security/relationship consequence exists;
- package cannot continue without new information.

## 13. Quality model

### Core dimensions

```text
functional-correctness
usability-experience
reliability
performance-efficiency
security-safety
maintainability
supportability-operability
```

Project archetype activates usually 3–5.

```ts
export type QualityDimensionState = Readonly<{
  dimension: QualityDimensionId;
  target: QualityBand;
  assessed: QualityBand;
  confidence: QualityConfidence;
  trend: QualityTrend;
  lastAssessmentSource?: ProjectSourceRef;
}>;
```

Quality bands:

```text
unknown → fragile → acceptable → strong → excellent
```

### Quality rules

- `unknown`/low confidence is not equal to fragile;
- testing/review/prototype can increase confidence without raising intrinsic quality;
- rush/scope pressure may reduce achieved quality or confidence;
- quality dimensions can conflict;
- quality target changes are traceable decisions;
- only active dimensions appear in novice UI;
- release gate may require target band and/or confidence.

## 14. Technical debt

### State

```ts
export type TechnicalDebtState = Readonly<{
  aggregate: DebtPressureAggregate;
  records: Readonly<Record<TechnicalDebtId, TechnicalDebtRecord>>;
}>;

export type TechnicalDebtRecord = Readonly<{
  id: TechnicalDebtId;
  category: TechnicalDebtCategory;
  origin: ProjectSourceRef;
  affectedScope: readonly ProjectAreaRef[];
  principalWork: WorkUnit;
  changeDragBps: BasisPoints;
  defectRiskBps: BasisPoints;
  visibility: DebtVisibility;
  confidence: QualityConfidence;
  intentional: boolean;
  status: DebtStatus;
  mitigationPackageId?: WorkPackageId;
  createdMonth: MonthIndex;
}>;
```

### Baseline categories

- architecture;
- implementation;
- test/verification;
- dependency;
- infrastructure/operations;
- documentation/knowledge.

### Effects

Debt affects:

- future work drag;
- clarity;
- defect injection/materialization;
- maintenance load;
- migration complexity;
- release risk;
- onboarding/coordination.

### Interest

```text
debtDragWork = roundHalfEven(
  affectedEffectiveWork × aggregateChangeDragBps / 10000
)
```

Debt does not grow by arbitrary monthly percentage if no affected work occurs. Carrying cost appears when changing/supporting affected areas or when risk materializes.

## 15. Defects and incidents

```ts
export type ProjectDefectState = Readonly<{
  latentRisk: Readonly<Record<ProjectAreaId, LatentDefectRisk>>;
  known: Readonly<Record<DefectId, KnownDefect>>;
  unresolvedCriticalCount: number;
}>;
```

### Defect creation

Package produces defect risk from:

- change size;
- challenge/novelty;
- quality criticality;
- prevention practices;
- time pressure;
- debt;
- technology/capability fit;
- review/testing.

Starting conceptual formula:

```text
addedRisk = roundHalfEven(
  changeRiskPoints
  × pressureBps
  × debtAmplifierBps
  × (10000 - preventionBps)
  / 10000^3
)
```

### Materialization

- uses scoped deterministic RNG;
- may occur during testing, release, operation or later maintenance;
- converts risk into known defect/incident;
- severity depends on affected scope, quality criticality and exposure;
- repeated reload does not reroll.

### Known defect

Stores:

- severity;
- affected area;
- reproducibility/confidence;
- workaround;
- discovered source;
- status;
- fix package reference;
- escaped/release relation.

Minor defects may remain aggregate; critical/player-relevant defects are explicit.

## 16. Participant contribution

```ts
export type ParticipantContribution = Readonly<{
  participant: ProjectParticipantRef;
  directWork: WorkUnit;
  contributionKinds: readonly ContributionKind[];
  responsibility: ResponsibilityBand;
  autonomy: ContributionBand;
  assistanceReceived: AssistanceProfile;
  reviewImpact: ContributionBand;
  decisionImpact: ContributionBand;
  mentoringImpact: ContributionBand;
  delegationImpact: ContributionBand;
}>;
```

Contribution kinds:

- implementation;
- analysis/design;
- testing/quality;
- review;
- architecture;
- incident response;
- mentoring;
- ownership/delegation;
- documentation/support.

Project outcome and contribution stored separately.

## 17. Coordination and ownership

Coordination factor derived from:

- ownership clarity;
- component coupling;
- cross-team dependencies;
- communication health;
- team familiarity;
- review/decision latency;
- simultaneous package count.

Team size alone is not direct penalty/bonus.

```text
coordinationBps = clamp(
  10000
  - couplingPenalty
  - crossTeamPenalty
  - unclearOwnershipPenalty
  - interruptionPenalty
  + familiarityBonus,
  coordinationFloor,
  coordinationCeiling
)
```

## 18. Delegation

```ts
export type DelegationPolicy = Readonly<{
  owner: ProjectParticipantRef;
  autonomy: DelegationAutonomyBand;
  outcomeGuardrails: readonly OutcomeGuardrail[];
  qualityGuardrails: readonly QualityGuardrail[];
  reviewCadence: ReviewCadence;
  escalationThreshold: EscalationThreshold;
}>;
```

### Rules

- player sets owner/outcome/guardrails, not employee hours;
- competent owner can advance package autonomously;
- micromanagement increases coordination cost and may reduce motivation/autonomy;
- insufficient oversight increases latent risk when capability/clarity low;
- delegated success creates leadership/leverage episode only from traceable decisions;
- delegated success does not create full direct-craft evidence.

## 19. Release model

```ts
export type ReleaseCandidate = Readonly<{
  id: ReleaseCandidateId;
  projectId: ProjectId;
  includedPackages: readonly WorkPackageId[];
  includedScope: readonly ScopeSliceId[];
  qualitySnapshot: ProjectQualitySnapshot;
  knownIssues: readonly DefectId[];
  acceptedDebt: readonly TechnicalDebtId[];
  rolloutPolicy: RolloutPolicy;
  supportPolicy: SupportPolicy;
  gateResult: ReleaseGateResult;
}>;

export type ReleaseRecord = Readonly<{
  id: ReleaseId;
  projectId: ProjectId;
  versionLabel: string;
  releasedAt: GameDate;
  includedPackages: readonly WorkPackageId[];
  scopeSnapshot: ProjectScopeSnapshot;
  qualitySnapshot: ProjectQualitySnapshot;
  knownIssues: readonly DefectSnapshot[];
  acceptedDebt: readonly TechnicalDebtSnapshot[];
  technicalOutcome: ReleaseTechnicalOutcome;
  rollbackState: RollbackState;
  contributionSnapshot: readonly ParticipantContribution[];
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

### Release gate

Checks:

- mandatory scope acceptance;
- critical defects;
- required quality targets/confidence;
- dependency/compatibility;
- support/rollback readiness;
- era distribution capabilities;
- organization/client policy.

Player may accept bounded risk when policy allows; exact risk is not fully known.

## 20. Maintenance

```ts
export type ProjectMaintenanceState = Readonly<{
  routineLoad: WorkUnit;
  supportPressure: PressurePoint;
  dependencyPressure: PressurePoint;
  compatibilityPressure: PressurePoint;
  nextReviewMonth?: MonthIndex;
}>;
```

Maintenance generated from:

- project/component complexity;
- debt pressure;
- dependencies/ecosystem changes;
- user/community support signals;
- release quality/incidents;
- security/operational requirements.

Routine maintenance aggregates. Significant maintenance becomes package.

## 21. Extension interfaces

### Product/Market

```ts
export type ReleaseTechnicalOutcome = Readonly<{
  releaseId: ReleaseId;
  functionalReadiness: QualityBand;
  reliabilityBand: QualityBand;
  usabilityBand?: QualityBand;
  performanceBand?: QualityBand;
  securityBand?: QualityBand;
  knownIssueSeverity: DefectSeverityBand;
  supportabilityBand: QualityBand;
  compatibilityTags: readonly string[];
}>;
```

Product/Market returns:

- adoption/load signal;
- support demand;
- user feedback categories;
- market deadline/feature requests.

It does not modify Project quality directly.

### Open Source

Provides:

- contributor capacity;
- issue/PR/support pressure;
- governance constraints;
- community review quality.

Consumes release/project outcomes.

### Company

Provides:

- team/participant capacity;
- ownership;
- budgets/tooling/process;
- portfolio priority;
- organizational constraints.

Consumes delivery/risk/maintenance outcomes.

### Career

Provides:

- job role expectations;
- stakeholder/deadline constraints;
- organizational quality policy.

Consumes contribution/outcome summaries.

### Progression

Consumes `ExperienceEpisode` after provider truth finalization.

## 22. ExperienceEpisode mapping

Project Engine creates episode only for meaningful character participation.

Episode includes:

- source project/package/release;
- challenge;
- direct/review/architecture/mentoring/delegation contribution;
- assistance;
- outcome/quality/reliability;
- skills/technologies applied;
- stable context fingerprint.

### Mapping rules

- team success ≠ full character success;
- partial package ≠ delivery claim;
- accepted debt may demonstrate decision/ownership but not quality;
- bug fix can demonstrate debugging, but repeated identical fixes diminish;
- release impact comes from role/contribution, not revenue alone;
- delegation creates leverage claim, not direct programming mastery.

## 23. MonthRun integration

```text
1. world/era changes
2. life capacity and mandatory commitments
3. Company/Career/Open Source inputs
4. allocate work to active packages
5. advance known work
6. reveal uncertainty/latent work
7. materialize package decision if required
8. checkpoint/suspend
9. resolve package outcome
10. update scope/quality/debt/defects
11. evaluate release/maintenance
12. create contribution snapshot
13. materialize ExperienceEpisode
14. Progression assessment/evidence
15. cross-module invariants
16. atomic commit
```

Project checkpoint stores:

- project/package revisions;
- allocation;
- latent realization;
- RNG states;
- discovered uncertainty;
- pending decision;
- provisional outcome;
- release candidate;
- contribution draft;
- episode draft;
- trace hashes/fingerprints.

## 24. RNG scopes

```text
project/{projectId}/package/{packageId}/latent-work
project/{projectId}/package/{packageId}/uncertainty
project/{projectId}/package/{packageId}/defect
project/{projectId}/release/{releaseId}/technical
project/{projectId}/incident/{incidentId}
```

Randomness is not used for:

- stable arithmetic;
- deterministic scope/debt consequences;
- eligibility;
- ID generation;
- grade/evidence assessment outside its existing explicit rules.

## 25. Persistence

### Authoritative normalized records

- projects;
- project goals/constraints;
- scope slices/requirements;
- components;
- work packages;
- quality dimensions;
- debt aggregates/records;
- latent defect aggregates/known defects;
- maintenance state;
- participant/ownership plan.

### Append-only

- releases;
- major scope decisions;
- incidents;
- project lifecycle milestones;
- significant contribution summaries;
- project migration/repair history.

### Rebuildable

- project health/dashboard;
- work forecast cards;
- risk summary;
- portfolio comparison;
- release charts;
- grouped minor defect/debt UI.

### Retention

Resolved routine packages may be compacted into monthly/project summaries after preserving:

- outcome;
- scope/quality/debt/defect deltas;
- contribution summary;
- episode/evidence references;
- trace hash;
- semantic snapshot.

Releases, incidents and significant debt/scope decisions are not compacted away.

## 26. Content definitions

Baseline JSONC definitions:

- `ProjectArchetypeDefinition`;
- `ProjectKindDefinition`;
- `ProjectQualityProfileDefinition`;
- `WorkPackageTemplateDefinition`;
- `ScopeTemplateDefinition`;
- `TechnicalDebtRuleDefinition`;
- `DefectRuleDefinition`;
- `ReleasePolicyDefinition`;
- `MaintenancePolicyDefinition`;
- `EraProjectCapabilityDefinition`.

### Validation

- stable IDs/versions;
- references;
- chronology/era availability;
- principal challenge consistency;
- active quality dimension count;
- work/latent bounds;
- outcome reachability;
- decision reachability;
- release gate feasibility;
- no direct skill/grade effects;
- no executable scripts;
- anti-farming keys;
- localization/sourceRefs.

## 27. UI read models

```ts
ProjectSummaryReadModel
ProjectScopeReadModel
WorkPackageCardReadModel
WorkForecastReadModel
ProjectQualityReadModel
ProjectDebtReadModel
ProjectDefectReadModel
ReleaseDecisionReadModel
ReleaseHistoryReadModel
ContributionExplanationReadModel
ProjectMonthlyDeltaReadModel
```

### Novice mode

Shows:

- project goal;
- current milestone;
- 1–3 active packages;
- forecast range and cause;
- active quality priorities;
- critical risk/debt/defect;
- next meaningful decision.

### Advanced mode

Adds:

- challenge dimensions;
- known/latent uncertainty explanation;
- quality confidence;
- significant debt records;
- known defect details;
- contribution breakdown;
- package/release trace.

No default backlog table with hundreds of rows.

## 28. Player decision density

Targets:

- ordinary package: 0–2 blocking decisions;
- major package/migration/incident: 1–4;
- no repeated scope/quality dialog each month;
- package without decision may progress automatically;
- active package count visible to casual player: normally 1–4 personal/direct, more only through delegated portfolio abstraction.

## 29. Anti-exploit rules

### Tiny-project spam

- minimum meaningful scope/context;
- repeated context anti-repeat;
- portfolio/reputation costs of abandonment;
- evidence requires sustained result.

### Work-package splitting

- semantic validator groups related slices;
- anti-repeat key includes project area/outcome family;
- split packages do not multiply impact.

### Intentional failure/bug farming

- failure does not create delivery/quality;
- repeated root-cause context diminishes;
- defects impose cost/risk;
- self-created defect does not create net impact evidence.

### Debt farming

- debt itself yields no positive claim;
- repayment evidence depends on actual complexity/outcome;
- creating then repaying same debt receives anti-repeat penalty.

### Release spam

- meaningful release requires changed scope/quality/compatibility;
- impact belongs Product/OSS domain and contribution context;
- empty version increments aggregate as routine.

### Overparallelization

- global allocation and project continuity/coordination penalties;
- deadlines and maintenance continue;
- partial packages accumulate opportunity cost.

### Huge-team exploit

- capacity is not linear with headcount;
- coupling/ownership/review constraints;
- background staff aggregated;
- only traceable player contribution creates episode.

### Perfection stalling

- obsolescence/deadline/support/competition opportunity costs;
- diminishing quality returns;
- project may lose relevance without release.

### Abandon/reset

- history/reputation/finance/contribution persist;
- project ID/scope context included in anti-repeat;
- archived debt/incident outcomes remain historical.

## 30. Failure and recovery

| Failure | Immediate consequence | Recovery |
|---|---|---|
| Package miss | delay/partial scope/pressure | rescope, mentor, more capacity, defer |
| Bad release | defects/support/reputation | hotfix, rollback, incident package |
| Debt spiral | reduced throughput/risk | focused repayment, migration, scope freeze |
| Stalled project | opportunity/maintenance cost | discovery reset, ownership transfer, archive |
| Obsolete technology | compatibility/market pressure | migration, legacy niche, maintenance-only |
| Key contributor loss | capacity/knowledge gap | documentation, hiring, rescope, handover |
| Security/reliability incident | outage/trust/financial consequence | containment, fix, review, process change |
| Failed product | technical asset remains | pivot, open source, sell/transfer, archive |

Project failure is normally story outcome, not game over.

## 31. Vertical slice — January 1990

### Project

Small personal text-program project in historically valid beginner environment.

### Scope

- core interaction;
- result output;
- optional input validation.

### Quality profile

- functional correctness;
- usability/experience;
- maintainability.

### Work packages

1. `core-interaction-loop`;
2. `input-validation-and-recovery`.

### Decision

After discovering invalid-input behavior:

- ask for help and fix;
- cut validation and release with known issue;
- spend next month investigating;
- simplify scope.

### Outcomes

- independent completion;
- assisted completion;
- partial release with known defect/debt;
- failed release preparation with recovery package.

### Required records

- ProjectState;
- two package states;
- one quality snapshot;
- optional debt/defect;
- one ReleaseRecord;
- one contribution snapshot;
- one ExperienceEpisode;
- crash-safe checkpoint.

## 32. Public pure API

```ts
evaluateProjectActionEligibility(...)
createWorkPackage(...)
buildWorkForecast(...)
allocatePackageWork(...)
advanceWorkPackage(...)
discoverPackageUncertainty(...)
resolveProjectDecision(...)
calculateWorkPackageOutcome(...)
applyProjectOutcome(...)
assessProjectQuality(...)
updateTechnicalDebt(...)
updateProjectDefects(...)
evaluateReleaseCandidate(...)
commitReleaseTechnicalOutcome(...)
buildProjectExperienceEpisode(...)
buildProjectReadModels(...)
```

### Ownership

- pure calculations/state transitions: Game Core Project module;
- cross-provider orchestration: MonthRunner/Application;
- content lookup: Compiled Content Registry;
- persistence: Rust adapter;
- UI projection: Application/read-model layer.

## 33. Invariants

- closed/archived project does not progress;
- resolved/cancelled package does not consume work;
- package belongs to one project;
- scope/dependency references valid or tombstoned;
- exact latent work never changes after creation except supported migration;
- partial outcome is not full completion;
- release references resolved packages/scope snapshot;
- release record immutable;
- critical release gate cannot be bypassed without explicit accepted-risk decision/policy;
- one quality score is not authoritative;
- low confidence is not low quality;
- debt drag applies only to affected work/state;
- defects are not rerolled on reload;
- Project Engine does not mutate skills/grade;
- team outcome separated from player contribution;
- Product revenue does not mutate technical quality;
- duplicate MonthRun does not duplicate package outcome/release/episode;
- all arithmetic checked integer/fixed-point;
- input order does not change outcome;
- active draft fingerprints compatible;
- historical release/debt/defect semantic snapshots survive missing content.

## 34. Tests

### Unit

- progress modifiers/rounding;
- forecast range;
- uncertainty revelation;
- quality assessment/confidence;
- debt drag;
- defect risk/materialization;
- release gates;
- contribution mapping.

### Property

- no overflow/negative work;
- deterministic input ordering;
- progress monotonic except revealed latent work;
- no duplicate release/episode;
- package state-machine validity;
- debt repayment cannot increase principal accidentally;
- critical defect blocks release unless explicit policy;
- compacted history preserves semantic outcome.

### Golden

- January 1990 project;
- partial package;
- assisted package;
- debt shortcut and later repayment;
- latent defect → known defect → hotfix;
- release rollback;
- team release with small player contribution;
- delegated package;
- migration/legacy project;
- abandoned project recovery.

### Mass simulation

- time-to-first-release;
- project completion/abandon rates;
- debt pressure distributions;
- defect/incident rates;
- forecast error;
- active package count;
- release frequency;
- quality target attainment;
- overparallelization;
- project spam;
- delegation-credit share;
- path parity by project type.

### Integration

- Project outcome + ExperienceEpisode + evidence atomic commit;
- suspend/resume at uncertainty/release decision;
- duplicate decision/retry;
- missing content/tombstone;
- active package rules mismatch;
- TS/Rust DTO round trip;
- migration corpus.

## 35. Performance

- normal project stores a small number of active packages;
- resolved routine packages compactable;
- releases/incidents/significant debt remain append-only;
- Project dashboard uses projections, not full-history scan;
- mass simulation can disable UI/history prose while preserving canonical hash;
- Project Engine should remain pure and headless.

## 36. Implementation stages

### P0

- IDs/types/schemas;
- Project/WorkPackage state machine;
- progress/latent work/forecast;
- quality profile;
- persistence draft/commit.

### P1

- one archetype;
- two packages;
- one uncertainty decision;
- one release;
- optional debt/defect;
- one episode.

### P2

- personal/work/freelance archetypes;
- debt/defects/maintenance;
- release policies;
- contribution mapping.

### P3

- Product/Open Source extensions;
- teams/delegation;
- incidents/migrations;
- portfolio read models.

### P4

- company portfolio;
- strategic technical direction;
- ownership transfer/sale;
- late-career legacy projects.

## 37. Запрещённые дрейфы

- Jira/backlog simulator;
- daily task clicking;
- project = one progress bar;
- quality = one score;
- every bug/debt item as modal card;
- unlimited parallel packages without costs;
- employees as interchangeable work-unit multipliers;
- project success = character mastery;
- revenue/stars = technical quality;
- random defects rerolled by reload;
- exact hidden work shown as guaranteed completion date;
- Project Engine owning users, payroll, grade or narrative pacing.
