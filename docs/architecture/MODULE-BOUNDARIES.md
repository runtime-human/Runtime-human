# Границы модулей

## Правило направления зависимостей

```text
UI → Application → Game Core ← Content Runtime
                     ↑
              Contracts / Ports
                     ↑
        Rust, SQLite and Platform Adapters
```

Зависимость всегда направлена к более стабильному и более чистому слою.

## `shared-kernel`

Содержит только стабильные value objects и примитивы:

- branded IDs;
- `GameDate`;
- `Money`;
- `Result` и доменные ошибки;
- version identifiers.

Не содержит игровых систем, React, SQL и platform APIs.

## `game-schema`

Содержит TypeBox-схемы DTO, контента и save envelopes. Не содержит поведения и side effects.

## `game-core`

Владеет:

- доменными сущностями;
- формулами;
- MonthRun;
- Event Engine;
- Narrative Director;
- invariants;
- deterministic randomness contracts.

Запрещены импорты React, Tauri, Zustand, SQLite, filesystem, network, `Date.now` и `Math.random`.

## `game-application`

Оркестрирует use cases:

- создание и загрузку сейва;
- begin/resume month;
- выполнение команд;
- сохранение результата;
- import/export;
- backup/restore.

Не содержит формул баланса.

## `game-content`

Загружает и компилирует data packs, строит registry и предоставляет core только валидированные immutable definitions.

## Persistence contracts

Описывают typed repositories, transactions, backup и migration services. Raw SQL не входит в public API.

## Platform contracts

Описывают filesystem, dialogs, window lifecycle, updater, logging и clock для инфраструктурных задач. Системный clock не передаётся в игровую симуляцию.

## `game-ui`

Содержит design system, presentational components, view models и route-level composition. Не импортирует persistence implementation.

## Архитектурные проверки

CI обязан блокировать:

- импорт `@tauri-apps/*` из core/application;
- импорт React из core;
- импорт persistence implementation из UI;
- циклические package dependencies;
- обход public package exports;
- игровые формулы внутри компонентов.
