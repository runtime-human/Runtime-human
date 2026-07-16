# Rust boundary

## Назначение

Rust является минимальным platform/persistence adapter, а не вторым игровым ядром.

## Rust владеет

- Tauri command handlers;
- SQLite connection/migrations/transactions;
- backup/restore/import/export;
- atomic filesystem operations;
- platform paths/dialogs/window lifecycle;
- updater integration;
- logging bootstrap;
- single instance;
- integer-safe DTO conversion.

## Rust не владеет

- балансом;
- Event Engine/Narrative Director;
- карьерными формулами;
- content IDs и historical logic;
- React view models;
- случайным выбором gameplay outcomes.

## Commands

Команды узкие, versioned и принимают schema-validated DTO. Не создаётся универсальная команда `execute_sql` или `read_file(path)` для renderer.

## Errors

Rust errors переводятся в стабильную application taxonomy. Internal cause сохраняется в redacted log, пользователь получает безопасный code/message/recovery action.

## Concurrency

Persistence operations сериализуются там, где требуется consistency. Long CPU gameplay не переносится в Rust без profiling/ADR.

## Toolchain

- точная stable версия в `rust-toolchain.toml`;
- `cargo fmt --check`;
- `cargo clippy --all-targets -- -D warnings`;
- `cargo deny check`;
- `cargo nextest run` после появления достаточного test corpus;
- `sccache` в CI/release.

## Security

Tauri capabilities минимальны. Commands, updater, filesystem и shell-like actions проходят отдельный threat review. Shell plugin baseline не используется.