# Technology & Ecosystem Content

Нормативные источники:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Historical Technology Catalog](HISTORICAL-TECHNOLOGY-CATALOG.md)
- [Content Architecture](CONTENT-ARCHITECTURE.md)

## Цель

Определить data-only contracts для technology identities, version bands, platform/toolchain profiles, ecosystem evidence, fictional local diffusion и provider contexts. Content не содержит executable rules и не меняет save/project/progression state напрямую.

## Content pipeline

```text
source registry
+ historical technology records
+ version/platform/toolchain definitions
+ ecosystem evidence
+ fictional local profiles
+ provider context templates
→ schema validation
→ chronology/reference validation
→ source-scope validation
→ compatibility/migration validation
→ casual-complexity lint
→ balance/reachability lint
→ immutable registries/fingerprints
```

## Namespaces

```text
core.tech-family.*
core.technology.*
core.tech-band.*
core.platform.*
core.toolchain.*
core.ecosystem-profile.*
core.compatibility-profile.*
core.migration.*
core.tech-context.*
core.local-tech-availability.*
source.technology.*
```

IDs never derive from display names and are never reused.

## TechnologyFamilyDefinition

```ts
type TechnologyFamilyDefinition = Readonly<{
  id: TechnologyFamilyId;
  labelKey: LocalizationKey;
  categoryHints: readonly TechnologyCategory[];
  conceptualTags: readonly TechnologyConceptTag[];
  transferEdges: readonly TransferEdgeDefinition[];
  version: ContentVersion;
}>;
```

Family exists for transfer/shared mechanics, not to group technologies only by brand or chronology.

## TechnologyDefinition

```ts
type TechnologyDefinition = Readonly<{
  id: TechnologyId;
  familyId: TechnologyFamilyId;
  historicalEntityId: HistoricalEntityId;
  category: TechnologyCategory;
  contentTier: 'A' | 'B' | 'C';
  labelKey: LocalizationKey;
  shortDescriptionKey: LocalizationKey;
  paradigms: readonly TechnologyParadigmTag[];
  professionalFacets: readonly ProfessionalFacetTag[];
  prerequisiteIds: readonly HistoricalEntityId[];
  versionBandIds: readonly TechnologyVersionBandId[];
  compatibleProjectKinds: readonly ProjectKindId[];
  sourceRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

Tier C definitions may omit familiarity/project decisions and exist only as validated context tags.

## TechnologyVersionBandDefinition

```ts
type TechnologyVersionBandDefinition = Readonly<{
  id: TechnologyVersionBandId;
  technologyId: TechnologyId;
  labelKey: LocalizationKey;
  historicalBandId: HistoricalTechnologyBandId;
  availableFrom: HistoricalDate;
  supportProfileId: SupportProfileId;
  platformProfileIds: readonly PlatformProfileId[];
  toolchainProfileIds: readonly ToolchainProfileId[];
  ecosystemProfileId: EcosystemProfileId;
  compatibilityProfileId: CompatibilityProfileId;
  migrationEdgeIds: readonly MigrationEdgeId[];
  meaningfulChangeTags: readonly VersionBandChangeKind[];
  sourceRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

Semantic validator requires current gameplay usage and meaningful boundary justification.

## PlatformProfileDefinition

```ts
type PlatformProfileDefinition = Readonly<{
  id: PlatformProfileId;
  category: 'hardware' | 'operating-system' | 'runtime-host' | 'network';
  labelKey: LocalizationKey;
  historicalEntityIds: readonly HistoricalEntityId[];
  capabilityTags: readonly PlatformCapabilityTag[];
  constraints: readonly PlatformConstraintDefinition[];
  sourceRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

Platform profile aggregates only distinctions that affect current gameplay. It is not a hardware-spec database.

## ToolchainProfileDefinition

```ts
type ToolchainProfileDefinition = Readonly<{
  id: ToolchainProfileId;
  labelKey: LocalizationKey;
  availableAffordances: readonly ToolingAffordance[];
  missingAffordances: readonly ToolingAffordance[];
  setupBurden: CasualBurdenBand;
  verificationSupport: CasualContextBand;
  deliverySupport: CasualContextBand;
  requiredPlatformIds: readonly PlatformProfileId[];
  sourceRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

MVP uses aggregate editor/interpreter/compiler profile; it does not model every application.

## EcosystemProfileDefinition

```ts
type EcosystemProfileDefinition = Readonly<{
  id: EcosystemProfileId;
  tooling: EcosystemBand;
  documentation: EcosystemBand;
  learningSources: EcosystemBand;
  componentBreadth: EcosystemBand;
  testingSupport: EcosystemBand;
  deliverySupport: EcosystemBand;
  interoperability: EcosystemBand;
  communityFeedback: EcosystemBand;
  maintenanceChannels: EcosystemBand;
  evidenceRefs: readonly EcosystemEvidenceId[];
  inferredFields: readonly EcosystemDimension[];
  confidence: SourceConfidence;
  version: ContentVersion;
}>;
```

Profile dimensions cannot be collapsed into one score.

## CompatibilityProfileDefinition

```ts
type CompatibilityProfileDefinition = Readonly<{
  id: CompatibilityProfileId;
  sourceCompatibility: CompatibilityBand;
  runtimeCompatibility: CompatibilityBand;
  dataCompatibility: CompatibilityBand;
  toolingCompatibility: CompatibilityBand;
  acceptsBandIds: readonly TechnologyVersionBandId[];
  targetPlatformIds: readonly PlatformProfileId[];
  constraintTags: readonly CompatibilityConstraintTag[];
  version: ContentVersion;
}>;
```

Content compiler checks direction and historical availability.

## MigrationEdgeDefinition

```ts
type MigrationEdgeDefinition = Readonly<{
  id: MigrationEdgeId;
  fromBandId: TechnologyVersionBandId;
  toBandId: TechnologyVersionBandId;
  migrationKinds: readonly MigrationKind[];
  expectedWork: WorkRangeDefinition;
  compatibilityRisk: CasualRiskBand;
  learningBurden: CasualBurdenBand;
  possibleChallengeArchetypes: readonly ProfessionalChallengeArchetype[];
  recoveryRouteIds: readonly RecoveryRouteId[];
  sourceRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

Migration content proposes context; Project/Challenge resolve outcome.

## LocalTechnologyAvailabilityDefinition

```ts
type LocalTechnologyAvailabilityDefinition = Readonly<{
  id: LocalTechnologyAvailabilityId;
  technologyId: TechnologyId;
  versionBandId: TechnologyVersionBandId;
  cityEraProfileId: CityEraProfileId;
  localFrom: GameDate;
  localUntil?: GameDate;
  diffusion: LocalDiffusionBand;
  accessChannels: readonly TechnologyAccessChannel[];
  costBand: CasualCostBand;
  fictionalInstitutionIds: readonly FictionalInstitutionId[];
  basis: LocalAdaptationBasis;
  sourceConstraintRefs: readonly SourceRefId[];
  assumptionNoteKey: LocalizationKey;
  version: ContentVersion;
}>;
```

`basis` must identify whether value is direct constraint, analogy, fictional assumption or balance adjustment.

## TechnologyContextTemplate

```ts
type TechnologyContextTemplate = Readonly<{
  id: TechnologyContextTemplateId;
  providerKinds: readonly ExperienceProviderKind[];
  technologyId: TechnologyId;
  allowedBandIds: readonly TechnologyVersionBandId[];
  projectKindIds: readonly ProjectKindId[];
  learningAffordances: readonly LearningAffordance[];
  careerSignalTags: readonly CareerSignalTag[];
  salienceRules: readonly TechnologyTraitSalienceRule[];
  possibleChoiceHooks: readonly TechnologyChoiceHook[];
  fallbackRouteIds: readonly TechnologyAccessRouteId[];
  antiRepeatKey: AntiRepeatKey;
  version: ContentVersion;
}>;
```

Template does not encode authoritative outcome or skill delta.

## TechnologyChoiceHook

Allowed hooks:

- stay-familiar;
- choose-mainstream;
- experiment-emerging;
- preserve-legacy;
- migrate-band;
- improve-tooling;
- reduce-scope-for-compatibility;
- add-verification;
- defer-until-access.

Each hook defines:

- player-facing goal;
- known trade-off direction;
- required access/context;
- provider request payload;
- disabled reason;
- recovery/next-step text.

It does not contain direct state patches or hidden correct answer.

## Trait salience

Normal UI receives deterministic 3–5 traits selected from:

- practical access;
- platform compatibility;
- familiar/current practice;
- documentation/examples;
- feedback/community;
- tooling/testing/delivery;
- component breadth;
- support/maintenance;
- migration burden;
- market/legacy relevance.

Rules select traits by current provider decision, not global importance.

## 1990 MVP seed content

### Family

```text
core.tech-family.basic-like
```

### Technology

```text
core.technology.basic-like-early-pc
```

Tier A, language category, one aggregate version band.

### Platform

```text
core.platform.pc-dos-like-1990
```

Represents a text-oriented personal/school computer context without exact hardware simulation.

### Toolchain

```text
core.toolchain.basic-interpreter-editor-1990
```

Affordances:

- edit source;
- run quickly;
- inspect simple errors;
- save/load through available medium.

Limitations:

- weak structured debugging;
- limited reusable components;
- offline documentation/feedback.

### Ecosystem

```text
core.ecosystem-profile.basic-local-1990
```

Starting bands:

- tooling: developing;
- documentation: developing/broad locally through selected material;
- learning sources: developing;
- components: sparse;
- testing/delivery: sparse;
- community feedback: sparse/delayed;
- interoperability: constrained.

These are balance hypotheses grounded in era constraints and require playtest.

### Local availability

Two routes:

1. home access;
2. school/shared access.

Low-access fixture must reach the same first project with different capacity/feedback context.

## Later seed examples

Not required for MVP, but schema must support selectively:

- early Python after 1991;
- web/ECMAScript after era-valid browser/network context;
- Git after 2005;
- container tooling after 2013;
- Kubernetes after 2014/2015;
- current .NET/Python support bands;
- AI assistant profiles in 2020s.

These examples do not create automatic roadmap tasks.

## AI assistant definition

Category `assistant`; usually Tier B/C unless current gameplay proves persistent identity.

Possible affordances:

- explanation;
- completion;
- code generation;
- diagnosis;
- review;
- agentic execution.

Possible constraints:

- device/network/local-model access;
- privacy/policy;
- verification burden;
- context limits;
- unsupported/generated output risk.

Content never grants autonomy/evidence directly.

## Semantic validation

### Technology

- identity/category/family valid;
- Tier A has current gameplay consumer;
- Tier C has no standalone proficiency bar;
- prerequisites historically valid;
- version bands ordered;
- source refs support declared facts.

### Ecosystem

- dimensions individually sourced or marked inferred;
- no universal score;
- broad/mainstream claims triangulated or estimated;
- survey/platform/radar scope retained.

### Local availability

- not before global availability;
- platform/channel exists;
- fictional basis declared;
- practical fallback available when path-blocking;
- no exact local percentage without source/model need.

### Compatibility/migration

- referenced nodes exist;
- target available;
- work/risk/recovery defined;
- no instant evidence/familiarity reward;
- active save compatibility assessed.

### Provider context

- at most 2–4 meaningful options;
- no globally dominant option;
- provider owns outcome;
- UI trait budget 3–5;
- anti-repeat key present.

## Casual-complexity lint

Warn/block:

- technology with no current decision;
- more than one new visible technology concept in ordinary early month;
- patch/minor version entries;
- library/package promoted to Tier A without proof;
- tech tree dependency for normal navigation;
- more than five visible context traits;
- exact popularity/benchmark numbers;
- universal best label;
- unimplemented Company/Open Source/AI fields;
- source details required to make ordinary choice.

## Balance/reachability lint

- at least two viable options in declared choice fixture;
- newest/mainstream not always dominant;
- legacy has value and exit route;
- low-access route reaches meaningful practice;
- migration cannot farm progression;
- transfer requires target use;
- failure/blocked state has recovery;
- hidden context deterministic;
- committed snapshot compatible/tombstoned.

## Stable IDs and tombstones

Removed/merged definitions keep:

- stable tombstone ID;
- last semantic label;
- category/family/band snapshot;
- replacement mapping if valid;
- history readability;
- active recovery policy.

ID reuse is forbidden.

## Fingerprints

Separate:

- historical source registry fingerprint;
- technology definition fingerprint;
- compatibility/migration fingerprint;
- ecosystem evidence/profile fingerprint;
- local availability fingerprint;
- provider context fingerprint;
- localization-only fingerprint.

Cosmetic copy change does not invalidate active outcome. Semantic context change does.

## Content Studio

When implemented, first preview supports:

- context card;
- 3–5 selected traits;
- technology choice options;
- access fallback;
- compatibility/support warning;
- source/confidence view;
- deterministic fixture replay;
- long-RU/a11y states.

It does not initially need graph editors for every dependency/version.

## Modding

Data-only mods may add supported technology/context content.

Forbidden:

- executable rules;
- dynamic network data;
- direct familiarity/project/career mutations;
- unsupported version solver;
- fake historical facts without source/fictional marking;
- future real-product releases;
- missing migration/tombstone policy.

## Required content tests

1. schema round-trip;
2. historical chronology;
3. source claim scope;
4. version-band justification;
5. prerequisite/compatibility graph;
6. migration reachability/recovery;
7. local fictional-basis validation;
8. low-access fallback;
9. salience trait budget;
10. provider ownership;
11. anti-dominance fixtures;
12. stable fingerprint;
13. tombstone/history load;
14. active missing-content recovery;
15. future boundary.

## Definition of Done

Content set is ready when every Tier A identity has current gameplay, release/support claims are source-backed, adoption/ecosystem inference is scoped, local diffusion is explicitly fictional, context options are bounded and causal, low-access recovery exists, compatibility/history fixtures pass and no executable or speculative Extended schema is introduced.