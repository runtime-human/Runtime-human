# Runtime Human — Master Architecture

> **Статус:** архитектурный канон, редакция 1.2
> **Дата:** 2026-07-16
> **Полный план:** [`FULL-ARCHITECTURE-PLAN.md`](FULL-ARCHITECTURE-PLAN.md)
> **Индекс:** [`../INDEX.md`](../INDEX.md)

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
React UI
  ↓
Application Facade / Use Cases
  ↓
Pure TypeScript Game Core
  ↓ typed ports
Rust Persistence and Platform Adapters
  ↓
SQLite / filesystem / Tauri
```

### Жёсткие границы

- core не импортирует React, Tauri, DOM, SQLite, filesystem, network и system time;
- UI не содержит игровых формул и raw SQL;
- Rust не содержит баланс, события и historical rules;
- контент data-only и не исполняет код;
- случайность только versioned seeded RNG;
- авторитетная математика целочисленная/fixed-point;
- `SaveGameState` — consistency boundary завершённого месяца;
- pending MonthRun хранится отдельным draft.

## 6. Модули

```text
apps/desktop
apps/content-studio          # позднее
packages/shared-kernel
packages/game-schema
packages/game-core
packages/game-application
packages/game-content
packages/game-persistence-contracts
packages/game-platform-contracts
packages/game-ui
content/**
tools/**
docs/**
```

Подробности: [`REPOSITORY-STRUCTURE.md`](REPOSITORY-STRUCTURE.md), [`MODULE-BOUNDARIES.md`](MODULE-BOUNDARIES.md).

## 7. Домен

Авторитетное состояние включает character, people, relationships, employment, activities, projects, products, companies, inventory, housing, finance, world, narrative и achievements.

Грейд и должность разделены. NPC имеют stable IDs и tiers active/background/archived. World state состоит из `HomeCityState`, `LocalMarketState`, `WorldTimelineState`, `EraId` и revision глобального технологического каталога.

Не создаются `CountrySimulation`, `VisaSystem`, `ImmigrationSystem`, `RelocationSystem` и `RegionalTaxEngine`.

## 8. Месячная симуляция

```text
ready → running → suspended-for-decision → running → completed → committed
```

Draft хранит base revision, versions/fingerprints, RNG state, MonthPlan, intermediate state, pending decision и history choices. Основной сейв изменяется только после завершения месяца одной транзакцией.

Подробности: [`../simulation/MONTH-SIMULATION.md`](../simulation/MONTH-SIMULATION.md), [`../simulation/SUSPENDED-MONTH-RUN.md`](../simulation/SUSPENDED-MONTH-RUN.md).

## 9. Event Engine и Narrative Director

Event Engine отвечает за допустимость, conditions, choices, effects, cooldown и chains. Narrative Director отвечает за pacing, diversity, anti-repeat, intensity, quiet months и milestone arcs.

События JSONC, валидируются TypeBox/Ajv и semantic/chronology validators. Arbitrary scripts запрещены.

## 10. Историческая модель и город

Технологии разделяют announcement, first public release, local availability, professional demand, mainstream, peak, decline и end-of-support. Каждая каноническая дата имеет provenance.

Город проходит эпохи 1990–1994, 1995–2001, 2002–2006, 2007–2012, 2013–2019, 2020–2026 и альтернативное будущее после 2026-07.

## 11. Числа и детерминизм

- money TS: `bigint` minor units;
- Rust/SQLite: `i64`;
- IPC: decimal string;
- проценты: basis points;
- probabilities/weights: integers;
- progress/time: integer units.

`DeterminismManifest` фиксирует rules, RNG, hash, numeric, calendar и sorting versions. Запрещены `Math.random`, system `Date`, locale sorting и неявный порядок файлов.

## 12. Persistence

Модель:

```text
normalized current snapshot
+ append-only histories/ledger
+ pending month draft
+ rolling backups
```

SQLite использует WAL, foreign keys и atomic transactions. Backup создаётся согласованно через SQLite Backup API или эквивалент, а не копированием active WAL database.

Предпочтительная persistence boundary описана в proposed ADR-004: Rust выполняет authoritative SQL и migrations; renderer не получает raw SQL capability.

## 13. Контент

- JSONC;
- TypeBox + Ajv;
- semantic/chronology/reference validation;
- stable namespaced IDs;
- tombstones/replacements;
- localization keys;
- historical source registry;
- data-only mods после стабилизации content API.

## 14. UI

Стек: React 19, Tailwind CSS 4, Radix UI, Motion, TanStack Router, Zustand только для transient UI state.

UI использует semantic design tokens и игровые компоненты. Норматив доступности — WCAG 2.2 AA насколько применимо: keyboard, Narrator, focus, 200% text scale, high contrast, reduced motion и alternatives to drag.

## 15. Технологический стек

- Tauri 2;
- React 19;
- TypeScript 6 stable;
- Vite 8/Rolldown/Oxc;
- Node.js 24 LTS;
- pnpm;
- SQLite;
- Oxlint без type-aware как blocking;
- Oxfmt, Knip, Lefthook;
- Vitest, Testing Library, fast-check;
- Playwright для renderer;
- WebdriverIO + Tauri service для настоящего desktop E2E;
- rustfmt, Clippy, cargo-deny, cargo-nextest, sccache.

Type-aware Oxlint/TypeScript-Go остаётся неблокирующей compatibility-проверкой до отдельного решения о стабильном TypeScript 7.

## 16. Дистрибуция

Игра бесплатная. Alpha: private GitHub Releases. Публичная версия: подписанный NSIS per-user installer и подписанный Tauri updater. Backend, Steam, stores и payments отсутствуют.

CRA/CE не являются baseline release gates, поскольку проект не ориентирован на коммерческий рынок ЕС. При изменении модели требуется новый ADR. Инженерные требования безопасности и лицензий сохраняются.

## 17. Тесты

- unit/property/golden;
- content/chronology;
- balance simulations;
- migration/backup/recovery;
- React/Playwright accessibility/visual;
- WebdriverIO desktop integration;
- architecture dependency tests;
- release/install/update matrix.

## 18. Агентная разработка

`main` содержит согласованный канон. Существенные изменения выполняются в branch/PR. ADR имеет приоритет. Workflows, capabilities, migrations, updater и signing требуют human review. Агент показывает verification evidence до заявления о завершении.

## 19. Реализация

Порядок: Foundation → Vertical Slice → Education/Career → Projects/Open Source → Life/Property → Company → Endgame/Future/Modding.

Подробности: [`../plans/ROADMAP.md`](../plans/ROADMAP.md) и [`../plans/VERTICAL-SLICE-PLAN.md`](../plans/VERTICAL-SLICE-PLAN.md).

## 20. Статусы решений

Accepted ADR: 001–003.

Proposed ADR: 004–010. Их наличие фиксирует рекомендуемый вариант, но не означает окончательного принятия до explicit review/merge decision.
