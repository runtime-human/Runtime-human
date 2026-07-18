---
title: "Правила зависимостей"
type: architecture
status: draft
canon: true
updated: 2026-07-18
---

# Правила зависимостей

## Основной принцип

Зависимость направляется от изменчивого внешнего слоя к стабильному внутреннему слою. Домен не знает об инструментах доставки, UI, SQLite, Tauri и Storybook.

## Разрешённые зависимости

| From | To |
|---|---|
| `apps/desktop` | application facade, UI, generated IPC client, production adapters |
| Storybook config/app | `game-ui`, `game-ui-fixtures`, test mocks |
| `game-ui` | application/read-model contracts, schemas, shared kernel |
| `game-ui-fixtures` | schemas/read-model contracts, shared kernel |
| `game-application` | core, schemas, persistence/platform ports |
| `game-content` | schemas, immutable content contracts, shared kernel |
| `game-core` | shared kernel, immutable compiled content contracts |
| Rust/platform adapters | generated/typed contracts, schemas, persistence concepts |
| tools | public contracts/schemas/fixtures, если задача инструмента это требует |

## Запрещённые зависимости

- core → React/Tauri/SQLite/network/filesystem/system clock/locale;
- application → React/Tauri/raw SQL/concrete persistence implementation;
- UI → SQLite implementation/raw SQL/production Rust internals;
- Storybook → production save directory/updater/signing/SQL/filesystem adapter;
- fixtures → desktop composition/production adapters/system randomness;
- content definitions → executable code;
- Rust adapter → gameplay formulas/Event Engine/Narrative Director/content-specific branching;
- package → чужой `src/internal/**`;
- migration → UI/Storybook types;
- domain → system locale/timezone;
- test-only WebdriverIO/Tauri plugin → release dependency graph;
- arbitrary feature package → `@tauri-apps/*` вне desktop composition/approved adapter;
- component → mutable full `GameState`;
- cloud/network adapter → game-core.

## TypeScript 7/tooling boundary

- TypeScript 7 является production compiler/LSP.
- `@typescript/typescript6`, если временно нужен Compiler API, располагается только в изолированном tooling package.
- Compatibility tooling не становится dependency `game-core`, `game-application`, `game-ui` или production bundle.
- Oxlint/Oxfmt являются baseline; ESLint/Prettier/Biome не добавляются параллельно без ADR.

## Storybook boundary

Storybook stories являются development consumers публичных UI/read-model contracts.

Разрешено:

- typed mocks;
- deterministic fixtures;
- in-memory ports;
- Storybook Vitest/a11y/visual addons.

Запрещено:

- импортировать production composition root;
- вызывать raw Tauri APIs;
- читать пользовательский сейв;
- зависеть от wall clock/network;
- хранить release secrets;
- расширять production capabilities.

## Rust/persistence boundary

Rust authoritative adapter реализует ports через typed commands/repositories. Raw SQL находится только в Rust persistence module и migrations.

TypeScript может содержать repository interfaces/DTO schemas, но не SQL statements для production writes.

## Runtime dependency policy

Зависимость добавляется только если:

1. снимает существенный объём сложного или рискованного кода;
2. имеет понятную поддержку, release cadence и лицензию;
3. не создаёт лишний runtime/security layer;
4. совместима с Tauri/WebView2 и Windows tier-1;
5. допускает deterministic/offline use там, где касается core/content;
6. имеет тестируемую границу замены;
7. не требует ослабления Tauri capabilities;
8. не дублирует уже принятый инструмент;
9. имеет конкретного owner и removal/migration path;
10. exact version/range policy согласована с dependency policy.

## Проверки

- Oxlint import restrictions;
- TypeScript 7 project references;
- dependency-cruiser либо собственный architecture test после scaffold;
- package export maps;
- Knip для мёртвых exports/dependencies;
- Rust module visibility и contract tests;
- `cargo-deny` для Rust graph;
- dependency review в CI;
- capability manifest test;
- release bundle inspection на отсутствие Storybook/MCP/test-only plugins;
- raw SQL scan вне allowlisted Rust/migration paths;
- запрет `@tauri-apps/*` в чистых packages;
- cycle detection.

## Исключения

Любое исключение оформляется ADR с причиной, минимальной областью, owner, сроком пересмотра, security/compatibility impact и планом удаления. Локальный lint ignore, dynamic import или test-only comment не является архитектурным исключением.