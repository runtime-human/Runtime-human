# Runtime Human — полный архитектурный план

> **Статус:** целевая архитектура с профильным внедрением
> **Редакция:** 1.4
> **Дата:** 2026-07-17
> **Источник истины:** приватный репозиторий `MrFr3di/Runtime-human`
> **Master:** [`MASTER-ARCHITECTURE.md`](MASTER-ARCHITECTURE.md)
> **Casual-first:** [`../game-design/CASUAL-SIMULATION-DESIGN.md`](../game-design/CASUAL-SIMULATION-DESIGN.md)

## 1. Назначение

Runtime Human — PC-first, Windows-first, offline-first казуальный текстовый симулятор становления, работы и наследия программиста.

Этот документ описывает:

- конечные архитектурные границы;
- минимальный игровой baseline;
- staged extension seams;
- правила сохранений, контента, UI и тестирования;
- условия, при которых сложность действительно добавляется.

Accepted ADR и специализированные спецификации имеют приоритет.

## 2. Продуктовая формула

```text
понятная ситуация
→ один содержательный выбор
→ автоматический месяц
→ правдоподобное последствие
→ короткое объяснение
→ следующий интересный вариант
```

Глубина возникает из накопления последствий, разных путей и исторического изменения индустрии.

Глубина не измеряется количеством:

- шкал;
- таблиц;
- тикетов;
- evidence claims;
- quality dimensions;
- hidden subsystems.

## 3. Зафиксированный канон

- старт: январь 1990 года, персонажу 12 лет;
- календарь: реальный григорианский;
- один ход: один месяц;
- внутри месяца: календарные дни и integer work units;
- no universal action points;
- no mandatory percentage sliders;
- routine commitments continue automatically;
- ordinary month normally 0–1 blocking decision;
- one fictional international metropolis;
- no permanent country/city relocation simulation;
- real technologies and verified historical milestones;
- fictional employers, NPC, institutions and local economy;
- post-July-2026 future is explicitly alternative;
- free game, no Steam, payments, ads or mandatory backend;
- programmer-first;
- casual-first;
- deterministic authoritative simulation;
- integer/fixed-point authoritative numerics.

## 4. Product hierarchy

1. Programmer Mastery Core.
2. Professional Expression.
3. Human Constraints and Values.
4. Narrative, Era and Philosophy.

При конфликте scope:

> Понятный meaningful choice важнее максимальной детализации реального процесса.

## 5. Реализационные профили

## 5.1. MVP Casual

Единственный обязательный профиль Foundation и Vertical Slice.

Включает:

- один персонаж;
- одну beginner technology;
- 3–5 relevant skills;
- один small project;
- два Work Packages;
- simple uncertainty;
- three project qualities;
- one debt/risk/known-issue branch;
- one meaningful technical choice;
- one aggregated professional result;
- short monthly report;
- crash-safe suspend/restart;
- atomic save.

## 5.2. Recommended

Добавляется после успешного first-month/year playtest:

- multiple beginner technologies;
- Intern/Junior progression;
- more project archetypes;
- situational quality;
- meaningful debt/issue records;
- career/employment;
- Details mode;
- richer life/narrative events.

## 5.3. Extended Simulation

Опциональная поздняя модель:

- full evidence browser;
- complex grade profiles;
- technology version/transfer graph;
- teams/delegation;
- production incidents/rollback;
- debt/defect ledgers;
- Product/Open Source ecosystems;
- Company portfolios;
- Senior/CTO/Founder/Top Programmer;
- long-term compaction and advanced analytics.

Extension seam не является roadmap obligation.

## 6. Архитектурный стиль

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

### Hard boundaries

- `game-core` has no React/Tauri/SQLite/filesystem/network/system-time dependencies;
- UI has no gameplay formulas or raw SQL;
- renderer has no authoritative SQL execute;
- Rust persists and validates contracts but does not calculate gameplay;
- content is data-only;
- randomness is seeded/versioned;
- authoritative values are integer/fixed-point;
- SaveGameState is completed-month consistency boundary;
- suspended MonthRun uses separate persisted draft;
- projections are rebuildable;
- schema stores only active implementation profile.

## 7. Repository structure

```text
apps/
  desktop/
packages/
  shared-kernel/
  game-schema/
  game-core/
  game-application/
  game-content/
  game-persistence-contracts/
  game-platform-contracts/
  game-ui/
  game-ui-fixtures/
content/
tools/
docs/
```

Packages are created when current implementation needs them. Do not scaffold empty future modules solely to mirror the final architecture.

## 8. Core domain ownership

### Character/Life

Owns identity, age, traits, health/capacity, life stages and major milestones.

### Professional Progression

Consumes `ExperienceEpisode` and owns:

- active skill mastery/fluency;
- technology familiarity;
- aggregated professional result;
- awarded grade;
- readiness projection.

Does not own project/job/course lifecycle.

### Project Engine

Owns:

- project stage and goal;
- aggregated Work Packages;
- uncertainty;
- active quality bands;
- debt/risk/known issue;
- compact release state;
- technical outcome and participation.

Does not own skills, users, revenue, employment or community.

### Career

Owns employer, position, salary, schedule, vacancies, interviews and promotion rules when implemented.

### Product/Market

Owns users, demand, pricing and revenue when implemented.

### Open Source

Owns contributors, governance, community and funding when implemented.

### Company

Owns people, teams, cash, strategy and portfolio priorities when implemented.

## 9. Professional progression model

MVP visible model:

- awarded grade;
- capability phrase;
- up to 3–5 relevant skills;
- active technology familiarity;
- readiness status;
- next useful step.

Internal semantics distinguish:

- mastery;
- fluency;
- familiarity;
- meaningful professional result.

Grade:

- not XP/time/title/salary/fame;
- achieved milestone;
- not automatically downgraded after short break;
- requires multiple meaningful contexts in later profiles.

Evidence exists for causality, not as default performance-review UI.

## 10. Project model

MVP project:

```text
idea → development → release-preparation → released → maintenance / finished
```

MVP has:

- one clear goal;
- two Work Packages;
- progress band;
- low/medium/high uncertainty;
- forecast: this month / next month / unclear;
- functional/usability/maintainability qualities;
- debt band;
- one risk/known issue;
- compact release outcome;
- independent/assisted participation.

Work Package is an aggregated stage, not a ticket/file/method.

Project cannot be only one progress bar: at least one decision changes scope, quality, risk, release or future cost.

## 11. Time and commitments

Game calendar uses pure Gregorian service without timezone/DST.

Persistent commitments:

- education;
- employment;
- active project;
- family/life duties;
- housing/finance;
- later product/community/company obligations.

Routine commitments are automatic. Player sets focus/priorities and reacts to meaningful conflicts.

## 12. MonthRun

State machine:

```text
ready → running → suspended-for-decision → running → completed → committed
```

MVP pipeline:

1. load/validate save and draft;
2. restore deterministic context;
3. calendar/world changes;
4. life capacity and commitments;
5. allocate work;
6. advance current package;
7. materialize deterministic uncertainty;
8. optional event/decision;
9. checkpoint/suspend;
10. resolve compact project outcome;
11. create ExperienceEpisode;
12. apply professional result;
13. apply life/finance consequences;
14. build short report;
15. validate invariants;
16. atomic commit.

Additional phases appear only with implemented systems.

## 13. Suspended MonthRun

Draft stores only restart-critical state for active profile:

- IDs/revisions/fingerprints;
- RNG states;
- phase;
- package progress;
- hidden realization;
- pending decision/history;
- provisional compact outcome;
- episode/professional result;
- trace hashes.

No draft fields for unimplemented incidents, team ledgers or detailed evidence.

## 14. Event Engine and Narrative Director

Event Engine owns eligibility, choices, typed requests and chains.

Narrative Director owns pacing, anti-repeat, quiet months and crisis protection.

MVP event:

- 2–4 understandable options;
- clear trade-off direction;
- human language;
- typed provider operation;
- no direct mastery/project mutation;
- no dependency on unimplemented systems.

Routine events do not create monthly clicking.

## 15. Historical model

Technology historical data may distinguish:

- announcement;
- availability;
- local learnability;
- demand;
- mainstream;
- decline;
- legacy/end-of-support.

MVP needs one fully playable beginner technology and enough catalogue context for era authenticity.

Full lifecycle/version/transfer simulation is Recommended/Extended.

## 16. Numerical model

- money TS: branded `bigint` minor units;
- Rust/SQLite: checked `i64`;
- IPC: canonical decimal strings;
- rates: basis points;
- probabilities/weights: integers;
- progress/time: integer units;
- coefficients: versioned fixed-point;
- explicit rounding;
- overflow/underflow checks.

No authoritative floating point.

## 17. Determinism

`DeterminismManifest` version-controls:

- rules;
- RNG;
- hashing;
- numeric model;
- calendar;
- stable sorting;
- effect ordering;
- serialization.

Forbidden:

- `Math.random`;
- system time in Core;
- locale-dependent authoritative sorting;
- filesystem-order dependence;
- reroll after reload.

## 18. Persistence

```text
implemented normalized snapshot
+ bounded important histories
+ persisted MonthRun draft
+ rolling backups
+ rebuildable projections
```

Storage is profile-aware:

- MVP stores minimal state;
- later features add migrations;
- no empty future ledgers/tables;
- semantic snapshots preserve important history.

Rust is authoritative write boundary.

SQLite baseline:

- 3.51.3+ or confirmed WAL backport;
- WAL;
- foreign keys;
- busy timeout;
- one writer;
- atomic transactions.

Backup uses Online Backup API or controlled `VACUUM INTO`.

## 19. Content

- JSONC;
- TypeBox/Ajv;
- semantic/chronology/reference validation;
- casual-complexity lint;
- reachability/balance lint;
- stable IDs;
- semantic snapshots/tombstones;
- data-only mods after current content API stabilizes.

MVP content budget:

- one project archetype;
- two packages;
- one technology;
- five internal skills;
- one uncertainty/debt branch;
- four outcomes;
- 4–6 events;
- minimal equipment/housing/life context.

## 20. UI

Normal UI is the product.

Main screen:

1. professional focus;
2. main activity/project;
3. next milestone;
4. one critical constraint;
5. next month/action.

Project card:

- goal;
- current package;
- simple forecast/uncertainty;
- three qualities;
- debt/issue;
- next choice.

Progression card:

- capability phrase;
- relevant skills;
- technology familiarity;
- readiness status;
- next step.

Details/Advanced are optional and never alter outcome.

## 21. Storybook and accessibility

Storybook 10 is Foundation workshop for implemented components:

- normal/edge states;
- decision cards;
- project/progression summaries;
- monthly report;
- recovery;
- long Russian text;
- keyboard/focus;
- 200% scale;
- high contrast;
- reduced motion;
- Narrator.

Do not create dashboards/stories for unimplemented Extended systems.

## 22. Testing strategy

MVP required:

- unit/property/golden tests for active formulas/transitions;
- deterministic restart/idempotency;
- save/backup/recovery;
- content validation/reachability;
- Storybook interaction/a11y;
- Playwright renderer flows;
- WebdriverIO critical desktop flow;
- manual usability tests.

MVP product gates:

- goal understood;
- ordinary decision understood in 10–20 seconds;
- player predicts trade-off direction;
- monthly report causality understood;
- screen not perceived as CRM/Jira;
- majority wants to continue;
- no obvious exploit/bad-start soft lock.

Large mass simulations and late-system tests are added with stable corresponding gameplay.

## 23. CI/CD

```text
check:fast:
Oxfmt → Oxlint → TypeScript 7 → active content/architecture validation

verify:
check:fast → active core/property/story/Rust tests

verify:release:
verify → Playwright → WebdriverIO → security/package/release checks
```

CI does not require tests for unimplemented Extended modules.

Actions pinned by full SHA with least privileges. Release architecture includes dependency review, secret scanning, SBOM, checksums and provenance.

## 24. Security and privacy

- no mandatory telemetry;
- no remote config/auth/cloud baseline;
- explicit Tauri capabilities;
- no raw SQL/shell/filesystem from renderer;
- signed updater with protected key process;
- data-only mod quarantine and archive limits;
- diagnostics exported manually with redaction.

## 25. Distribution

Windows tier-1.

Alpha: private GitHub Releases.

Public: signed per-user NSIS installer and signed updater when release-ready.

No Steam, stores, payments or mandatory network.

## 26. Agent development rules

Agent must:

- follow ADR/spec source order;
- not implement extension seam automatically;
- document active profile;
- justify state by current choice/consequence;
- propose simplest viable model first;
- add Storybook/test/playtest criteria;
- preserve deterministic/recovery/security boundaries;
- report deferred Extended work.

Workflow, migrations, capabilities, updater and signing changes require review.

## 27. Roadmap

### Phase 0 — MVP Casual Foundation

Minimal contracts, deterministic MonthRun, persistence, UI foundation and fixtures.

### Phase 1 — Casual Vertical Slice

One project, one technical choice, one professional result, restart and comprehension playtest.

### Phase 2 — First Playable Year

Several learning activities, technologies and projects; simple Intern readiness; event variety.

### Phase 3 — Beginner to Junior + Career

Employment, vacancies, work projects, promotion/title separation and recovery.

### Phase 4 — Products/Open Source

Market/community extensions using shared Project Engine.

### Phase 5 — Long-term Life

Relationships, health, housing, economy and interruptions without monthly chores.

### Phase 6 — Middle/Senior/Leadership/Company

Only after validated early corpus and demand.

### Phase 7 — Late Career/Endgame

Top Programmer, legacy, succession, future and optional Extended depth.

## 28. Complexity gate

A feature is rejected/deferred when:

- no current player problem;
- no meaningful choice/consequence;
- normal mode needs advanced data;
- state is speculative;
- visible concepts exceed budget;
- creates routine maintenance clicking;
- justified only by realism/completeness;
- no playtest criterion;
- content/test/migration cost exceeds demonstrated value.

## 29. Principal risks

- overengineering before fun;
- UI as dashboard;
- content explosion;
- hidden randomness without explanation;
- project as progress bar;
- evidence as bureaucracy;
- deterministic/save corruption;
- historical inaccuracies;
- agent scope drift;
- premature late-game systems.

Controls:

- ADR-015 profiles;
- playtest gates;
- small content budgets;
- human-readable reports;
- deterministic draft/restart;
- profile-aware schemas;
- module boundaries;
- Storybook/usability feedback.

## 30. Definition of Done

A phase is complete only when:

- normal mode is sufficient;
- gameplay is understandable and causal;
- visible complexity is bounded;
- active schema contains no speculative future fields;
- deterministic/recovery checks pass;
- implemented content is reachable;
- accessibility stories pass;
- product playtest exit criteria pass;
- documentation/source hierarchy synchronized;
- deferred Extended work remains deferred.
