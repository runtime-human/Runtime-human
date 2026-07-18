---
title: "HISTORICAL-CATALOG"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Исторический каталог

## Назначение

Каталог связывает реальную историю технологий, каналов обучения и рынка труда с вымышленным локальным рынком одного города.

Связанные решения:

- [ADR-017 — Programmer Learning & Access](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md);
- [Programmer Learning Content](PROGRAMMER-LEARNING-CONTENT.md);
- [Programmer Career Content](PROGRAMMER-CAREER-CONTENT.md);
- [Historical Labor Market Catalog](HISTORICAL-LABOR-MARKET-CATALOG.md).

Общий каталог владеет хронологией технологий/каналов. Специализированный labor-market catalog владеет provenance-backed предположениями о career channels, employer practices и market profiles.

## Lifecycle

```ts
type HistoricalAvailability = Readonly<{
  announcedAt?: HistoricalDate;
  firstPublicReleaseAt: HistoricalDate;
  locallyAvailableFrom?: HistoricalDate;
  professionalDemandFrom?: HistoricalDate;
  mainstreamFrom?: HistoricalDate;
  peakFrom?: HistoricalDate;
  declineFrom?: HistoricalDate;
  endOfSupportAt?: HistoricalDate;
  sourceRefs: readonly SourceRefId[];
  confidence: 'primary' | 'secondary' | 'estimated';
}>;
```

`HistoricalDate` содержит precision: day, month, quarter или year.

## Реальные сущности

Допускаются:

- языки;
- frameworks/runtimes;
- databases;
- open-source tools;
- standards;
- нейтральные industry milestones;
- устройства и ОС при фактическом описании;
- реальные категории и каналы обучения;
- occupational/labor-market statistics при явном region/era scope;
- конкретные исторически значимые manuals/books/platforms, если их identity нужна gameplay и подтверждена source refs.

Работодатели, локальные продукты, школы, кружки, mentors, recruiters и события компаний остаются вымышленными.

Реальная company practice может использоваться как source evidence общего pattern, но не превращается в fictional employer identity или universal market rule.

## Prerequisites

Технология не может стать доступной раньше prerequisite runtime/platform. Chronology validator проверяет dependency graph и release ordering.

Learning source не может появиться раньше:

- своего publication/release;
- required device/platform/network;
- соответствующего distribution channel;
- локальной доступности, если она моделируется отдельно.

Career channel/role/interview pattern не может появиться раньше:

- соответствующей коммуникационной инфраструктуры;
- era-valid employer/industry context;
- local professional demand;
- required technology/platform availability;
- region-valid legal/educational assumptions where modeled.

AI-assistant source и AI-assisted hiring pattern не могут использоваться до historically allowed era/profile.

## Локальная адаптация

Global release не равен local availability. Доступность зависит от era profile, hardware, информационных каналов, образования, языка и цены входа. Multi-region table не используется в baseline.

Для learning content разделяются:

```text
global existence
→ distribution channel
→ local availability
→ practical access for this character
```

Для Career content:

```text
global/industry practice
→ regional/era plausibility
→ fictional local market profile
→ opportunity access for this character
```

Последний уровень является runtime projection из equipment/school/economy/NPC/professional/career state и не хранится как universal historical fact.

## Historical learning availability

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
- downloadable documentation;
- video platform;
- Git repository;
- interactive platform;
- AI assistant.

## Historical career availability

Labor market detail lives in `HISTORICAL-LABOR-MARKET-CATALOG.md`.

Common fields:

```ts
type HistoricalCareerAvailability = Readonly<{
  roleFamilyId: ProfessionalRoleFamilyId;
  industryId: IndustryId;
  regionId: RegionId;
  eraRange: EraRange;
  opportunityChannels: readonly CareerOpportunitySource[];
  commonSelectionPatterns: readonly HiringPatternId[];
  credentialBias: CasualBiasBand;
  portfolioOpenness: CasualOpportunityBand;
  referralLeverage: CasualOpportunityBand;
  trainableGapTolerance: CasualOpportunityBand;
  remoteReach: CasualReachBand;
  sourceRefs: readonly SourceRefId[];
  confidence: 'primary' | 'secondary' | 'estimated';
}>;
```

Это source-backed constraint для fictional `LaborMarketProfile`, а не точная симуляция population.

## Era profiles

Era profile задаёт вероятные каналы, но не создаёт точную дату/market parameter без source refs.

### 1990-е

Learning:

- print/manual/listing;
- school labs and clubs;
- local peers/teachers;
- disk exchange;
- BBS/early network only where locally plausible;
- delayed feedback and offline practice.

Career hypotheses requiring regional research:

- local institutional/community/referral channels;
- limited public vacancy reach;
- employer-specific practical demonstration/training;
- strong hardware/platform context;
- no baseline remote market.

### 2000-е

Learning:

- web tutorials/forums/IRC;
- downloadable docs;
- growing open-source access;
- wider home PC/internet availability.

Career hypotheses:

- broader job-board/service-company channels;
- more formal multi-stage hiring;
- growing specialization;
- market corrections affect employer cancellations/layoffs.

### 2010-е

Learning:

- video courses;
- Q&A platforms;
- Git hosting;
- interactive platforms and bootcamps;
- fast ecosystem change.

Career hypotheses:

- public repositories/community become stronger signals;
- remote/global collaboration expands unevenly;
- specialization and standardized technical assessments grow;
- employer archetype matters more than one universal market score.

### 2020-е

Learning:

- AI coding assistants;
- interactive sandboxes;
- abundant sources;
- low search cost with stronger verification/recency concerns.

Career hypotheses:

- remote reach and competition both expand;
- restructuring/layoff/re-entry become significant in affected segments;
- AI-assisted hiring may shift toward judgment, codebase navigation and verification;
- traditional interview patterns remain valid in many employers/regions.

## Источник качества и актуальности

Historical availability не означает pedagogical, employer или career quality.

Learning source отдельно хранит:

- information quality;
- source recency;
- compatibility/version fit;
- language availability;
- feedback affordance.

Labor-market source отдельно хранит:

- region/era/industry/role-family scope;
- source type;
- supported claims;
- limitations;
- observed vs inferred parameter;
- uncertainty/confidence.

Старый источник может быть полезен для соответствующей legacy technology. Новый source не является автоматически лучшим или универсальным.

## Будущее

После `historicalThrough = 2026-07` реальные компании не получают придуманные релизы, hiring policies или market events. Future catalog использует fictional IDs и отдельный `futureRulesVersion`.

Будущие learning platforms/AI products, employers и hiring ecosystems используют fictional IDs, если не существует подтверждённого реального релиза/practice.

## Review

Изменение canonical date/market claim требует sourceRefs, confidence, human review и обновления catalog snapshot. Secondary/estimated запись не должна маскироваться под точный primary fact.

Learning-source review проверяет:

- required platform chronology;
- distribution channel chronology;
- global vs local availability;
- language claim;
- AI-era eligibility;
- отсутствие вымышленной точности.

Labor-market review проверяет:

- region/era/industry/role-family scope;
- fictional employer separation;
- sourced vs inferred fields;
- hiring channel chronology;
- remote/AI-era eligibility;
- отсутствие прямого переноса modern U.S./single-company data в другой контекст;
- отсутствие permanent career soft lock;
- source update impact on content fingerprints and fixtures.
