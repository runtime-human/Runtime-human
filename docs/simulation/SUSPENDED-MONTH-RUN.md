# Приостановленный MonthRun

Нормативные решения: [ADR-005](../adr/ADR-005-suspended-month-run.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Проблема

Важное событие может остановить месяц до решения игрока. Основной сейв нельзя оставлять наполовину изменённым, а повторный расчёт без сохранённого deterministic context может нарушить воспроизводимость и совместимость.

Professional Progression добавляет отдельный риск: provider outcome, skill delta и evidence должны либо committed вместе, либо не применяться вообще. Resume не может создавать второй evidence event из уже обработанного episode.

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
- save/rules/content/progression schema versions;
- content fingerprint;
- полный Determinism Manifest;
- RNG algorithm/state/fork metadata;
- MonthPlan;
- phase и step index;
- intermediate immutable checkpoint/state;
- provider checkpoints;
- stable `ExperienceEpisode` candidates;
- progression assessment/draft deltas;
- pending evidence IDs и claims;
- monthly practice accumulators;
- evidence anti-repeat state;
- pending decision;
- decision/input history;
- phase/progression trace hashes;
- created/updated timestamps инфраструктурного уровня;
- checksum/canonical payload hash.

Физическая схема может хранить часть draft как versioned blob, но перечисленные логические данные не должны теряться.

## Правила

- Draft не изменяет основной сейв.
- Draft professional delta/evidence не отображается как committed history.
- На один save допускается один активный MonthRun.
- Begin проверяет отсутствие другого active run и фиксирует base revision.
- Resume проверяет run revision, base save revision, decision ID и exact compatibility.
- Повтор одного request/decision не применяет effects, progression delta или evidence повторно.
- Episode/evidence IDs стабильны внутри run и не зависят от количества reload.
- Provider outcome и progression assessment не могут использовать разные rules/content fingerprints.
- Обновление приложения, migration, restore и смена active content/mod set блокируются либо требуют controlled compatibility flow при active draft.
- Закрытие приложения безопасно только после durable записи draft/checkpoint.
- Abandon помечает draft `abandoned`/удаляет payload по retention policy и оставляет базовый сейв, skills и evidence history без изменений.
- Draft не продолжается новой rules/content/progression version без явной совместимой migration.

## Checkpoint policy

Checkpoint записывается:

- перед выдачей blocking decision;
- после принятия решения и до следующей потенциально блокирующей фазы;
- после provider outcome до progression assessment, если outcome уже материализован;
- после progression assessment до final commit, если evidence candidates сформированы;
- при явном safe suspension;
- перед переходом `completed → committed`.

Не требуется сохранять каждый микрошаг, если crash/replay tests подтверждают восстановимость выбранной granularity.

## Deterministic evidence

Evidence ID:

```text
hash(saveId, monthRunId, episodeId, outcomeOrdinal, rulesVersion)
```

Resume:

- восстанавливает тот же episode/assessment;
- повторно валидирует hash/checksum;
- не потребляет новый RNG для уже решённого outcome;
- не создаёт другой evidence ID;
- возвращает сохранённый result либо stable `AlreadyApplied` при повторе decision.

## Commit

Завершённый MonthRun записывается одной Rust/SQLite transaction:

1. проверить base save revision, run revision и status;
2. проверить canonical final state/invariants;
3. записать normalized snapshot, включая professional state;
4. append histories/finance ledger;
5. append evidence events/claims, practice aggregates и grade awards;
6. обновить/пометить rebuildable projection caches;
7. увеличить save revision один раз;
8. записать committed run marker/trace;
9. очистить active draft безопасно;
10. commit.

Crash после commit, но до cleanup не приводит к повторному применению месяца: committed run ID и deterministic evidence IDs являются idempotency guards.

## Recovery

При несовместимости или повреждении доступны:

- продолжение exact совместимой версией;
- controlled migration поддерживаемого draft format;
- отмена draft с возвратом к committed save;
- Safe Mode;
- read-only diagnostic/export;
- restore backup при повреждении committed save.

Нельзя автоматически продолжать draft на другой rules/content/determinism/progression version без явной migration и regression fixtures.

Если provider outcome существует, а progression checkpoint повреждён, допустим только deterministic rebuild exact той же версией rules/content. Если exact rebuild невозможен, draft отменяется или открывается recovery flow; частичный commit запрещён.

## Обязательные тесты

- close/restart на blocking professional decision;
- duplicate answer;
- duplicate resume request;
- crash до provider outcome;
- crash после provider outcome до progression assessment;
- crash после draft evidence до commit;
- crash после commit до cleanup;
- duplicate evidence ID;
- incompatible content/progression fingerprint;
- changed Determinism Manifest;
- abandon без изменения skills/evidence;
- exact rebuild progression checkpoint;
- recovery/read-only export.
