# Симуляция месяца

## Public contract

```ts
type BeginMonthCommand = Readonly<{
  saveId: SaveId;
  expectedRevision: number;
  plan: MonthPlan;
}>;

type MonthRunResult = MonthRunSuspended | MonthRunCompleted | MonthRunFailed;
```

## Pipeline

1. Загрузить сейв и проверить revision.
2. Проверить save schema, rules version и content fingerprint.
3. Создать deterministic context и RNG streams.
4. Определить календарные дни месяца.
5. Рассчитать постоянные обязательства.
6. Распределить work units по активностям.
7. Обновить employment, projects, products, company и relationships.
8. Обновить fatigue, health, finance и local market.
9. Собрать event candidates.
10. Применить Narrative Director.
11. Остановиться на blocking decision либо закончить симуляцию.
12. Проверить invariants.
13. Сформировать immutable result и report model.

## Чистота

MonthRunner получает всё необходимое аргументами. Он не читает filesystem, SQLite, system clock, locale или environment variables.

## Side effects

Side effects выполняются только application/persistence слоями после получения результата. Core не пишет лог-файлы и не отправляет уведомления.

## Идемпотентность

Одинаковый базовый state, MonthPlan, content fingerprint, rules version и RNG state дают одинаковый результат.

## Ошибки

Validation/compatibility ошибки возникают до запуска. Unexpected invariant failure создаёт диагностический trace и не изменяет основной сейв.

## Производительность

Обычный месяц должен укладываться в 100 мс p95 на reference machine, тяжёлый — в 500 мс p95. Массовые симуляции используют тот же core без UI.