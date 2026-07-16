# Граница persistence

Нормативное решение: [ADR-004](../adr/ADR-004-persistence-execution-boundary.md).

## Решение

Авторитетные operations записи, migrations, MonthRun checkpoints/commit, backup, restore, import/export и mod ingest выполняются в Rust services/repositories. React renderer не получает raw SQL execute capability.

```text
React UI
→ typed application facade
→ typed Tauri command
→ Rust persistence service/repository
→ SQLite managed writer
```

## TypeScript responsibilities

- чистая симуляция;
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
- serialization boundary;
- checked `i64` money conversion;
- backup/restore;
- mod package quarantine/ingest;
- atomic filesystem operations;
- Safe Mode/recovery bootstrap;
- diagnostics и stable error mapping.

## IPC

- versioned DTO;
- runtime validation на boundary;
- `bigint` передаётся canonical decimal string;
- mutating commands имеют request/idempotency ID и expected save revision;
- payload limits проверяются до работы с persistence;
- raw filesystem paths не возвращаются без необходимости;
- error response не раскрывает secrets или private paths;
- TS/Rust contract tests проверяют optional/null/enum semantics.

## Capabilities

Production main window не получает:

- `sql:allow-execute`;
- shell proxy;
- произвольный filesystem;
- updater signing/release operations.

Read-only SQL debug surface допускается только отдельным development capability и не является production dependency.

## Почему не прямой SQL plugin из UI

Архитектурный запрет должен быть техническим, а не только соглашением. Ограниченная Rust boundary уменьшает поверхность атаки WebView и централизует transaction, compatibility и recovery policy.

## Ограничение Rust слоя

Rust не вычисляет баланс, не выбирает события, не применяет Narrative Director и не интерпретирует исторический контент. Он получает рассчитанный, валидированный typed command/result и сохраняет его по принятой transaction policy.

## Concurrency

- один managed writer;
- month commit, migration, backup, restore и import activation mutually exclusive;
- reads не удерживают UI-blocking transactions;
- duplicate request обрабатывается idempotent либо отклоняется stable conflict error.

## Тестирование

- contract tests TS ↔ Rust;
- DTO round trips;
- integer boundary tests;
- command permission/capability tests;
- отсутствие SQL execute у renderer;
- interrupted write recovery;
- duplicate request/commit;
- backup/migration/restore integration;
- incompatible pending MonthRun.