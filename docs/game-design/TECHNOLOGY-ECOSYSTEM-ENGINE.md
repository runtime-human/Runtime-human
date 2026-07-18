# Historical Technology, Tooling & Ecosystem Engine

Нормативные источники:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Skills & Technologies](SKILLS-AND-TECHNOLOGIES.md)
- [Programmer Learning Engine](PROGRAMMER-LEARNING-ENGINE.md)
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md)
- [Programmer Career Engine](PROGRAMMER-CAREER-ENGINE.md)
- [Historical Technology Catalog](../content/HISTORICAL-TECHNOLOGY-CATALOG.md)

## Цель

Дать Learning, Project и Career единый исторически допустимый технологический контекст без линейного tech tree, package-manager simulation и универсального рейтинга технологий.

```text
historical facts
→ fictional local diffusion
→ character practical access
→ TechnologyContextSnapshot
→ Learning / Project / Career situation
→ provider outcome
→ ExperienceEpisode
→ Progression familiarity
```

## Player fantasy

Игрок развивается вместе с профессией: начинает с доступной среды своего времени, выбирает между стабильностью и новым потенциалом, поддерживает legacy, переживает platform shifts и осознанно использует новые ecosystem affordances.

Игра не требует собирать все языки и всегда заменять старую технологию новой.

## Ownership

### Technology Context Engine владеет

- validation и projection technology/version/platform/toolchain context;
- multi-axis ecosystem affordances and risks;
- provider-usable immutable snapshot;
- compatibility/support warnings;
- reason codes и deterministic fingerprint.

### Не владеет

- historical source records;
- local city/economy/equipment truth;
- learning/project/career outcomes;
- familiarity, evidence или grade;
- company, product или open-source state.

Historical Catalog владеет global facts. City/Era content владеет fictional local diffusion. Equipment, Housing, School, NPC, Economy и Employment владеют practical access. Progression владеет familiarity/transfer/evidence.

## Public model

```ts
type TechnologyCategory =
  | 'language'
  | 'runtime'
  | 'framework'
  | 'database'
  | 'operating-system'
  | 'platform'
  | 'toolchain'
  | 'development-tool'
  | 'deployment-tool'
  | 'standard'
  | 'assistant';
```

```ts
type TechnologyIdentity = Readonly<{
  id: TechnologyId;
  familyId: TechnologyFamilyId;
  category: TechnologyCategory;
  contentTier: 'A' | 'B' | 'C';
  historicalEntityId: HistoricalEntityId;
}>;
```

- Tier A: отдельная familiarity, lifecycle и meaningful decisions.
- Tier B: identity с общей family mechanics и ограниченным unique content.
- Tier C: context/tag/requirement без collectible progression.

## Version bands

```ts
type TechnologyVersionBandDefinition = Readonly<{
  id: TechnologyVersionBandId;
  technologyId: TechnologyId;
  availableFrom: HistoricalDate;
  supportProfileId: SupportProfileId;
  compatibilityProfileId: CompatibilityProfileId;
  toolchainProfileId: ToolchainProfileId;
  ecosystemProfileId: EcosystemProfileId;
  migrationEdges: readonly MigrationEdgeDefinition[];
  sourceRefs: readonly SourceRefId[];
}>;
```

Band создаётся только при meaningful shift минимум по двум направлениям:

- paradigm/API model;
- compatibility;
- tooling/ecosystem;
- platform/deployment;
- support/maintenance;
- market/project opportunity;
- learning burden;
- migration risk.

Каждая semver, patch, library и IDE update не моделируются.

## Independent lifecycle axes

### Release maturity

`preview → experimental → available → established`

### Adoption/demand

`niche → emerging → growing → mainstream → concentrated/declining`

### Support

`active → maintenance → security-only → unsupported`

### Ecosystem capability

`sparse → developing → broad → mature → fragmented`

### Local diffusion

`unavailable → rare/shared → specialist → accessible → common`

### Installed-base value

`small → established → entrenched → legacy-critical`

Оси независимы. Legacy technology может иметь высокий installed-base demand; mainstream old version может быть unsupported; emerging technology может иметь хорошие docs и слабое tooling.

## Ecosystem profile

```ts
type EcosystemProfile = Readonly<{
  tooling: EcosystemBand;
  documentation: EcosystemBand;
  learningSources: EcosystemBand;
  componentBreadth: EcosystemBand;
  testingSupport: EcosystemBand;
  deliverySupport: EcosystemBand;
  interoperability: EcosystemBand;
  communityFeedback: EcosystemBand;
  maintenanceChannels: EcosystemBand;
}>;
```

Provider projection:

```ts
type EcosystemAffordanceSnapshot = Readonly<{
  examplesReach: CasualContextBand;
  feedbackReach: CasualContextBand;
  reusableComponentReach: CasualContextBand;
  debuggingToolReach: CasualContextBand;
  testToolReach: CasualContextBand;
  deliveryToolReach: CasualContextBand;
  integrationReach: CasualContextBand;
  maintenanceBurden: CasualBurdenBand;
  dependencyRisk: CasualRiskBand;
  verificationBurden: CasualBurdenBand;
  reasonCodes: readonly TechnologyContextReasonCode[];
}>;
```

Большая ecosystem не является фиксированным multiplier: она может ускорять работу, но создавать dependency surface, fragmentation и migration burden.

## Local and practical access

```ts
type LocalTechnologyAvailability = Readonly<{
  technologyId: TechnologyId;
  versionBandId: TechnologyVersionBandId;
  cityEraProfileId: CityEraProfileId;
  diffusion: LocalDiffusionBand;
  channels: readonly TechnologyAccessChannel[];
  expectedCost: CasualCostBand;
  localFrom: GameDate;
  localUntil?: GameDate;
  basis: LocalAdaptationBasis;
}>;
```

`basis` различает source chronology, era analogy, fictional local assumption и balance adjustment.

```ts
type PracticalTechnologyAccess = Readonly<{
  status: 'unavailable' | 'indirect' | 'limited' | 'available';
  channels: readonly TechnologyAccessChannel[];
  capacityConstraint: CasualConstraintBand;
  costConstraint: CasualConstraintBand;
  platformConstraint: CasualConstraintBand;
  feedbackConstraint: CasualConstraintBand;
  fallbackRoutes: readonly TechnologyAccessRoute[];
  reasonCodes: readonly TechnologyContextReasonCode[];
}>;
```

Engine не покупает оборудование и не изменяет отношения/деньги.

## TechnologyContextSnapshot

```ts
type TechnologyContextSnapshot = Readonly<{
  id: TechnologyContextSnapshotId;
  gameDate: GameDate;
  technologyId: TechnologyId;
  familyId: TechnologyFamilyId;
  versionBandId: TechnologyVersionBandId;
  platformProfileId: PlatformProfileId;
  toolchainProfileId: ToolchainProfileId;
  releaseMaturity: ReleaseMaturityBand;
  adoption: AdoptionBand;
  support: SupportBand;
  ecosystem: EcosystemAffordanceSnapshot;
  localDiffusion: LocalDiffusionBand;
  installedBase: InstalledBaseBand;
  practicalAccess: PracticalTechnologyAccess;
  compatibleProjectKinds: readonly ProjectKindId[];
  compatibleLearningAffordances: readonly LearningAffordance[];
  careerSignalTags: readonly CareerSignalTag[];
  constraints: readonly TechnologyContextConstraint[];
  historicalSources: readonly SourceSnapshot[];
  localBasis: LocalAdaptationSnapshot;
  rulesVersion: TechnologyContextRulesVersion;
  contentFingerprint: TechnologyContentFingerprint;
  traceHash: TraceHash;
}>;
```

Snapshot materializes once per provider attempt/MonthRun and remains immutable through suspend/resume.

## Provider contracts

### Learning consumes

- access and learnability;
- docs/examples/feedback/tooling affordances;
- platform and compatibility requirements;
- family transfer context;
- support/recency warnings.

Learning owns approach/outcome/help/autonomy. Progression changes familiarity.

### Project consumes

- compatible project kinds;
- implementation/testing/delivery affordances;
- integration and platform constraints;
- maintenance/support burden;
- migration options.

Project owns Work Package, quality, debt, risk, issue, release and contribution.

### Career consumes

- era-valid role/project signals;
- demand and installed-base context;
- familiarity gap and trainability;
- employer toolchain compatibility.

Career owns opportunity, hiring, offer and employment outcomes.

## Technology decisions

### Familiar and stable

Predictable learning/tooling and lower context switching, but possible legacy concentration and weaker new-market reach.

### Mainstream ecosystem

Broad docs/components/help and hiring reach, but possible dependency complexity, competition and weak fit for a specific project.

### Emerging technology

Novel opportunities and learning, but sparse tooling, limited help and higher compatibility uncertainty.

### Legacy context

Installed-base demand and familiar constraints, but support, maintenance and security burden.

### Migration

Future compatibility/support in exchange for current work, risk and target-learning burden.

Project Engine resolves technical effects; Technology Engine only validates and explains context.

## Compatibility

Content compiler validates:

- prerequisite chronology;
- platform/runtime ordering;
- version-band references;
- source/data/runtime/tooling compatibility;
- migration reachability;
- active-context recovery.

Runtime does not solve arbitrary dependency graphs.

## Transfer and familiarity

Technology Context identifies family, band and context novelty. Progression applies directed transfer only after target exposure/practice.

Transfer cannot create target evidence, bypass platform/access or convert old familiarity into current support status.

## Source policy

Primary/official sources are preferred for release, standards, support and compatibility.

Adoption/ecosystem inference may use surveys, repository activity, package data, labor-market data, expert radars and historical research only with scope/methodology preserved.

- repository activity is not universal professional usage;
- survey is limited to its sample;
- expert radar is recommendation, not popularity;
- job demand is not technical quality;
- package count is not ecosystem health.

`mainstream` and `broad ecosystem` need two independent source classes or explicit `estimated` status.

## 1990 MVP

- one PC/DOS-like platform context;
- one BASIC-family Tier A technology/version band;
- aggregate editor/interpreter/compiler toolchain;
- printed manual/example listings;
- home or school/shared access;
- one compatibility/support limitation;
- one stable-versus-new-context decision.

Normal UI traits:

```text
Доступна на школьном компьютере
Примеры есть в руководстве
Быстро проверить небольшую программу
Мало готовых компонентов
Помощь обычно приходится ждать
```

MVP does not require exact product/version inventory in Normal UI.

## AI-era

AI assistant is a tool affordance, not a language, universal skill or automatic evidence source.

Context may describe explanation, completion, generation, diagnosis, review and agentic execution availability plus integration and verification burden. Providers still own actual outcome/autonomy.

## Persistence

Store only implemented authoritative state:

- active project technology snapshot/reference;
- character familiarity in ProfessionalState;
- equipment/installed-access owner state;
- active MonthRun snapshot/fingerprint;
- committed project/release/episode semantic snapshot.

Catalog and current projections are compiled/rebuildable unless an active/historical record requires a snapshot.

Rules:

- UI inspection consumes no RNG;
- context never rerolls on resume;
- catalog update cannot silently alter active outcome;
- committed history does not recalculate;
- duplicate context/decision does not duplicate progression.

## Recovery

Cases:

- missing active definition;
- removed version band;
- changed compatibility/support semantics;
- unavailable platform after migration;
- invalid context snapshot;
- local chronology conflict.

Routes:

- exact-compatible content;
- controlled mapping/migration;
- abandon active draft;
- project migration/recovery decision;
- Safe Mode/read-only history/export;
- tombstone for historical-only reference.

## Complexity profiles

### MVP Casual

1 family, 1 Tier A technology, 1 band, 1 platform/toolchain, 1 ecosystem profile, 1 access fallback and 1 compatibility trade-off.

### Recommended

2–5 active families, selected Tier A/B identities, sparse transfer graph, meaningful bands, migrations/legacy and career/project integration.

### Extended

Broader catalog, multiple platforms, open-source ecosystem health, company tooling, support incidents, richer migration and AI tool profiles.

## Required fixtures

1. global existence but local unavailable;
2. school/shared access;
3. no direct access with fallback;
4. stable familiar context;
5. emerging sparse ecosystem;
6. broad ecosystem with dependency burden;
7. legacy-critical unsupported band;
8. migration compatibility risk;
9. transfer without evidence inflation;
10. catalog update after committed history;
11. close/restart before choice;
12. close/restart after materialization;
13. duplicate answer/resume;
14. missing active content recovery;
15. AI generation versus verification.

## Invariants

- no universal technology score;
- no automatic newer-is-better;
- no every-library progression;
- version band requires current gameplay;
- provider ownership preserved;
- familiarity changes only through Progression;
- context never bypasses access;
- local diffusion is explicitly fictional;
- source scope is preserved;
- active snapshot restart-safe;
- committed history stable;
- low-access fallback exists;
- Normal UI remains bounded.

## Definition of Done

A technology-context feature is complete when one contextual choice affects real Learning/Project/Career input, player understands 3–5 visible traits, deterministic/recovery fixtures pass, provenance is reviewed, low-access route remains viable and no tech-tree or exact-version micromanagement is required.