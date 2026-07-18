---
title: "Professional Situation Content Composition Engine"
type: engine
status: draft
canon: true
depends_on: [ADR-020]
updated: 2026-07-18
---

# Professional Situation Content Composition Engine

## Статус

Нормативная межсистемная спецификация.

Основание:

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Professional Challenge Engine](PROFESSIONAL-CHALLENGE-ENGINE.md);
- [Event Engine](../events/EVENT-ENGINE.md);
- [Narrative Director](../events/NARRATIVE-DIRECTOR.md);
- [Content Architecture](../content/CONTENT-ARCHITECTURE.md).

## 1. Назначение

Система повышает authorial leverage без передачи профессиональной причинности генератору.

```text
authored kernels/context/pressure/bridges/presentation
→ constrained composition
→ compile and validate
→ immutable situation variants
→ provider eligibility
→ event/director selection
→ challenge resolution
```

Она отвечает на вопросы команды контента:

1. Какие части ситуации можно переиспользовать без потери смысла?
2. Какие комбинации профессионально и исторически допустимы?
3. Сколько реально разных решений содержит corpus?
4. Где есть повтор, reskin, dominant approach или content gap?
5. Какие готовые variants безопасно отдавать runtime?

## 2. Boundary map

```text
Authoring definitions / Content Studio
                 │
                 ▼
Professional Situation Content Compiler
├─ reference/schema validation
├─ compatibility resolution
├─ bounded materialization
├─ semantic validation
├─ provider-contract validation
├─ chronology validation
├─ similarity/coverage analysis
└─ immutable registry + diagnostics
                 │
                 ▼
CompiledProfessionalSituationDefinition
                 │
       ┌─────────┼───────────┐
       ▼         ▼           ▼
 Provider     Event Engine  Narrative Director
 request      chain/effects selection/pacing
       └─────────┬───────────┘
                 ▼
Professional Challenge Engine
                 ▼
Provider application → ExperienceEpisode
```

Compiler не:

- выбирает месяц показа;
- рассчитывает event weight;
- разрешает approach outcome;
- меняет provider state;
- начисляет progression;
- выбирает NPC;
- создаёт runtime prose;
- обращается к сети или LLM.

## 3. Implementation profiles

### MVP Casual

- existing January `diagnose` situation represented as one kernel/composition;
- one context frame;
- one pressure package;
- one consequence bridge;
- one presentation pack;
- one materialized variant;
- deterministic registry/fingerprint;
- basic semantic validation;
- one golden fixture.

No generic DSL, coverage dashboard or automatic expansion is required.

### First Playable Year

Starting budget:

- 6–10 kernels;
- 3–4 challenge archetypes;
- Learning/Project providers;
- bounded Career references where needed;
- 2–3 technology context profiles;
- 12–24 materialized variants;
- coverage and near-duplicate reports;
- semantic anti-repeat metadata;
- recovery/follow-up coverage.

### Recommended

- more provider/context bindings;
- multi-month Event chains;
- authoring UI and coverage heatmaps;
- pairwise coverage suggestions;
- curated transformation patterns;
- offline draft assistance under human review.

### Extended

- leadership/systemic kernels;
- Company/Open Source contexts;
- sequence coverage across long arcs;
- mixed-initiative authoring suggestions;
- larger corpus analytics.

## 4. Authoring units

### 4.1 Situation Kernel

```ts
type SituationKernelDefinition = Readonly<{
  id: SituationKernelId;
  version: ContentVersion;
  archetype: ProfessionalChallengeArchetype;
  titleKey: LocalizationKey;
  professionalGoalClass: ProfessionalGoalClass;
  dilemmaId: ProfessionalDilemmaId;
  dilemmaSummaryKey: LocalizationKey;
  stageRange: ProfessionalStageRange;
  approachIntents: readonly SituationApproachIntentDefinition[];
  outcomePatternId: SituationOutcomePatternId;
  requiredProviderCapabilityIds: readonly ProviderSituationCapabilityId[];
  semanticTags: readonly ProfessionalSituationSemanticTag[];
  prohibitedContextTags: readonly ProfessionalSituationContextTag[];
  coverageLabels: readonly ProfessionalSituationCoverageLabel[];
}>;
```

Kernel owns:

- what problem is being decided;
- why the approaches are genuinely different;
- broad successful/partial/failure semantics;
- professional stage limits;
- reusable semantic identity.

Kernel does not own:

- concrete project/employer/NPC;
- era-specific hardware;
- exact provider effects;
- event chain;
- presentation skin.

### 4.2 Approach intent

```ts
type SituationApproachIntentDefinition = Readonly<{
  id: ProfessionalApproachIntentId;
  baselineApproachId: ProfessionalApproachId;
  semanticGoal: ProfessionalApproachSemanticGoal;
  invariantTradeOffIds: readonly ProfessionalTradeOffId[];
  availabilityRequirementIds: readonly SituationApproachRequirementId[];
  prohibitedPressureTags: readonly SituationPressureTag[];
}>;
```

Wording may vary, semantic intent may not.

Examples:

- investigate-first;
- implement-fast;
- prototype;
- ask-for-help;
- reduce-scope;
- strengthen-quality;
- clarify-requirement;
- disclose-risk;
- negotiate-scope;
- defer-or-recover.

### 4.3 Context Frame

```ts
type SituationContextFrameDefinition = Readonly<{
  id: SituationContextFrameId;
  version: ContentVersion;
  providerKind: ExperienceProviderKind;
  providerContextKind: ProviderSituationContextKind;
  stageRange: ProfessionalStageRange;
  eraRange: EraRange;
  technologyContextSelectors: readonly TechnologyContextSelector[];
  sourceRequirementIds: readonly ProviderSourceRequirementId[];
  participantRoleSlots: readonly SituationParticipantRoleSlot[];
  accessRequirementIds: readonly SituationAccessRequirementId[];
  capacityAssumption: SituationCapacityAssumption;
  allowedKernelTags: readonly ProfessionalSituationSemanticTag[];
  prohibitedKernelIds: readonly SituationKernelId[];
  allowedPressureTags: readonly SituationPressureTag[];
  providerContractProfileId: ProviderSituationContractProfileId;
}>;
```

Context frame binds semantic problem to a valid domain situation.

Examples:

- beginner personal project on shared school computer;
- small product team with review available;
- legacy internal tool with limited observability;
- open-source contribution with asynchronous feedback;
- hiring work sample with no production effect.

### 4.4 Pressure Package

```ts
type SituationPressurePackageDefinition = Readonly<{
  id: SituationPressurePackageId;
  version: ContentVersion;
  causeIds: readonly ChallengeCauseId[];
  visibleStakeBand: CasualStakeBand;
  requiredContextTags: readonly ProfessionalSituationContextTag[];
  prohibitedKernelTags: readonly ProfessionalSituationSemanticTag[];
  approachAdjustments: readonly SituationApproachAdjustment[];
  complicationProfileId?: ChallengeComplicationProfileId;
  forecastModifierIds: readonly SituationForecastModifierId[];
  recoveryModifierIds: readonly SituationRecoveryModifierId[];
}>;
```

Rules:

- ordinary package exposes at most two causes;
- cause must change forecast, availability, compromise or recovery;
- pressure cannot exist only as different flavor text;
- high-consequence pressure requires appropriate provider/stage context;
- pressure does not declare exact success chance.

### 4.5 Outcome Pattern

```ts
type SituationOutcomePatternDefinition = Readonly<{
  id: SituationOutcomePatternId;
  allowedOutcomeClasses: readonly ProfessionalOutcomeClass[];
  completionBands: readonly CasualCompletionBand[];
  qualityBands: readonly CasualOutcomeQualityBand[];
  compromiseClassIds: readonly ProfessionalCompromiseClassId[];
  recoveryClassIds: readonly ProfessionalRecoveryClassId[];
  reasonClassIds: readonly ProfessionalReasonClassId[];
}>;
```

Outcome Pattern constrains possible semantic results. Challenge Engine still computes actual outcome.

### 4.6 Consequence Bridge

```ts
type SituationConsequenceBridgeDefinition = Readonly<{
  id: SituationConsequenceBridgeId;
  version: ContentVersion;
  providerKind: ExperienceProviderKind;
  providerContractProfileId: ProviderSituationContractProfileId;
  kernelIds: readonly SituationKernelId[];
  contextFrameIds: readonly SituationContextFrameId[];
  effectMappings: readonly SituationProviderEffectMapping[];
  episodeFactMappings: readonly SituationEpisodeFactMapping[];
  followUpMappings: readonly SituationFollowUpMapping[];
  recoveryMappings: readonly SituationRecoveryMapping[];
  eventHookMappings: readonly SituationEventHookMapping[];
}>;
```

The bridge maps semantic outcome classes, not exact hidden scores.

### 4.7 Presentation Pack

```ts
type SituationPresentationPackDefinition = Readonly<{
  id: SituationPresentationPackId;
  version: ContentVersion;
  eraRange: EraRange;
  providerKinds: readonly ExperienceProviderKind[];
  toneTags: readonly SituationToneTag[];
  vocabularyProfileId: EraVocabularyProfileId;
  titleTemplates: readonly LocalizationKey[];
  summaryTemplates: readonly LocalizationKey[];
  goalTemplates: readonly LocalizationKey[];
  causeTemplates: Readonly<Record<ChallengeCauseId, readonly LocalizationKey[]>>;
  approachWording: Readonly<Record<ProfessionalApproachIntentId, SituationApproachCopy>>;
  resultTemplates: readonly SituationResultTemplate[];
  accessibilityFixtureIds: readonly UiFixtureId[];
}>;
```

Presentation cannot add or remove semantic approach intent or provider effect.

### 4.8 Composition Set

```ts
type SituationCompositionSetDefinition = Readonly<{
  id: SituationCompositionSetId;
  version: ContentVersion;
  kernelIds: readonly SituationKernelId[];
  contextFrameIds: readonly SituationContextFrameId[];
  pressurePackageIds: readonly SituationPressurePackageId[];
  consequenceBridgeIds: readonly SituationConsequenceBridgeId[];
  presentationPackIds: readonly SituationPresentationPackId[];
  constraints: readonly SituationCompositionConstraint[];
  explicitExclusions: readonly SituationCompositionExclusion[];
  materializationBudget: MaterializationBudget;
  coverageTargetIds: readonly ProfessionalSituationCoverageTargetId[];
  generatedIdNamespace: StableContentNamespace;
  owner: ContentOwnerMetadata;
}>;
```

## 5. Compilation pipeline

```text
load stable definitions
→ validate schema and refs
→ resolve composition set
→ enumerate candidate tuples in stable order
→ apply compatibility constraints
→ build semantic situation
→ validate approaches/outcome/provider bridge
→ validate chronology/access/technology context
→ bind presentation
→ create semantic signature
→ create deterministic materialized ID
→ emit compiled definition
→ run duplicate/coverage/reachability analysis
→ emit registry and diagnostics
```

### Stable ordering

All enumeration uses canonical stable-ID ordering. JSON object iteration, filesystem order and locale sorting are forbidden inputs.

### Bounded materialization

`MaterializationBudget` includes:

- maximum candidates before validation;
- maximum valid variants;
- maximum presentation variants per semantic composition;
- maximum variants per kernel/context pair;
- maximum total normal-mode variants for implementation profile.

Exceeding budget is build failure, not silent truncation.

## 6. Compiled variant

```ts
type CompiledProfessionalSituationDefinition = Readonly<{
  id: CompiledSituationVariantId;
  version: ContentVersion;
  compositionSetId: SituationCompositionSetId;
  kernelId: SituationKernelId;
  contextFrameId: SituationContextFrameId;
  pressurePackageId: SituationPressurePackageId;
  consequenceBridgeId: SituationConsequenceBridgeId;
  presentationPackId: SituationPresentationPackId;
  technicalSituationTemplate: TechnicalSituationTemplateSnapshot;
  eligibility: CompiledSituationEligibility;
  providerContract: CompiledProviderSituationContract;
  semanticSignature: ProfessionalSituationSemanticSignature;
  repetitionProfile: ProfessionalSituationRepetitionProfile;
  followUpProfile: ProfessionalSituationFollowUpProfile;
  semanticSnapshot: ProfessionalSituationSemanticSnapshot;
  sourceFingerprint: ContentFingerprint;
}>;
```

## 7. Eligibility lookup

Provider requests:

```ts
type ProfessionalSituationLookupRequest = Readonly<{
  providerKind: ExperienceProviderKind;
  source: ExperienceSourceRef;
  desiredArchetypeIds?: readonly ProfessionalChallengeArchetype[];
  desiredGoalClassIds?: readonly ProfessionalGoalClass[];
  professionalStage: ProfessionalStageBand;
  technologyContext: TechnologyContextSnapshot;
  accessSnapshot: SituationAccessSnapshot;
  participantSnapshot: SituationParticipantSnapshot;
  providerRevision: ProviderRevision;
  excludedVariantIds: readonly CompiledSituationVariantId[];
}>;
```

Registry returns eligible candidates in stable order with reason codes. It does not rank by pacing; Event Engine/Narrative Director own that.

## 8. Event and arc integration

Two modes:

### Provider-direct situation

A project/learning/career provider reaches a meaningful technical point and requests eligible compiled situation.

### Event-wrapped situation

EventDefinition references a compiled situation family/composition selector. Event Engine owns:

- event requirements;
- persistent participants;
- chain stage;
- delayed hooks;
- event effects outside technical outcome.

After Event selection, provider materializes `TechnicalSituation` from the selected compiled definition.

Director sees:

- product layer;
- archetype/provider/category;
- semantic signature;
- repetition profile;
- intensity/stakes;
- arc/follow-up metadata.

It never sees authoring components as mutable runtime options.

## 9. Semantic repetition profile

```ts
type ProfessionalSituationRepetitionProfile = Readonly<{
  exactVariantKey: AntiRepeatKey;
  kernelKey: AntiRepeatKey;
  dilemmaKey: AntiRepeatKey;
  approachShapeKey: AntiRepeatKey;
  causeSetKey: AntiRepeatKey;
  consequenceShapeKey: AntiRepeatKey;
  providerArchetypeKey: AntiRepeatKey;
  participantRoleKey?: AntiRepeatKey;
  presentationOnlyGroupKey: AntiRepeatKey;
}>;
```

Presentation-only changes never reset kernel/dilemma/approach repetition.

## 10. Similarity analysis

Compiler calculates a diagnostic similarity vector using exact semantic fields, not embeddings as authority.

Dimensions:

- same dilemma;
- same approach intents;
- same cause set;
- same provider/context kind;
- same consequence classes;
- same technology family;
- same participant roles;
- same follow-up class.

Rules:

- identical semantic vector + different text = reskin warning/error;
- same kernel with meaningful context/pressure change = allowed variant;
- same choice shape repeated across many kernels = design warning;
- embeddings/LLM classification may later suggest clusters offline, but cannot suppress deterministic rule checks.

## 11. Coverage targets

```ts
type ProfessionalSituationCoverageTarget = Readonly<{
  id: ProfessionalSituationCoverageTargetId;
  implementationProfile: ImplementationProfile;
  requiredStageIds: readonly ProfessionalStageBand[];
  requiredProviderKinds: readonly ExperienceProviderKind[];
  requiredArchetypeIds: readonly ProfessionalChallengeArchetype[];
  requiredGoalClassIds: readonly ProfessionalGoalClass[];
  requiredCauseIds: readonly ChallengeCauseId[];
  requiredApproachIntentIds: readonly ProfessionalApproachIntentId[];
  requiredOutcomeClassIds: readonly ProfessionalOutcomeClass[];
  requiredRecoveryClassIds: readonly ProfessionalRecoveryClassId[];
  requiredTechnologyContextTags: readonly TechnologyContextTag[];
  minimumPairwiseCoverageBps: BasisPoints;
  requiredExplicitTuples: readonly ProfessionalSituationCoverageTuple[];
}>;
```

Coverage targets are profile-specific. They do not require all cross-products.

## 12. Diagnostics

Compiler emits:

- schema/reference errors;
- invalid compatibility tuples;
- unreachable variants;
- duplicate semantic signatures;
- near-duplicate clusters;
- presentation-only reskins;
- dominant approach risks;
- missing provider mappings;
- missing recovery/follow-up;
- chronology/access mismatch;
- materialization budget overflow;
- coverage deficits;
- overrepresented kernels/causes/approach shapes;
- never-selected candidates from simulation corpus;
- unstable generated IDs/fingerprints.

Each diagnostic contains stable code, severity, component IDs and remediation hint.

## 13. Validation rules

Reject when:

- kernel lacks one identifiable professional dilemma;
- ordinary choice has fewer than 2 or more than 4 approaches;
- approach intents are semantic duplicates;
- one approach dominates every declared fixture;
- pressure does not affect choice/outcome/recovery;
- context violates kernel/provider/stage/era constraints;
- bridge can apply effects outside provider ownership;
- failure/partial has no recovery where path continuation is required;
- assisted outcome can map to independent autonomy;
- presentation changes semantic facts;
- exact result/probability is exposed in Normal UI;
- composition depends on runtime LLM/network/system clock;
- generated ID depends on iteration/display text;
- semantic history cannot be snapshotted.

Warn when:

- kernel has too many context variants before playtest;
- one cause/approach shape dominates corpus;
- context differs only by employer/product name;
- multiple variants produce identical follow-up;
- text length exceeds Normal UI budget;
- coverage exists only through presentation variants;
- technology context is technically valid but historically unusual.

## 14. Content Studio

Initial authoring view:

- kernel editor;
- context/pressure/bridge compatibility preview;
- materialized variant list;
- player-facing situation preview;
- approach comparison;
- provider effect preview;
- semantic signature;
- duplicate cluster warning;
- coverage report;
- deterministic fixture preview;
- RU long-text/accessibility preview.

Content Studio does not modify production save or call privileged adapters.

## 15. Testing

### Unit

- stable tuple order;
- compatibility filtering;
- bounded expansion;
- stable IDs/fingerprints;
- semantic signature calculation;
- provider mapping completeness;
- presentation semantic immutability;
- chronology validation.

### Property

- input order does not affect registry;
- every emitted variant passes kernel/context/bridge constraints;
- materialization never exceeds budget;
- presentation changes never change signature;
- every failure path has declared recovery when required;
- no variant directly grants progression/provider state.

### Golden

- January diagnose compiled variant;
- low-access school fallback;
- same kernel under deadline pressure;
- invalid legacy pressure on beginner context;
- text-only reskin rejection;
- provider bridge mismatch;
- content removal/tombstone recovery.

### Simulation

- exposure distribution;
- exact/semantic repeat rate;
- approach-shape streaks;
- cause/provider/archetype concentration;
- never-selected variants;
- coverage by stage/year/seed;
- decision time and comprehension.

## 16. Forbidden drift

- runtime free composition;
- universal generic situation DSL before proven need;
- LLM-generated gameplay content at runtime;
- presentation variants counted as new gameplay;
- full Cartesian materialization;
- hidden correct-combination tables;
- content-owned provider effects;
- duplicate Event/Narrative pacing logic;
- hundreds of kernels before first-year playtest;
- embeddings as authoritative duplicate/eligibility decision;
- source code/syntax quiz content required for Normal play.
