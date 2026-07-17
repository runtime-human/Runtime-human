# Runtime Human — Master Architecture

> **Статус:** архитектурный канон, редакция 1.4
> **Дата:** 2026-07-17
> **Индекс:** [`../INDEX.md`](../INDEX.md)
> **Casual-first:** [`../game-design/CASUAL-SIMULATION-DESIGN.md`](../game-design/CASUAL-SIMULATION-DESIGN.md)

## 1. Продукт

Runtime Human — бесплатный PC-first offline-first казуальный текстовый симулятор становления, работы и наследия программиста.

Игровая формула:

```text
понятная ситуация
→ один содержательный выбор
→ автоматический месяц
→ правдоподобное последствие
→ короткое объяснение
→ следующий интересный вариант
```

Внутренняя модель может быть глубже normal UI, но архитектурная полнота и максимальный реализм не являются целями сами по себе.

## 2. Канонические решения

- старт: январь 1990 года, возраст 12;
- календарь: реальный григорианский;
- один ход: один месяц;
- внутри месяца: календарные дни и integer work units;
- no universal action points/mandatory percentage sliders;
- routine commitments automatic;
- ordinary month normally 0–1 blocking decision;
- one fictional metropolis;
- real technologies/history with provenance;
- fictional local employers/NPC/economy;
- post-2026 future explicitly alternative;
- free, no Steam/payment/mandatory backend;
- programmer-first and casual-first;
- normal UI uses bounded human-readable concepts;
- extension seam does not require early implementation.

## 3. Реализационные профили

### MVP Casual

Only mandatory profile for Foundation/Vertical Slice:

- one small project;
- two Work Packages;
- three visible project qualities;
- one uncertainty/debt/issue branch;
- 3–5 relevant skills;
- one technology;
- one aggregated professional result;
- short monthly report;
- deterministic suspend/restart/atomic commit.

### Recommended

Added after successful first-month/year playtest:

- more skills/technologies;
- Intern/Junior career;
- several project archetypes;
- situational quality;
- significant debt/issue records;
- Details UI.

### Extended Simulation

Optional late-game:

- full evidence browser;
- complex grade profiles;
- teams/delegation/company portfolios;
- incidents/rollback;
- debt/defect ledgers;
- Senior/CTO/Founder/Top Programmer;
- long-lived Product/Open Source ecosystems.

Extended is not a Definition of Done for early phases.

## 4. Главный цикл

```text
current professional/life state
→ choose learning/project/priority
→ simple forecast
→ next month
→ automatic commitments
→ optional blocking decision
→ project/professional/life outcomes
→ atomic commit
→ short report and next option
```

## 5. Product hierarchy

1. Programmer Mastery Core.
2. Professional Expression.
3. Human Constraints and Values.
4. Narrative, Era and Philosophy.

Within every layer, understandable meaningful choice outranks process detail.

## 6. Архитектурные слои

```text
React 19 UI
  ↓
Typed Application Facade
  ↓
Pure TypeScript 7 Game Core
  ↓ typed ports
Typed Tauri Commands
  ↓
Rust Persistence and Platform Services
  ↓
SQLite / filesystem / Tauri
```

Hard boundaries:

- core has no React/Tauri/SQLite/filesystem/network/system-time imports;
- UI has no gameplay formulas/raw SQL;
- renderer has no authoritative SQL execute;
- Rust persists but does not judge gameplay;
- content data-only;
- randomness versioned/seeded;
- authoritative arithmetic integer/fixed-point;
- SaveGameState month consistency boundary;
- suspended MonthRun separate draft;
- projections rebuildable;
- schemas store only active implementation profile.

## 7. Modules

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
```

Module boundary does not imply every future module is implemented in MVP. Empty/stub extension packages are avoided until needed.

## 8. Professional progression

Experience Providers own domain outcomes and create stable `ExperienceEpisode`.

Progression Core owns:

- active skill mastery/fluency;
- technology familiarity;
- aggregated professional result;
- awarded grade;
- readiness projection/explanation.

MVP normal UI shows capability text, up to 3–5 relevant skills, one technology, readiness status and next step.

Grade is not XP/time/title/salary. Evidence details are not primary UI.

## 9. Projects

Project Engine owns technical project truth and uses aggregated Work Packages.

MVP:

- one goal;
- two packages;
- progress/uncertainty bands;
- functional/usability/maintainability qualities;
- one debt/risk/known issue;
- compact release state;
- independent/assisted contribution.

Project is neither one progress bar nor a ticket dashboard.

Product, Career, Company and Open Source extensions do not duplicate technical ProjectState.

## 10. MonthRun

```text
ready → running → suspended-for-decision → running → completed → committed
```

Draft contains only restart-critical state for implemented systems: revisions, RNG, hidden realization, pending decision, provisional project outcome, episode/professional result and trace.

One Rust/SQLite transaction commits project, professional and cross-system consequences.

## 11. Events and narrative

Event Engine owns eligibility/options/effects. Narrative Director owns pacing, anti-repeat, quiet months and crisis protection.

MVP events:

- 2–4 understandable options;
- typed provider requests;
- no direct skill/project mutation;
- no repeated maintenance clicks;
- no dependency on unimplemented systems.

## 12. Historical model

Technology history distinguishes availability, adoption, demand, decline and legacy where gameplay needs it.

MVP implements one fully playable beginner technology and a small historical catalogue. Full technology version/transfer graph is deferred.

## 13. Persistence

```text
implemented normalized snapshot
+ bounded important histories
+ pending MonthRun draft
+ rolling backups
+ rebuildable projections
```

SQLite 3.51.3+ or confirmed WAL backport. WAL, foreign keys, busy timeout and atomic transactions.

Rust is authoritative write boundary. Storage does not preallocate unused Extended tables.

## 14. Content

- JSONC;
- TypeBox/Ajv;
- semantic/chronology/reference validation;
- casual-complexity and reachability lint;
- stable namespaced IDs;
- semantic snapshots/tombstones;
- data-only mods after stable current content API.

MVP content is intentionally small: one project archetype, two packages, one technology, five internal skills and several events.

## 15. UI and Storybook

Normal UI is the primary product:

- 3–5 primary objects;
- human-readable bands/statuses;
- one main choice;
- short monthly report;
- no default evidence/debt/defect dashboards.

Details/Advanced are optional and never change outcomes.

Storybook 10 covers normal/edge/accessibility/recovery states for implemented components only.

## 16. Technology stack

- Tauri 2;
- React 19;
- TypeScript 7 exact;
- Vite/Oxc;
- Node 24 LTS/pnpm;
- Storybook 10;
- SQLite 3.51.3+ / rusqlite;
- Vitest/Testing Library/fast-check;
- Playwright/WebdriverIO;
- rustfmt/Clippy/cargo-deny/cargo-nextest/sccache.

## 17. Testing and balance

MVP gates prioritize:

- first-time comprehension;
- 10–20 second ordinary decision target;
- causal monthly report;
- bounded visible complexity;
- deterministic restart/idempotency;
- assisted/partial/failure semantics;
- one real project trade-off;
- accessibility/long Russian text;
- desire to continue.

Long-term Senior/team/debt-spiral/portfolio simulations are added with corresponding gameplay.

## 18. Roadmap rule

No additional simulation depth before current phase product exit criteria pass.

Feature requires:

- observed player problem;
- simpler alternatives considered;
- clear choice/consequence;
- normal UI;
- playtest criterion;
- state/content/test cost.

## 19. Distribution

Free Windows-first distribution through signed installer/updater when release-ready. No Steam, stores, payments or mandatory backend.

## 20. Definition of Done

A phase is complete when:

- normal mode works without advanced view;
- gameplay is understandable and causal;
- active schema contains no speculative future fields;
- deterministic/recovery guarantees pass;
- content/accessibility stories pass;
- playtest exit criteria pass;
- deferred complexity remains deferred.
