# Technology & Ecosystem Engine — Implementation Plan

Нормативные источники:

- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Technology Ecosystem UI](../ui/TECHNOLOGY-ECOSYSTEM-UI.md)
- [Technology Ecosystem Balance](../simulation/TECHNOLOGY-ECOSYSTEM-BALANCE.md)
- [Technology Ecosystem Content](../content/TECHNOLOGY-ECOSYSTEM-CONTENT.md)
- [Historical Technology Catalog](../content/HISTORICAL-TECHNOLOGY-CATALOG.md)

## Цель

Реализовать минимальный исторический technology context для первого playable без tech tree, exact-version/package simulation и преждевременного полного каталога.

Active implementation profile: **MVP Casual**.

## Scope

### In

- stable IDs/contracts;
- one BASIC-like technology family/identity;
- one aggregate version band;
- one PC/DOS-like platform profile;
- one aggregate toolchain;
- one ecosystem profile;
- global chronology and fictional local availability;
- home and school/shared access fixtures;
- one technology-informed Learning/Project choice;
- immutable context snapshot/fingerprint;
- UI card and choice stories;
- balance, chronology, restart and compatibility tests.

### Out

- complete historical catalog;
- every version/library/tool;
- runtime dependency solver;
- dynamic web metrics;
- full career demand model;
- open-source ecosystem health;
- company tool procurement;
- detailed hardware simulation;
- AI-era implementation;
- graph editor/tech tree.

## Task 1 — Core IDs and contracts

Future paths:

```text
packages/shared-kernel/src/ids/technology-context.ts
packages/game-schema/src/technology/technology-context.schema.ts
packages/game-core/src/technology/contracts.ts
packages/game-core/src/technology/index.ts
```

Add:

- `TechnologyId`;
- `TechnologyFamilyId`;
- `TechnologyVersionBandId`;
- `PlatformProfileId`;
- `ToolchainProfileId`;
- `EcosystemProfileId`;
- `CompatibilityProfileId`;
- `TechnologyContextSnapshotId`;
- lifecycle/access/context bands;
- source/local adaptation snapshots;
- immutable `TechnologyContextSnapshot`.

Tests:

- branded ID serialization;
- schema round-trip;
- enum exhaustiveness;
- integer/band validation;
- no float authoritative field;
- no platform/React/Tauri imports in core/schema.

Commit boundary:

```text
domain: add technology context contracts
```

## Task 2 — Content schemas and compiler

Future paths:

```text
packages/game-schema/src/content/technology-content.schema.ts
packages/game-content/src/technology/compile-technology-content.ts
packages/game-content/src/technology/validate-chronology.ts
packages/game-content/src/technology/validate-compatibility.ts
packages/game-content/src/technology/validate-source-scope.ts
packages/game-content/src/technology/technology-content.fixture.ts
```

Implement only schemas used by MVP:

- family;
- technology;
- version band;
- platform;
- toolchain;
- ecosystem profile;
- local availability;
- context template;
- source refs.

Validation:

- release before local availability;
- prerequisite ordering;
- valid family/band/profile refs;
- one band has meaningful justification;
- local basis declared;
- ecosystem dimensions sourced/inferred;
- low-access fallback present;
- no direct state/evidence effects;
- no more than five Normal traits;
- stable fingerprint independent of source file order.

Tests first:

1. invalid local-before-global fixture fails;
2. missing source ref fails;
3. Tier C with proficiency configuration fails;
4. exact patch-version spam warns/fails;
5. missing fallback fails;
6. canonical order produces same fingerprint.

Commit:

```text
content: compile minimal technology ecosystem definitions
```

## Task 3 — Technology Context resolver

Future paths:

```text
packages/game-core/src/technology/build-technology-context.ts
packages/game-core/src/technology/project-ecosystem-affordances.ts
packages/game-core/src/technology/select-context-traits.ts
packages/game-core/src/technology/technology-context-reasons.ts
packages/game-core/src/technology/__tests__/build-technology-context.test.ts
```

Inputs:

- game date/era;
- compiled global record;
- fictional local availability;
- equipment/institution/economy/people access snapshots;
- optional provider/project context;
- rules version.

Outputs:

- practical access;
- lifecycle axes;
- ecosystem affordances;
- relevant provider constraints;
- 3–5 trait salience selection;
- fallback routes;
- deterministic trace/fingerprint.

Rules:

- pure function;
- no RNG unless an explicitly versioned local-content selection needs it;
- UI inspection never changes snapshot;
- no mutation of equipment/professional/project/career state;
- no universal score.

TDD fixtures:

- global/local/practical access separation;
- school fallback;
- stable familiar context;
- legacy/support mixed state;
- emerging sparse ecosystem;
- deterministic trait ordering;
- duplicate call identical output.

Commit:

```text
core: resolve deterministic technology context
```

## Task 4 — 1990 seed content

Future paths:

```text
content/core/technology/families/basic-like.jsonc
content/core/technology/technologies/basic-early-pc.jsonc
content/core/technology/bands/basic-early-pc.jsonc
content/core/technology/platforms/pc-dos-like-1990.jsonc
content/core/technology/toolchains/basic-interpreter-editor-1990.jsonc
content/core/technology/ecosystems/basic-local-1990.jsonc
content/core/technology/local/home-city-1990-basic.jsonc
content/core/technology/contexts/january-1990-basic.jsonc
content/sources/technology-sources.jsonc
```

Content budget:

- one family;
- one Tier A identity;
- one band;
- one platform;
- one toolchain;
- one ecosystem;
- two access routes;
- one compatibility limitation;
- one source pack.

Authoring tests:

- source chronology valid;
- fictional local basis explicit;
- no real employer/city claim;
- no post-1990 technology leaks;
- content compiles reproducibly;
- Normal traits fit long-RU budget.

Commit:

```text
content: add January 1990 technology context
```

## Task 5 — Learning integration

Future paths:

```text
packages/game-core/src/learning/technology-learning-context.ts
packages/game-core/src/learning/__tests__/technology-learning-context.test.ts
```

Learning consumes:

- access;
- examples/docs/feedback/tooling affordances;
- family/band novelty;
- support/recency warnings.

Learning remains owner of attempt/outcome. Progression remains owner of familiarity.

Required tests:

- unavailable technology cannot start direct practice;
- shared route can start with capacity constraint;
- context alone creates no familiarity;
- target practice plus outcome creates episode facts;
- assisted use does not become independent capability;
- transfer requires target exposure.

Commit:

```text
learning: consume technology context without ownership drift
```

## Task 6 — Project integration

Future paths:

```text
packages/game-core/src/project/project-technology-context.ts
packages/game-core/src/project/__tests__/project-technology-context.test.ts
```

Project consumes:

- compatible project kinds;
- implementation/testing/delivery affordances;
- platform/compatibility constraints;
- maintenance/support burden.

For Vertical Slice:

- current BASIC-like context supports small text project;
- school-machine compatibility is a constraint;
- weak debugging/testing affordance contributes to input-error challenge;
- player may keep familiar context or improve verification/tooling.

Tests:

- Technology Engine never changes Work Package directly;
- Project outcome retains owner semantics;
- context reason codes appear in trace;
- context snapshot preserved in release/episode;
- no duplicate project/progression commit;
- restart restores same options.

Commit:

```text
project: apply technology context to first work package
```

## Task 7 — Persistence and compatibility

Future paths:

```text
packages/game-schema/src/save/technology-context-save.schema.ts
packages/game-application/src/month-run/technology-context-phase.ts
src-tauri/src/persistence/migrations/...technology_context...
packages/game-core/src/technology/__tests__/technology-context-resume.test.ts
```

Store only:

- active context snapshot/reference/fingerprint;
- required owner refs/revisions;
- committed semantic snapshots;
- stable IDs and trace.

Do not create:

- full technology database in save;
- package graph;
- empty future ecosystem tables;
- dynamic metrics cache as authority.

Tests:

- close before choice;
- close after context materialization;
- duplicate answer/resume;
- changed semantic fingerprint;
- localization-only update;
- removed historical-only content/tombstone;
- removed active band/recovery;
- committed history unchanged after catalog update.

Commit:

```text
persistence: preserve technology context across resume and updates
```

## Task 8 — UI and Storybook

Future paths:

```text
packages/game-ui/src/features/technology/TechnologyContextCard.tsx
packages/game-ui/src/features/technology/TechnologyChoice.tsx
packages/game-ui/src/features/technology/TechnologyDetails.tsx
packages/game-ui/src/features/technology/TechnologyContextCard.stories.tsx
packages/game-ui-fixtures/src/technology-context.fixtures.ts
```

Normal UI:

- identity/context;
- 3–5 traits;
- one warning;
- project/learning relevance;
- next step.

Stories:

- 1990 home;
- 1990 school/shared;
- unavailable/fallback;
- emerging;
- mainstream/complex;
- legacy unsupported;
- migration;
- long RU;
- 200% scale;
- keyboard/focus;
- recovery.

Tests:

- no exact probability/score;
- option count 2–4;
- trait count ≤5;
- disabled reason present;
- focus restored after decision;
- screen-reader status semantics;
- Details optional.

Commit:

```text
ui: add casual technology context card and choice
```

## Task 9 — Balance and playtest harness

Future paths:

```text
packages/game-core/src/technology/__tests__/technology-dominance.test.ts
packages/game-core/src/technology/__tests__/technology-access-equity.test.ts
packages/game-content/src/technology/__tests__/technology-source-policy.test.ts
packages/game-ui-fixtures/src/playtest/technology-context-playtest.ts
```

Automated gates:

- newest/mainstream dominance;
- legacy value/recovery;
- wealth/access soft lock;
- migration/transfer farming;
- ecosystem score absence;
- source triangulation;
- deterministic snapshot;
- committed-history compatibility.

Playtest questions:

- identify advantage/constraint;
- explain access route;
- distinguish technology from skill;
- explain why newer is not automatically better;
- explain result causality;
- choose without Details.

Commit:

```text
test: enforce technology ecosystem balance and comprehension
```

## Task 10 — Career integration later

Blocked until Phase 3 implementation.

Career consumes only public projection:

- demand/installed-base tags;
- role/project relevance;
- familiarity gap;
- trainability;
- employer toolchain compatibility.

It does not import historical catalog internals or calculate technology lifecycle.

Tests when enabled:

- old band with legacy opportunity;
- newer band trainable gap;
- market demand differs from support;
- title/grade unchanged by technology popularity;
- rejection does not erase familiarity;
- no universal role-fit score.

## Verification commands after scaffold

```bash
pnpm check:fast
pnpm test --filter technology
pnpm test --filter content
pnpm test --filter project
pnpm test --filter learning
pnpm test --filter save-compatibility
pnpm storybook:test --filter technology
pnpm verify
```

Until scaffold exists, verification is limited to:

- documentation/source hierarchy;
- path/reference review;
- contract consistency;
- chronology/source policy review;
- GitHub diff/branch checks.

## Review checkpoints

### Checkpoint A — contracts

Approve ownership, axes, snapshot and absence of universal score.

### Checkpoint B — seed content

Approve one BASIC-like context, fictional local assumptions and source pack.

### Checkpoint C — provider integration

Approve Learning/Project ownership and January choice.

### Checkpoint D — persistence/UI

Approve no-reroll/history compatibility and Normal UI budget.

### Checkpoint E — playtest

Approve comprehension, diversity, access equity and desire to continue.

## Stop conditions

Do not expand catalog when:

- current first-year content has no need;
- new identity creates no meaningful choice;
- version band mirrors release trivia;
- Normal UI complexity rises;
- source confidence is insufficient;
- low-access path breaks;
- tests/playtest do not show value;
- expansion is justified only by completeness.

## Completion report

Must include:

- changed contracts/definitions;
- active implementation profile;
- source/provenance impact;
- visible complexity impact;
- authoritative/derived state impact;
- stable IDs/migrations/tombstones;
- fixtures and playtest results;
- verification commands/results;
- deferred technologies/eras;
- recovery and compatibility behavior.