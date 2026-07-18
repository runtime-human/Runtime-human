---
title: "CALENDAR"
type: simulation
status: draft
canon: true
updated: 2026-07-18
---

# Календарь

## Канон

Игра использует обычный пролептический григорианский календарь. Канонический старт — январь 1990 года; возраст персонажа — 12 лет.

## Core API

```ts
interface GameCalendar {
  daysInMonth(year: number, month: number): number;
  isLeapYear(year: number): boolean;
  dayOfWeek(date: GameDate): GameDayOfWeek;
  addDays(date: GameDate, days: number): GameDate;
  addMonths(date: GameDate, months: number): GameDate;
  compare(left: GameDate, right: GameDate): number;
}
```

## Правила

- `month` имеет единый контракт 1–12 во всех DTO и домене.
- Календарь не использует system timezone и DST.
- `Date` JavaScript не применяется в авторитетной симуляции.
- Праздники и учебные периоды накладываются data-driven профилями города/эпохи.
- Возраст вычисляется из даты рождения и GameDate.
- MonthIndex хранится отдельно и используется для быстрых индексов.

## Историческая точность

Historical catalog использует год/месяц/день только при подтверждённой точности. Для неизвестной даты хранится precision: year, quarter или month. Estimated запись не открывает технологию в случайно придуманную точную дату.

## Тесты

- известные високосные годы;
- переход февраля;
- смена года;
- день недели для фиксированных fixtures;
- add/subtract round trips;
- возраст до и после дня рождения;
- 1990 start mapping к MonthIndex 0.