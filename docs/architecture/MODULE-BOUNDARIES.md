# Границы модулей

Нормативные решения: [ADR-004](../adr/ADR-004-persistence-execution-boundary.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Правило направления зависимостей

```text
React UI / Storybook
        ↓
Typed Application Facade / Use Cases
        ↓
Pure TypeScript 7 Game Core ← Compiled Content Runtime
        ↑
 Typed Contracts / Ports / Schemas
        ↓
Typed Tauri Commands
        ↓
Rust Persistence and Platform Services
        ↓
SQLite / filesystem / Tauri
```

Зависимость всегда направлена к более стабильному и чистому слою. Runtime adapters реализуют ports, но domain/application не знают конкретную инфраструктуру.

## `shared-kernel`

Содержит только стабильные value objects и примитивы:

- branded IDs;
- `GameDate`;
- authoritative numeric types (`MoneyMinor`, `RateBps`, `ChancePpm`, `WorkUnit`);
- `Result` и доменные ошибки;
- version identifiers;
- canonical serialization contracts.

Не содержит игровых систем, React, SQL, Tauri и platform APIs.

## `game-schema`

Содержит TypeBox-схемы DTO, контента, save envelopes, IPC requests/results, Storybook fixtures и mod manifests. Не содержит поведения и side effects.

Включает contracts для:

- `ExperienceEpisode`;
- professional state/evidence DTO;
- progression read models;
- skill/technology/grade content definitions.

Generated schemas/types имеют один source и не редактируются вручную.

## `game-core`

Владеет:

- доменными сущностями/state transitions;
- integer/fixed-point формулами;
- MonthRun engine;
- Event Engine;
- Narrative Director;
- Professional Progression Core;
- invariants;
- deterministic randomness contracts;
- calendar;
- canonical outcome/trace model.

Запрещены импорты React, Tauri, Zustand, SQLite, filesystem, network, system `Date`, `Math.random` и production logger.

Core не выполняет persistence. Он возвращает immutable result/checkpoint, который application layer передаёт в port.

## Professional Progression Core

Владеет:

- `CharacterProfessionalState` transitions;
- mastery/fluency/familiarity assessment;
- experience assessment;
- evidence materialization;
- grade/readiness projections;
- progression trace/explanations;
- anti-repeat/dedup rules.

Не владеет:

- lifecycle проектов, work packages, вакансий, курсов и событий;
- salary, employer, promotion и company state;
- health/fatigue state;
- provider-specific outcome truth;
- persistence transaction;
- UI formatting.

Public input — immutable `ExperienceEpisode`. Public output — professional assessment/delta/evidence candidates/projections.

## Experience Providers

Provider modules:

- Education;
- Projects/Products;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event Engine.

Каждый provider:

- владеет своим task/activity/outcome lifecycle;
- проверяет eligibility и domain invariants;
- отделяет вклад персонажа от командного результата;
- материализует stable `ExperienceEpisode`;
- не изменяет skills/technologies/grade напрямую.

Provider может использовать compiled definitions из `game-content`, но не импортирует внутренности Progression Core.

## `game-application`

Оркестрирует use cases:

- создание/загрузку сейва;
- begin/resume/recover/abandon MonthRun;
- выполнение пользовательских команд;
- проверку revisions/idempotency context;
- сохранение результата через ports;
- import/export;
- backup/restore;
- построение read models.

Не содержит формул баланса, raw SQL, progression math и Tauri calls.

## `game-content`

Загружает и компилирует data packs, строит deterministic registry и предоставляет core только валидированные immutable definitions.

Владеет:

- schemas/semantic validation orchestration;
- skill/technology family/transfer definitions;
- activity/challenge/grade profile definitions;
- references/chronology;
- load order и fingerprints;
- tombstones/remaps;
- localization resources;
- built-in/mod pack registry.

Не исполняет произвольный код контента и не вычисляет runtime progression.

## Persistence contracts

Описывают typed repositories/services:

- save snapshot/history;
- professional snapshot/evidence ledger;
- MonthRun draft/checkpoint/commit;
- transaction/revision/idempotency;
- migrations;
- backup/restore;
- import/export;
- recovery.

Raw SQL и concrete SQLite types не входят в public TypeScript API.

## Platform contracts

Описывают filesystem, dialogs, window lifecycle, updater, logging и infrastructure clock. Системный clock не передаётся в игровую симуляцию.

Platform contract не должен превращаться в универсальный `execute`, `readAnyPath` или shell bridge.

## Typed Tauri/Rust adapter

Rust реализует persistence/platform contracts через узкие versioned commands. Production renderer не получает authoritative SQL execute, произвольный filesystem или shell capability.

Rust не выбирает события, не вычисляет progression/grade, не создаёт evidence claims и не интерпретирует content rules. Он валидирует DTO, checked integer ranges, idempotency и transaction consistency.

## `game-ui`

Содержит:

- design system;
- presentational/game components;
- view models/view adapters;
- route-level composition;
- accessibility behavior;
- Storybook stories рядом с компонентами при выбранной структуре.

Не импортирует persistence implementation, raw Tauri API, `game-core` mutable state и SQL.

UI получает capabilities, evidence, readiness и explanations через typed application/read-model facade. Он не пересчитывает grade или skill gain.

## `game-ui-fixtures`

Содержит deterministic serializable fixtures для:

- Storybook;
- component tests;
- Playwright;
- bug reproduction;
- будущего Content Studio.

Fixtures включают novice/advanced professional read models, но не используют system date/randomness, production save paths, сеть и privileged platform adapters.

`game-ui-fixtures` может зависеть от schemas/read-model contracts, но не от desktop composition/Rust implementation.

## Storybook boundary

Storybook является development-only consumer `game-ui` и fixtures.

Разрешено:

- in-memory application/platform mocks;
- deterministic professional/evidence read models;
- interaction/a11y/visual tests.

Запрещено:

- production SQLite/save directory;
- updater/signing;
- arbitrary filesystem/network;
- release secrets;
- production Tauri capabilities;
- grade/progression formula в story decorator.

Storybook MCP, если включён, остаётся за той же boundary и не входит в release dependency graph.

## Desktop composition root

`apps/desktop` единственный слой, который связывает:

- React routes/UI;
- application facade;
- generated IPC client;
- Tauri/Rust commands;
- production adapters/configuration.

Composition root не содержит gameplay/progression formulas.

## Архитектурные проверки

CI обязан блокировать:

- импорт `@tauri-apps/*` из shared-kernel/schema/core/application/game-ui;
- импорт React/DOM/Zustand из core/application;
- импорт persistence implementation из UI/Storybook;
- импорт `game-core` internals из UI;
- provider import внутренних progression modules вместо public contracts;
- provider direct mutation `CharacterProfessionalState`;
- grade calculation вне Progression Core;
- evidence creation без `ExperienceEpisode`/source snapshot;
- raw SQL strings вне Rust persistence module/migrations;
- SQL execute capability у main production window;
- production adapters/secrets в Storybook graph;
- циклические package dependencies;
- обход public package exports/deep imports;
- игровые формулы внутри компонентов/application orchestration;
- system `Date`/`Math.random`/locale sorting в core;
- plain floating authoritative domain fields;
- content/mod executable code;
- test-only Tauri/WebdriverIO plugin в release build.
