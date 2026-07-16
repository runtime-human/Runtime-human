# Runtime Human — Master Architecture

> **Статус:** архитектурный канон, редакция 1.3
> **Дата:** 2026-07-16
> **Полный план:** [`FULL-ARCHITECTURE-PLAN.md`](FULL-ARCHITECTURE-PLAN.md)
> **Индекс:** [`../INDEX.md`](../INDEX.md)
> **Research synthesis:** [`../research/DR-SYNTHESIS-2026-07-16.md`](../research/DR-SYNTHESIS-2026-07-16.md)

## 1. Продукт

Runtime Human — бесплатный PC-first offline-first симулятор жизни и карьеры программиста. Игра объединяет событийную life simulation, RPG-прогрессию, idle-автоматизацию, software projects, open source, карьеру, отношения, имущество и управление компанией.

## 2. Канонические решения

- старт: январь 1990 года, персонажу 12 лет;
- календарь: реальный григорианский;
- пользовательский тик: один месяц;
- внутри месяца: дни и целочисленные work units;
- универсальных очков действий и обязательных процентных sliders нет;
- покупки и управленческие операции не расходуют ход;
- ограничения предметные и мягкие;
- постоянное место действия — один вымышленный международный мегаполис;
- страна неназванная и вымышленная;
- постоянных переездов, виз, карт мира и разных национальных экономик нет;
- поездки существуют только как bounded events;
- реальные технологии и подтверждённые IT-вехи используются по источникам;
- работодатели, университеты, локальные продукты, конференции и NPC вымышлены;
- после июля 2026 года будущее явно альтернативное;
- игра бесплатная, без Steam, магазинов, платежей, рекламы и обязательного backend.

## 3. Главный цикл

```text
свободное управление и покупки
→ запуск/изменение длительных занятий
→ «Следующий месяц»
→ автоматическая симуляция обязательств
→ остановка на важных событиях
→ crash-safe suspend/resume при необходимости
→ атомарный commit месяца
→ отчёт и новые возможности
```

Работа, учёба, жильё, семья, продукты, open source и компания являются persistent commitments и продолжаются автоматически.

## 4. Основные системы

- детство, образование и взросление;
- навыки, технологии и специализации;
- грейды Beginner/Intern/Junior/Middle/Senior/Top Programmer;
- должности Developer/Team Lead/Tech Lead/Architect/CTO/Founder;
- работа, вакансии, проекты и фриланс;
- продукты и SaaS;
- open source, contributors, governance и sponsorship;
- статьи, конференции, репутация и слава;
- жильё внутри города, ипотека, техника и home lab;
- отношения, семья, здоровье, fatigue и burnout risk;
- компания, сотрудники, делегирование и портфель продуктов;
- поздняя карьера, пенсия, наследие и завершение жизни.

## 5. Архитектурные слои

```text
React 19 UI
  ↓
Typed Application Facade / Use Cases
  ↓
Pure TypeScript 7 Game Core
  ↓ typed ports
Typed Tauri Commands
  ↓
Rust Persistence and Platform Services
  ↓
SQLite / filesystem / Tauri
```

### Жёсткие границы

- core не импортирует React, Tauri, DOM, SQLite, filesystem, network и system time;
- UI не содержит игровых формул и raw SQL;
- production renderer не получает authoritative SQL execute capability;
- Rust не содержит баланс, события и historical rules;
- контент data-only и не исполняет код;
- случайность только versioned seeded RNG;
- авторитетная математика целочисленная/fixed-point;
- `SaveGameState` — consistency boundary завершённого месяца;
- pending MonthRun хранится отдельным persisted draft;
- read projections и caches неавторитетны и перестраиваемы.

## 6. Модули

```text
apps/desktop
packages/shared-kernel
packages/game-schema
packages/game-core
packages/game-application
packages/game-content
packages/game-persistence-contracts
packages/game-platform-contracts
packages/game-ui
packages/game-ui-fixtures
content/**
tools/**
docs/**

apps/content-studio          # после vertical slice
```

Storybook находится рядом с `game-ui`/desktop tooling и использует `game-ui-fixtures`, не production platform adapters.

Подробности: [`REPOSITORY-STRUCTURE.md`](REPOSITORY-STRUCTURE.md), [`MODULE-BOUNDARIES.md`](MODULE-BOUNDARIES.md).

## 7. Домен

Авторитетное состояние включает character, people, relationships, employment, activities, projects, products, companies, inventory, housing, finance, world, narrative и achievements.

Грейд и должность разделены. NPC имеют stable IDs и tiers active/background/archived. World state состоит из `HomeCityState`, `LocalMarketState`, `WorldTimelineState`, `EraId` и revision глобального технологического каталога.

Не создаются `CountrySimulation`, `VisaSystem`, `ImmigrationSystem`, `RelocationSystem` и `RegionalTaxEngine`.

## 8. Месячная симуляция

```text
ready → running → suspended-for-decision → running → completed → committed
```

Дополнительные состояния: `failed`, `incompatible-after-update`, `recovery-required`, `abandoned`.

Draft хранит run/base revisions, versions/fingerprints, RNG state, MonthPlan, phase/checkpoint, intermediate state, pending decision, decision history и trace hash. Основной сейв изменяется только после завершения месяца одной транзакцией. Resume/commit имеют idempotency guards.

Подробности: [`../simulation/MONTH-SIMULATION.md`](../simulation/MONTH-SIMULATION.md), [`../simulation/SUSPENDED-MONTH-RUN.md`](../simulation/SUSPENDED-MONTH-RUN.md), [ADR-005](../adr/ADR-005-suspended-month-run.md).

## 9. Event Engine и Narrative Director

Event Engine отвечает за допустимость, conditions, choices, effects, cooldown и chains. Narrative Director отвечает за pacing, diversity, anti-repeat, intensity, quiet months, crisis protection и milestone arcs.

События JSONC, валидируются TypeBox/Ajv и semantic/chronology validators. Arbitrary scripts запрещены.

## 10. Историческая модель и город

Технологии разделяют announcement, first public release, local availability, professional demand, mainstream, peak, decline и end-of-support. Каждая каноническая дата имеет provenance.

Город проходит эпохи 1990–1994, 1995–2001, 2002–2006, 2007–2012, 2013–2019, 2020–2026 и альтернативное будущее после 2026-07.

## 11. Числа и детерминизм

- money TS: branded `bigint` minor units;
- Rust/SQLite: checked `i64`;
- IPC/JSON: canonical decimal string;
- проценты: basis points;
- probabilities/weights: integers;
- progress/time/XP: integer units;
- coefficients: versioned fixed-point.

Floating point запрещён в authoritative core/persistence contracts и допускается только в render-only/diagnostic projections.

`DeterminismManifest` фиксирует rules, RNG, hash, numeric, calendar, sorting, effect ordering и canonical serialization versions. Запрещены `Math.random`, system `Date`, locale sorting и неявный порядок файлов.

## 12. Persistence

Модель:

```text
normalized current snapshot
+ append-only histories/ledger
+ persisted pending month draft
+ rolling backups
+ rebuildable projections
```

SQLite minimum: `3.51.3+` либо версия с подтверждённым backport WAL fix. Используются WAL, foreign keys, busy timeout и atomic transactions.

Backup создаётся через SQLite Online Backup API либо controlled `VACUUM INTO`, а не копированием active WAL database. Миграции выполняются после pre-migration backup и заканчиваются `foreign_key_check`, `quick_check` и application invariant validation.

Rust является authoritative write-boundary: save writes, migrations, backup/restore, import/export и mod ingest выполняются через typed commands/repositories.

## 13. Контент и моды

- JSONC;
- TypeBox + Ajv;
- semantic/chronology/reference validation;
- stable namespaced IDs;
- tombstones/replacements;
- localization keys;
- historical source registry;
- data-only mods после стабилизации content API;
- manifest/version/dependencies/checksums;
- quarantine, archive limits и path traversal protection.

## 14. UI и Storybook

Стек: React 19, Tailwind CSS 4, Radix UI, Motion, TanStack Router, Zustand только для transient UI state.

Storybook 10 является обязательным Foundation workshop для:

- design system;
- isolated components;
- event/decision/content previews;
- interaction tests;
- accessibility checks;
- visual baselines;
- bug fixtures;
- AI-assisted UI work.

Storybook использует typed mocks и не получает production SQL/filesystem/updater permissions. Обязательный cloud VRT SaaS не используется.

UI использует semantic design tokens и игровые компоненты. Норматив доступности — WCAG 2.2 AA насколько применимо: keyboard, Narrator, focus, 200% text scale, high contrast, reduced motion и alternatives to drag.

## 15. Технологический стек

- Tauri 2;
- React 19;
- TypeScript 7 stable exact pinned;
- Vite 8/Rolldown/Oxc;
- Node.js 24 LTS;
- pnpm;
- Storybook 10 exact pinned;
- SQLite 3.51.3+;
- `rusqlite` preferred write adapter;
- Oxfmt;
- Oxlint fast + type-aware;
- Knip, Lefthook;
- Vitest, Testing Library, fast-check;
- Storybook Vitest/a11y tests;
- Playwright для renderer/VRT;
- WebdriverIO + Tauri service для настоящего desktop E2E;
- rustfmt, Clippy, cargo-deny, cargo-nextest, sccache.

TypeScript 7.0 не имеет публичного Compiler API. TS6 compatibility package разрешён только изолированному tooling consumer и не является production compiler.

## 16. Дистрибуция

Игра бесплатная. Alpha: private GitHub Releases. Публичная версия: подписанный NSIS per-user installer и подписанный Tauri updater. Backend, Steam, stores и payments отсутствуют.

CRA/CE не являются baseline release gates, поскольку проект не ориентирован на коммерческий рынок ЕС. Инженерные требования безопасности, privacy и лицензий сохраняются.

## 17. Тесты

- unit/property/golden;
- content/chronology;
- balance simulations;
- migration/backup/recovery;
- Storybook render/interaction/a11y;
- Playwright renderer/accessibility/visual;
- WebdriverIO desktop integration;
- Rust proptest/fuzz для import/archive после появления surface;
- architecture dependency/capability tests;
- release/install/update matrix.

## 18. CI/CD и supply chain

```text
check:fast:
Oxfmt → Oxlint → TypeScript 7 tsc -b → content/architecture checks

verify:
check:fast → Oxlint type-aware → core/story/Rust tests

verify:release:
verify → Playwright → WebdriverIO → security/package/release checks
```

Actions pinned по full SHA, permissions минимальны, dependency review/secret scanning обязательны, релизы публикуют checksums, SBOM и provenance/attestation. Updater private key хранится в protected environment и имеет offline escrow/runbook.

## 19. Агентная разработка

`main` содержит согласованный канон. Существенные изменения выполняются в branch/PR. ADR имеет приоритет. Workflows, capabilities, migrations, updater и signing требуют human review. Issues, mods, logs, external pages и third-party README считаются untrusted data.

Storybook stories и deterministic fixtures являются предпочтительным feedback layer для UI/content agents.

## 20. Реализация

Порядок: Foundation → Vertical Slice → Education/Career → Projects/Open Source → Life/Property → Company → Endgame/Future/Modding.

Foundation включает TypeScript 7, Storybook, Rust write-boundary, persisted MonthRun, SQLite runbook и базовую supply-chain verification.

Подробности: [`../plans/ROADMAP.md`](../plans/ROADMAP.md) и [`../plans/VERTICAL-SLICE-PLAN.md`](../plans/VERTICAL-SLICE-PLAN.md).

## 21. Статусы решений

Accepted ADR: 001–012.

Канон редакции 1.3 учитывает оба Deep Research от 2026-07-16. Исследовательские отчёты сохраняются для traceability, но нормативный приоритет имеют ADR и профильные спецификации.