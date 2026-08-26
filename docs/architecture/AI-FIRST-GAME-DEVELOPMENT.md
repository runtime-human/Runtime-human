---
title: "AI-First Game Development Harness"
type: architecture
status: draft
canon: true
updated: 2026-08-24
---

# AI-First Game Development Harness

Целевая архитектура репозитория как harness для ИИ-разработки. Статус: целевая архитектура; инструменты, помеченные `(planned)`, ещё не существуют — не выдавать их за работающие и не ссылаться на них как на команды.

## Классы редактируемых артефактов

ИИ не редактирует «игру вообще». Каждый таск изменяет ровно один класс артефактов:

| Класс | Canonical source | Проверка |
|---|---|---|
| presentation | React/Storybook, design tokens | stories/browser tests |
| content | JSONC под `content/` с provenance | content compiler + graph |
| balance | closed typed data (`balance/`, planned) | schema + simulation compare (planned) |
| scenario | typed graph JSONC (planned) | static analyzer (planned) |
| rule | TypeScript в `game-core` | tests/property/replay |

Всё остальное делает специализированный deterministic tooling.

## Принципы

1. **P-01** Canonical source — текстовый и Git-friendly (TS/JSONC/Markdown/DTCG). Figma-документ, координаты визуального редактора, generated artifact, скриншот, runtime DB — не authority.
2. **P-02** GUI — projection, а не authority: read canonical → render → edit semantic field → validate → write canonical.
3. **P-03** Headless parity: каждая ключевая GUI-операция имеет CLI/library эквивалент.
4. **P-04** Structured output: внутренние CLI поддерживают `--json` и versioned output schema со стабильными diagnostics (code/severity/category/entityId/path/pointer/invariant/message/fixKind).
5. **P-05** Никакого generic gameplay DSL: только closed формы (base/modifier/threshold/weight/range/table/enum mapping/provider ID/predicate ID). JS eval, Lua, formula strings, expression languages — запрещены без отдельного ADR.
6. **P-06** Pure Core остаётся authority; Core не получает editor/GUI/runtime-authoring зависимостей.
7. **P-07** Progressive disclosure: worker стартует с `AGENTS.md` + `GAME.md` + task envelope + matching skill.
8. **P-08** Mechanical guard > prose: проверяемое правило становится validator/lint/test/schema.
9. **P-09** Fresh reviewer получает machine-generated envelope (task/diff/evidence), но не reasoning implementer'а.
10. **P-10** Harness-изменения оправдываются метриками (context bytes, agent calls, wall-clock, full-suite runs, review rounds, finding recurrence).

## Роли

```text
Orca/Producer      — КТО работает (outer orchestrator, maxWorkers=3)
Studio             — ЧТО нужно прочитать и проверить (zones, context-map, task envelope — planned Wave 1)
Nx                 — ЧТО затронуто в репозитории (project/task graph, cache, affected — planned)
gamectl            — ЧТО означает игровая операция (catalog/simulate/replay — planned)
Content compiler   — КАКИЕ данные легальны (schema → normalize → refs → graph → fingerprint)
game-simulation    — ЧТО доказано о gameplay (deterministic runs/compare — planned)
Storybook          — КАК выглядит UI (workshop, browser tests; MCP dev-only, planned)
Canonical sources  — единственная истина (Git-friendly текст)
```

## Правила зависимостей пакетов

```text
shared-kernel ← game-schema ← game-core ← game-application
content sources → game-authoring-schema (planned) → game-content-compiler → game-content (compiled contracts)
compiled rules/content → game-core/adapters по существующей authority
game-simulation (planned) → game-core + game-schema + compiled rules/content
game-devtools (planned) → authoring schema/compiler + simulation + read-only game contracts
apps/authoring (planned) → game-devtools + authoring schemas + UI libraries
apps/desktop → только существующие runtime packages
```

Запрещено: production runtime зависит от apps/authoring, от JSON Forms/React Flow/Terrazzo CLI, парсит raw JSONC/Ajv в runtime.

## Запреты (антипаттерны)

- MCP на каждую CLI-функцию; второй orchestrator; God-object `gamectl`.
- Giant constants file; formula language в balance; прямая mutation authoritative state из scenario/content.
- LLM judge вместо deterministic test; screenshot как единственный UI test; JSDOM как доказательство Tauri runtime.
- Полный verify после каждого мелкого edit; чтение всего docs tree «для контекста».
- Дублирование canon внутри skills; skill на каждую мелкую команду; важные факты задачи только в чате.
- Generated files как authoring source; Unity/Godot миграция ради AI-editor; Yarn/Ink/GoRules/XState без реального complexity trigger.

## Дорожная карта

Волны внедрения фиксируются в implementation plan и `docs/EXECUTION-STATUS.jsonc`. Текущая фаза: canon/harness alignment (skill-map, verification-policy, верификационные tier'ы); далее context compiler/task envelope, compact exec/affected, Nx minimal, Vitest projects + Storybook browser, Game Catalog + `gamectl`, authoring schema pilot, balance layer, simulation/fast-check/repro, skills v2 + adaptive review, scenario v1, Authoring Studio (GUI после headless API), DTCG tokens, persistence inspector.
