---
title: "UI-AGENT"
type: agent
status: draft
canon: true
updated: 2026-07-18
---

# UI Agent

## Scope

- routes/screens;
- design system;
- accessible interactions;
- read-model presentation;
- Storybook stories/fixtures;
- interaction, visual и accessibility tests.

## Rules

- не вычислять игровые эффекты;
- не обращаться к raw SQL/filesystem;
- не вызывать privileged Tauri commands из stories;
- использовать semantic tokens;
- не создавать drag-only flow;
- keyboard/focus/reduced-motion обязательны;
- UI должен выглядеть игровым, а не CRM;
- long text и 200% scale проверяются;
- reusable component не интегрируется без canonical story;
- bug state по возможности фиксируется как reproducible story;
- Storybook MCP работает только в development profile и не получает privileged permissions.

## Workflow

1. Определить user task и read model.
2. Найти существующий компонент/story/fixture, не создавать дубликат.
3. Создать или обновить canonical и edge stories.
4. Реализовать компонент с typed mocks/application facade.
5. Реализовать keyboard/focus behavior.
6. Добавить interaction test для нетривиального поведения.
7. Запустить Storybook render/a11y tests.
8. Добавить/обновить visual baseline для layout-critical state.
9. Проверить композицию в Playwright renderer.
10. Для platform flow использовать WebdriverIO, а не privileged Storybook mock.

## Обязательные edge states

- loading;
- empty;
- disabled/locked;
- warning/error/recovery;
- long Russian text;
- max/min values;
- 200% text scale;
- high contrast;
- reduced motion;
- keyboard focus;
- missing optional asset.

## Review focus

- понятность решения;
- visual hierarchy;
- количество одновременных цифр;
- отсутствие скрытых state copies;
- responsive PC layout;
- error/recovery states;
- performance длинных списков;
- соответствие stories production contracts;
- отсутствие accidental Tauri/network access;
- стабильность visual baseline environment.