---
title: "DOMAIN-MODEL"
type: architecture
status: draft
canon: true
updated: 2026-07-18
---

# Доменная модель Runtime Human

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

## 1. Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. MonthRun commit проверяет межмодульные invariants и сохраняет изменения атомарно.

```ts
type SaveGameState = Readonly<{
  metadata: SaveMetadata;
  character: CharacterState;
  professional: CharacterProfessionalState;
  people: Readonly<Record<PersonId, PersonState>>;
  relationships: Readonly<Record<RelationshipId, RelationshipState>>;
  career: CareerState;
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

Пустой/неоткрытый модуль может использовать минимальный empty state. Наличие поля в верхнем GameState не требует реализации полной подсистемы.

## 2. Implementation profile rule

Authoritative state хранит только поля, необходимые текущему реализованному gameplay.

- MVP Casual до Phase 3 использует empty CareerState.
- Career Slice добавляет только search/hiring/offer/position/trust fields из ADR-018.
- Recommended fields добавляются migrations вместе с feature.
- Extended fields не добавляются «на будущее».
- Derived UI detail не становится authoritative без причины.

## 3. CharacterState

Содержит identity, birth date, life stage, traits, health/capacity statuses и ключевые milestones.

Professional state выделен отдельно.

## 4. CharacterProfessionalState

MVP:

```ts
type CharacterProfessionalState = Readonly<{
  schemaVersion: ProfessionalStateSchemaVersion;
  aptitudes: ProfessionalAptitudeState;
  skills: Readonly<Record<SkillId, SkillState>>;
  technologies: Readonly<Record<TechnologyId, TechnologyProficiencyState>>;
  professionalFocus: ProfessionalFocus;
  awardedGrades: readonly ProfessionalGradeAward[];
}>;
```

```ts
type SkillState = Readonly<{
  skillId: SkillId;
  mastery: MasteryPoint;
  fluency: FluencyPoint;
  lastPracticedMonth: MonthIndex;
}>;
```

```ts
type TechnologyProficiencyState = Readonly<{
  technologyId: TechnologyId;
  familyId: TechnologyFamilyId;
  familiarity: FamiliarityPoint;
  lastPracticedMonth: MonthIndex;
}>;
```

Recommended/Extended могут добавить conceptual/operational/version fields и practice accumulators только вместе с соответствующим gameplay.

Rebuildable:

- readiness status/profile;
- specialization;
- capability cards;
- history indexes;
- monthly report.

## 5. Professional history

MVP meaningful history:

```ts
type ProfessionalEvidenceEvent = Readonly<{
  id: ProfessionalEvidenceId;
  period: GameDateRange;
  sourceSnapshot: EvidenceSourceSnapshot;
  outcome: ProfessionalOutcomeKind;
  summary: EvidenceSummary;
  skills: readonly SkillId[];
  participation: ParticipationKind;
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

Routine practice groups monthly and does not create one record per action/day.

Detailed claims/evidence browser are Recommended/Extended.

## 6. Experience Providers

Education, Project, Career, Open Source, Company and Event domains create stable `ExperienceEpisode` only for eligible real domain outcomes.

Provider owns domain outcome. Progression owns professional interpretation.

Interview, ordinary application and routine employment do not automatically create production evidence.

## 7. MVP ProjectState

```ts
type ProjectState = Readonly<{
  schemaVersion: ProjectStateSchemaVersion;
  id: ProjectId;
  titleKey: LocalizationKey;
  stage: CasualProjectStage;
  goal: ProjectGoalSummary;
  packages: Readonly<Record<WorkPackageId, WorkPackageState>>;
  quality: CasualQualityProfile;
  debt: DebtBand;
  risk: ProjectRiskBand;
  knownIssue?: CasualKnownIssue;
  releaseState: CasualReleaseState;
  revision: ProjectRevision;
}>;
```

MVP does not contain:

- components;
- requirement graph;
- detailed participant plan;
- maintenance pressure model;
- debt/defect ledger;
- rollout/support policy.

Those fields are added with later features, not reserved now.

## 8. WorkPackageState

```ts
type WorkPackageState = Readonly<{
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

Work Package is an aggregated stage, not a ticket.

MVP lifecycle:

```text
planned → active → blocked / completed / needs-rework
```

Internal suspend state lives in MonthRun draft where appropriate.

## 9. Project quality

MVP:

```ts
type CasualQualityProfile = Readonly<{
  functional: QualityBand;
  usability: QualityBand;
  maintainability: QualityBand;
  situational?: readonly CasualSituationalQuality[];
}>;
```

Situational quality exists only for current relevant gameplay.

No authoritative universal quality score.

## 10. Debt, risk and defects

MVP:

- `DebtBand`;
- `ProjectRiskBand`;
- optional player-relevant `CasualKnownIssue`.

Minor debt/bugs aggregate.

Significant debt records, known-defect inventory, incidents and rollback become separate state only with Recommended/Extended gameplay.

## 11. Release

MVP committed release:

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

Record immutable after commit.

Detailed scope snapshots, rollout, rollback, support and contribution ledger are later extensions.

## 12. Contribution

MVP participation:

- independent;
- assisted;
- team;
- review-or-leadership.

Vertical Slice requires only independent/assisted.

Project outcome and character participation remain separate.

## 13. CareerState

До Career Slice:

```ts
type CareerState = Readonly<{
  schemaVersion: CareerStateSchemaVersion;
}>;
```

Career Slice adds only implemented state:

```ts
type CareerState = Readonly<{
  schemaVersion: CareerStateSchemaVersion;
  activeIntent?: CareerIntent;
  activeSearch?: CareerSearchCampaign;
  activeHiringProcesses: Readonly<Record<HiringProcessId, HiringProcess>>;
  activeOffers: Readonly<Record<EmploymentOfferId, EmploymentOffer>>;
  activePosition?: EmploymentPosition;
  workplaceTrust?: WorkplaceTrustState;
  history: readonly CareerHistoryEntry[];
}>;
```

Career authoritative state owns:

- opportunity/search/hiring/offer/position lifecycle;
- saved visible/uncertain snapshots required for deterministic resume;
- employer role-expectation snapshot;
- workplace trust dimensions/allowed scope;
- career transitions/history.

Career does not store:

- mastery/evidence/grade copies;
- ProjectState copies;
- Company teams/payroll/budget/portfolio;
- NPC relationships;
- health/capacity;
- finance ledger;
- exact derived role-fit/hire probability/UI ranking.

Derived/rebuildable Career read models:

- market competitiveness summary;
- employer role-fit explanation;
- sorted opportunity recommendations;
- offer comparison badges;
- promotion readiness explanation;
- market trend labels.

Grade, readiness, market competitiveness, role fit, title/position and workplace trust remain distinct.

## 14. EmploymentPosition

Career Slice minimal position:

```ts
type EmploymentPosition = Readonly<{
  id: EmploymentPositionId;
  employerArchetypeId: EmployerArchetypeId;
  roleFamily: ProfessionalRoleFamilyId;
  titleKey: LocalizationKey;
  expectedScope: ProfessionalScopeBand;
  employmentType: EmploymentType;
  startedAt: GameDate;
  compensationContractRef: CompensationContractRef;
  scheduleCommitmentRef: ScheduleCommitmentRef;
  context: EmploymentContext;
  status: EmploymentPositionStatus;
}>;
```

Actual money/capacity state remains in Finance/Life owners. Position references work projects but does not own ProjectState or Professional Grade.

## 15. WorkplaceTrustState

```ts
type WorkplaceTrustState = Readonly<{
  positionId: EmploymentPositionId;
  deliveryConfidence: CasualConfidenceBand;
  autonomyConfidence: CasualConfidenceBand;
  qualityConfidence: CasualConfidenceBand;
  collaborationConfidence: CasualConfidenceBand;
  growthTrajectory: CasualTrajectoryBand;
  allowedScope: ProfessionalScopeBand;
  reasonHistory: readonly WorkplaceTrustReason[];
}>;
```

No single authoritative performance score. Trust is employer-specific and does not duplicate NPC relationship.

## 16. ProductState

Product owns market/economic state and consumes release outcome.

Product may remain empty/unimplemented in MVP. ProjectState does not reserve users/revenue fields.

## 17. CompanyState

Company owns employees/teams, headcount demand, payroll budget, portfolio and strategy when system exists. It provides typed position/budget/policy signals to Career and capacity/ownership signals to Project Engine.

No Company/team/delegation state is required in Vertical Slice or Career Slice. Career Slice uses fictional employer archetypes.

Company does not execute the player character's opportunity/search/interview/offer lifecycle.

## 18. Open Source extension

Owns community/governance/funding when implemented. Uses shared Project Engine technical outcome and may provide typed Career signals/opportunities.

No OSS state required in Vertical Slice.

## 19. People and relationships

NPC use stable IDs and active/background/archived tiers.

Professional mentoring/referral may affect learning/opportunity access but does not duplicate canonical project/progression/career history.

Workplace Trust is not NPC relationship truth.

## 20. Activity

Long activity stores commitment-level goal, priority, dates and required capacity.

Routine progress is automatic. Project technical stages use Work Packages. Employment is an automatic commitment, not a monthly work action.

## 21. World

```ts
type WorldState = Readonly<{
  city: HomeCityState;
  timeline: WorldTimelineState;
  currentEra: EraId;
  localMarket: LocalMarketState;
  technologyCatalogRevision: string;
}>;
```

Career Slice may add a reference to implemented `LaborMarketProfile`, not a full simulated population of employers/candidates.

Additional capability revisions are added only with implemented systems.

## 22. Histories

MVP append-only histories:

- important professional results;
- awarded grades when present;
- releases;
- important project decisions;
- major life events;
- migration/repair history.

Career Slice additionally preserves:

- meaningful opportunity/hiring outcome;
- accepted/ended position;
- important workplace trust/scope change;
- promotion/lateral/exit/layoff/re-entry transition reason.

Routine applications, ordinary rejection and routine work aggregate.

Do not create empty ledgers for unimplemented debt, incidents, teams, portfolios or detailed labor market history.

## 23. Invariants

- SaveGameState atomic at month boundary.
- Provider outcome separated from progression interpretation.
- Project technical truth separated from Product/Career/Company.
- Career state separated from Professional Grade and Company truth.
- Employer projections use candidate signals, not copied hidden mastery.
- Awarded grade not derived from XP/title/tenure/salary/referral.
- Promotion does not award grade.
- Project not ticket list or one progress score.
- Workplace Trust not one performance score or NPC relationship.
- Hidden outcome deterministic.
- Opportunity/interview/offer/transition snapshot deterministic after materialization.
- Release immutable.
- Routine history aggregated.
- Extended fields absent until gameplay uses them.
- UI projections rebuildable.
