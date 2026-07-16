# Тестовая стратегия

## Пирамида

1. Unit tests чистого Game Core.
2. Property-based tests invariants.
3. Contract/schema/content tests.
4. Persistence/migration integration tests.
5. React component tests.
6. Playwright browser/visual/accessibility tests.
7. WebdriverIO Tauri desktop E2E.
8. Balance and long-run simulations.

## Unit tests

Покрывают формулы, transitions, requirements/effects, календарь, money и edge cases без IO.

## fast-check

Обязательные properties:

- дата не уменьшается;
- деньги не выходят за range;
- отсутствуют NaN/Infinity;
- уволенный не получает зарплату;
- закрытый проект не прогрессирует;
- MonthIndex увеличивается один раз;
- save/load сохраняет state;
- одинаковый seed воспроизводится.

## Golden tests

Фиксируют deterministic MonthRun trace и historical catalog snapshots. Golden update требует review причины, а не автоматического accept.

## Content tests

Schema, references, chronology, reachability, localization и tombstones.

## Persistence tests

Каждая поддерживаемая старая версия сейва, failed migration, WAL recovery, backup/restore и interrupted transaction.

## UI tests

Testing Library ищет по roles/names. Playwright проверяет renderer, screenshots и axe. WebdriverIO запускает настоящий Tauri app и проверяет IPC, SQLite, window state, single instance и recovery.

## Mutation/fuzz

После стабилизации критические pure modules могут проверяться StrykerJS. Archive/import parsers — Rust fuzz/proptest.

## Test quality

Тест не должен повторять реализацию. Используются observable outcomes и invariants. Flaky test либо исправляется, либо изолируется с owner и сроком; бесконечный retry запрещён.