# Исторический каталог

## Назначение

Каталог связывает реальную историю технологий и каналов обучения с вымышленным локальным рынком одного города.

Связанные решения:

- [ADR-017 — Programmer Learning & Access](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [Programmer Learning Content](PROGRAMMER-LEARNING-CONTENT.md).

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
- конкретные исторически значимые manuals/books/platforms, если их identity нужна gameplay и подтверждена source refs.

Работодатели, локальные продукты, школы, кружки, mentors и события компаний остаются вымышленными.

## Prerequisites

Технология не может стать доступной раньше prerequisite runtime/platform. Chronology validator проверяет dependency graph и release ordering.

Learning source не может появиться раньше:

- своего publication/release;
- required device/platform/network;
- соответствующего distribution channel;
- локальной доступности, если она моделируется отдельно.

AI-assistant source не может использоваться до historically allowed era/profile.

## Локальная адаптация

Global release не равен local availability. Доступность зависит от era profile, hardware, информационных каналов, образования, языка и цены входа. Multi-region table не используется.

Для learning content разделяются:

```text
global existence
→ distribution channel
→ local availability
→ practical access for this character
```

Последний уровень является runtime projection из equipment/school/economy/NPC state и не хранится как универсальный historical fact.

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

## Era profiles

Era profile задаёт вероятные каналы, но не создаёт точную дату без source refs.

### 1990-е

- print/manual/listing;
- school labs and clubs;
- local peers/teachers;
- disk exchange;
- BBS/early network only where locally plausible;
- delayed feedback and offline practice.

### 2000-е

- web tutorials/forums/IRC;
- downloadable docs;
- growing open-source access;
- wider home PC/internet availability.

### 2010-е

- video courses;
- Q&A platforms;
- Git hosting;
- interactive platforms and bootcamps;
- fast ecosystem change.

### 2020-е

- AI coding assistants;
- interactive sandboxes;
- abundant sources;
- low search cost with stronger verification/recency concerns.

## Источник качества и актуальности

Historical availability не означает pedagogical quality.

Learning source отдельно хранит:

- information quality;
- source recency;
- compatibility/version fit;
- language availability;
- feedback affordance.

Старый источник может быть полезен для соответствующей legacy technology. Новый источник не является автоматически лучшим для новичка.

## Будущее

После `historicalThrough = 2026-07` реальные компании не получают придуманные релизы. Future catalog использует fictional IDs и отдельный `futureRulesVersion`.

Будущие learning platforms/AI products также используют fictional IDs, если не существует подтверждённого реального релиза.

## Review

Изменение canonical date требует sourceRefs, confidence, human review и обновления catalog snapshot. Secondary/estimated запись не должна маскироваться под точный primary fact.

Learning-source review дополнительно проверяет:

- required platform chronology;
- distribution channel chronology;
- global vs local availability;
- language claim;
- AI-era eligibility;
- отсутствие вымышленной точности.