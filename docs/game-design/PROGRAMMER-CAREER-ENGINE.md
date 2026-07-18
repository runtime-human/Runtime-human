# Programmer Career, Hiring & Employment Engine

Нормативные источники:

- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Casual Simulation Design](CASUAL-SIMULATION-DESIGN.md);
- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Professional Challenge Engine](PROFESSIONAL-CHALLENGE-ENGINE.md);
- [Programmer Learning Engine](PROGRAMMER-LEARNING-ENGINE.md);
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

## Цель

Сделать карьеру программиста самостоятельной причинной игрой без job-board CRM, скрытого stat-check, ежедневной работы и преждевременной Company/HR-симуляции.

Игровая формула:

```text
профессиональная история
→ доступные возможности
→ выбор карьерного приоритета
→ содержательный этап отбора
→ предложение с компромиссами
→ рабочий контекст
→ технические и организационные последствия
→ доверие и новый scope
→ следующий переход
```

Игрок выбирает не просто название должности. Он выбирает контекст, который определяет задачи, помощь, автономность, доход, нагрузку, evidence и будущие возможности.

## 1. Boundary

Career Engine владеет:

- `CareerOpportunity`;
- `CareerIntent`;
- hiring process/stages;
- employer-visible signal projection;
- `EmploymentOffer`;
- `EmploymentPosition`;
- role expectations;
- workplace trust;
- promotion/lateral move/exit/dismissal/layoff/re-entry;
- career history;
- labor-market opportunity projection.

Career Engine не владеет:

- mastery, fluency, familiarity, evidence или Professional Grade;
- technical challenge resolution;
- ProjectState/WorkPackage/quality/debt/defect/release;
- learning outcome;
- NPC relationship truth;
- health/capacity truth;
- actual cash ledger;
- team/payroll/budget/company portfolio truth.

## 2. Authoritative и derived state

### Authoritative Career state

В MVP/Recommended сохраняются только используемые поля:

```ts
type CareerState = Readonly<{
  activeIntent?: CareerIntent;
  activeSearch?: CareerSearchCampaign;
  activeHiringProcesses: readonly HiringProcess[];
  activeOffers: readonly EmploymentOffer[];
  activePosition?: EmploymentPosition;
  employerTrust?: WorkplaceTrustState;
  history: readonly CareerHistoryEntry[];
}>;
```

### Derived read models

Не обязаны сохраняться:

- market competitiveness summary;
- employer role-fit explanation;
- sorted opportunity recommendations;
- comparison badges;
- promotion readiness explanation;
- market trend labels.

Они пересчитываются из authoritative state, content/version fingerprints и external owner snapshots.

## 3. Professional truth и market projection

Career получает immutable professional snapshot:

```ts
type CareerProfessionalSnapshot = Readonly<{
  awardedGrade: ProfessionalGradeId;
  gradeReadiness: ProfessionalReadinessSummary;
  capabilities: readonly CapabilitySummary[];
  technologyFamiliarity: readonly TechnologyFamiliaritySummary[];
  eligiblePortfolioStories: readonly PortfolioStoryRef[];
  careerRelevantHistory: readonly ProfessionalHistorySignal[];
}>;
```

Employer не получает этот snapshot напрямую. Career строит доступный работодателю `CandidateSignalProfile`:

```ts
type CandidateSignalProfile = Readonly<{
  credentials: readonly CredentialSignal[];
  publicProjects: readonly ProjectSignal[];
  priorPositions: readonly PositionSignal[];
  recommendations: readonly RecommendationSignal[];
  reputation: readonly ReputationSignal[];
  demonstratedStories: readonly PortfolioStorySignal[];
  visibilityGaps: readonly SignalGap[];
}>;
```

### Нормативное правило

```text
capability truth ≠ employer-visible signal ≠ employer projection
```

Сильная capability может быть плохо видна. Сильный credential может быть слабым доказательством самостоятельности. Career должен объяснять это, но не раскрывать exact hidden formula.

## 4. Career Opportunity

```ts
type CareerOpportunity = Readonly<{
  id: CareerOpportunityId;
  definitionId: CareerOpportunityDefinitionId;
  source: CareerOpportunitySource;
  employerArchetypeId: EmployerArchetypeId;
  roleFamily: ProfessionalRoleFamilyId;
  advertisedTitle: LocalizationKey;
  expectedScope: ProfessionalScopeBand;
  employmentType: EmploymentType;
  locationMode: LocationMode;
  accessRequirements: readonly CareerAccessRequirement[];
  expectedSignals: readonly EmployerSignalExpectation[];
  preferredSignals: readonly EmployerSignalExpectation[];
  trainableGaps: readonly TrainableGap[];
  visibleConditions: CareerConditionPreview;
  uncertainConditions: readonly CareerUncertainty[];
  selectionPlanId: HiringProcessTemplateId;
  marketContextId: LaborMarketProfileId;
  generatedAt: GameDate;
  expiresAt?: GameDate;
  generationFingerprint: Fingerprint;
}>;
```

### Opportunity sources

Baseline:

- `public-vacancy`;
- `school-or-training-channel`;
- `mentor-or-peer-referral`;
- `project-or-community-invitation`;
- `recruiter-contact`;
- `client-opportunity`;
- `internal-transfer`;
- `former-employer-return`.

Источник влияет на:

- chance to be surfaced;
- information completeness;
- access to selection stage;
- starting relationship/context;
- expiry/urgency.

Источник не выдаёт offer и не меняет capability.

## 5. Требования роли

Каждое requirement имеет тип.

### `hard-access`

- legal/work eligibility;
- age/time/schedule;
- language;
- required location;
- mandatory regulated credential.

Неудовлетворённый hard-access requirement блокирует конкретную opportunity, но content обязан иметь alternative route или visible retry condition, если это path-critical opportunity.

### `demonstrated-capability`

- самостоятельно завершал ограниченные задачи;
- диагностировал ошибки;
- работал в существующем коде;
- проверял качество;
- объяснял решение;
- действовал с нужной автономностью.

### `context-familiarity`

- technology/platform;
- domain;
- legacy environment;
- deployment/operations context.

### `market-signal`

- diploma/certificate;
- commercial history;
- public project;
- recommendation;
- released outcome;
- known community contribution.

### `trainable-gap`

Работодатель готов закрыть пробел через onboarding/mentorship:

- framework;
- internal tools;
- domain language;
- process;
- company-specific stack.

### `preference`

Желательно, но не обязательно. Preference влияет на role fit, а не превращается в hard gate.

## 6. Labor Market Profile

```ts
type LaborMarketProfile = Readonly<{
  id: LaborMarketProfileId;
  eraId: EraId;
  regionId: RegionId;
  industryId: IndustryId;
  roleFamily: ProfessionalRoleFamilyId;
  demand: CasualMarketBand;
  candidateCompetition: CasualMarketBand;
  hiringSelectivity: CasualMarketBand;
  credentialBias: CasualBiasBand;
  portfolioOpenness: CasualOpportunityBand;
  referralLeverage: CasualOpportunityBand;
  trainableGapTolerance: CasualOpportunityBand;
  compensationPressure: CasualMarketBand;
  stability: CasualStabilityBand;
  remoteReach: CasualReachBand;
  commonSelectionPatterns: readonly HiringPatternId[];
  commonEmploymentTypes: readonly EmploymentType[];
  sourceRefs: readonly HistoricalSourceRef[];
}>;
```

Market profile не симулирует каждого кандидата. Он проектирует количество и тип возможностей, employer expectations и selection patterns.

## 7. Career Intent и search campaign

```ts
type CareerIntentKind =
  | "first-professional-entry"
  | "mentorship-first"
  | "specialization-first"
  | "income-first"
  | "stability-first"
  | "flexibility-first"
  | "portfolio-first"
  | "network-first"
  | "quiet-search";
```

Intent является устойчивым приоритетом, а не ежемесячной кнопкой. Его можно изменить содержательным решением.

```ts
type CareerSearchCampaign = Readonly<{
  id: CareerSearchCampaignId;
  intent: CareerIntent;
  startedAt: GameDate;
  status: "active" | "paused" | "completed" | "cancelled";
  surfacedOpportunityIds: readonly CareerOpportunityId[];
  aggregateSearchSummary: SearchRoutineSummary;
  decisionFingerprint: Fingerprint;
}>;
```

### Routine aggregation

Автоматически агрегируются:

- просмотр объявлений;
- obvious mismatch filtering;
- routine application preparation;
- обычные отказы;
- repeated recruiter messages;
- scheduling.

Игроку показываются 1–3 opportunities, где выбор меняет историю.

## 8. Opportunity surfacing

Opportunity становится meaningful, если выполняется хотя бы одно условие:

- создаёт заметный trade-off;
- открывает новый профессиональный контекст;
- проверяет новую capability;
- предлагает важный recovery/re-entry route;
- меняет доход/стабильность/географию;
- конкурирует с текущей работой или жизненным обязательством;
- содержит значимую uncertainty.

Не показывать три вакансии, отличающиеся только зарплатой на несколько процентов.

## 9. Hiring Process

```ts
type HiringProcess = Readonly<{
  id: HiringProcessId;
  opportunityId: CareerOpportunityId;
  status: HiringProcessStatus;
  stages: readonly HiringStageState[];
  currentStageId?: HiringStageId;
  candidateSignalSnapshot: CandidateSignalProfile;
  employerProjection: EmployerRoleFitProjection;
  committedDecisionIds: readonly DecisionId[];
  manifestRef: DeterminismManifestRef;
}>;
```

### Baseline stage types

- `eligibility-review`;
- `signal-review`;
- `portfolio-discussion`;
- `situational-interview`;
- `bounded-work-sample`;
- `manager-or-team-conversation`;
- `offer-discussion`.

Eligibility и routine signal review обычно non-blocking. Ordinary process имеет 1–2 meaningful blocking stages.

### Portfolio discussion

Использует сохранённые portfolio stories:

```text
context
→ personal contribution
→ challenge
→ chosen approach
→ outcome
→ reflection
```

Игрок выбирает, какую реальную историю показать и на чём сделать акцент. Нельзя выдумать capability, которой нет в history.

### Situational interview

Career Provider создаёт `TechnicalSituation` и делегирует Professional Challenge Engine.

Interview outcome использует:

- approach relevance;
- current capability;
- communication/explanation signal;
- assistance used;
- role expectations;
- deterministic complication.

Interview success не является production evidence.

### Work sample

Ограниченная работа, близкая к роли:

- изменить маленький существующий компонент;
- диагностировать reproducible issue;
- проверить результат;
- объяснить trade-off.

Нет полноценного IDE gameplay. Результат персонажа моделируется shared engines.

## 10. Candidate approaches

В meaningful hiring stage показываются 2–4 approaches:

- показать самый сильный релевантный проект;
- честно обозначить пробел и план обучения;
- подготовиться под technology/context;
- сделать упор на learning trajectory;
- выполнить bounded work sample;
- запросить clarification;
- отказаться от несоразмерного процесса;
- предложить alternative role/scope.

Ни один approach не глобально лучший. Пример:

- honesty полезна для mentorship employer, но слабее для immediate-autonomy role;
- preparation снижает familiarity gap, но не создаёт sustained evidence;
- strong project повышает signal, но может быть нерелевантен контексту;
- work sample даёт observable signal, но требует capacity и может быть плохим trade-off.

## 11. Employer Role Fit Projection

```ts
type EmployerRoleFitProjection = Readonly<{
  overallBand: CasualFitBand;
  demonstratedStrengths: readonly EmployerReasonCode[];
  visibleGaps: readonly EmployerReasonCode[];
  uncertainAreas: readonly EmployerReasonCode[];
  trainableAreas: readonly EmployerReasonCode[];
  confidence: ProjectionConfidenceBand;
}>;
```

Это employer-specific read model. Он не сохраняется как global candidate score.

Запрещено показывать exact probability hire. UI может показать:

- «профиль выглядит подходящим»;
- «есть заметный пробел в самостоятельной работе»;
- «компания готова обучать этой технологии»;
- «решение сильно зависит от собеседования».

## 12. Hiring outcome

```ts
type HiringOutcomeKind =
  | "strong-offer"
  | "standard-offer"
  | "conditional-offer"
  | "trial-or-internship-offer"
  | "alternate-role"
  | "continue-after-preparation"
  | "talent-pool"
  | "rejection-with-feedback"
  | "rejection-without-feedback"
  | "candidate-withdrawal"
  | "employer-cancelled";
```

Outcome содержит:

- primary reason;
- supporting reasons;
- candidate-related vs employer/market-related cause;
- feedback availability;
- recovery/next step;
- optional offer.

No-offer не уменьшает Professional Grade. Candidate-related feedback может создать Learning Opportunity или portfolio next step.

## 13. Employment Offer

```ts
type EmploymentOffer = Readonly<{
  id: EmploymentOfferId;
  hiringProcessId: HiringProcessId;
  employerArchetypeId: EmployerArchetypeId;
  roleFamily: ProfessionalRoleFamilyId;
  title: LocalizationKey;
  expectedScope: ProfessionalScopeBand;
  compensation: CompensationPackage;
  schedule: EmploymentSchedule;
  locationMode: LocationMode;
  visibleConditions: OfferConditionSummary;
  uncertainConditions: readonly CareerUncertainty[];
  probation?: ProbationTerms;
  expiresAt: GameDate;
  offerFingerprint: Fingerprint;
}>;
```

### Offer dimensions

- income;
- stability;
- mentorship;
- task quality/scope;
- technology relevance;
- workload;
- autonomy;
- growth opportunity;
- location/flexibility;
- values/process fit.

Normal mode показывает 4–6 наиболее важных для текущего intent измерений.

## 14. Employment Position

```ts
type EmploymentPosition = Readonly<{
  id: EmploymentPositionId;
  employerArchetypeId: EmployerArchetypeId;
  roleFamily: ProfessionalRoleFamilyId;
  title: LocalizationKey;
  expectedScope: ProfessionalScopeBand;
  employmentType: EmploymentType;
  startedAt: GameDate;
  compensationContract: CompensationContractRef;
  scheduleCommitment: ScheduleCommitmentRef;
  workplaceContext: EmploymentContext;
  status: "active" | "notice" | "suspended" | "ended";
}>;
```

Employment Position создаёт typed inputs для Project/Learning/Challenge/Life/Economy owners.

## 15. Employment Context

```ts
type EmploymentContext = Readonly<{
  mentorship: CasualSupportBand;
  autonomyExpectation: CasualAutonomyBand;
  workload: CasualWorkloadBand;
  stability: CasualStabilityBand;
  processMaturity: CasualProcessBand;
  legacyPressure: CasualPressureBand;
  qualityExpectation: CasualQualityBand;
  learningAccess: CasualOpportunityBand;
  roleBreadth: CasualScopeBand;
  technologyContext: TechnologyContextRef;
  projectContext: WorkplaceProjectContextRef;
}>;
```

Контекст проектируется из fictional employer archetype и текущих Company signals. Он не является полной компанией.

## 16. Employer archetypes

MVP Casual использует три контрастных archetype:

### Маленькая продуктовая команда

- широкий scope;
- быстрый рост responsibility;
- сильное learning-through-work;
- средняя/низкая stability;
- риск overload;
- мало formal process.

### Крупная стабильная организация

- узкий понятный scope;
- формальное onboarding/review;
- высокая stability;
- медленный title/scope growth;
- legacy/process constraints.

### Сервисная/контрактная команда

- разнообразные contexts;
- deadline/client pressure;
- быстрый рост familiarity;
- ограниченное product ownership;
- variable workload.

Архетипы отличаются ситуациями и trade-offs, а не фиксированными XP multipliers.

## 17. Work as automatic commitment

Каждый месяц Employment Provider:

1. получает capacity/economy/life snapshots;
2. формирует routine work aggregate;
3. при необходимости создаёт один meaningful workplace situation;
4. создаёт ProjectWorkRequest, LearningOpportunity или TechnicalSituation;
5. применяет organizational outcome;
6. создаёт Career-specific episode только при реальном organizational/interview/leadership outcome;
7. передаёт technical/professional outcomes владельцам;
8. формирует causal report.

Игрок не нажимает «работать» и не распределяет часы сотрудников.

## 18. Workplace Trust

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

Это несколько bands, а не единый score.

Trust updates принимают summary:

- expected vs actual responsibility;
- contribution;
- deadline/quality result;
- risk disclosure;
- assistance;
- recovery;
- collaboration/review/mentoring.

Team success не превращается в personal trust без contribution. Failure with honest escalation/recovery может сохранять или повышать определённые trust dimensions.

## 19. Promotion and role transition

```ts
type CareerTransitionKind =
  | "scope-expanded"
  | "salary-adjusted"
  | "promoted"
  | "lateral-transfer"
  | "specialization-change"
  | "management-path-offered"
  | "promotion-delayed"
  | "promotion-denied"
  | "voluntary-exit"
  | "contract-ended"
  | "laid-off"
  | "company-closed"
  | "reorganized"
  | "role-mismatch-exit"
  | "performance-dismissal"
  | "misconduct-dismissal"
  | "health-or-life-interruption";
```

Promotion resolver использует:

- professional readiness summary;
- sustained workplace contribution;
- workplace trust;
- available scope/position signal;
- employer advancement policy;
- Company budget/state signal;
- manager sponsorship signal if available.

Career не создаёт grade award. Progression не создаёт promotion.

## 20. Job loss and re-entry

### Market/company cause

Layoff, closure, cancelled role и reorganization:

- не уменьшают grade;
- не создают false performance failure;
- могут изменить income/stability/reputation/network;
- создают immediate recovery opportunities.

### Performance/role mismatch

- сохраняют mastery и grade;
- создают employer-specific negative signal;
- требуют recovery through bounded role, learning, project or sustained later outcome;
- объясняются конкретными dimensions, а не ярлыком «плохой программист».

### Break

После перерыва:

- grade/history остаются;
- fluency/familiarity/market visibility могут снизиться;
- re-entry может требовать refresh practice, updated project или role with support.

## 21. MonthRun contract

### Generation

Opportunity/process/offer/workplace situation generation фиксирует:

- definition/content version;
- owner snapshots;
- visible and uncertain fields;
- candidate signal snapshot;
- selected intent/approach;
- RNG stream/manifest;
- expiry and decision IDs.

### Suspend/resume

После suspend/reload не меняются:

- surfaced opportunities;
- employer conditions;
- interview complication;
- stage result;
- offer terms;
- transition reason.

### Commit

При необходимости один atomic commit включает:

- Career delta;
- Project delta;
- Learning/Challenge outcome;
- Progression episode/evaluation;
- Economy compensation event;
- Life/capacity commitment;
- report/history;
- dedup/idempotency records.

## 22. MVP Casual profile

Первый Career Slice:

- один era/region/industry market profile;
- три employer archetypes;
- один role family;
- три opportunity templates;
- один `CareerIntent` decision;
- максимум три surfaced opportunities;
- один portfolio story;
- один interview `diagnose` situation;
- четыре candidate approaches;
- standard/conditional/alternate/rejection fixtures;
- два offers для сравнения или один offer + portfolio continuation;
- одна active position;
- один workplace challenge;
- simple trust bands;
- one promotion-delayed or scope-expanded preview;
- one rejection recovery;
- no-reroll/no-duplicate fixtures.

## 23. Recommended profile

После Career Slice playtest:

- multiple role families;
- internal transfer;
- salary negotiation;
- promotion;
- referral network;
- freelance/client route;
- layoff/re-entry;
- specialization transition;
- regional market shocks;
- IC/management fork;
- richer employer archetypes.

## 24. Extended profile

Только при доказанном gameplay value:

- global/remote labor market;
- relocation/visa;
- advanced compensation/contracts;
- organizational politics;
- detailed Company integration;
- executive/founder careers;
- multiple simultaneous commitments;
- reputation ecosystems;
- recruiting/hiring others.

## 25. Invariants

- Career does not mutate professional state directly.
- Project technical truth remains in Project Engine.
- Company organizational truth remains in Company Engine.
- Employer sees signals, not hidden authoritative mastery.
- Grade/title/position/role fit/trust remain distinct.
- Search routine aggregates.
- Ordinary month has 0–1 blocking professional decision.
- Meaningful hiring stage exposes 2–4 approaches.
- No globally optimal application/interview strategy.
- Referral and credential can open access but not guarantee outcome.
- Interview outcome does not mint production evidence.
- Employment is automatic commitment, not monthly work button.
- No single authoritative performance score.
- Promotion is organizational; grade is professional.
- Job loss does not erase mastery/grade/history.
- Every path-blocking career state has fallback/retry/alternative route.
- Historical market content has provenance; employers fictional.
- Deterministic generation and outcome do not reroll.

## 26. Required fixtures

- strong candidate / weak signal;
- credentialed candidate / weak autonomy evidence;
- referral / failed interview;
- trainable technology gap;
- hard access block with alternative route;
- salary vs mentorship offer choice;
- stable legacy employer vs risky modern employer;
- conditional internship offer;
- alternate role offer;
- employer-cancelled process;
- reliable delivery raises allowed scope;
- failure + honest recovery preserves trust;
- team success without contribution does not raise trust;
- promotion delayed by missing position;
- title higher than grade;
- grade higher than position;
- layoff re-entry;
- break reacquisition;
- reload/resume/no-reroll/no-duplicate.
