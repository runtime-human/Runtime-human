---
title: "Город и исторические эпохи"
type: engine
status: draft
canon: true
depends_on: [ADR-003, ADR-019]
updated: 2026-07-18
---

# Город и исторические эпохи

Нормативные источники:

- [ADR-003 — Fixed fictional metropolis](../adr/ADR-003-fixed-fictional-metropolis.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Historical Catalog](../content/HISTORICAL-CATALOG.md)
- [Historical Technology Catalog](../content/HISTORICAL-TECHNOLOGY-CATALOG.md)

## Канон

Вся постоянная игровая жизнь проходит в одном вымышленном международном мегаполисе неназванной вымышленной страны. Название города выбирается отдельно и не содержит прямых IT-терминов.

Город не является копией реальной страны/столицы. Реальная global chronology ограничивает fictional local content, но не превращает его в историческую реконструкцию конкретного региона.

## Зачем нужен город

Он даёт цельный контекст для:

- дома, семьи, школы и университета;
- магазинов/ремонтных мастерских/компьютерных клубов;
- локальных learning channels и mentors;
- первых работодателей;
- конференций/coworking/community;
- медицины, жилья и life economy;
- локального labor market;
- fictional technology diffusion.

Город представлен организациями, экранами, событиями и изменениями эпохи, а не картой дорог/районов.

## Technology diffusion ownership

Historical Technology Catalog владеет global release/prerequisite/support facts.

City/Era content владеет:

- fictional local availability window;
- diffusion band;
- distribution/access channels;
- fictional institutions;
- expected local rarity/cost;
- era-valid project/career contexts;
- explicit local-adaptation basis.

Practical character access остаётся у Equipment/School/NPC/Economy/Employment owners.

```text
global existence
→ fictional city diffusion
→ organization/source access
→ character practical access
```

Local availability не может предшествовать global chronology, но может появляться позже. Exact local adoption percentages не используются без отдельной доказанной gameplay необходимости.

## CityEraProfile

```ts
type CityEraProfile = Readonly<{
  id: CityEraProfileId;
  eraRange: EraRange;
  educationProfileId: EducationProfileId;
  economyProfileId: EconomyProfileId;
  housingProfileId: HousingProfileId;
  institutionIds: readonly FictionalInstitutionId[];
  companyArchetypeIds: readonly EmployerArchetypeId[];
  localTechnologyAvailabilityIds: readonly LocalTechnologyAvailabilityId[];
  laborMarketProfileIds: readonly LaborMarketProfileId[];
  learningChannelIds: readonly LearningDistributionChannel[];
  technologyContextModifierIds: readonly TechnologyContextModifierId[];
  sourceConstraintRefs: readonly SourceRefId[];
  version: ContentVersion;
}>;
```

Profile uses only fields consumed by current gameplay. It does not contain universal technology popularity or full market simulation.

## Эпохи

### 1990–1994

- home/school PC and DOS-like contexts;
- manuals, magazines, libraries and clubs;
- disk exchange and delayed feedback;
- computer clubs/repair workshops/small software shops;
- local BASIC-like environment for first playable;
- other technology families added only when current content needs them;
- no remote/global career baseline.

### 1995–2001

- internet providers, web studios and local portals;
- browser/network contexts after valid chronology;
- online materials/community expand unevenly;
- early conferences and dot-com growth/correction;
- old desktop contexts remain viable.

### 2002–2006

- enterprise development, outsourcing and system integration;
- wider forums/docs/open source;
- professional communities and job boards;
- Git only after its valid global release;
- more formalized toolchains and hiring.

### 2007–2012

- mobile, SaaS and cloud adoption;
- product startups/coworking/accelerators;
- repository/community signals strengthen;
- multiple platform/device constraints;
- remote collaboration expands but is not universal.

### 2013–2019

- DevOps, containers and cloud-native contexts after valid dates;
- mature open-source components;
- testing/delivery/observability toolchains;
- remote teams and specialization;
- faster version/ecosystem shifts and migration decisions.

### 2020–2026

- remote/hybrid work;
- generative AI, coding assistants, local models and agentic tooling;
- abundant information with verification/provenance burden;
- cloud/local-compute/privacy constraints;
- multiple old and new ecosystems remain active simultaneously.

### После 2026-07

Явно альтернативная будущая история с fictional technologies, companies, platforms and waves. Реальные продукты не получают придуманные releases/support changes.

## Local adaptation basis

Every local technology/learning/career record marks:

- direct global chronology constraint;
- regional/era analogy;
- fictional local assumption;
- playtest/balance adjustment.

Player-facing Normal UI does not expose this taxonomy, but Details/source review can.

## Access equity

No-home-device or low-income background must retain a route through:

- school/shared equipment;
- library/club/community;
- mentor/peer;
- used equipment;
- employer-provided toolchain;
- later infrastructure change/retry.

Routes may change time, convenience, feedback and social context, but not permanent programmer capability ceiling.

## HomeCityProfile

Contains one currency/economic profile, education/housing/health abstraction, fictional institutions/company catalog, era profiles and implemented local technology/labor definitions.

It does not contain:

- every technology/version;
- exact global popularity;
- live internet data;
- selectable national policies;
- full hardware market.

## Запрещённые расширения

Без нового ADR не добавляются:

- selectable countries or second persistent city;
- visas/immigration;
- separate tax systems;
- international housing market;
- real-time transport;
- political simulation;
- real-company local history;
- dynamic regional technology statistics.

## Временные поездки

Conference, client, hackathon or vacation outside the city is an event with costs/consequences. It may expose a temporary technology/community context but does not create another persistent city/market state.

## Verification

- local date never precedes global release/prerequisites;
- local basis declared;
- fictional institutions separated from real sources;
- one era does not erase viable legacy contexts;
- low-access fallback reachable;
- future boundary enforced;
- catalog update preserves committed history;
- Normal UI uses context traits, not city/technology dashboards.