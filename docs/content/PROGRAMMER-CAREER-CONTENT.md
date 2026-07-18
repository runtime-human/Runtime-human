---
title: "Programmer Career Content"
type: content
status: draft
canon: true
depends_on: [ADR-018]
updated: 2026-07-18
---

# Programmer Career Content

Нормативные источники:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md);
- [Programmer Career UI](../ui/PROGRAMMER-CAREER-UI.md);
- [Historical Labor Market Catalog](HISTORICAL-LABOR-MARKET-CATALOG.md);
- [Content Architecture](CONTENT-ARCHITECTURE.md).

## Цель

Определить content contracts для opportunities, fictional employers, hiring stages, offers, workplace contexts и career transitions без executable scripts, hidden stat tables и дублирования domain state.

## 1. Content ownership

Content может описывать:

- fictional employer archetype;
- opportunity template;
- role expectation profile;
- hiring process template;
- interview/work-sample situation reference;
- offer condition template;
- workplace context profile;
- promotion/transition policy profile;
- labor-market profile reference;
- localized explanations and reason-code mapping.

Content не может:

- изменять save напрямую;
- менять skills/mastery/evidence/grade;
- рассчитывать Project outcome;
- создавать salary transaction;
- менять NPC relationship;
- исполнять произвольный код;
- обращаться к filesystem/network/system clock;
- задавать hidden universal correct answer.

## 2. Stable IDs

Обязательные stable IDs:

- `EmployerArchetypeId`;
- `CareerOpportunityDefinitionId`;
- `CareerRoleProfileId`;
- `HiringProcessTemplateId`;
- `HiringStageTemplateId`;
- `OfferProfileId`;
- `EmploymentContextProfileId`;
- `CareerTransitionPolicyId`;
- `LaborMarketProfileId`;
- localization keys;
- source refs.

Удаление/переименование требует tombstone/migration/compatibility review, если ID уже присутствует в save/history/fixtures.

## 3. Employer archetype schema

```ts
type EmployerArchetypeDefinition = Readonly<{
  id: EmployerArchetypeId;
  displayNameKey: LocalizationKey;
  descriptionKey: LocalizationKey;
  availableEraRange: EraRange;
  regionIds: readonly RegionId[];
  industryIds: readonly IndustryId[];
  sizeBand: EmployerSizeBand;
  stabilityBand: CasualStabilityBand;
  processMaturityBand: CasualProcessBand;
  mentorshipBand: CasualSupportBand;
  workloadBand: CasualWorkloadBand;
  roleBreadthBand: CasualScopeBand;
  legacyPressureBand: CasualPressureBand;
  trainingToleranceBand: CasualOpportunityBand;
  commonRoleProfileIds: readonly CareerRoleProfileId[];
  commonOpportunitySourceKinds: readonly CareerOpportunitySource[];
  commonHiringProcessIds: readonly HiringProcessTemplateId[];
  contextProfileIds: readonly EmploymentContextProfileId[];
  sourceRefs: readonly HistoricalSourceRef[];
}>;
```

Employer является fictional. Historical refs подтверждают era constraints, а не существование вымышленной компании.

## 4. MVP employer archetypes

### `small-product-team`

- широкий scope;
- высокая learning-through-work;
- неформальное mentorship;
- средняя stability;
- высокая uncertainty workload;
- быстрый рост allowed scope;
- мало formal process.

### `large-stable-organization`

- ограниченный role scope;
- формальный onboarding/review;
- высокая stability;
- legacy/process pressure;
- медленный promotion;
- ясные expectations.

### `service-contract-team`

- много customer contexts;
- deadline pressure;
- variable workload;
- быстрый рост familiarity;
- меньше product ownership;
- mixed mentorship.

Каждый archetype обязан создавать минимум один unique trade-off, который виден в Normal UI.

## 5. Role profile schema

```ts
type CareerRoleProfileDefinition = Readonly<{
  id: CareerRoleProfileId;
  roleFamilyId: ProfessionalRoleFamilyId;
  advertisedTitleKeys: readonly LocalizationKey[];
  expectedScope: ProfessionalScopeBand;
  hardAccessRequirements: readonly CareerRequirementDefinition[];
  demonstratedCapabilityExpectations: readonly CareerRequirementDefinition[];
  contextFamiliarityExpectations: readonly CareerRequirementDefinition[];
  marketSignalExpectations: readonly CareerRequirementDefinition[];
  trainableGaps: readonly TrainableGapDefinition[];
  preferences: readonly CareerRequirementDefinition[];
  typicalResponsibilityMix: ResponsibilityMix;
  projectRequestProfileIds: readonly ProjectWorkRequestProfileId[];
  learningOpportunityProfileIds: readonly LearningOpportunityDefinitionId[];
  challengeSituationProfileIds: readonly TechnicalSituationDefinitionId[];
}>;
```

Requirement definition использует semantic reason codes, а не arbitrary script/formula.

## 6. Opportunity template schema

```ts
type CareerOpportunityDefinition = Readonly<{
  id: CareerOpportunityDefinitionId;
  employerArchetypeId: EmployerArchetypeId;
  roleProfileId: CareerRoleProfileId;
  sourceKinds: readonly CareerOpportunitySource[];
  marketProfileIds: readonly LaborMarketProfileId[];
  availabilityConditions: readonly DeclarativeCondition[];
  visibleConditionKeys: readonly LocalizationKey[];
  uncertainConditionDefinitions: readonly CareerUncertaintyDefinition[];
  hiringProcessTemplateId: HiringProcessTemplateId;
  offerProfileId: OfferProfileId;
  expiryPolicy: OpportunityExpiryPolicy;
  fallbackOrRetry?: CareerFallbackDefinition;
  explanationKeys: CareerOpportunityExplanationKeys;
}>;
```

### Availability conditions

Разрешены только compiled declarative conditions над public owner snapshots:

- era/region;
- age/legal eligibility;
- schedule/location availability;
- role family readiness band;
- required credential signal;
- public project/recommendation/referral signal;
- market state;
- current employment state.

Content не читает hidden mastery points и не меняет state.

## 7. Hiring process template

```ts
type HiringProcessTemplateDefinition = Readonly<{
  id: HiringProcessTemplateId;
  stageIds: readonly HiringStageTemplateId[];
  maxMeaningfulBlockingStages: 1 | 2;
  cancellationPolicyId: EmployerCancellationPolicyId;
  feedbackPolicyId: HiringFeedbackPolicyId;
  outcomePolicyId: HiringOutcomePolicyId;
}>;
```

### Stage templates

```ts
type HiringStageTemplateDefinition = Readonly<{
  id: HiringStageTemplateId;
  kind: HiringStageKind;
  blocking: boolean;
  relevantRequirementKinds: readonly CareerRequirementKind[];
  portfolioStoryFilters?: readonly PortfolioStoryFilter[];
  technicalSituationDefinitionId?: TechnicalSituationDefinitionId;
  learningPreparationDefinitionId?: LearningOpportunityDefinitionId;
  availableApproachIds: readonly CareerApproachDefinitionId[];
  outcomeReasonMapId: CareerReasonMapId;
  localization: HiringStageLocalizationKeys;
}>;
```

Meaningful technical stage ссылается на Professional Challenge content, а не дублирует его.

## 8. Candidate approach content

Approach definition описывает:

- player-facing intent;
- visible trade-off;
- eligibility;
- cost/capacity request;
- employer signal proposal;
- optional learning preparation reference;
- reason codes.

Approach не содержит финальный hire probability.

Примеры IDs:

- `career.show-relevant-project`;
- `career.explain-gap-honestly`;
- `career.prepare-target-technology`;
- `career.emphasize-learning-trajectory`;
- `career.accept-bounded-work-sample`;
- `career.ask-role-clarification`;
- `career.propose-alternate-scope`;
- `career.withdraw-from-process`.

## 9. Offer profile

```ts
type OfferProfileDefinition = Readonly<{
  id: OfferProfileId;
  compensationBandPolicyId: CompensationBandPolicyId;
  scheduleOptions: readonly EmploymentScheduleDefinition[];
  locationModes: readonly LocationMode[];
  visibleConditionDefinitions: readonly OfferConditionDefinition[];
  uncertainConditionDefinitions: readonly CareerUncertaintyDefinition[];
  probationPolicyId?: ProbationPolicyId;
  expiryPolicy: OfferExpiryPolicy;
  negotiationProfileId?: NegotiationProfileId;
}>;
```

Compensation policy возвращает contract proposal владельцу Economy. Content не начисляет деньги.

## 10. Employment context profile

```ts
type EmploymentContextProfileDefinition = Readonly<{
  id: EmploymentContextProfileId;
  mentorship: CasualSupportBand;
  autonomyExpectation: CasualAutonomyBand;
  workload: CasualWorkloadBand;
  stability: CasualStabilityBand;
  processMaturity: CasualProcessBand;
  legacyPressure: CasualPressureBand;
  qualityExpectation: CasualQualityBand;
  learningAccess: CasualOpportunityBand;
  roleBreadth: CasualScopeBand;
  technologyContextIds: readonly TechnologyContextDefinitionId[];
  projectContextProfileIds: readonly WorkplaceProjectContextProfileId[];
  workplaceSituationDefinitionIds: readonly WorkplaceSituationDefinitionId[];
}>;
```

Archetype/context не задаёт fixed XP multipliers. Он определяет affordances, constraints, situations и feedback.

## 11. Workplace situation content

Organizational situation examples:

- manager changes expected scope;
- deadline promised before technical estimate;
- review feedback conflicts with local practice;
- overtime request;
- ownership offered;
- team credit/contribution dispute;
- promotion discussion;
- reorganization/layoff;
- internal transfer;
- mentoring opportunity.

Technical core situation делегируется Professional Challenge Engine. Project effects делегируются Project Engine.

## 12. Outcome reason taxonomy

### Candidate capability

- `career.capability.not-yet-independent`;
- `career.capability.scope-too-large`;
- `career.capability.quality-evidence-weak`;
- `career.capability.relevant-strength-demonstrated`.

### Signal/visibility

- `career.signal.project-relevant`;
- `career.signal.project-too-small`;
- `career.signal.context-not-visible`;
- `career.signal.credential-opens-channel`;
- `career.signal.referral-opens-stage`.

### Familiarity/trainable gap

- `career.familiarity.target-technology-gap`;
- `career.familiarity.gap-trainable`;
- `career.familiarity.gap-not-trainable-for-role`.

### Process/approach

- `career.process.clear-reasoning`;
- `career.process.risk-clarified`;
- `career.process.work-sample-strong`;
- `career.process.assistance-limits-autonomy-signal`;
- `career.process.candidate-withdrew`.

### Employer/market cause

- `career.employer.role-cancelled`;
- `career.employer.budget-frozen`;
- `career.employer.alternate-role-available`;
- `career.market.competition-high`;
- `career.market.demand-low`.

### Employment/trust

- `career.trust.delivery-reliable`;
- `career.trust.quality-reliable`;
- `career.trust.risk-disclosed-early`;
- `career.trust.problem-hidden`;
- `career.trust.recovery-strong`;
- `career.trust.team-result-without-contribution`.

Reason codes должны иметь Normal/Details localized explanation.

## 13. Career transition content

Transition policy получает typed summaries и возвращает proposal/reasons:

- scope expansion;
- salary adjustment;
- promotion;
- lateral transfer;
- promotion delay/denial;
- voluntary exit;
- contract end;
- layoff/reorganization/closure;
- role mismatch/performance dismissal;
- health/life interruption.

Content не изменяет grade и не завершает ProjectState напрямую.

## 14. Historical content rules

- global existence и local availability разделены;
- реальные labor-market claims имеют provenance;
- fictional employer name/history не выдаются за реальные;
- modern terms не используются в старой эпохе без localization adaptation;
- hiring channels, interview patterns, remote reach, credentials и technology demand ограничены era/region;
- AI-assisted interview content доступен только исторически допустимо;
- historical uncertainty маркируется.

## 15. MVP Career Slice content budget

Минимум:

- 1 labor market profile;
- 3 employer archetypes;
- 1 role family;
- 3 opportunity definitions;
- 3 opportunity sources;
- 2 hiring process templates;
- 1 portfolio discussion;
- 1 `diagnose` interview situation;
- 4 candidate approaches;
- 4 hiring outcomes;
- 2 offer profiles;
- 3 employment contexts;
- 1 workplace challenge;
- 1 promotion delayed/scope expanded event;
- 1 rejection recovery;
- 1 layoff/re-entry fixture for contract verification;
- long-RU and accessibility fixtures.

## 16. Validation

Content compile fails when:

- stable ID duplicate/missing;
- referenced owner definition missing;
- opportunity has no market/era availability;
- path-blocking requirement has no fallback/retry where required;
- ordinary process has >2 meaningful blocking stages;
- blocking stage has <2 or >4 approaches;
- approach has no visible trade-off;
- technical stage embeds duplicate resolver instead of shared challenge ref;
- offer has no meaningful non-salary dimension;
- employer archetypes differ only by numeric multiplier;
- outcome has no reason code/next step;
- historical factual field has no source ref;
- content tries to mutate owner state;
- player-facing text exposes hidden formula/probability;
- long-RU localization missing.

## 17. Content authoring checklist

Для каждого opportunity author отвечает:

1. Почему она появляется сейчас?
2. Чем отличается от альтернативы минимум по двум измерениям?
3. Какой реальный professional signal она использует?
4. Какой gap является capability, signal, familiarity или access?
5. Какие 2–4 meaningful approaches доступны?
6. Почему ни один approach не всегда лучший?
7. Какие employer-caused outcomes возможны?
8. Какой next step существует после no-offer?
9. Что увидит Normal UI?
10. Какой owner применяет каждое последствие?
11. Какие deterministic fixtures нужны?
12. Какие historical refs подтверждают era/market assumptions?
