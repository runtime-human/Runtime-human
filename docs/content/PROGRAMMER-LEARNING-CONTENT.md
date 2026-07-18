# Programmer Learning Content

## Статус

Нормативная content-спецификация для [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md).

Основание:

- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [Content Architecture](CONTENT-ARCHITECTURE.md);
- [Historical Catalog](HISTORICAL-CATALOG.md);
- [NPC Memory](../events/NPC-AND-NARRATIVE-MEMORY.md).

## 1. Цель

Content описывает:

- что доступно изучать;
- через какой источник;
- в какую эпоху и при каком access;
- какие approaches поддерживает источник;
- какой observable practice result возможен;
- какой feedback доступен;
- как перейти к проекту или следующему learning goal.

Content не содержит произвольный код и не изменяет mastery, familiarity, evidence, grade, equipment, money, relationship или project state напрямую.

## 2. Content domains

MVP namespaces:

```text
core.learning-goal.*
core.learning-source.*
core.learning-opportunity.*
core.learning-access-route.*
core.learning-artifact.*
core.learning-reason.*
```

IDs стабильны, не выводятся из display name и не переиспользуются.

## 3. Learning source definition

```ts
type LearningSourceDefinition = Readonly<{
  id: LearningSourceId;
  version: ContentVersion;
  family: LearningSourceFamily;
  title: LocalizationKey;
  description: LocalizationKey;
  affordances: LearningSourceAffordances;
  technologyIds: readonly TechnologyId[];
  prerequisiteCapabilityIds: readonly CapabilityMilestoneId[];
  availability: HistoricalLearningAvailability;
  accessRequirementIds: readonly LearningAccessRequirementId[];
  sourceQuality: InformationQualityBand;
  recencyPolicy: SourceRecencyPolicy;
  sourceRefs: readonly SourceRefId[];
}>;
```

### Source families

- `book-or-manual`;
- `worked-example`;
- `documentation`;
- `guided-class-or-club`;
- `practice-set`;
- `mentor-or-pair`;
- `community`;
- `personal-project`;
- `existing-code`;
- `interactive-platform`;
- `ai-assistant` — only in historically valid era.

Source family does not imply a universal fixed bonus.

## 4. Affordances

MVP/Recommended dimensions:

- conceptual explanation;
- worked examples;
- guided practice;
- independent practice;
- retrieval opportunity;
- transfer opportunity;
- feedback availability;
- collaboration;
- authentic project context;
- information quality;
- historical recency.

Values are bounded bands. Normal UI translates them into prose and does not show a matrix.

Validation warns when two sources are identical in all gameplay-relevant affordances and differ only by title/cost.

## 5. Learning opportunity definition

```ts
type LearningOpportunityDefinition = Readonly<{
  id: LearningOpportunityId;
  version: ContentVersion;
  goalId: LearningGoalId;
  provider: LearningProviderKind;
  sourceId: LearningSourceId;
  title: LocalizationKey;
  summary: LocalizationKey;
  accessRequirementIds: readonly LearningAccessRequirementId[];
  fallbackRouteIds: readonly AccessRouteId[];
  approaches: readonly LearningApproachDefinition[];
  relevantSkillIds: readonly SkillId[];
  technologyId?: TechnologyId;
  challengeBand: CasualChallengeBand;
  feedbackProfileId?: FeedbackProfileId;
  possibleOutcomeIds: readonly LearningOutcomeDefinitionId[];
  nextStepIds: readonly LearningNextStepId[];
  antiRepeatKey: AntiRepeatKey;
}>;
```

Blocking opportunity contains 2–4 genuinely different approaches. Routine practice can contain no player choice and aggregate automatically.

## 6. Approach definition

```ts
type LearningApproachDefinition = Readonly<{
  id: LearningApproachId;
  label: LocalizationKey;
  forecast: LocalizationKey;
  tradeOffs: readonly LocalizationKey[];
  practiceMode: PracticeMode;
  assistanceMode: AssistanceMode;
  requiredCapabilityIds: readonly CapabilityMilestoneId[];
  requiredAccessIds: readonly LearningAccessRequirementId[];
}>;
```

Content cannot declare direct `masteryGain`, `gradeDelta`, `evidenceScore` or exact success chance.

## 7. Access route definition

```ts
type LearningAccessRouteDefinition = Readonly<{
  id: AccessRouteId;
  version: ContentVersion;
  title: LocalizationKey;
  description: LocalizationKey;
  eraEligibility: HistoricalRange;
  requiredWorldFacts: readonly WorldFactRequirement[];
  domainRequests: readonly TypedDomainRequest[];
  resultingAccessFacts: readonly LearningAccessFactProposal[];
  timeCostBand: CostBand;
  moneyCostBand: CostBand;
  retryCondition?: AccessRetryCondition;
  sourceRefs: readonly SourceRefId[];
}>;
```

Domain owners validate/apply requests. Content cannot directly grant equipment, money, relationship or access state.

Path-blocking requirement must have at least one fallback route or explicit future retry condition.

## 8. Feedback profile

```ts
type FeedbackProfileDefinition = Readonly<{
  id: FeedbackProfileId;
  timing: FeedbackTiming;
  quality: FeedbackQualityBand;
  assistanceModes: readonly AssistanceMode[];
  subjectFitTags: readonly SubjectFitTag[];
  providerKind: FeedbackProviderKind;
}>;
```

Provider truth determines actual availability. A mentor profile does not guarantee presence in a specific save.

### Assistance semantics

- hint;
- conceptual explanation;
- guided walkthrough;
- pair work;
- takeover.

Content explanation must state when result is assisted/shared. It cannot label takeover as independent.

## 9. Learning artifact

Observable artifact examples:

- explanation in character journal;
- reproduced listing;
- modified example;
- completed exercise;
- small runnable program;
- debugging notes;
- comparison of two approaches;
- project change;
- reviewed/generated solution with verification.

Artifact snapshot preserves semantic meaning after content removal. It is not required to store actual source code.

## 10. Historical learning availability

```ts
type HistoricalLearningAvailability = Readonly<{
  globallyAvailableFrom: HistoricalDate;
  locallyAvailableFrom?: HistoricalDate;
  commonFrom?: HistoricalDate;
  decliningFrom?: HistoricalDate;
  unavailableAfter?: HistoricalDate;
  requiredPlatformIds: readonly HistoricalEntityId[];
  distributionChannels: readonly LearningDistributionChannel[];
  languageAvailability: readonly LanguageAvailabilityBand[];
  sourceRefs: readonly SourceRefId[];
  confidence: 'primary' | 'secondary' | 'estimated';
}>;
```

Distribution channels:

- bundled manual;
- printed book/magazine;
- school/club;
- disk exchange;
- BBS;
- web page/forum;
- downloadable docs;
- video platform;
- Git repository;
- interactive platform;
- AI assistant.

Global release is not local availability.

## 11. Era profiles

### 1990–1999

Authoring emphasis:

- print/manual/listing sources;
- school/club/shared-device access;
- local mentors/peers;
- delayed feedback;
- offline practice;
- BBS only where local access permits.

### 2000–2009

- web tutorials/forums/IRC;
- downloadable documentation;
- wider home PC access;
- open-source code and community feedback.

### 2010–2019

- video courses;
- Q&A platforms;
- Git hosting;
- interactive courses/bootcamps;
- source abundance and framework churn.

### 2020+

- AI assistance;
- interactive sandboxes;
- low search cost;
- verification and shallow-understanding risks.

Exact dates require source registry review.

## 12. MVP content set

January/first-year starter set:

- one beginner learning goal;
- one book/manual-like source;
- one worked example;
- one home access profile;
- one school-lab fallback;
- one mentor/teacher feedback possibility;
- one modify-example opportunity;
- one independent follow-up;
- one project/challenge bridge;
- one interruption/recovery branch;
- Russian localization and long-text fixture.

No course marketplace or hundreds of source definitions.

## 13. Semantic validation

Reject or warn when:

- learning goal is missing or not observable;
- blocking opportunity has fewer than 2 or more than 4 approaches;
- source directly mutates professional state;
- source directly grants grade/evidence;
- source appears before historical availability;
- AI appears before allowed era;
- passive reading creates independent delivery;
- assistance is mislabeled;
- path-blocking access has no recovery;
- one expensive source dominates all declared contexts;
- source definitions are gameplay-identical reskins;
- failure has no next step;
- content requires syntax/API knowledge in Normal choice;
- duplicate anti-repeat keys are missing;
- required localization/source refs are absent.

## 14. Casual-complexity lint

Warn when:

- ordinary screen would show more than three sources;
- learning creates more than one blocking decision in an ordinary month;
- source description exposes internal coefficients;
- opportunity requires a daily schedule;
- more than one new capability concept appears at once;
- routine practice creates separate event/evidence cards;
- content introduces unused university/AI/adaptive fields;
- access requires a new inventory inside Learning Engine.

## 15. Content Studio scope

After Vertical Slice, preview:

- learning goal/source card;
- access state and fallback route;
- 2–4 approaches;
- assistance wording;
- observable artifact;
- result/next step;
- learning → challenge transition;
- historical availability;
- RU localization/accessibility;
- deterministic fixtures.

Not included initially:

- adaptive tutor editor;
- certificate trees;
- AI prompt/editor;
- daily timetable;
- full education institution builder.

## 16. Modding

Data-only mods may add sources/opportunities/routes supported by current API.

Forbidden:

- executable tutoring scripts;
- network fetch for source content;
- direct skill/project/access patches;
- arbitrary AI calls;
- fabricated historical availability without source refs;
- paths that permanently block vanilla starts;
- hidden exact reward tables required for play.

## 17. Definition of Done

MVP learning content готово, когда:

- one source/opportunity/route compiles;
- source has distinct affordances and limitation;
- low-access start reaches practice;
- player choice has 2–3 readable approaches;
- observable artifact exists;
- assisted/independent semantics validate;
- project/challenge bridge is explicit;
- chronology/source refs validate;
- routine practice can aggregate;
- no content directly changes professional or world state.