# Professional Situation Content — Module Boundary

## Статус

Нормативная архитектурная спецификация.

Связанные документы:

- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md);
- [Module Boundaries](MODULE-BOUNDARIES.md);
- [Content Architecture](../content/CONTENT-ARCHITECTURE.md);
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md);
- [Event Engine](../events/EVENT-ENGINE.md);
- [Pacing Integration](../events/PROFESSIONAL-SITUATION-PACING-INTEGRATION.md).

## 1. Цель

Зафиксировать границу между authoring/compiler, pure runtime lookup, provider systems, Event/Narrative, Professional Challenge и persistence.

## 2. Package placement

```text
packages/shared-kernel
  stable IDs, versions, fingerprints

packages/game-schema
  authoring/compiled/save/IPC schemas

packages/game-content
  component loading
  composition compiler
  semantic/provider/chronology validation
  coverage/duplicate analysis
  immutable compiled registry artifact

packages/game-core
  registry lookup/filter
  TechnicalSituation materialization
  provider/Challenge/Event/Director contracts
  no authoring materialization

packages/game-application
  content package loading
  MonthRun orchestration
  cross-owner commit/recovery

packages/game-ui
  production Challenge UI
  development Content Studio adapters/components

packages/game-ui-fixtures
  static compiled/diagnostic/recovery fixtures
```

## 3. `game-content` ownership

Owns:

- authoring definition schemas/normalization;
- stable reference resolution;
- explicit compatibility constraints;
- bounded candidate enumeration;
- semantic signature/materialized ID creation;
- provider-contract validation;
- chronology/technology/access-definition validation;
- duplicate/coverage/materialization reports;
- immutable compiled registry serialization;
- development diagnostics.

Does not own:

- save/runtime provider state;
- month/event pacing;
- Challenge resolution;
- progression;
- actual participant selection;
- actual practical access projection;
- persistence transaction;
- network/LLM runtime generation.

## 4. `game-core` ownership

Owns pure runtime contracts/functions:

- `CompiledProfessionalSituationRegistry`;
- `ProfessionalSituationLookupRequest`;
- eligibility filtering over immutable public snapshots;
- stable candidate ordering/reason codes;
- `materializeTechnicalSituation` using compiled definition;
- semantic repetition metadata passed to Director;
- no mutation outputs except typed proposals through existing systems.

Core does not:

- load JSONC/filesystem;
- expand component tuples;
- run coverage analysis;
- select by pacing;
- decide provider effects;
- call React/Tauri/SQLite/network/system clock.

## 5. Provider boundary

Provider supplies:

- provider kind/source;
- professional stage/context;
- current technology/access/capacity snapshots;
- participant/source facts;
- provider revision;
- desired archetype/goal constraints;
- excluded/used variants where applicable.

Provider receives:

- eligible compiled candidates/reasons;
- selected compiled definition;
- Challenge outcome;
- provider effect/episode/follow-up proposals.

Provider validates/applies only its own domain changes.

## 6. Event and Narrative boundary

Event Engine may reference compiled variant or bounded selector and owns requirements, participants, chain/effects wrapper.

Narrative Director consumes candidate metadata and owns pacing/selection.

Forbidden dependencies:

- Event/Director import authoring component internals;
- compiler imports Director scoring;
- Director mutates semantic signature/approaches;
- Event calculates Challenge outcome;
- compiler creates persistent NPC/arc state.

## 7. Professional Challenge boundary

Challenge Engine receives existing `TechnicalSituation` snapshot materialized from compiled content.

It owns:

- approach availability validation;
- realized complication use;
- deterministic outcome/reasons;
- typed provider proposals/episode facts.

It does not need authoring kernel/context/pressure definitions at runtime after materialization.

## 8. Progression boundary

Progression sees only eligible `ExperienceEpisode` and provider/challenge facts. It does not know whether situation was monolithic or composed.

Composition count, kernel reuse, coverage and presentation variants never increase mastery/evidence by themselves.

## 9. Persistence boundary

Persistence stores only active/committed snapshots needed by ADR-005/007/010/016/020:

- selected compiled variant/component IDs/versions;
- semantic/presentation/provider snapshot;
- approaches/complication;
- fingerprints/revisions;
- provisional result/proposals;
- committed semantic history/repetition keys.

It does not store complete authoring registries or coverage reports.

## 10. Content Studio boundary

Development UI consumes compiler outputs/diagnostics through typed read models.

It cannot:

- edit production save;
- execute raw effects;
- call production privileged adapters;
- generate production content via runtime LLM;
- implement separate compiler/Director logic in React.

All authoring changes still write ordinary data files through development tooling outside gameplay runtime.

## 11. Dependency rules

Allowed:

```text
game-content → game-schema/shared-kernel
compiled content artifact → game-core
provider → game-core professional-situation lookup contract
game-core → shared-kernel/schema DTO types
application → game-core/content ports
UI → application read models / fixture DTOs
```

Forbidden:

```text
game-core → game-content implementation/filesystem
game-content → React/Tauri/SQLite
game-content → provider mutable state
game-content → Narrative Director internals
Event/Director → authoring components
UI → compiler internals for production outcome
Rust adapter → situation composition/outcome rules
```

## 12. Architecture checks

CI/lint should block:

- composition/materialization function under `game-core`, Event, UI or Rust;
- React/Tauri/network/filesystem import in compiler-neutral contracts;
- runtime content fetching/generation;
- authoring component import in production Event/Director selection;
- provider raw state mutation from compiled definition;
- progression delta fields in content schemas;
- unstable ID creation from display/file/object order;
- coverage/scoring formula in React;
- duplicate Director/Challenge resolution;
- privileged Storybook/Content Studio plugin in release build.

## 13. Active profile

MVP implementation adds the package seam and one January compiled variant only.

It does not require:

- generic plugin framework;
- dynamic rule DSL;
- worker service before profiling;
- database tables for full corpus;
- runtime authoring registry;
- coverage dashboard;
- LLM/embedding dependency;
- Open Source/Company situation contexts.
