# Тестовая стратегия

## Пирамида

1. Unit tests чистого Game Core.
2. Property-based tests invariants.
3. Contract/schema/content tests.
4. Persistence/migration integration tests.
5. React component tests.
6. Storybook render/interaction/accessibility tests.
7. Playwright browser/visual/accessibility tests.
8. WebdriverIO Tauri desktop E2E.
9. Balance and long-run simulations.
10. Release/install/update verification.

Нормативные решения: [ADR-008](../adr/ADR-008-desktop-e2e.md) и [ADR-012](../adr/ADR-012-storybook-ui-content-workshop.md).

## Unit tests

Покрывают формулы, transitions, requirements/effects, календарь, money, Narrative Director и edge cases без IO.

## fast-check

Обязательные properties:

- дата не уменьшается;
- деньги не выходят за range;
- authoritative state не содержит float/NaN/Infinity;
- уволенный не получает зарплату;
- закрытый проект не прогрессирует;
- MonthIndex увеличивается один раз на commit;
- save/load сохраняет state;
- одинаковый seed/manifest воспроизводится;
- duplicate decision/commit не применяет effects повторно;
- failed MonthRun не меняет authoritative save.

## Golden tests

Фиксируют deterministic MonthRun trace, Narrative Director selection и historical catalog snapshots. Golden update требует review причины, а не автоматического accept.

Golden fixture включает rules/content/determinism versions.

## Content tests

Schema, references, chronology, reachability, localization, stable IDs, tombstones, mod manifest, archive limits и deterministic registry fingerprint.

## Persistence tests

Каждая поддерживаемая старая версия сейва, failed migration, WAL recovery, backup/restore, interrupted transaction, duplicate commit, incompatible pending draft и Safe Mode flow.

SQLite tests проверяют minimum version gate, `quick_check`, `foreign_key_check`, Online Backup API/`VACUUM INTO` path и controlled `PRAGMA optimize`.

## Storybook tests

Storybook является первой поверхностью UI verification:

- render test каждой canonical story;
- interaction tests через `play`/Vitest addon;
- a11y addon с blocking errors для canonical stories;
- long RU text, 200% scale, high contrast и reduced motion;
- empty/loading/error/recovery states;
- content fixtures для событий и решений.

Stories не получают production SQL/filesystem/updater access.

## Playwright

Проверяет browser renderer и application flows с mocked platform ports:

- routes;
- screen compositions;
- visual regression;
- accessibility;
- keyboard navigation;
- responsive PC layouts;
- Storybook story screenshots в фиксированной CI-среде.

Baselines разделяются по OS/browser environment и не обновляются автоматически без review.

## WebdriverIO Tauri

Запускает настоящий Tauri executable и проверяет:

- IPC contracts;
- SQLite persistence;
- native dialogs;
- window state/single instance;
- suspend/restart/resume MonthRun;
- backup/restore/recovery;
- Safe Mode;
- updater preconditions;
- import/export.

Основная platform lane — Windows. Desktop E2E не дублирует все component tests.

## Rust tests/fuzz

- repositories и transactions — unit/integration;
- parsers и archive import — proptest/fuzz после vertical slice;
- path traversal, zip-slip, decompression limits и malformed payloads — обязательные security cases.

## Mutation testing

После стабилизации критические pure modules могут проверяться StrykerJS. Mutation testing не является Foundation gate.

## Balance simulations

Длинные deterministic прогоны проверяют:

- soft locks;
- карьерную скорость;
- экономику;
- burnout/fatigue;
- event repetition;
- crisis streaks;
- abandoned narrative arcs;
- редкие недостижимые технологии/события.

## Test quality

Тест не должен повторять реализацию. Используются observable outcomes и invariants. Flaky test либо исправляется, либо изолируется с owner и сроком; бесконечный retry запрещён.

Каждый bug в core/persistence получает regression fixture. Для UI предпочтительно сохранить reproducer как Storybook story.