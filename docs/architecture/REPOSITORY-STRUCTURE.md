# Структура репозитория

## Целевая раскладка

```text
apps/
  desktop/
  content-studio/
packages/
  shared-kernel/
  game-schema/
  game-core/
  game-application/
  game-content/
  game-persistence-contracts/
  game-platform-contracts/
  game-ui/
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
```

## Правила размещения

- Файлы группируются по ответственности, а не по случайному техническому типу.
- Код, который изменяется вместе, располагается рядом.
- Один файл имеет одну основную причину изменения.
- Public API пакета экспортируется только через `src/index.ts` или узкие subpath exports.
- Deep imports между пакетами запрещены.
- Тесты располагаются рядом с модулем либо в package-level `tests/`, если используют несколько файлов.
- Fixtures сейвов и исторического контента версионируются.

## Размеры

Ориентиры, а не автоматические жёсткие лимиты:

- доменный файл: до 250 строк;
- React-компонент: до 200 строк;
- schema definition: до 300 строк;
- тестовый файл: до 400 строк.

При превышении файл проверяется на смешение обязанностей.

## Package ownership

- `game-core`: core-agent и architecture review;
- `game-content`: content-agent и core review;
- `game-ui`: UI-agent и accessibility review;
- persistence/Rust: platform-agent и human review для migrations;
- workflows/updater/signing: обязательный human review.

## Генерируемые файлы

Генерируемые schemas, registries, snapshots и reports не редактируются вручную. В заголовке указывается генератор и команда воспроизведения.