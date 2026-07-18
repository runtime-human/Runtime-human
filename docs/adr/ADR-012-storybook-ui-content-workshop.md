---
title: "ADR-012: Storybook как UI и content workshop"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-012: Storybook как UI и content workshop

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание:** DR-001, DR-002 и явное решение владельца проекта

## Контекст

Runtime Human имеет state-heavy и content-heavy интерфейс: карточки событий, blocking decisions, отчёты месяца, длинные локализованные тексты, ошибки сохранений, recovery и accessibility states.

Откладывание Storybook до появления «готового UI kit» приводит к тому, что редкие состояния создаются внутри полноэкранных маршрутов, плохо воспроизводятся и дорого тестируются. Исследования и актуальная документация Storybook подтверждают более сильную модель: stories являются одновременно fixture, документацией, interaction test и visual test case.

## Решение

1. Storybook 10.x вводится в Phase 0 / Foundation.
2. Версия закрепляется точно в lockfile.
3. Storybook является обязательной dev-средой для `packages/game-ui` и контентных представлений.
4. Каждое reusable UI-состояние имеет story до либо одновременно с интеграцией в приложение.
5. Stories используются для:
   - component development;
   - edge-state registry;
   - event/content preview;
   - interaction tests;
   - accessibility checks;
   - visual baselines;
   - bug reproduction;
   - AI-assisted UI work.
6. Storybook не вызывает privileged Tauri commands напрямую. Platform APIs заменяются typed mocks/adapters.
7. Обязательный внешний SaaS visual testing не вводится. Visual regression выполняется в контролируемой CI-среде через Storybook stories и Playwright/Vitest browser.
8. Storybook MCP допускается только в development profile после стабилизации component registry и не получает filesystem, SQL, updater либо signing permissions.

## Минимальное покрытие vertical slice

- application shell;
- resource/date bar;
- character summary;
- activity card;
- event card;
- blocking decision dialog;
- monthly report;
- save/load/recovery;
- empty/loading/error;
- long Russian text;
- 200% text scale;
- high contrast;
- reduced motion;
- keyboard/focus paths.

## Последствия

Плюсы:

- быстрый feedback без запуска Tauri;
- воспроизводимые редкие состояния;
- единый fixture layer для людей и агентов;
- более дешёвые visual/accessibility regressions;
- основа для Content Studio.

Минусы:

- дополнительный Foundation setup;
- stories требуют сопровождения как тестовые данные;
- platform mocks должны соответствовать production contracts.

## Definition of Done для UI-компонента

Компонент не считается готовым, пока отсутствуют:

- canonical story;
- ключевые edge stories;
- keyboard/focus behavior;
- interaction test для нетривиального поведения;
- a11y result;
- visual baseline для layout-critical компонента.

## Источники

- https://storybook.js.org/
- https://storybook.js.org/docs/writing-tests/interaction-testing
- https://storybook.js.org/docs/writing-tests/accessibility-testing
- https://storybook.js.org/docs/writing-tests/visual-testing
- https://storybook.js.org/blog/storybook-10-3/
