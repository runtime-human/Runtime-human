# Граница persistence

Нормативные решения: [ADR-004](../adr/ADR-004-persistence-execution-boundary.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Решение

Авторитетные operations записи, migrations, MonthRun checkpoints/commit, professional state/evidence, backup, restore, import/export и mod ingest выполняются в Rust services/repositories. React renderer не получает raw SQL execute capability.

```text
React UI
→ typed application facade
→ typed Tauri command
→ Rust persistence service/repository
→ SQLite managed writer
```

## TypeScript responsibilities

- чистая симуляция;
- provider outcome/`ExperienceEpisode` creation;
- progression assessment и evidence claims;
- application commands/results;
- DTO schemas;
- repository/platform ports;
- read model composition;
- application orchestration;
- validation результата core до передачи persistence command.

## Rust responsibilities

- open/close database и SQLite 3.51.3+ version gate;
- pragmas и managed connection lifecycle;
- schema migrations;
- transactions и optimistic revision checks;
- persisted MonthRun draft/checkpoints/commit;
- professional snapshot/evidence/practice/grade persistence;
- unique evidence/run constraints;
- projection cache invalidation/versioning;
- serialization boundary;
- checked `i64`/integer conversion;
- backup/restore;
- mod package quarantine/ingest;
- atomic filesystem operations;
- Safe Mode/recovery bootstrap;
- diagnostics и stable error mapping.

Rust не вычисляет mastery, fluency, evidence strength, grade gates или market readiness. Он проверяет schema, ranges, IDs, transaction consistency и version compatibility.

## Professional commit contract

Mutating MonthRun commit DTO включает:

- final normalized snapshot;
- provider domain deltas;
- professional state delta;
- evidence events/claims;
- monthly practice aggregates;
- grade awards;
- append-only histories/ledger;
- committed run marker/trace;
- projection cache version/invalidation set.

Rust transaction проверяет:

- expected save/run revision;
- unique MonthRun/evidence IDs;
- episode/evidence relationship;
- awarded grade order/uniqueness;
- integer ranges;
- absence of draft-only state in committed snapshot;
- snapshot/history/evidence consistency.

Нельзя отдельно commit project outcome, а затем evidence в другой transaction.

## IPC

- versioned DTO;
- runtime validation на boundary;
- `bigint` передаётся canonical decimal string;
- mutating commands имеют request/idempotency ID и expected save revision;
- evidence IDs и schema/rules versions передаются явно;
- payload limits проверяются до работы с persistence;
- raw filesystem paths не возвращаются без необходимости;
- error response не раскрывает secrets или private paths;
- TS/Rust contract tests проверяют optional/null/enum/discriminated-union semantics.

## Capabilities

Production main window не получает:

- `sql:allow-execute`;
- shell proxy;
- произвольный filesystem;
- updater signing/release operations.

Read-only SQL debug surface допускается только отдельным development capability и не является production dependency.

## Почему не прямой SQL plugin из UI

Архитектурный запрет должен быть техническим, а не только соглашением. Ограниченная Rust boundary уменьшает поверхность атаки WebView и централизует transaction, compatibility, evidence uniqueness и recovery policy.

## Ограничение Rust слоя

Rust не:

- выбирает события;
- применяет Narrative Director;
- интерпретирует исторический контент;
- создаёт `ExperienceEpisode`;
- решает, что outcome доказал;
- пересчитывает grade/readiness.

Он получает рассчитанный, валидированный typed command/result и сохраняет его по принятой transaction policy.

## Concurrency

- один managed writer;
- month commit, migration, backup, restore и import activation mutually exclusive;
- reads не удерживают UI-blocking transactions;
- duplicate request обрабатывается idempotent либо отклоняется stable conflict error;
- readiness/index rebuild не блокирует authoritative writer дольше необходимого;
- duplicate evidence insert определяется unique constraint и committed run marker.

## Тестирование

- contract tests TS ↔ Rust;
- professional DTO/evidence round trips;
- integer boundary tests;
- command permission/capability tests;
- отсутствие SQL execute у renderer;
- interrupted write recovery;
- duplicate request/commit/evidence;
- provider outcome + evidence atomicity;
- grade award persistence;
- projection cache rebuild/invalidation;
- backup/migration/restore integration;
- incompatible pending MonthRun/progression version.
