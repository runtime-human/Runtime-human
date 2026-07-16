# Design System

## Цель

Интерфейс должен выглядеть как современная атмосферная PC-игра, а не как банковский dashboard или CRM.

## Semantic tokens

```text
surface.base
surface.raised
surface.overlay
text.primary
text.secondary
accent.career
accent.technology
accent.fame
accent.money
state.positive
state.warning
state.danger
```

Компоненты не используют случайные `blue-600`/`gray-400` вне token layer.

## Component families

- buttons and choices;
- cards/events;
- status chips;
- grade/career badges;
- meters;
- timelines;
- journals;
- equipment tiles;
- project panels;
- month summary;
- dialogs and command palette;
- empty/error/loading states.

## Variants

Variants определяются через `class-variance-authority`, `clsx` и `tailwind-merge`. API компонента выражает смысл: `variant="career"`, `state="warning"`, а не конкретный цвет.

## Radix

Radix используется для behavior/accessibility primitives: dialog, tooltip, menu, tabs, select, popover и scroll area. Визуальный стиль полностью собственный.

## Storybook

Подключается после первых 8–10 стабильных компонентов. Для каждого компонента обязательны normal, long text, keyboard, high contrast, reduced motion и error stories.

## Theme

Baseline поддерживает светлую/тёмную тему только если обе реально проверяются. Сначала допускается одна качественная тема плюс high-contrast variant, а не две недоделанные.

## Visual review

Ключевые screens имеют reference screenshots. Изменение design tokens проходит visual regression и review на 1366×768, 1920×1080 и 200% text scale.