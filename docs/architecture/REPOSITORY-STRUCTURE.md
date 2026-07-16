# Структура репозитория

## Целевая раскладка

```text
apps/
  desktop/
    .storybook/
  content-studio/              # после vertical slice
packages/
  shared-kernel/
  game-schema/
  game-core/
  game-application/
  game-content/
  game-persistence-contracts/
  game-platform-contracts/
  game-ui/
  game-ui-fixtures/
content/
  events/
  technologies/
  products/
  companies/
  equipment/
  housing/
  conferences/
  localization/
  history/
tools/
  content-validator/
  content-compiler/
  balance-simulator/
  save-inspector/
  screenshot-runner/
docs/
  research/
  adr/
```

## Storybook placement

- `.storybook/` располагается в desktop app либо отдельном UI-workshop app после scaffold review.
- Stories могут находиться рядом с компонентами либо в `game-ui/src/stories`.
- Сложные deterministic fixtures находятся в `game-ui-fixtures` и переиспользуются Storybook, Vitest, Playwright и будущим Content Studio.
- Storybook не импортирует production persistence/platform adapters.
- Storybook MCP, если включён, является development-only tooling и не входит в release graph.

## Правила размещения

- Файлы группируются по ответственности, а не по случайному техническому типу.
- Код, который изменяется вместе, располагается рядом.
- Один файл имеет одну основную причину изменения.
- Public API пакета экспортируется только через `src/index.ts` или узкие subpath exports.
- Deep imports между пакетами запрещены.
- Тесты располагаются рядом с модулем либо в package-level `tests/`, если используют несколько файлов.
- Fixtures сейвов, UI states и исторического контента версионируются.
- Production и test/dev adapters разделяются exports/configuration и не смешиваются условными проверками по всему коду.

## Размеры

Ориентиры, а не автоматические жёсткие лимиты:

- доменный файл: до 250 строк;
- React-компонент: до 200 строк;
- story/fixture: до 250 строк до декомпозиции;
- schema definition: до 300 строк;
- тестовый файл: до 400 строк.

При превышении файл проверяется на смешение обязанностей.

## Package ownership

- `game-core`: core-agent и architecture review;
- `game-content`: content-agent и core review;
- `game-ui`: UI-agent и accessibility review;
- `game-ui-fixtures`/Storybook: UI-agent, content-agent для content-facing fixtures и QA review;
- persistence/Rust: platform-agent и human review для migrations;
- workflows/updater/signing/capabilities: обязательный human review.

## Генерируемые файлы

Генерируемые schemas, registries, snapshots, reports и visual baselines не редактируются вручную без documented regeneration/approval flow. В заголовке или manifest указывается генератор и команда воспроизведения.