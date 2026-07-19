---
title: "Repository Foundation design"
type: plan
status: draft
canon: true
depends_on: [ADR-008, ADR-011, ADR-012, ADR-015, ADR-020]
updated: 2026-07-19
---

# Repository Foundation design

## Цель

Создать первый исполняемый scaffold Runtime Human, который доказывает выбранный стек, package boundaries и воспроизводимые команды проверки, но не реализует игровую симуляцию раньше времени.

```text
clean checkout
→ frozen dependency install
→ static checks and tests
→ React/Vite renderer build
→ Storybook build
→ Rust/Tauri shell check
```

## Выбранный подход

Используется минимальный pnpm monorepo с настоящими границами пакетов.

Отклонены:

- единый `apps/desktop`, смешивающий UI, application, core и platform;
- полный production monorepo с преждевременными schemas, SQLite и gameplay APIs;
- Nx/Turborepo до доказанной необходимости.

## Структура

```text
apps/
  desktop/
    .storybook/
    src/
    src-tauri/
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
tests/
scripts/
```

Реальными runtime surfaces в этом PR являются только desktop renderer, Storybook и минимальный Tauri shell. Остальные packages создают компилируемые public boundaries без фиктивных gameplay interfaces.

## Закреплённый стек

- Node.js 24;
- pnpm 11.11.0;
- TypeScript 7.0.2;
- Vite 8.1.5;
- React/React DOM 19.2.7;
- Storybook 10.5.0;
- Oxlint 1.74.0 + oxlint-tsgolint 0.24.0;
- Oxfmt 0.59.0;
- Vitest 4.1.10;
- Tauri CLI 2.11.4, Rust crate 2.11.5;
- Rust 1.97.0.

Все toolchain/runtime зависимости фиксируются exact versions. Workspace dependencies используют `workspace:*`.

## Dependency direction

Разрешённый Foundation graph:

```text
shared-kernel
  ↑
game-schema
  ↑
game-core
  ↑
game-application
  ↑
game-ui
  ↑
apps/desktop
```

Дополнительные ветви:

- `game-content` → только `shared-kernel`, `game-schema`;
- persistence/platform contracts → только `shared-kernel`, `game-schema`;
- `game-ui` → `game-application`, но не `game-core` напрямую;
- `game-ui-fixtures` → public contracts и `game-ui`;
- desktop остаётся composition root и не импортирует gameplay internals;
- core не импортирует React, DOM, Tauri, filesystem или persistence adapters.

`scripts/check-boundaries.mjs` проверяет declared workspace dependencies и запрещённые deep imports. Сторонний dependency graph framework в Foundation не добавляется.

## TypeScript

Каждый package имеет composite project и public entry `src/index.ts`. Root `tsconfig.json` использует project references.

Обязательны:

- `strict`;
- `noUncheckedIndexedAccess`;
- `exactOptionalPropertyTypes`;
- `useUnknownInCatchVariables`;
- `noImplicitOverride`;
- `noUncheckedSideEffectImports`;
- явные `target`, `module`, `moduleResolution`, `lib`, `rootDir`;
- ESM и запрет deep imports.

TypeScript 7 является единственным production typechecker. Type-aware Oxlint остаётся blocking и использует официальный `oxlint-tsgolint` backend.

## Desktop и Tauri

Desktop renderer:

- Vite + React;
- один русскоязычный Foundation status screen;
- без Router, Zustand, Tailwind, Radix и Motion;
- без прямого импорта `@tauri-apps/api`;
- без gameplay formulas.

Tauri shell:

- одно окно;
- минимальный CSP;
- bundle disabled для Foundation checks;
- без custom commands, filesystem, network, updater и SQLite;
- точный Rust toolchain;
- `cargo fmt --check` и `cargo check --locked`.

## UI и Storybook

`game-ui` содержит только один reusable smoke component `FoundationStatus`.

`game-ui-fixtures` содержит serializable deterministic fixtures, включая long-RU вариант.

Storybook:

- размещён в `apps/desktop/.storybook`;
- использует React/Vite framework;
- включает addon-a11y;
- показывает canonical и long-RU stories;
- не имеет production platform/persistence adapters;
- обязан успешно собираться в CI.

## Tooling и команды

```text
pnpm docs:check
pnpm fmt
pnpm fmt:check
pnpm lint
pnpm lint:type-aware
pnpm typecheck
pnpm boundaries:check
pnpm test
pnpm build
pnpm storybook
pnpm storybook:build
pnpm rust:fmt:check
pnpm rust:check
pnpm check:fast
pnpm verify
```

`check:fast` объединяет docs, formatting, fast lint, typecheck, boundary checks и tests.

`verify` дополнительно запускает type-aware lint, renderer build, Storybook build и Rust checks.

## Tests

Foundation покрывает:

1. разрешённый workspace dependency graph;
2. запрещённую зависимость UI → core;
3. запрещённый deep import;
4. render/accessibility smoke для `FoundationStatus`;
5. deterministic fixtures;
6. TypeScript project build;
7. Vite и Storybook production builds;
8. Rust formatting и Tauri `cargo check`.

Gameplay, save, MonthRun, PRNG и SQLite tests относятся к следующим PR.

## CI

Новый `foundation.yml` разделяет JS и Rust jobs.

JS job:

- Node 24;
- exact pnpm через Corepack;
- frozen lockfile;
- `pnpm check:fast`;
- `pnpm lint:type-aware`;
- `pnpm build`;
- `pnpm storybook:build`.

Rust job:

- Linux Tauri prerequisites;
- Rust 1.97.0;
- `cargo fmt --check`;
- `cargo check --locked`.

Workflow permissions read-only. Existing docs workflow остаётся отдельным.

## Out of scope

- branded IDs, fixed-point и PRNG;
- TypeBox/Ajv schemas;
- gameplay contracts и formulas;
- SQLite/rusqlite, save и MonthRun;
- content compiler;
- Tailwind/design system;
- Router/Zustand;
- Playwright/WebdriverIO;
- packaging/signing/updater;
- backend/network services.

## Definition of Done

- lockfiles committed and frozen install succeeds;
- docs metadata/catalog current;
- `pnpm check:fast` succeeds;
- `pnpm verify` succeeds in CI environment;
- TypeScript 7 project references compile;
- boundary checker rejects forbidden graph/deep imports;
- renderer and Storybook build;
- Rust/Tauri shell passes locked check;
- no speculative gameplay or persistence API is introduced.
