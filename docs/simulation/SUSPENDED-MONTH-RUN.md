# Приостановленный MonthRun

Нормативное решение: [ADR-005](../adr/ADR-005-suspended-month-run.md).

## Проблема

Важное событие может остановить месяц до решения игрока. Основной сейв нельзя оставлять наполовину изменённым, а повторный расчёт без сохранённого deterministic context может нарушить воспроизводимость и совместимость.

## State machine

```text
ready
→ running
→ suspended-for-decision
→ running
→ completed
→ committed
```

Дополнительные состояния:

```text
failed
incompatible-after-update
recovery-required
abandoned
```

## Draft model

`pending_month_runs` логически хранит:

- run ID;
- save ID, base save revision и run revision;
- month index/current game date;
- save/rules/content schema versions;
- content fingerprint;
- полный Determinism Manifest;
- RNG algorithm/state/fork metadata;
- MonthPlan;
- phase и step index;
- intermediate immutable checkpoint/state;
- pending decision;
- decision/input history;
- phase trace hashes;
- created/updated timestamps инфраструктурного уровня;
- checksum/canonical payload hash.

Физическая схема может хранить часть draft как versioned blob, но перечисленные логические данные не должны теряться.

## Правила

- Draft не изменяет основной сейв.
- На один save допускается один активный MonthRun.
- Begin проверяет отсутствие другого active run и фиксирует base revision.
- Resume проверяет run revision, base save revision, decision ID и exact compatibility.
- Повтор одного request/decision не применяет эффекты повторно.
- Обновление приложения, миграция, restore и смена active content/mod set блокируются либо требуют controlled compatibility flow при active draft.
- Закрытие приложения безопасно только после durable записи draft/checkpoint.
- Abandon помечает draft `abandoned`/удаляет payload по retention policy и оставляет базовый сейв без изменений.
- Draft не продолжается новой rules/content version без явной совместимой migration.

## Checkpoint policy

Checkpoint записывается:

- перед выдачей blocking decision;
- после принятия решения и до следующей потенциально блокирующей фазы;
- при явном safe suspension;
- перед переходом `completed → committed`.

Не требуется сохранять каждый микрошаг, если crash/replay tests подтверждают восстановимость выбранной granularity.

## Commit

Завершённый MonthRun записывается одной Rust/SQLite transaction:

1. проверить base save revision, run revision и status;
2. проверить canonical final state/invariants;
3. записать normalized snapshot;
4. append histories/ledger;
5. увеличить save revision один раз;
6. записать committed run marker/trace;
7. очистить active draft безопасно;
8. commit.

Crash после commit, но до cleanup не должен приводить к повторному применению месяца: committed run ID является idempotency guard.

## Recovery

При несовместимости или повреждении доступны:

- продолжение exact совместимой версией;
- controlled migration поддерживаемого draft format;
- отмена draft с возвратом к committed save;
- Safe Mode;
- read-only diagnostic/export;
- restore backup при повреждении committed save.

Нельзя автоматически продолжать draft на другой rules/content/determinism version без явной migration и regression fixtures.

## Обязательные тесты

- close/restart на blocking decision;
- duplicate answer;
- duplicate resume request;
- crash до checkpoint;
- crash после checkpoint;
- crash до commit;
- crash после commit до cleanup;
- incompatible content fingerprint;
- changed Determinism Manifest;
- abandon;
- recovery/read-only export.