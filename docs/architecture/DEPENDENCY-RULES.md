# Правила зависимостей

## Основной принцип

Зависимость направляется от изменчивого внешнего слоя к стабильному внутреннему слою. Домен не знает об инструментах доставки.

## Разрешённые зависимости

| From | To |
|---|---|
| `apps/desktop` | application, UI, platform adapters |
| `game-ui` | application contracts, shared kernel |
| `game-application` | core, schemas, persistence/platform ports |
| `game-content` | schemas, shared kernel |
| `game-core` | shared kernel, immutable content contracts |
| adapters | contracts, schemas, shared kernel |

## Запрещённые зависимости

- core → React/Tauri/SQLite/network/filesystem;
- UI → SQLite implementation/raw SQL;
- content definitions → executable code;
- Rust adapter → gameplay formulas;
- package → чужой `src/internal/**`;
- migration → UI types;
- domain → system locale/timezone.

## Runtime dependency policy

Зависимость добавляется только если:

1. снимает существенный объём сложного кода;
2. имеет понятную поддержку и лицензию;
3. не создаёт лишний runtime layer;
4. совместима с Tauri/WebView2;
5. допускает deterministic/offline use;
6. имеет тестируемую границу замены.

## Проверки

- Oxlint import restrictions;
- TypeScript project references;
- dependency-cruiser или собственный architecture test при появлении scaffold;
- Knip для мёртвых exports и dependencies;
- `cargo-deny` для Rust graph;
- dependency review в CI.

## Исключения

Любое исключение оформляется ADR с причиной, областью, сроком пересмотра и планом удаления. Локальный `eslint-disable`/lint ignore не является архитектурным исключением.