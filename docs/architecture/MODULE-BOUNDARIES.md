---
title: "Границы модулей"
type: architecture
status: draft
canon: true
depends_on: [ADR-004, ADR-013, ADR-014, ADR-018, ADR-019]
updated: 2026-07-18
---

# Границы модулей

Нормативные решения:

- [ADR-004 — Persistence Boundary](../adr/ADR-004-persistence-execution-boundary.md)
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md)
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)

## Dependency direction

```text
React UI / Storybook
        ↓
Typed Application Facade / Use Cases
        ↓
Pure TypeScript Game Core ← Compiled Content Runtime
        ↑
 Typed Contracts / Ports / Schemas
        ↓
Typed Tauri Commands
        ↓
Rust Persistence and Platform Services
        ↓
SQLite / filesystem / Tauri
```

Dependencies point toward stable pure layers.

## `shared-kernel`

Only stable primitives:

- branded IDs;
- `GameDate`/`MonthIndex`;
- integer/fixed-point value types;
- `Result`/domain errors;
- version/fingerprint/trace IDs;
- canonical serialization.

No gameplay systems, React, SQL, Tauri or platform APIs.

## `game-schema`

TypeBox/JSON schemas for:

- save/IPC/content/mod DTO;
- professional state/evidence/episodes;
- ProjectState/WorkPackage/release;
- Career opportunity/hiring/offer/position/trust;
- technology identity/band/platform/toolchain/ecosystem/context;
- historical source/local-availability definitions;
- UI fixtures/read models.

Generated types have one source.

## `game-core`

Owns pure:

- domain transitions and integer/fixed-point rules;
- MonthRun/Event/Narrative;
- Professional Progression Core;
- Professional Challenge Engine;
- Programmer Learning Engine;
- Project & Work Package Engine;
- Programmer Career Engine;
- Technology Context Engine;
- invariants, deterministic randomness and canonical traces.

Forbidden imports:

- React/DOM/Zustand;
- Tauri/SQLite/filesystem/network;
- system `Date`/`Math.random`/locale sorting;
- production logger.

## Technology Context Engine

Owns:

- validation/projection of technology/version/platform/toolchain context;
- lifecycle-axis projection;
- ecosystem affordance/risk projection;
- practical-access projection from immutable owner snapshots;
- provider-compatible constraints/signals;
- `TechnologyContextSnapshot`/reason codes/fingerprint;
- deterministic trait salience.

Does not own:

- source registry/global chronology definitions;
- fictional city/equipment/institution/economy/employment truth;
- Learning/Project/Career outcomes;
- familiarity/evidence/grade;
- company/product/open-source state;
- persistence transaction or UI formatting.

Public inputs:

- compiled historical technology/band/support/compatibility definitions;
- fictional local availability;
- equipment/institution/economy/NPC/employment access snapshots;
- provider/project/career context;
- game date, rules/content fingerprints and decision log.

Public outputs:

- immutable technology context;
- practical access/fallback routes;
- ecosystem affordances/risks;
- compatible learning/project/career signals;
- support/compatibility warnings;
- reason codes and trace.

Boundary rules:

- no universal technology/popularity/ecosystem score;
- no provider state mutation;
- no direct familiarity delta;
- no dynamic network values;
- no reroll after materialization;
- historical/local/practical access remain distinct.

## Historical Technology Catalog and City/Era

`game-content` owns immutable source-backed global records and fictional local definitions.

Historical catalog:

- global release/standards/support chronology;
- major version bands;
- prerequisites/compatibility/migrations;
- scoped adoption/ecosystem evidence.

City/Era content:

- fictional local diffusion;
- channels/institutions/cost/rarity;
- era-valid context;
- explicit local-adaptation basis.

Neither owns character practical access or provider outcomes.

## Project & Work Package Engine

Owns:

- ProjectState, scope and packages;
- uncertainty/forecast;
- quality/debt/defects;
- releases/maintenance;
- contribution and technical outcome;
- Project → `ExperienceEpisode` mapping.

Consumes public technology context for compatibility/tooling/support/project-fit constraints. It does not import Technology Catalog internals or let Technology Engine change project state.

Does not own Product/OSS/Company/Career/professional/life/persistence/UI truth.

## Professional Progression Core

Owns:

- professional state;
- mastery/fluency/familiarity;
- directed transfer/reacquisition;
- episode assessment;
- evidence/grade/readiness;
- dedup and explanations.

Does not re-evaluate provider or technology-history truth. Catalog/context alone creates no familiarity/evidence.

## Experience Providers

- Education/Learning;
- Project;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event where a real domain outcome exists.

Every provider:

- owns activity/outcome lifecycle;
- checks eligibility/invariants;
- consumes public technology context where relevant;
- separates character contribution from external/team result;
- creates stable episode under policy;
- never mutates professional state directly.

## Programmer Learning Engine

Owns learning opportunity/attempt/approach/outcome and assistance semantics.

Consumes technology access/docs/examples/tooling/feedback/transfer context. It does not calculate lifecycle, buy equipment or change familiarity directly.

## Programmer Career Engine

Owns:

- opportunity/search intent;
- employer-visible candidate projection;
- hiring/offer/position;
- role expectations and workplace trust;
- promotion/lateral/exit/layoff/re-entry;
- compact labor-market projection and history.

Consumes public technology signals:

- role/project relevance;
- demand/installed-base tags;
- familiarity gap/trainability;
- employer toolchain compatibility.

Career does not calculate technology chronology/ecosystem context, professional truth, technical project outcome or Company state.

## Product/Market extension

Owns users/demand/pricing/revenue/churn/competition/support demand. Consumes release outcomes and public technology/product context. Does not mutate ProjectState or technology chronology.

## Open Source extension

Owns contributors/maintainers/community/governance/forks/sponsorship and ownership transfer. Uses Project contracts and may provide scoped ecosystem/career signals. Technology Engine does not pre-simulate community health.

## Company/Leadership

Owns employees/teams, headcount/positions, payroll budget, portfolio priorities, tooling/process, organizational debt, restructuring and delegation.

Provides Career position/policy signals, Project capacity/constraints and Employment toolchain access. Company does not execute player-character Career lifecycle, calculate grade or duplicate Project/Technology state.

## `game-application`

Orchestrates:

- save lifecycle;
- begin/resume/recover/abandon MonthRun;
- commands/revisions/idempotency;
- persistence ports;
- import/export/backup;
- cross-owner atomic commit;
- read-model composition.

No gameplay/technology/project/progression/career formulas, raw SQL or Tauri calls.

## `game-content`

Loads/validates/compiles immutable definitions:

- skills/grade/transfer;
- technologies/bands/platforms/toolchains/ecosystems/compatibility;
- historical source registry and fictional local availability;
- learning/project/challenge content;
- fictional employers/career/labor profiles;
- events/NPC/world/content.

No executable content, runtime simulation or professional mutations.

## Persistence contracts

Typed services for:

- implemented normalized snapshots;
- active technology/project/professional/career MonthRun context;
- bounded append-only history/semantic snapshots;
- transaction/revision/idempotency;
- migrations/compatibility;
- backup/restore/import/export/recovery.

No raw SQL/concrete SQLite types in public TS API. No speculative full technology/package/ecosystem tables before gameplay.

## Rust adapter

Rust validates DTO/ranges/revisions, executes transactions, stores deltas/snapshots atomically and handles migrations/recovery.

Rust does not:

- calculate technology context/lifecycle/compatibility;
- advance projects or choose outcomes;
- calculate progression/evidence;
- generate/score career outcomes;
- interpret content rules.

## `game-ui`

Consumes application read models; never imports mutable owner state or persistence internals.

UI does not:

- calculate hidden project/career/technology outcomes;
- rank technologies universally;
- reroll context/options;
- calculate mastery/evidence/role fit/trust;
- issue raw SQL/platform commands.

## `game-ui-fixtures`

Deterministic serializable fixtures for:

- project/professional/career states;
- technology context/access/ecosystem/migration/support states;
- recovery and edge cases.

No production paths/network/clock/randomness/privileged adapters.

## Desktop composition root

`apps/desktop` wires UI, application facade, IPC and adapters only. No gameplay formulas.

## Architecture checks

CI blocks:

- forbidden platform/UI/persistence imports;
- UI direct mutable state or formulas;
- content/Rust/application calculating gameplay outcomes;
- Project/Career/Technology direct mutation across owner boundaries;
- Technology Engine changing familiarity/project/career/access truth;
- provider direct professional mutation;
- Career reading hidden mastery without projection;
- Product/Company/OSS/Career duplicating ProjectState;
- Company executing player Career lifecycle;
- dynamic network metrics in authoritative core/content;
- system clock/random/locale order in core;
- float authoritative fields;
- executable content/mod scripts;
- missing stable fingerprint/tombstone for semantic content;
- circular/deep imports;
- test-only desktop plugins in release build.