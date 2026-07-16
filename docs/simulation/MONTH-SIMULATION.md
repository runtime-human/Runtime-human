# Симуляция месяца

Связанные решения: [ADR-005](../adr/ADR-005-suspended-month-run.md), [ADR-007](../adr/ADR-007-determinism-manifest.md), [ADR-009](../adr/ADR-009-narrative-director.md) и [ADR-010](../adr/ADR-010-authoritative-save-state.md).

## Public contracts

```ts
type BeginMonthCommand = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  plan: MonthPlan;
}>;

type ResumeMonthCommand = Readonly<{
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  decisionId: DecisionId;
  answer: DecisionAnswer;
}>;

type MonthRunResult =
  | MonthRunSuspended
  | MonthRunCompleted
  | MonthRunFailed;
```

Core-функции чистые. Application layer отвечает за загрузку committed state/pending draft, compatibility/idempotency checks и сохранение checkpoint/result через ports.

## State machine

```text
ready → running → suspended-for-decision → running → completed → committed
```

`failed`, `incompatible-after-update`, `recovery-required` и `abandoned` являются явными состояниями lifecycle.

## Deterministic context

MonthRunner получает аргументами:

- committed base state;
- MonthPlan;
- GameDate/calendar context;
- compiled immutable content registry;
- rules/content/mod fingerprints;
- Determinism Manifest;
- root/fork RNG states;
- previous decision/input log при resume;
- phase/checkpoint position.

Он не читает filesystem, SQLite, system clock, locale, process environment или UI state.

## Pipeline

1. Application layer загружает committed save и active draft.
2. Проверяются save/run revisions, schema/rules/content/mod compatibility и idempotency.
3. Создаётся/восстанавливается deterministic context и RNG streams.
4. Определяются календарные дни месяца.
5. Применяются scheduled/global world changes текущей даты.
6. Рассчитываются постоянные обязательства.
7. Распределяются integer work units по активностям и приоритетам.
8. Обновляются education/employment/projects/products/open source/company/relationships.
9. Обновляются fatigue, health, finance, housing/equipment и local market.
10. Собираются eligible event candidates в stable order.
11. Narrative Director применяет integer pacing modifiers и выбирает display/decision set.
12. При blocking decision создаётся immutable checkpoint, decision и trace; MonthRun возвращает `suspended`.
13. После ответа resume продолжается с сохранённого checkpoint и отдельного RNG state.
14. При завершении проверяются cross-module invariants.
15. Формируется immutable final state, histories/ledger delta, report read model и final trace hash.
16. Application/Rust persistence выполняют atomic authoritative commit.

Порядок фаз является versioned rules contract и входит в effect ordering/trace policy.

## Checkpoints

Checkpoint содержит достаточно данных для crash-safe resume, но не обязан сохранять каждый микрошаг. Минимум:

- phase/step;
- intermediate immutable state;
- RNG states;
- decision/input history;
- trace hashes;
- compatibility fingerprints;
- pending decision.

Checkpoint создаётся перед blocking decision и перед final commit boundary.

## Side effects

Core не выполняет IO. Side effects после результата разделяются:

### Authoritative

- сохранить MonthRun draft/checkpoint;
- commit snapshot/history/ledger;
- увеличить save revision;
- записать committed run marker.

### Non-authoritative

- обновить UI read models;
- показать notification/audio;
- перестроить search/chart caches;
- записать redacted diagnostics.

Неавторитетный side effect не может изменить outcome или состояние следующего месяца.

## Idempotency

Одинаковые base state, MonthPlan, content/rules/mod fingerprints, Determinism Manifest, RNG state и decision log дают одинаковый canonical result.

Дополнительно:

- duplicate `requestId` не запускает операцию повторно;
- duplicate decision не потребляет RNG повторно;
- duplicate committed `runId` не применяет месяц второй раз;
- save revision увеличивается только при первом успешном commit;
- crash после commit до cleanup определяется committed marker.

## Invariants

Минимум после каждой критической фазы и перед commit:

- GameDate/MonthIndex не уменьшаются;
- authoritative числа целые и в диапазоне;
- деньги/ledger согласованы;
- закрытые/удалённые сущности не получают прогресс;
- employment/education commitments согласованы;
- references и NPC/arc participants существуют либо имеют tombstone policy;
- один active MonthRun на save;
- effects applied order соответствует manifest;
- final state не содержит pending-only values.

## Errors

До запуска:

- validation;
- revision conflict;
- unsupported schema/rules/manifest;
- content/mod fingerprint mismatch;
- malformed plan/answer.

Во время запуска:

- invariant violation;
- integer overflow;
- no valid outcome для обязательной фазы;
- corrupted checkpoint/trace mismatch.

Ошибка core возвращает typed diagnostic result и не изменяет committed save. Persistence error после completed result оставляет run recoverable и не считается committed.

## Trace и observability

Каждая фаза имеет stable ID, input/output hash, RNG scope и список applied effect IDs. Production trace bounded; debug trace расширен, но использует тот же canonical hash.

UI может показывать user-friendly progress по фазам, но не зависит от внутреннего количества шагов как от gameplay contract.

## Производительность

Цели на reference machine:

- обычный месяц p95 ≤ 100 мс;
- тяжёлый месяц p95 ≤ 500 мс;
- checkpoint serialization/write измеряется отдельно от pure core;
- UI main thread не блокируется long task >50 мс: при необходимости pure core запускается в Worker;
- массовые симуляции используют тот же core без React/Tauri/SQLite на каждом прогоне.

Оптимизация не может менять deterministic result. Parallelization допускается только при стабильном reduction/order contract.