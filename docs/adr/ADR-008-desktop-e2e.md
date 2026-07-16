# ADR-008: Разделение browser и desktop E2E

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

Playwright хорошо тестирует React renderer, но не является полной заменой управления настоящим Tauri executable, IPC, SQLite и window lifecycle.

## Предлагаемое решение

- Playwright: browser renderer, visual regression, accessibility и platform mocks.
- WebdriverIO + Tauri service: настоящий desktop app, IPC, persistence, window state, single instance, backup/recovery и updater smoke.

## Последствия

CI получает два разных уровня E2E. Desktop suite тяжелее и выполняется на Windows runner для release candidates/selected PRs.

## Альтернативы

- только Playwright — недостаточно для native boundary;
- тестировать всё WebdriverIO — медленнее и ухудшает component feedback;
- ручное desktop QA без automation — неприемлемо для migrations/updater.