---
title: "Доступность"
type: ui
status: draft
canon: true
updated: 2026-07-18
---

# Доступность

## Целевой уровень

WCAG 2.2 AA применяется как нормативный ориентир для desktop WebView-приложения.

## Обязательные требования

- полная клавиатурная навигация;
- видимый focus;
- отсутствие keyboard traps;
- корректное управление focus в dialogs;
- поддержка Windows Narrator;
- status messages через live regions;
- смысл не кодируется только цветом;
- UI остаётся рабочим при 200% text scale;
- high-contrast mode;
- reduced motion;
- drag-and-drop имеет кнопочную/клавиатурную альтернативу;
- достаточный target size;
- доступные названия графиков и показателей.

## События

Event choice является обычной доступной кнопкой с полным текстом. Таймеров на решение в реальном времени нет. Скрытая информация не передаётся только визуальным эффектом.

## Charts

Каждый график имеет текстовое summary и таблицу/список ключевых значений. Tooltip не является единственным источником данных.

## Настройки

- text scale;
- animation intensity;
- reduced flashes;
- high contrast;
- volume channels;
- sensitivity/content intensity options.

## Тестирование

- `@axe-core/playwright`;
- keyboard-only сценарии;
- Narrator smoke tests на release milestones;
- 200% screenshots;
- pseudo-localization;
- contrast checks;
- no-pointer flows.

## Definition of Done

Новый интерактивный компонент не принимается без keyboard behavior, focus rules, accessible name и хотя бы одного accessibility test/story.