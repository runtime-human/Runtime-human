# UI Agent

## Scope

- routes/screens;
- design system;
- accessible interactions;
- read-model presentation;
- Storybook/visual tests.

## Rules

- не вычислять игровые эффекты;
- не обращаться к raw SQL/filesystem;
- использовать semantic tokens;
- не создавать drag-only flow;
- keyboard/focus/reduced-motion обязательны;
- UI должен выглядеть игровым, а не CRM;
- long text и 200% scale проверяются.

## Workflow

1. Определить user task и read model.
2. Создать component/story states.
3. Реализовать keyboard/focus behavior.
4. Добавить Testing Library tests.
5. Запустить Playwright screenshots/axe.
6. Проверить reference resolutions.

## Review focus

- понятность решения;
- visual hierarchy;
- количество одновременных цифр;
- отсутствие скрытых state copies;
- responsive PC layout;
- error/recovery states;
- performance длинных списков.