# Симуляция месяца

Связанные решения: [ADR-005](../adr/ADR-005-suspended-month-run.md), [ADR-007](../adr/ADR-007-determinism-manifest.md), [ADR-009](../adr/ADR-009-narrative-director.md), [ADR-010](../adr/ADR-010-authoritative-save-state.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

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
- phase/checkpoint position;
- provider checkpoints;
- progression checkpoint.

Он не читает filesystem, SQLite, system clock, locale, process environment или UI state.

## Versioned pipeline

1. Application layer загружает committed save и active draft.
2. Проверяются save/run revisions, schema/rules/content/mod compatibility и idempotency.
3. Создаётся/восстанавливается deterministic context и RNG streams.
4. Определяются календарные дни месяца.
5. Применяются scheduled/global world changes текущей даты.
6. Рассчитываются life capacity, health/fatigue modifiers и постоянные обязательства.
7. Распределяются integer work units по commitments/activities и приоритетам.
8. Experience Providers продвигают education/employment/projects/products/open source/company/relationships и собственные task states.
9. Providers открывают uncertainty/decision candidates; Event Engine добавляет eligible events в stable order.
10. Narrative Director применяет pacing modifiers и выбирает display/decision set.
11. При blocking decision создаётся immutable checkpoint; MonthRun возвращает `suspended`.
12. После ответа provider/event state продолжается с сохранённого checkpoint без нового random roll.
13. Providers материализуют domain outcomes и нормализованные `ExperienceEpisode`.
14. Professional Progression Core оценивает episodes:
    - mastery delta;
    - fluency/familiarity delta;
    - evidence candidates;
    - monthly practice aggregates;
    - explanations/trace.
15. Evidence candidates проходят source/context validation, anti-repeat и deterministic ID materialization.
16. Обновляются finance, housing/equipment, local market и остальные post-outcome systems.
17. Строятся demonstrated/current-market readiness projections и monthly professional report.
18. Проверяются cross-module invariants.
19. Формируется immutable final state, append-only deltas, report read models и final trace hash.
20. Application/Rust persistence выполняют atomic authoritative commit.

Порядок фаз является versioned rules contract и входит в effect ordering/trace policy.

## Experience Provider contract

Provider владеет domain truth:

- task/activity state;
- completion/partial/failure;
- project quality/debt/bugs;
- work/employment result;
- course/learning-source result;
- participant contribution;
- available feedback/assistance.

Provider передаёт `ExperienceEpisode`. Он не начисляет skill mastery, technology familiarity или grade напрямую.

Progression Core не меняет provider outcome и не пересчитывает его из description/content text.

## Progression checkpoint

Checkpoint professional phase хранит минимум:

- stable episode IDs;
- episode semantic snapshots либо provider refs + hashes;
- progression phase/step;
- draft skill/technology deltas;
- pending evidence IDs;
- evidence anti-repeat state;
- monthly practice accumulators;
- readiness projection input hash;
- progression trace hash;
- related pending decision IDs.

Draft evidence не считается committed history.

## Evidence ID и idempotency

Evidence ID формируется детерминированно:

```text
hash(saveId, monthRunId, episodeId, outcomeOrdinal, rulesVersion)
```

Правила:

- duplicate resume создаёт тот же evidence candidate;
- duplicate decision не потребляет RNG и не меняет episode ID;
- duplicate commit определяется committed MonthRun/evidence IDs;
- один provider outcome не может материализовать два эквивалентных evidence event;
- routine practice одного месяца агрегируется по stable aggregate key.

## Checkpoints

Checkpoint содержит достаточно данных для crash-safe resume, но не обязан сохранять каждый микрошаг. Минимум:

- phase/step;
- intermediate immutable state;
- provider checkpoints;
- progression checkpoint;
- RNG states;
- decision/input history;
- trace hashes;
- compatibility fingerprints;
- pending decision.

Checkpoint создаётся:

- перед blocking decision;
- после принятого ответа до следующей потенциально блокирующей фазы;
- после provider outcomes до progression materialization, если фаза может быть длительной;
- перед final commit boundary.

## Side effects

Core не выполняет IO. Side effects после результата разделяются:

### Authoritative

- сохранить MonthRun draft/checkpoint;
- commit normalized snapshot;
- append histories/finance/evidence/practice/grade records;
- увеличить save revision;
- записать committed run marker.

### Non-authoritative

- обновить UI/readiness/specialization projections;
- показать notification/audio;
- перестроить search/chart/evidence indexes;
- записать redacted diagnostics.

Неавторитетный side effect не может изменить outcome или состояние следующего месяца.

## Idempotency

Одинаковые base state, MonthPlan, content/rules/mod fingerprints, Determinism Manifest, RNG state и decision log дают одинаковый canonical result.

Дополнительно:

- duplicate `requestId` не запускает операцию повторно;
- duplicate decision не потребляет RNG повторно;
- duplicate committed `runId` не применяет месяц второй раз;
- duplicate evidence ID не добавляется повторно;
- save revision увеличивается только при первом успешном commit;
- crash после commit до cleanup определяется committed marker;
- project outcome и evidence не могут разойтись между разными transactions.

## Invariants

Минимум после каждой критической фазы и перед commit:

- GameDate/MonthIndex не уменьшаются;
- authoritative числа целые и в диапазоне;
- деньги/ledger согласованы;
- закрытые/удалённые entity/task/activity не получают прогресс;
- employment/education commitments согласованы;
- provider outcome имеет stable source/context;
- evidence candidate ссылается на существующий episode;
- partial outcome не подтверждает full delivery;
- transfer не создаёт production evidence;
- помощь не повышает autonomy claim;
- awarded grade не понижается автоматически;
- readiness projections построены из того же final state/evidence delta;
- references и NPC/arc participants существуют либо имеют tombstone policy;
- один active MonthRun на save;
- effects applied order соответствует manifest;
- final committed state не содержит draft-only evidence/accumulators.

## Randomness

Progression formula deterministic и не использует RNG там, где достаточно provider outcome/coefficients.

Допустимые отдельные scopes:

- `month/professional/uncertainty` — discovery неизвестности provider task;
- `month/professional/outcome` — bounded outcome variability, если provider contract это допускает;
- `month/events`/`month/narrative` — event selection;
- cosmetic scopes — отдельно.

Skill gain/evidence assessment не перебрасывает provider outcome и не получает новый roll после reload.

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
- invalid/missing provider episode source;
- duplicate/inconsistent evidence candidate;
- no valid outcome для обязательной фазы;
- corrupted checkpoint/trace mismatch.

Ошибка core возвращает typed diagnostic result и не изменяет committed save. Persistence error после completed result оставляет run recoverable и не считается committed.

## Trace и observability

Каждая фаза имеет stable ID, input/output hash, RNG scope и список applied effect/evidence IDs.

Progression trace содержит:

- episode ID/provider/source;
- applied skills/technologies;
- challenge/outcome/assistance summary;
- integer modifiers и rounding reason codes;
- mastery/fluency/familiarity delta;
- evidence claim reason codes;
- anti-repeat decision;
- readiness input/output hashes.

Production trace bounded; debug trace расширен, но использует тот же canonical hash.

## Производительность

Цели на reference machine:

- обычный месяц p95 ≤ 100 мс;
- тяжёлый месяц p95 ≤ 500 мс;
- progression assessment масштабируется по episodes текущего MonthRun, а не полной evidence history;
- readiness projection использует cached aggregates/indexes и не перестраивает тысячи events на каждый UI render;
- checkpoint serialization/write измеряется отдельно от pure core;
- UI main thread не блокируется long task >50 мс: при необходимости pure core запускается в Worker;
- массовые симуляции используют тот же core без React/Tauri/SQLite на каждом прогоне.

Оптимизация не может менять deterministic result. Parallelization допускается только при стабильном reduction/order contract.
