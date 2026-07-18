---
title: "MODULE-BOUNDARIES"
type: architecture
status: draft
canon: true
updated: 2026-07-18
---

# Границы модулей

Нормативные решения:

- [ADR-004 — Persistence Boundary](../adr/ADR-004-persistence-execution-boundary.md);
- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-018 — Programmer Career, Hiring & Employment](../adr/ADR-018-authoritative-programmer-career-employment-model.md).

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
- Career opportunity/search/hiring/offer/position/trust DTO;
- project/career content definitions;
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
- Programmer Career Engine;
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

Does not re-evaluate project, learning, interview or workplace domain truth.

## Experience Providers

- Education/Learning;
- Project Engine;
- Career/Employment;
- Open Source;
- Company/Leadership;
- Event Engine where a real domain outcome exists.

Every provider:

- owns its task/activity/outcome lifecycle;
- checks eligibility/invariants;
- separates player contribution from team/external result;
- creates stable episode where policy allows;
- never mutates skills/grade directly.

Interview and routine employment do not automatically create production evidence. Career-specific episode exists only for eligible real organizational/leadership outcome.

## Programmer Career Engine

Owns:

- `CareerOpportunity` generation/lifecycle;
- `CareerIntent` and search campaign;
- candidate market-visible signal projection;
- hiring process/stage/outcome;
- `EmploymentOffer`;
- `EmploymentPosition`;
- employer role expectations;
- workplace trust/allowed scope;
- promotion/lateral move/exit/firing/layoff/re-entry;
- career history;
- compact labor-market opportunity projection.

Does not own:

- mastery/evidence/Professional Grade;
- technical challenge resolution;
- ProjectState/WorkPackage/quality/debt/defect/release;
- learning outcome;
- Company teams/payroll/budget/portfolio;
- NPC relationship truth;
- health/life capacity;
- actual economy ledger;
- persistence transaction;
- UI formatting.

Public inputs:

- immutable professional snapshot and eligible portfolio stories;
- access/life/economy/current-employment snapshots;
- market and fictional employer definitions;
- typed Company demand/budget/position signals when Company exists;
- shared Challenge/Learning/Project outcomes;
- deterministic context/decision log.

Public outputs:

- opportunity/search state delta;
- pending hiring/offer/workplace decision;
- employer signal/role-fit explanations;
- hiring outcome/offer proposal;
- employment/compensation/schedule commitment proposals;
- workplace trust delta;
- career transition proposal/history;
- Career-specific `ExperienceEpisode` candidate only when eligible;
- career trace/explanations.

Boundary rules:

- Grade, readiness, market competitiveness, role fit, title/position and trust remain distinct;
- Career never reads hidden mastery as employer-visible signal without projection;
- referral/credential/title/salary/tenure do not become technical evidence;
- Career delegates technical situations to Professional Challenge Engine;
- Career delegates preparation/onboarding/reacquisition to Learning Engine;
- Career submits typed work requests to Project Engine;
- Career proposes compensation/schedule commitments to Economy/Life owners;
- Career does not duplicate CompanyState.

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

Uses public Project contracts for technical state/releases. May provide Career opportunity/reputation signals through typed contracts; does not hire/promote directly.

## Company/Leadership

Owns:

- employees/teams and organizational structure;
- headcount demand and available positions;
- payroll budget and compensation constraints;
- portfolio priorities;
- budgets/tooling/process;
- organizational debt;
- manager assignments/sponsorship signals;
- restructuring/closure;
- organization-level delegation policies.

Provides Career Engine position/demand/budget/policy signals and Project Engine capacity/ownership/constraints.

Company does not:

- duplicate ProjectState;
- execute candidate Career search/interview/offer lifecycle;
- calculate Professional Grade/evidence;
- replace Workplace Trust with one company performance score.

In Company-player gameplay, hiring other employees belongs to Company/Leadership while the player character's own employment lifecycle remains Career.

## `game-application`

Orchestrates:

- save lifecycle;
- begin/resume/recover/abandon MonthRun;
- commands/revisions/idempotency;
- persistence ports;
- import/export/backup;
- cross-owner atomic commit;
- read-model composition.

No balance/project/progression/career formulas, raw SQL or Tauri calls.

## `game-content`

Loads/validates/compiles immutable definitions:

- skills/technologies/transfer/grade;
- project archetypes/kinds;
- scope/work-package templates;
- quality profiles;
- debt/defect/release/maintenance policies;
- era project capabilities;
- fictional employer archetypes;
- career role/opportunity/hiring/offer/context profiles;
- labor-market profiles and historical source refs;
- events/NPC/world/content.

No executable content, runtime project/career simulation or progression calculation.

## Persistence contracts

Typed services for:

- normalized save/project/professional/career snapshots;
- append-only evidence/releases/incidents/career transitions/history/ledger;
- MonthRun draft/checkpoint/commit;
- transaction/revision/idempotency;
- migrations/compatibility;
- backup/restore/import/export/recovery.

No raw SQL/concrete SQLite types in public TS API.

Active Career MonthRun persists opportunity/process/offer/workplace snapshots required for no-reroll and resume, but no speculative Extended fields.

## Rust adapter

Rust:

- validates DTO/ranges/revisions;
- executes transactions;
- stores project/professional/career/history deltas atomically;
- handles migration/backup/recovery.

Rust does not:

- advance Work Packages;
- choose project outcomes;
- calculate quality/debt/defects;
- calculate progression/evidence;
- generate opportunities;
- score candidates/interviews;
- calculate workplace trust/promotion;
- interpret content rules.

## `game-ui`

Contains components/routes/view adapters/accessibility/stories.

Consumes application read models; never imports mutable ProjectState/progression/career internals or persistence implementation.

UI does not:

- calculate hidden latent work;
- reroll forecast/defects/opportunities/interviews;
- decide release gate;
- calculate mastery/evidence;
- calculate role fit/hire probability/trust/promotion;
- issue raw SQL/platform commands.

## `game-ui-fixtures`

Deterministic serializable fixtures for Storybook/tests/bug reproduction:

- project/package/forecast/quality/debt/defect/release states;
- professional/evidence states;
- career opportunity/hiring/offer/employment/trust/transition states;
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
- Project Engine importing Product/Company/OSS/Career internal state instead of contracts;
- Product/Company/OSS/Career direct mutation of ProjectState;
- Career direct mutation of professional state;
- Career reading hidden mastery as employer-visible signal without projection contract;
- Career duplicating Company team/payroll/budget/portfolio truth;
- Company executing player-character opportunity/hiring/offer lifecycle;
- provider direct mutation of professional state;
- project technical outcome calculated outside Project Engine;
- grade/evidence calculation outside Progression Core;
- hire/trust/promotion calculation in React/application/content/Rust;
- release record mutation after commit;
- raw SQL outside Rust persistence/migrations;
- SQL execute capability in production renderer;
- executable content/mod scripts;
- system time/random/locale-order in core;
- float authoritative fields;
- circular/deep imports;
- formulas in React/application orchestration;
- test-only desktop plugins in release build.
