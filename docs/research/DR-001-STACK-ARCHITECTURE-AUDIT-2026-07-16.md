---
title: "DR-001 — Аудит стека и архитектуры Runtime Human"
type: research
status: draft
canon: false
depends_on: [ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-010, ADR-011, ADR-012]
updated: 2026-07-18
---

# DR-001 — Аудит стека и архитектуры Runtime Human

- **Дата:** 2026-07-16
- **Тип:** Deep Research, архитектурный аудит
- **Статус:** нормализован и учтён
- **Область:** Tauri, React, TypeScript, Rust, SQLite, тестирование, сохранения, CI/CD и agent workflow

> Первый отчёт первоначально существовал только в UI Deep Research и не был сохранён в репозиторий. Этот файл восстанавливает его итоговые выводы, решения и проверяемые основания. Для полной базы источников и многоязычного анализа см. DR-002.

## 1. Итог

Выбранный стек сохраняется:

```text
Tauri 2
React 19
TypeScript 7
Vite 8 / Rolldown / Oxc
Tailwind CSS 4
Radix UI
Rust
SQLite
```

Причина изменений не в неверном выборе технологий, а в необходимости сделать архитектурные границы технически обеспеченными и операционно проверяемыми.

## 2. Главные выводы

### 2.1. Persistence должен иметь Rust write-boundary

Прямой SQL из renderer удобен для прототипа, но оставляет критическую границу соглашением. Авторитетные записи, миграции, backup/restore, import/export и mod ingest должны выполняться через typed Tauri commands и Rust repositories.

Game Core остаётся на TypeScript. Rust не получает баланс, события и исторические правила.

### 2.2. MonthRun — persisted state machine

Месяц может останавливаться на решении. Для crash-safe resume необходимо хранить:

- base save revision;
- rules/content fingerprints;
- RNG state;
- phase и step index;
- intermediate snapshot;
- pending decision;
- decision log;
- trace hash.

Основной сейв меняется только после успешного завершения месяца одной транзакцией.

### 2.3. SQLite требует эксплуатационного runbook

Минимум:

- SQLite 3.51.3 или новее либо подтверждённый backport WAL fix;
- WAL, foreign keys, busy timeout;
- Online Backup API или `VACUUM INTO` для согласованного backup;
- `PRAGMA quick_check` и `foreign_key_check` после критических операций;
- `PRAGMA optimize` по контролируемому lifecycle;
- pre-migration backup;
- post-migration validation;
- recovery и corruption bundle.

Копирование активного файла базы без протокола запрещается.

### 2.4. Числовая модель должна быть integer/fixed-point

В авторитетном core запрещаются floating-point значения для:

- денег;
- процентов;
- вероятностей;
- XP и progression accumulators;
- коэффициентов баланса;
- времени и work units.

Используются `MoneyMinor`, `RateBps`, `ChancePpm`, integer weights и versioned fixed-point типы. Float допускается только в render-only и неавторитетной аналитике.

### 2.5. Детерминизм шире seeded RNG

Нужны versioned:

- RNG algorithm;
- hash algorithm;
- numeric model;
- calendar model;
- candidate sorting;
- effect ordering;
- canonical serialization.

Обязательны stable IDs, RNG forks, golden traces и запрет system time, locale sorting, filesystem order и `Math.random`.

### 2.6. Тестирование разделяется по поверхности

- Vitest: pure core, application и component logic;
- fast-check: invariants и длинные последовательности;
- Storybook: isolated states, interaction, accessibility и content fixtures;
- Playwright: browser renderer, маршруты, visual regression и accessibility;
- WebdriverIO + Tauri service: настоящий executable, IPC, SQLite, native dialogs, window lifecycle, recovery и updater smoke;
- Rust tests/proptest/fuzz: persistence, imports и архивы.

### 2.7. Storybook вводится в Foundation

Storybook используется не как поздний каталог UI kit, а как рабочая поверхность для:

- design system;
- карточек событий;
- decision screens;
- журналов и отчётов;
- длинных локализованных текстов;
- empty/error/loading/recovery states;
- keyboard/focus/reduced-motion;
- воспроизводимых bug fixtures;
- AI-assisted UI development.

### 2.8. TypeScript 7 становится baseline

После стабильного релиза TypeScript 7 используется как основной `tsc` и LSP. Oxlint type-aware переносится в blocking `verify`/CI после короткого compatibility burn-in.

TypeScript 7.0 не имеет публичного Compiler API. Пакет совместимости TS6 допускается только для конкретного инструмента, который действительно требует программный API; он не является вторым production compiler.

### 2.9. Supply chain и updater — часть архитектуры

Нужны:

- GitHub Actions pinned по full SHA;
- минимальные workflow permissions;
- dependency review;
- secret scanning/push protection;
- SBOM;
- artifact attestations/provenance;
- checksums;
- protected release environment;
- updater key escrow и recovery runbook;
- dry-run signature verification.

### 2.10. Моды остаются data-only

Каждый пакет имеет manifest, schema version, compatibility range, dependencies, checksums, namespaces, tombstones/remaps и quarantine import. Arbitrary JS/Rust запрещён.

## 3. Решения, подтверждённые отчётом

| Решение | Результат |
|---|---|
| Tauri 2 + React 19 + Vite 8 | оставить |
| TypeScript 6 | заменить на TypeScript 7 |
| Storybook позднее | заменить на Storybook в Foundation |
| SQL из renderer | запретить для production |
| Rust write-boundary | принять |
| pending decision без persisted run | заменить persisted MonthRun |
| float в core | запретить |
| только Playwright для E2E | дополнить WebdriverIO |
| data-only content/mods | оставить и усилить |
| backend/Steam/stores | не добавлять |

## 4. Связанные ADR

- ADR-004 — persistence execution boundary;
- ADR-005 — suspended MonthRun;
- ADR-006 — numeric model;
- ADR-007 — determinism manifest;
- ADR-008 — desktop E2E;
- ADR-009 — Narrative Director;
- ADR-010 — authoritative save state;
- ADR-011 — TypeScript 7 baseline;
- ADR-012 — Storybook workshop.

## 5. Основные первичные источники

- https://v2.tauri.app/security/capabilities/
- https://v2.tauri.app/learn/security/using-plugin-permissions/
- https://v2.tauri.app/plugin/sql/
- https://v2.tauri.app/plugin/updater/
- https://sqlite.org/wal.html
- https://sqlite.org/backup.html
- https://sqlite.org/lang_vacuum.html
- https://sqlite.org/lang_analyze.html
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://oxc.rs/docs/guide/usage/linter/type-aware.html
- https://storybook.js.org/
- https://storybook.js.org/docs/writing-tests/interaction-testing
- https://storybook.js.org/docs/writing-tests/accessibility-testing
- https://storybook.js.org/docs/writing-tests/visual-testing
- https://webdriver.io/docs/desktop-testing/tauri/
- https://docs.github.com/en/actions/reference/security/secure-use
- https://slsa.dev/
