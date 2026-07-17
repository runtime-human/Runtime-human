# Границы модулей

Нормативные решения:

- [ADR-004 — Persistence Boundary](../adr/ADR-004-persistence-execution-boundary.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

## Dependency direction

```text
React UI / Storybook
        ↓
Typed Application Facade / Use Cases
        ↓
Pure TypeScript 7 Game Core ← Compiled Content Runtime
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
- `MoneyMinor`, `BasisPoints`, `ChancePpm`, `WorkUnit`;
- `Result`/domain errors;
- version/fingerprint IDs;
- canonical serialization.

No gameplay systems, React, SQL, Tauri or platform APIs.

## `game-schema`

TypeBox/JSON schemas for:

- save/IPC/content/mod DTO;
- professional state/evidence/episodes;
- ProjectState/WorkPackage/release DTO;
- project content definitions;
- UI fixtures/read models.

Generated types have one source.

## `game-core`

Owns pure:

- domain state transitions;
- integer/fixed-point rules;
- MonthRun;
- Event/Narrative systems;
- Professional Progression Core;
- Project & Work Package Engine;
- invariants;
- deterministic randomness;
- canonical outcomes/traces.

Forbidden imports:

- React/DOM/Zustand;
- Tauri/SQLite/filesystem/network;
- system `Date`/`Math.random`/locale sorting;
- production logger.

## Project & Work Package Engine

Owns:

- ProjectState transitions;
- scope/requirements;
- Work Package lifecycle;
- project uncertainty/forecast inputs;
- quality/debt/defects;
- releases/maintenance;
- participant contribution;
- technical project outcome;
- Project → `ExperienceEpisode` mapping.

Does not own:

- product users/revenue/churn;
- OSS governance/community;
- company employment/payroll;
- career salary/promotion;
- character mastery/grade;
- event selection/pacing;
- global life capacity allocation;
- persistence transaction;
- UI formatting.

Public inputs:

- immutable project state;
- allocated participant work;
- provider/extension constraints/signals;
- compiled definitions;
- deterministic context/decision log.

Public outputs:

- project/package state delta;
- pending project decision/checkpoint;
- release/incident/history deltas;
- contribution snapshot;
- `ExperienceEpisode` candidates;
- project trace/explanations.

## Professional Progression Core

Owns:

- professional state transitions;
- mastery/fluency/familiarity;
- episode assessment;
- evidence/grade/readiness;
- anti-repeat/dedup;
- progression explanations.

Does not re-evaluate project technical truth.

## Experience Providers

- Education;
- Project Engine;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event Engine where a real domain outcome exists.

Every provider:

- owns its task/activity/outcome lifecycle;
- checks eligibility/invariants;
- separates player contribution from team/external result;
- creates stable episode;
- never mutates skills/grade directly.

## Product/Market extension

Owns:

- adoption/users;
- demand;
- pricing/revenue/cost/churn;
- market fit/competition;
- product support demand.

Consumes `ReleaseTechnicalOutcome`; returns demand/support signals.

Must not import Project Engine internals or mutate quality/debt/defects directly.

## Open Source extension

Owns:

- contributor/maintainer/community state;
- governance/forks/sponsorship;
- issue/PR community flow;
- ownership transfer.

Uses public Project contracts for technical state/releases.

## Company/Leadership

Owns:

- employees/teams;
- hiring/payroll/retention;
- portfolio priorities;
- budgets/tooling/process;
- organizational debt;
- organization-level delegation policies.

Provides Project Engine capacity/ownership/constraints. It does not duplicate ProjectState.

## Career/Employment

Owns:

- employer/job/position/title;
- salary/promotion/firing;
- stakeholders/deadlines/role expectations;
- organizational consequences.

Consumes project contribution/outcome summaries.

## `game-application`

Orchestrates:

- save lifecycle;
- begin/resume/recover/abandon MonthRun;
- commands/revisions/idempotency;
- persistence ports;
- import/export/backup;
- read-model composition.

No balance/project/progression formulas, raw SQL or Tauri calls.

## `game-content`

Loads/validates/compiles immutable definitions:

- skills/technologies/transfer/grade;
- project archetypes/kinds;
- scope/work-package templates;
- quality profiles;
- debt/defect/release/maintenance policies;
- era project capabilities;
- events/NPC/world/content.

No executable content, runtime project simulation or progression calculation.

## Persistence contracts

Typed services for:

- normalized save/project/professional snapshots;
- append-only evidence/releases/incidents/history/ledger;
- MonthRun draft/checkpoint/commit;
- transaction/revision/idempotency;
- migrations/compatibility;
- backup/restore/import/export/recovery.

No raw SQL/concrete SQLite types in public TS API.

## Rust adapter

Rust:

- validates DTO/ranges/revisions;
- executes transactions;
- stores project/professional/history deltas atomically;
- handles migration/backup/recovery.

Rust does not:

- advance Work Packages;
- choose project outcomes;
- calculate quality/debt/defects;
- calculate progression/evidence;
- interpret content rules.

## `game-ui`

Contains components/routes/view adapters/accessibility/stories.

Consumes application read models; never imports mutable ProjectState/progression internals or persistence implementation.

UI does not:

- calculate hidden latent work;
- reroll forecast/defects;
- decide release gate;
- calculate mastery/evidence;
- issue raw SQL/platform commands.

## `game-ui-fixtures`

Deterministic serializable fixtures for Storybook/tests/bug reproduction:

- project/package/forecast/quality/debt/defect/release states;
- professional/evidence states;
- recovery/edge cases.

No production paths/network/clock/randomness/privileged adapters.

## Desktop composition root

`apps/desktop` wires UI, application facade, IPC and adapters only. No gameplay formulas.

## Architecture checks

CI blocks:

- Tauri imports in kernel/schema/core/application/UI;
- React/DOM imports in core/application;
- persistence implementation in UI/Storybook;
- UI direct mutable GameState imports;
- Project Engine importing Product/Company/OSS internal state instead of contracts;
- Product/Company/OSS direct mutation of ProjectState;
- provider direct mutation of professional state;
- project technical outcome calculated outside Project Engine;
- grade/evidence calculation outside Progression Core;
- release record mutation after commit;
- raw SQL outside Rust persistence/migrations;
- SQL execute capability in production renderer;
- executable content/mod scripts;
- system time/random/locale-order in core;
- float authoritative fields;
- circular/deep imports;
- formulas in React/application orchestration;
- test-only desktop plugins in release build.
