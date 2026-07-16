# Граница persistence

## Решение

Авторитетные операции записи, migrations, backup, restore и import/export выполняются в Rust adapter. React renderer не получает raw SQL capability.

```text
React/Application
→ typed Tauri command
→ Rust SaveRepository
→ SQLite
```

## TypeScript responsibilities

- чистая симуляция;
- commands/results;
- DTO schemas;
- repository interfaces;
- read model composition;
- application orchestration.

## Rust responsibilities

- open/close database;
- schema migrations;
- transactions;
- serialization boundary;
- `i64` money conversion;
- backup/restore;
- atomic filesystem operations;
- diagnostics and error mapping.

## IPC

- versioned DTO;
- `bigint` передаётся decimal string;
- commands имеют request ID и expected save revision;
- payload limits проверяются;
- raw filesystem paths не возвращаются без необходимости;
- error response не раскрывает secrets или private paths.

## Почему не прямой SQL plugin из UI

Архитектурный запрет должен быть техническим, а не только соглашением. Ограниченная Rust boundary уменьшает поверхность атаки WebView и централизует transaction/recovery policy.

## Ограничение Rust слоя

Rust не вычисляет баланс и не выбирает события. Он получает уже рассчитанный результат и проверяемые persistence commands.

## Тестирование

- contract tests TS ↔ Rust;
- DTO round trips;
- integer boundary tests;
- command permission tests;
- отсутствие SQL capabilities у renderer;
- interrupted write recovery.