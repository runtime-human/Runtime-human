---
title: "Verification tiers V0-V4"
type: engine
status: draft
canon: true
updated: 2026-08-31
---

# Verification tiers V0–V4

Уровни верификации для агентных задач. Машинная версия policy: `.studio/verification-policy.json`. `studio:affected` и `studio:verify` собирают affected-наборы для V0–V2; V3/V4 остаются отдельными serialized gates.

| Tier | Назначение | Состав | Доступность |
|---|---|---|---|
| **V0** | edit loop | один фокусный test file / `--project`; `pnpm content:check` по затронутым source; fmt/lint по затронутым путям | `pnpm studio:verify -- --tier V0 --diff <ref>` / `pnpm studio:exec -- <cmd>` |
| **V1** | worker completion (affected) | тесты затронутых проектов/зон; compiler/schema checks при изменении content; фокусные Storybook/browser проверки при UI; determinism/golden при изменении правил | `pnpm studio:affected [--nx]` + `pnpm studio:verify -- --tier V1` |
| **V2** | PR candidate | весь affected set: typecheck/lint/tests; browser UI если UI; фокусный Rust если persistence/platform; без дублирующего typecheck в build-цепочке | `pnpm studio:verify -- --tier V2` |
| **V3** | full merge gate | `pnpm verify` | serialized GitHub `foundation`; для PR — только explicit `verify:v3` candidate label; для `main` push/manual dispatch — всегда full gate |
| **V4** | release | `pnpm verify:release` | после V3 |

## GitHub remote loop

Обычная итерация PR и authoritative merge evidence разделены намеренно:

1. `opened`, `synchronize`, `reopened`, `converted_to_draft` и `ready_for_review` запускают read-only workflow `feedback`.
2. `feedback` вызывает существующий `pnpm check:fast` на `windows-2025`. Это широкий быстрый сигнал для ChatGPT/reviewer, но **не** V2/V3 verdict и не merge approval.
3. Полный PR V3 запускается только когда к текущему PR явно добавлен label `verify:v3`.
4. `foundation` на событии `labeled` выполняет `pnpm verify` на GitHub PR merge candidate и публикует `runtime-human-pr-evidence-v1` с раздельными `baseSha`, `headSha` и фактически проверенным `testedSha`.
5. Само наличие `verify:v3` на PR не запускает V3 при следующих `synchronize`: новый candidate требует нового явного trigger (remove/add label или будущий `/rh verify v3`).
6. Перед merge успешный V3 evidence обязан соответствовать **текущему** PR head. Evidence от старого head остаётся исторически корректным, но не является свежим merge evidence.

Такой split сохраняет качество полного gate и одновременно не оплачивает Rust toolchain, Chromium, browser tests, Storybook build и Rust tests на каждом RED/GREEN микрокоммите.

## Правила

- Worker не запускает V3/V4 после каждого мелкого изменения: full gate выполняется serialized (`.studio/project.json` → `fullGateSlots = 1`).
- После scaffold/крупной интеграции базовая лестница: `pnpm check:fast` → explicit candidate `pnpm verify` → `pnpm verify:release`.
- GitHub `feedback` не подменяет V0/V1/V2: agent по-прежнему выполняет tier-specific affected evidence согласно задаче.
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
