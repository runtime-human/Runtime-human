---
title: "Rust boundary"
type: engine
status: draft
canon: true
depends_on: [ADR-004]
updated: 2026-07-18
---

# Rust boundary

## Назначение

Rust является узким, но авторитетным platform/persistence perimeter, а не вторым игровым ядром.

Нормативное решение: [ADR-004](../adr/ADR-004-persistence-execution-boundary.md).

## Rust владеет

- Tauri command handlers;
- SQLite connection/version gate/migrations/transactions;
- MonthRun draft/checkpoint/commit persistence;
- backup/restore/import/export;
- mod package quarantine/ingest;
- atomic filesystem operations;
- platform paths/dialogs/window lifecycle;
- updater integration;
- logging bootstrap;
- single instance;
- integer-safe DTO conversion;
- Safe Mode/recovery bootstrap;
- capability-sensitive native operations.

## Rust не владеет

- балансом;
- Event Engine/Narrative Director;
- карьерными формулами;
- content IDs и historical logic;
- React view models;
- случайным выбором gameplay outcomes;
- Storybook fixtures;
- UI routing/state.

## Commands

Команды узкие, versioned и принимают schema-validated DTO. Не создаётся универсальная команда `execute_sql`, `read_file(path)`, `write_file(path)` или shell proxy для renderer.

Типовые группы:

```text
save.*
month_run.*
backup.*
import_export.*
recovery.*
updater.*
window.*
```

Каждая mutating command использует:

- stable request ID/idempotency key;
- expected revision при изменении save;
- stable error taxonomy;
- redacted structured log;
- transaction/recovery policy.

## Capabilities

Capabilities разделяются по поверхности:

- main window;
- import/export dialog flow;
- updater flow;
- debug read-only window;
- WebdriverIO test build.

Production main window не получает raw SQL execute, shell и произвольный filesystem. Test-only plugin/capability исключается из release profile.

## Errors

Rust errors переводятся в стабильную application taxonomy. Internal cause сохраняется в redacted log, пользователь получает безопасный code/message/recovery action.

Ошибки разделяются минимум на:

- validation;
- conflict/revision;
- incompatible version;
- storage unavailable;
- corruption suspected;
- migration failed;
- permission denied;
- cancelled;
- internal.

## Concurrency

- SQLite имеет один managed writer;
- month commit, migration, backup, restore и import activation mutually exclusive;
- reads не удерживают UI-blocking transactions;
- idempotency защищает от повторного IPC вызова;
- long CPU gameplay не переносится в Rust без profiling/ADR.

## Contracts

TS/Rust DTO имеют единый schema source либо contract tests, проверяющие:

- field names/types;
- decimal string integers;
- optional/null semantics;
- enum/discriminated union variants;
- error codes;
- backward compatibility.

`unknown` input валидируется до доступа к persistence.

## Toolchain

- точная stable версия в `rust-toolchain.toml`;
- `cargo fmt --check`;
- `cargo clippy --all-targets -- -D warnings`;
- `cargo deny check`;
- `cargo nextest run` после появления достаточного test corpus;
- `sccache` в CI/release;
- proptest/fuzz для archive/import boundaries после их появления.

## Security

Tauri capabilities минимальны. Commands, updater, filesystem, SQL, import archives и shell-like actions проходят отдельный threat review. Shell plugin baseline не используется.

Rust boundary не считается оправданием для переноса arbitrary logic: каждая native функция должна иметь platform/persistence причину и typed contract.