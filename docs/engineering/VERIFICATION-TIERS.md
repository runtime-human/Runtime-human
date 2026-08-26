---
title: "Verification tiers V0-V4"
type: engine
status: draft
canon: true
updated: 2026-08-24
---

# Verification tiers V0–V4

Уровни верификации для агентных задач. Машинная версия policy: `.studio/verification-policy.json`. Автоматический выбор affected-набора (`studio:affected`) и compact-exec обёртка — planned; сегодня наборы собираются из zone paths и diff вручную.

| Tier | Назначение | Состав | Доступность |
|---|---|---|---|
| **V0** | edit loop | один фокусный test file / `--project`; `pnpm content:check` по затронутым source; fmt/lint по затронутым путям | сейчас: `pnpm studio:verify -- --tier V0 --diff <ref>` / `pnpm studio:exec -- <cmd>` |
| **V1** | worker completion (affected) | тесты затронутых проектов/зон; compiler/schema checks при изменении content; фокусные Storybook/browser проверки при UI; determinism/golden при изменении правил | сейчас: `pnpm studio:affected [--nx]` + `pnpm studio:verify -- --tier V1` |
| **V2** | PR candidate | весь affected set: typecheck/lint/tests; browser UI если UI; фокусный Rust если persistence/platform; без дублирующего typecheck в build-цепочке | `pnpm studio:verify -- --tier V2` + CI foundation |
| **V3** | full merge gate | `pnpm verify` | сейчас, serialized slot=1 (`studio:verify` V3 намеренно отказывает) |
| **V4** | release | `pnpm verify:release` | сейчас, после V3 |

## Правила

- Worker не запускает V3/V4 после каждого мелкого изменения: full gate выполняется serialized (`.studio/project.json` → `fullGateSlots = 1`).
- После scaffold/крупной интеграции базовая лестница: `pnpm check:fast` → `pnpm verify` → `pnpm verify:release`.
- Кэширование верификации — только deterministic задачи: Nx local cache (`nx.json`, терминальный replay; `pnpm exec nx run runtime-human:<target>`); release signing, live perf capture, security probes — никогда. Nx Cloud отключён.
- Никогда не ослаблять тест/guard ради прохождения gate.
- Adaptive review policy (какой evaluator нужен после deterministic gate) — `.studio/verification-policy.json`; профили — `.studio/models.json`, выбор через `pnpm studio:route`.

## DoD по классам задачи

Краткая форма; полные контракты — в профильных agent guides (`docs/agents/README.md`):

- content: schema/stable ID/refs/chronology/provenance/reachability чисты;
- balance (planned): closed tables полны, fingerprint обновился детерминированно, simulation compare рассмотрен;
- scenario (planned): graph analyzer чист, нет прямой mutation, replay стабилен;
- core gameplay: failing regression/property first, pure boundaries сохранены, golden обновлён намеренно;
- UI: story обновлён, browser/a11y где нужно, long RU, визуальное evidence для layout/game-feel;
- persistence: R3-классификация, compatibility assessment, Rust tests, durability не ослаблен;
- harness/tooling: structured output, typed failures, Windows paths, unit tests, нет override product authority.
