---
title: "DR-SYNTHESIS-2026-07-16"
type: research
status: draft
canon: true
updated: 2026-07-18
---

# Синтез двух Deep Research — 2026-07-16

## 1. Назначение

Документ сводит DR-001 и DR-002 в единый набор решений для Runtime Human, устраняет повторы и отделяет:

- принятый архитектурный канон;
- сохраняемые решения;
- отложенные улучшения;
- отклонённые варианты.

## 2. Общий вердикт

Стек Runtime Human подтверждён. Проект не требует смены Tauri/React/Rust/SQLite. Требуется доведение до production-grade архитектуры через технически обеспеченные границы, детерминированный lifecycle месяца, ранний UI workshop и эксплуатационные runbooks.

## 3. Принятые решения

| ID | Решение | Основание | Где зафиксировано |
|---|---|---|---|
| D-01 | Rust является единственной authoritative write-boundary для SQLite | Tauri capability model, SQL plugin surface, desktop case studies | ADR-004, persistence docs |
| D-02 | MonthRun хранится как persisted state machine | replay/checkpoint practices, crash recovery | ADR-005, simulation docs |
| D-03 | Core использует integer/fixed-point numerics | deterministic simulation и money practices | ADR-006, numeric policy |
| D-04 | Сейв содержит Determinism Manifest | seeded RNG недостаточен | ADR-007, determinism docs |
| D-05 | Playwright и WebdriverIO имеют разные роли | renderer и native desktop — разные поверхности | ADR-008, testing docs |
| D-06 | Narrative Director отделён от Event Engine | weights/cooldowns не обеспечивают pacing | ADR-009, events docs |
| D-07 | SaveGameState — consistency boundary месяца | межмодульная атомарность | ADR-010, save docs |
| D-08 | TypeScript 7 — production baseline | стабильный релиз 2026-07-08, ускорение compiler/LSP | ADR-011, TS policy |
| D-09 | Storybook 10 вводится в Foundation | isolated UI/content states, interactions, a11y, agent feedback | ADR-012, Storybook workflow |
| D-10 | SQLite minimum gate — 3.51.3+ либо подтверждённый backport | WAL-reset defect и эксплуатационная надёжность | SQLite architecture |
| D-11 | Tauri capabilities разделяются по окнам/операциям | least privilege | Security/Rust boundary |
| D-12 | Моды остаются data-only с manifest/checksum/migrations | зрелые UGC/mod lifecycle practices | Modding docs |
| D-13 | Windows — tier 1; другие ОС не обещаются до отдельного CI | system webview differences | Testing/release docs |
| D-14 | Remote telemetry отсутствует по умолчанию | privacy/offline-first | Security/release docs |
| D-15 | Supply-chain checks входят в release architecture | native shell + updater повышают последствия compromise | CI/CD/security docs |

## 4. TypeScript 7 policy

### Production

- exact pinned TypeScript 7.0.x;
- `tsc -b` — blocking;
- TS7 LSP — основной editor service;
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` и остальные строгие флаги обязательны;
- `stableTypeOrdering` считается частью deterministic tooling baseline.

### Ограничение 7.0

TypeScript 7.0 не предоставляет публичный Compiler API. Поэтому:

- не добавляется `typescript-eslint` только ради привычного ruleset;
- Oxlint/Oxfmt остаются основным tooling stack;
- `@typescript/typescript6` допускается только как локальная compatibility dependency конкретного инструмента;
- compatibility package не выполняет production typecheck;
- каждое использование TS6 API должно иметь owner и removal condition.

### Lint pipeline

```text
check:fast:
  oxfmt --check
  oxlint
  tsc -b

verify:
  check:fast
  oxlint --type-aware
  unit/property/content/story tests

verify:release:
  verify
  browser E2E
  desktop E2E
  Rust/security/release checks
```

## 5. Storybook policy

Storybook является обязательной частью Foundation и используется как:

1. design-system workshop;
2. библиотека воспроизводимых UI states;
3. content preview для событий и решений;
4. interaction-test surface;
5. accessibility-test surface;
6. visual baseline source;
7. bug fixture registry;
8. контролируемый контекст для UI-агентов.

Обязательные story-группы vertical slice:

- App Shell;
- Resource Bar;
- Character Summary;
- Activity Card;
- Event Card;
- Blocking Decision Dialog;
- Monthly Report;
- Save/Load/Recovery;
- Empty/Error/Loading;
- Long RU text;
- 200% scale/high contrast/reduced motion.

Chromatic и другие внешние SaaS не являются обязательными. Baselines создаются в фиксированной CI-среде средствами Storybook stories + Playwright/Vitest browser.

Storybook MCP разрешается только в development profile, не получает Tauri privileged commands и вводится после стабилизации component registry.

## 6. P0 — Foundation

- принять ADR-004–012;
- TS7 exact pin;
- Storybook 10 exact pin;
- Rust typed persistence commands;
- explicit capability files;
- persisted MonthRun schema;
- integer domain types;
- Determinism Manifest;
- SQLite 3.51.3 gate;
- backup/migration runbook;
- Storybook stories для первых core components;
- CI jobs для type-aware lint и Storybook tests.

## 7. P1 — до выхода vertical slice

- desktop E2E critical path на Windows;
- recovery scenarios;
- migration corpus;
- visual/a11y baselines;
- supply-chain required checks;
- updater signing dry-run;
- mod manifest schema, даже если пользовательские моды ещё выключены;
- diagnostic bundle с redaction.

## 8. P2 — после vertical slice

- Content Studio, переиспользующий TypeBox schemas и Storybook fixtures;
- Storybook MCP development integration;
- mutation testing критических pure modules;
- Rust fuzzing import/archive paths;
- отдельный offline WebView2 installer только при подтверждённой потребности.

## 9. Сохраняемые решения

Без изменений остаются:

- Tauri 2;
- React 19;
- Vite 8/Rolldown;
- Tailwind 4/Radix/Motion;
- pure TypeScript Game Core;
- Rust platform/persistence perimeter;
- SQLite;
- JSONC + TypeBox + Ajv;
- monthly turn model;
- real Gregorian calendar;
- один вымышленный мегаполис;
- отсутствие Steam, stores, backend и cloud-save baseline;
- data-only mods;
- full snapshot + append-only history вместо full event sourcing.

## 10. Отклонённые решения

- Electron;
- full Rust Game Core;
- raw SQL из production renderer;
- floating-point authoritative domain;
- только Playwright для desktop testing;
- arbitrary code mods;
- обязательный cloud visual testing;
- backend ради analytics;
- несколько стран/городов;
- Nx/Turborepo до измеренного bottleneck.

## 11. Правило дальнейших исследований

Новый внешний отчёт не копируется напрямую в канон. Он проходит:

```text
raw research
→ source quality review
→ conflict check with ADR
→ decision matrix
→ ADR/spec updates
→ roadmap/test updates
```

Результат считается внедрённым только после синхронизации всех затронутых нормативных документов.