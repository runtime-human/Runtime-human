---
title: "Исторический каталог"
type: content
status: draft
canon: true
depends_on: [ADR-017, ADR-018, ADR-019]
updated: 2026-07-18
---

# Исторический каталог

## Назначение

Общий каталог связывает реальную историю технологий, каналов обучения и рынка труда с вымышленным локальным контекстом одного города.

Связанные решения:

- [ADR-017 — Programmer Learning & Access](../adr/ADR-017-authoritative-programmer-learning-access-model.md)
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Historical Technology Catalog](HISTORICAL-TECHNOLOGY-CATALOG.md)
- [Historical Labor Market Catalog](HISTORICAL-LABOR-MARKET-CATALOG.md)
- [Programmer Learning Content](PROGRAMMER-LEARNING-CONTENT.md)
- [Programmer Career Content](PROGRAMMER-CAREER-CONTENT.md)

## Ownership split

### Общий Historical Catalog

Владеет:

- shared `HistoricalDate`/source registry conventions;
- chronology/reference policy;
- historical-through/future boundary;
- global versus fictional-local separation;
- cross-domain review rules.

### Historical Technology Catalog

Владеет:

- technology/platform/tool public chronology;
- major gameplay version bands;
- prerequisites/compatibility/support facts;
- scoped adoption/ecosystem evidence.

### Historical Labor Market Catalog

Владеет:

- career channels and hiring practices;
- era/region/industry/role-family market profiles;
- scoped labor-market evidence.

### Provider content

Learning/Career/City content владеет fictional local adaptation and authored situations. Runtime owners resolve character access and outcomes.

## Shared source model

```ts
type HistoricalSourceRef = Readonly<{
  id: SourceRefId;
  sourceClass: HistoricalSourceClass;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: HistoricalDate;
  observedPeriod?: HistoricalDateRange;
  geography?: string;
  population?: string;
  methodology?: string;
  supportedClaims: readonly HistoricalClaimKind[];
  limitations: readonly string[];
  reviewedAt: GameDate;
}>;
```

Source class and supported claim are mandatory for composite adoption/market/ecosystem evidence.

## Historical date

```ts
type HistoricalDate = Readonly<{
  value: string;
  precision: 'day' | 'month' | 'quarter' | 'year';
}>;
```

Year/quarter evidence cannot be converted into fictional day precision.

## Confidence

```ts
type SourceConfidence =
  | 'primary-confirmed'
  | 'multi-source-supported'
  | 'secondary-supported'
  | 'estimated'
  | 'hypothesis';
```

Estimated/hypothesis fields are explicit and cannot be displayed as precise real-world facts.

## Реальные сущности

Допускаются:

- languages/runtimes/frameworks/databases/tools;
- devices/operating systems/platforms;
- standards and neutral industry milestones;
- real learning channels/material categories;
- occupational/labor statistics with explicit scope;
- official support/compatibility policies;
- scoped surveys/repository/package/ecosystem studies.

Employers, local products, schools, clubs, mentors, recruiters and fictional city events remain fictional.

Real company practice may support a general pattern but never becomes a fictional employer identity or universal rule.

## Technology chronology handoff

Detailed records live in `HISTORICAL-TECHNOLOGY-CATALOG.md`.

Shared sequence:

```text
global public existence
→ required platform/toolchain exists
→ fictional local diffusion
→ institution/equipment access
→ practical character access
```

Rules:

- technology cannot appear before prerequisites;
- local availability cannot precede global release;
- learning/project/career content cannot use unavailable context;
- support/adoption/ecosystem/local access are separate;
- AI tool cannot appear before allowed historical era;
- after 2026-07 real products receive no invented releases/policies.

## Learning availability

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
  confidence: SourceConfidence;
}>;
```

Channels:

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

Global source existence, fictional local availability and character access remain separate.

## Career availability

Detailed market model lives in `HISTORICAL-LABOR-MARKET-CATALOG.md`.

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
  confidence: SourceConfidence;
}>;
```

It constrains fictional market profiles; it is not a population simulation.

## Local adaptation

### Learning

```text
global source/channel
→ era-valid local distribution
→ fictional institution/access route
→ character practical access
```

### Career

```text
global/industry practice
→ regional/era plausibility
→ fictional local market profile
→ character opportunity access
```

### Technology

```text
global identity/band/platform
→ fictional local diffusion
→ equipment/institution/employer access
→ immutable technology context
```

Local adaptation records their basis:

- direct chronology constraint;
- regional/era analogy;
- fictional local assumption;
- playtest/balance adjustment.

## Era profiles

Era profiles suggest likely channels/contexts but do not create precise facts without source refs.

### 1990–1994

- PC/DOS-like home/school contexts;
- print/manual/listing and clubs;
- delayed/offline feedback;
- local institutional/referral career channels;
- technology access strongly tied to equipment/institutions;
- no remote/global market baseline.

### 1995–2001

- wider network/web access;
- web technologies and service companies;
- early online communities and job channels;
- new platform/browser compatibility contexts;
- dot-com growth/correction as scoped market hypotheses.

### 2002–2006

- broader web docs/forums/open source;
- job boards, outsourcing and formalized hiring;
- Git after historically valid release;
- specialization and enterprise toolchains.

### 2007–2012

- mobile/SaaS/cloud adoption;
- stronger repository/community signals;
- more integrated testing/delivery tooling;
- remote collaboration expands unevenly.

### 2013–2019

- containers/DevOps/cloud-native contexts after valid release milestones;
- mature open-source ecosystems;
- faster ecosystem/version shifts;
- standardized assessments and specialization.

### 2020–2026

- remote reach and competition;
- AI assistants/local models/agentic tooling after valid dates;
- abundant sources with stronger verification/provenance concerns;
- layoffs/re-entry significant in affected segments.

### After 2026-07

Alternative future uses fictional technology, employer and platform IDs with separate future rules.

## Source-scope rules

### Direct facts

Release, standard and support claims prefer official project/vendor/standards sources.

### Composite observations

Adoption/ecosystem/labor claims preserve:

- geography/platform/audience;
- sample/methodology;
- observed period;
- supported claim kind;
- limitations;
- observed versus inferred fields.

Repository activity, survey use/desire, package activity, job demand and expert recommendation are different signals. They cannot become one universal popularity truth.

Broad/mainstream claims need two independent source classes or explicit estimated/hypothesis status.

## Historical-through and future

```text
historicalThrough = 2026-07
```

After boundary:

- real products do not receive invented releases/support;
- real companies do not receive invented practices/events;
- future entities use fictional IDs;
- future content has explicit alternate-history marker and rules version.

## Fingerprints

Separate semantic fingerprints for:

- source registry;
- technology chronology/compatibility/support;
- learning availability;
- labor-market evidence;
- fictional local adaptation;
- provider content.

Cosmetic localization change does not invalidate active outcome. Semantic chronology/context change may.

## Review

Technology review:

- release/support source;
- date precision;
- prerequisite chronology;
- version-band justification;
- adoption/ecosystem source scope;
- global/local/access separation;
- active history compatibility.

Learning review:

- source/distribution chronology;
- platform/channel access;
- language claim;
- feedback affordance;
- AI-era eligibility;
- low-access fallback.

Labor review:

- region/era/industry/role scope;
- fictional employer separation;
- sourced versus inferred fields;
- channel/remote/AI chronology;
- no single-country/company universalization;
- recovery/no permanent soft lock.

## Forbidden

- canonical dates without provenance/precision;
- modern patterns projected backward silently;
- global release treated as local access;
- one metric used for adoption, quality and demand;
- fictional local values presented as real data;
- dynamic web state in authoritative simulation;
- invented post-boundary history for real entities;
- source update rewriting committed project/career/professional history.