---
title: "ADR-008-desktop-e2e"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-008: Разделение browser и desktop E2E

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и official WebdriverIO Tauri guidance

## Контекст

Playwright хорошо тестирует React renderer, но не является полной заменой управления настоящим Tauri executable, IPC, SQLite, native dialogs и window lifecycle.

## Решение

- Storybook + Vitest addon: isolated component render, interactions и accessibility.
- Playwright: browser renderer, routes, visual regression, accessibility и platform mocks.
- WebdriverIO + Tauri service: настоящий desktop app, IPC, persistence, native dialogs, window state, single instance, backup/recovery и updater smoke.

Каждый инструмент используется только на подходящем уровне. Не допускается перенос всех UI-тестов в тяжёлый desktop suite.

## Последствия

CI получает три уровня UI verification. Desktop suite тяжелее и выполняется на Windows runner для selected PRs, nightly/release candidates и изменений platform boundary.

Плюсы:

- реальное покрытие executable и IPC;
- быстрый feedback компонентов;
- отдельные стабильные visual baselines;
- лучшее разделение причин падения.

Минусы:

- больше конфигурации и CI jobs;
- нужны platform-specific fixtures;
- desktop suite требует контроля WebView2/driver versions.

## Альтернативы

- только Playwright — недостаточно для native boundary;
- тестировать всё WebdriverIO — медленнее и ухудшает component feedback;
- ручное desktop QA без automation — неприемлемо для migrations/updater.

## Critical desktop flows

- first launch;
- create/open save;
- run/suspend/resume month;
- app restart on decision;
- backup/restore;
- migration failure and Safe Mode;
- import/export;
- updater preconditions;
- single instance/window restore.