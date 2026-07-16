# ADR-005: Приостановленный MonthRun

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и требования crash-safe deterministic resume

## Контекст

Месяц может остановиться на важном решении. Применение промежуточных эффектов в основной сейв нарушает атомарность, а полный пересчёт без сохранённого RNG/content context ненадёжен.

## Решение

Хранить отдельный persisted `pending_month_run` draft со state machine:

```text
ready → running → suspended-for-decision → running → completed → committed
```

Дополнительные состояния:

```text
failed
incompatible-after-update
recovery-required
abandoned
```

Draft содержит:

- run ID и base save revision;
- rules/content/save schema versions и fingerprints;
- RNG algorithm/state;
- MonthPlan;
- phase/step index;
- intermediate state/checkpoint;
- pending decision;
- decision history/input log;
- canonical trace hash.

Основной сейв изменяется только после полного завершения месяца одной транзакцией. Resume является idempotent относительно `run_id + run_revision + decision_id`.

## Последствия

- безопасное закрытие игры на событии;
- воспроизводимый resume;
- отсутствие half-applied month;
- возможность deterministic debugging;
- updater/migration/content changes должны учитывать active draft;
- требуется отдельная compatibility и recovery policy;
- storage schema становится сложнее.

## Альтернативы

1. Сохранять частичный месяц прямо в state — отклонено из-за сложной consistency.
2. Всегда пересчитывать с начала — отклонено из-за compatibility и debugging risks.
3. Хранить только pending decision без checkpoint/context — отклонено как недостаточное для crash-safe resume.

## Implementation gate

Vertical slice не считается завершённым без тестов:

- закрытие приложения на blocking decision;
- повторный resume одного decision;
- несовместимый content fingerprint;
- crash до commit;
- crash после commit до удаления draft;
- recovery и abandon flow.