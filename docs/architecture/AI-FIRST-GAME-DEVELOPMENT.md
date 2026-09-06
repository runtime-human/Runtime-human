---
title: "AI-First Game Development Harness"
type: architecture
status: draft
canon: true
updated: 2026-08-27
---

# AI-First Game Development Harness

Целевая архитектура репозитория как harness для ИИ-разработки. Инструменты, помеченные `(planned)`, ещё не существуют — не выдавать их за работающие и не ссылаться на них как на команды. Текущее состояние всегда проверять по реальным scripts/packages и `docs/EXECUTION-STATUS.jsonc`, а не по памяти агента.

## Классы редактируемых артефактов

ИИ не редактирует «игру вообще». Каждый таск изменяет один основной класс артефактов, а cross-domain изменение явно повышает risk/scope:

| Класс | Canonical source | Проверка |
|---|---|---|
| presentation | React/Storybook, текущие CSS tokens | stories/browser tests |
| content | JSONC под `content/` с provenance | content compiler + graph |
| balance | closed typed data под `balance/` | schema + deterministic simulation compare |
| scenario | typed graph JSONC (planned) | static analyzer (planned) |
| rule | TypeScript в `game-core` | tests/property/replay/simulation |

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
Studio             — ЧТО нужно прочитать и проверить (zones, context-map, task envelope, verification tiers)
Nx                 — ЧТО затронуто в репозитории (project/task graph, local cache, affected assistance)
gamectl            — ЧТО означает игровая операция (catalog/content/simulate/fixture/replay/explain)
Content compiler   — КАКИЕ content-данные легальны (schema → normalize → refs → graph → fingerprint)
Balance compiler   — КАКИЕ tuning-данные легальны (closed schema → fingerprint → derived evidence)
game-simulation    — ЧТО доказано о gameplay (deterministic runs, properties, compare, replay/trace)
Storybook          — КАК выглядит UI (workshop + browser tests + dev-only MCP)
Canonical sources  — единственная истина (Git-friendly текст)
```

`pnpm studio:evaluate` является shadow-mode planner evaluator cost. Пока `.studio/verification-policy.json` явно не переведён в active mode после накопления метрик, planner не имеет права отменять tester/reviewer, обязательных текущим Producer contract.

## Правила зависимостей пакетов

```text
shared-kernel ← game-schema ← game-core ← game-application
content/balance sources → game-authoring-schema → compiler/validators → compiled runtime contracts
game-simulation → game-core + game-schema + verified rules/content
game-devtools → authoring/compiler + simulation + read-only game contracts
apps/authoring (planned) → game-devtools + authoring schemas + UI libraries
apps/desktop → только runtime packages
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

Реализованы Waves 0–8: canon/harness alignment, context/task envelope, compact exec/affected, minimal Nx + local cache, Vitest projects + Storybook browser/MCP, Game Catalog + `gamectl`, TypeBox authoring pilot, closed balance layer, deterministic simulation/fast-check/fixtures/repro/replay/trace/explain.

Wave 9 активирует существующие balance/simulation/harness skills и вводит измеримый adaptive evaluator planner только в shadow mode. Далее: scenario v1 shadow/analyzer → secure Authoring Studio поверх headless APIs → Scenario Graph/Balance Lab → DTCG/Terrazzo migration → Rust-owned read-only persistence inspector/dev overlay. Детальный порядок: `.opencode/Runtime-Human-AI-First-Harness-Waves-9-14-Execution-Plan-2026-08-31.md`.
