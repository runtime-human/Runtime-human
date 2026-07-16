# ADR-005: Приостановленный MonthRun

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

Месяц может остановиться на важном решении. Применение промежуточных эффектов в основной сейв нарушает атомарность, а полный пересчёт без сохранённого RNG/content context ненадёжен.

## Предлагаемое решение

Хранить отдельный `pending_month_run` draft со state machine:

```text
ready → running → suspended-for-decision → running → completed → committed
```

Draft содержит base save revision, rules/content versions, RNG state, plan, intermediate state, pending decision и decision history. Основной сейв изменяется только после полного завершения месяца одной транзакцией.

## Последствия

- безопасное закрытие игры на событии;
- воспроизводимый resume;
- отсутствие half-applied month;
- updater/migration должны учитывать active draft;
- требуется отдельная compatibility и recovery policy.

## Альтернативы

1. Сохранять частичный месяц прямо в state — отклонено из-за сложной consistency.
2. Всегда пересчитывать с начала — отклонено из-за compatibility и debugging risks.