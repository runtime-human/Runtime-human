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

Создать первый исполняемый scaffold Runtime Human, который доказывает работоспособность выбранного стека и package boundaries, но не реализует игровую симуляцию раньше времени.

PR должен дать одну воспроизводимую точку входа для локальной разработки и CI:

```text
pnpm install --frozen-lockfile
→ pnpm check:fast
→ pnpm verify
→ desktop frontend / Storybook / Tauri shell собираются
```

## Контекст

На момент проектирования репозиторий содержит документацию и docs tooling, но не содержит `package.json`, `pnpm-workspace.yaml`, TypeScript workspace, React/Vite app или Rust/Tauri crate.

Нормативный стек:

- Node.js 24 LTS;
- pnpm workspace;
- TypeScript 7 stable, exact pinned;
- Vite 8;
- React 19;
- Tauri 2;
- Rust stable, exact pinned;
- Oxfmt/Oxlint;
- Vitest;
- Storybook 10 с React/Vite.

Официальные источники на дату проектирования подтверждают TypeScript 7 stable, Vite 8, React 19, Storybook 10 и Tauri 2. Exact package versions выбираются при реализации из stable channels и фиксируются в `package.json`, `pnpm-lock.yaml` и `rust-toolchain.toml`; ranges для production toolchain не используются.

## Рассмотренные подходы

### A. Один `apps/desktop` без package boundaries

Преимущества:

- минимальное число файлов;
- самый быстрый первый запуск.

Недостатки:

- сразу смешивает UI, application, core и platform;
- последующее разделение создаёт искусственную миграцию;
- не проверяет целевую архитектуру.

Решение: отклонить.

### B. Сразу создать полный production monorepo

Создать все packages, schemas, persistence adapters, content tooling и CI lanes из целевой архитектуры.

Преимущества:

- структура близка к конечной;
- меньше будущих перемещений.

Недостатки:

- создаёт пустые абстракции и speculative dependencies;
- расширяет PR за пределы Foundation;
- скрывает ошибки scaffold за большим объёмом кода.

Решение: отклонить.

### C. Минимальный monorepo с реальными boundaries

Создать целевые workspace packages, но оставить их пустыми или с минимальным public module. Реальными исполняемыми поверхностями сделать только desktop shell и Storybook.

Преимущества:

- dependency direction проверяется сразу;
- нет Nx/Turborepo и лишнего orchestration layer;
- следующие PR добавляют код в устойчивые boundaries;
- scope остаётся проверяемым.

Недостатки:

- несколько packages временно не содержат gameplay;
- требуется небольшой собственный architecture check.

**Выбран подход C.**

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
scripts/
  check-boundaries.mjs
  build-toc.mjs
docs/
```

Не создаются `content-studio`, content compiler, SQLite adapter, balance simulator или save inspector.

## Workspace и package policy

Корневой `package.json`:

- `private: true`;
- exact `packageManager`;
- Node 24 engine;
- единые команды проверки;
- devDependencies только для реально используемого Foundation tooling.

`pnpm-workspace.yaml` включает `apps/*` и `packages/*`.

Каждый package:

- имеет уникальное имя `@runtime-human/<name>`;
- использует ESM;
- экспортирует только `src/index.ts`;
- не публикуется;
- имеет собственный composite `tsconfig.json`;
- не использует deep imports.

Пустые domain packages содержат только module boundary и package README. Они не получают фиктивные interfaces или placeholder gameplay APIs.

## Dependency direction

Разрешённый workspace graph Foundation:

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

Дополнительные правила:

- `game-content` зависит только от `shared-kernel` и `game-schema`;
- persistence/platform contracts зависят только от `shared-kernel` и `game-schema`;
- `game-ui-fixtures` может зависеть от public contracts и `game-ui`, но не от Tauri/Rust;
- `game-core` не зависит от UI, React, Tauri, filesystem или persistence adapter;
- `apps/desktop` является composition root и не содержит gameplay formulas.

`scripts/check-boundaries.mjs` проверяет workspace `package.json` dependencies по allow-list. AST/import scanner и сторонний dependency-cruiser не добавляются в Foundation.

## TypeScript configuration

Используются project references.

Обязательные options:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noImplicitOverride": true,
  "noUncheckedSideEffectImports": true,
  "composite": true,
  "incremental": true
}
```

`target`, `module`, `moduleResolution`, `lib`, `rootDir` и `types` задаются явно для package categories.

TypeScript 7 является единственным production typechecker. TS6 compatibility package в Foundation не добавляется.

## Desktop shell

`apps/desktop` содержит:

- Vite 8 + React 19 renderer;
- минимальный `App` без router/state library;
- один Foundation status screen на русском;
- Tauri 2 `src-tauri` crate;
- один window, CSP/capabilities в минимальном безопасном профиле;
- отсутствие custom privileged commands;
- отсутствие SQLite, filesystem, network и updater logic.

Renderer не импортирует `@tauri-apps/api` напрямую. Будущие native возможности войдут через `game-platform-contracts` и application facade.

## UI и Storybook

`game-ui` получает один нейтральный smoke component `FoundationStatus`, используемый desktop renderer и Storybook.

Storybook располагается в `apps/desktop/.storybook` и:

- использует `@storybook/react-vite`;
- импортирует только `game-ui` и deterministic fixtures;
- имеет canonical и long-RU story;
- не получает Tauri/SQL/filesystem adapters;
- должен успешно собираться в CI.

Tailwind, Radix, Motion, Router, Zustand и design-system dependencies не устанавливаются, пока не появится первый реальный UI requirement.

## Tooling

Foundation включает:

- Oxfmt configuration;
- Oxlint configuration с React, TypeScript, import, Vitest и accessibility categories только там, где они применимы;
- Vitest workspace/config;
- Testing Library для smoke component;
- Knip не является blocking gate этого PR и добавляется только после появления содержательных exports;
- Lefthook не добавляется до стабилизации команд;
- Playwright/WebdriverIO не входят в Foundation.

Type-aware Oxlint запускается в `verify`, но при несовместимости с TypeScript 7 допускается только явный documented временный non-blocking lane в этом PR; silent disable запрещён.

## Команды

Корневые команды:

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

Состав:

```text
check:fast
  docs:check
  + fmt:check
  + lint
  + typecheck
  + boundaries:check
  + test

verify
  check:fast
  + lint:type-aware
  + build
  + storybook:build
  + rust:fmt:check
  + rust:check
```

`verify:release` не вводится: полноценный desktop packaging, signing и release verification не являются Foundation gate.

## Tests

Foundation test corpus:

1. `check-boundaries` positive fixture для разрешённого graph.
2. `check-boundaries` negative fixture для запрещённой UI → core обратной зависимости.
3. React smoke render `FoundationStatus`.
4. Storybook build smoke.
5. TypeScript project-reference clean build.
6. Rust formatting и `cargo check` Tauri shell.
7. Root command smoke в GitHub Actions.

Тесты не проверяют gameplay, save, determinism или MonthRun — они принадлежат следующим PR.

## CI

Новый workflow `foundation.yml` использует минимальные permissions и разделяет:

### JS job

- checkout;
- Node 24;
- pnpm exact через Corepack;
- frozen install;
- `pnpm check:fast`;
- `pnpm lint:type-aware`;
- `pnpm build`;
- `pnpm storybook:build`.

### Rust/Tauri job

- Linux Tauri prerequisites из официальной документации;
- exact Rust toolchain;
- rustfmt check;
- cargo check.

Existing `docs.yml` остаётся отдельным и не дублируется.

GitHub Actions third-party references должны быть pinned по full commit SHA либо получить отдельное documented follow-up до защиты `main`. Release secrets отсутствуют.

## Error handling и recovery

Foundation scripts:

- завершаются non-zero при первой проверяемой ошибке;
- печатают конкретный package/path и нарушенное правило;
- не исправляют файлы в `--check` режимах;
- не обновляют snapshots автоматически;
- не используют network после frozen install;
- не скрывают ошибку retry-loop.

Если Rust/Tauri не компилируется на CI из-за отсутствующего system package, исправляется CI environment, а не отключается `rust:check`.

## Out of scope

- branded IDs/fixed-point/PRNG;
- gameplay contracts и formulas;
- TypeBox/Ajv schemas;
- SQLite/rusqlite;
- MonthRun/save/recovery;
- content definitions/compiler;
- Tailwind/design system;
- Router/Zustand;
- Playwright/WebdriverIO;
- packaging/signing/updater;
- Nx/Turborepo;
- Docker;
- backend/network services.

## Definition of Done

PR готов к review, если:

- clean checkout устанавливается через frozen lockfile;
- `pnpm check:fast` проходит;
- `pnpm verify` проходит в поддерживаемом environment;
- TypeScript 7 project references строятся;
- запрещённый workspace dependency обнаруживается тестом;
- desktop frontend собирается;
- Tauri shell проходит `cargo check`;
- Storybook собирает canonical и long-RU story;
- UI не импортирует Tauri/SQL;
- package graph не содержит циклов и deep imports;
- в PR нет gameplay/persistence/content implementation;
- docs manifest остаётся актуальным.

## Источники

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://vite.dev/blog/announcing-vite8
- https://react.dev/versions
- https://storybook.js.org/docs/get-started/frameworks/react-vite/
- https://v2.tauri.app/start/create-project/
- https://v2.tauri.app/start/prerequisites/
- https://doc.rust-lang.org/stable/releases.html
- https://oxc.rs/docs/guide/usage/linter/type-aware.html
