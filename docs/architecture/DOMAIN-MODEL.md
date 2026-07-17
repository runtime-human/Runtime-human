# Доменная модель Runtime Human

Нормативные решения:

- [ADR-010 — Authoritative Save State](../adr/ADR-010-authoritative-save-state.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

## 1. Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. MonthRun commit проверяет межмодульные invariants и сохраняет изменения атомарно.

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

Пустой/неоткрытый модуль может использовать минимальный empty state. Наличие поля в верхнем GameState не требует реализации полной подсистемы.

## 2. Implementation profile rule

Authoritative state хранит только поля, необходимые текущему реализованному gameplay.

- MVP Casual не резервирует full Extended state.
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

Education, Project, Career, Open Source, Company and Event domains create stable `ExperienceEpisode`.

Provider owns domain outcome. Progression owns professional interpretation.

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

## 13. Employment

Employment owns employer, position/title, contract, salary, schedule and career risks.

It may reference work projects but does not own ProjectState or professional grade.

Detailed teams/role expectations are added with Career gameplay.

## 14. ProductState

Product owns market/economic state and consumes release outcome.

Product may remain empty/unimplemented in MVP. ProjectState does not reserve users/revenue fields.

## 15. CompanyState

Company owns employees, teams, cash and strategy when system exists. It provides capacity/ownership signals to Project Engine.

No Company/team/delegation state is required in Vertical Slice.

## 16. Open Source extension

Owns community/governance/funding when implemented. Uses shared Project Engine technical outcome.

No OSS state required in Vertical Slice.

## 17. People and relationships

NPC use stable IDs and active/background/archived tiers.

Professional mentoring may affect an episode but does not duplicate canonical project/progression history.

## 18. Activity

Long activity stores commitment-level goal, priority, dates and required capacity.

Routine progress is automatic. Project technical stages use Work Packages.

## 19. World

```ts
type WorldState = Readonly<{
  city: HomeCityState;
  timeline: WorldTimelineState;
  currentEra: EraId;
  localMarket: LocalMarketState;
  technologyCatalogRevision: string;
}>;
```

Additional capability revisions are added only with implemented systems.

## 20. Histories

MVP append-only histories:

- important professional results;
- awarded grades when present;
- releases;
- important project decisions;
- major life events;
- migration/repair history.

Do not create empty ledgers for unimplemented debt, incidents, teams or portfolios.

## 21. Invariants

- SaveGameState atomic at month boundary.
- Provider outcome separated from progression interpretation.
- Project technical truth separated from Product/Career/Company.
- Awarded grade not derived from XP/title.
- Project not ticket list or one progress score.
- Hidden outcome deterministic.
- Release immutable.
- Routine history aggregated.
- Extended fields absent until gameplay uses them.
- UI projections rebuildable.
