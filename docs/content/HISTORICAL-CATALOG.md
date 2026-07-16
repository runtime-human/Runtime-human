# Исторический каталог

## Назначение

Каталог связывает реальную историю технологий с вымышленным локальным рынком одного города.

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
- устройства и ОС при фактическом описании.

Работодатели, локальные продукты и события компаний остаются вымышленными.

## Prerequisites

Технология не может стать доступной раньше prerequisite runtime/platform. Chronology validator проверяет dependency graph и release ordering.

## Локальная адаптация

Global release не равен local availability. Доступность зависит от era profile, hardware, информационных каналов, образования и цены входа. Multi-region table не используется.

## Будущее

После `historicalThrough = 2026-07` реальные компании не получают придуманные релизы. Future catalog использует fictional IDs и отдельный `futureRulesVersion`.

## Review

Изменение canonical date требует sourceRefs, confidence, human review и обновления catalog snapshot. Secondary/estimated запись не должна маскироваться под точный primary fact.