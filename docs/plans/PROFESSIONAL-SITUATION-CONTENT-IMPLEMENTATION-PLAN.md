---
title: "Professional Situation Content Composition — Implementation Plan"
type: plan
status: draft
canon: true
depends_on: [ADR-016, ADR-020]
updated: 2026-07-18
---

# Professional Situation Content Composition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Реализовать минимальный deterministic content compiler, который представляет January professional situation через authored components, выпускает один immutable compiled variant и создаёт extension seam для first-year bounded composition без runtime generation.

**Architecture:** Schemas and compiler live in `game-content`; pure lookup/contracts live in `game-core`; authoring definitions are JSONC data; Event/Director/Challenge consume only compiled immutable definitions. MVP does not add a generic rule DSL, coverage dashboard, runtime LLM or broad generated corpus.

**Tech Stack:** TypeScript 7, TypeBox/schema package, pure deterministic core, JSONC content, Storybook 10, Vitest/property tests, existing Manifest/fingerprint/persistence contracts.

## Global constraints

- Active implementation profile: **MVP Casual**.
- Existing January `diagnose` situation remains the only mandatory materialized variant.
- Runtime never creates a new component combination.
- No arbitrary JS, dynamic web access, runtime LLM generation/judging or hidden correct-answer table.
- Ordinary situation exposes 2–4 approaches and at most two visible causes.
- Provider owns domain application; Challenge owns outcome; Progression owns capability/evidence/grade; Event/Director own chain/pacing.
- Generated IDs depend only on stable IDs/versions and compiler rules version.
- Active visible decision must resume without reroll.
- Presentation-only changes never count as semantic variety.
- No speculative top-level save state or Extended schemas.

---

## Planned file map

```text
packages/shared-kernel/src/ids/professional-situation-content.ts
packages/game-schema/src/content/professional-situation-content.schema.ts
packages/game-content/src/professional-situation/contracts.ts
packages/game-content/src/professional-situation/compile-professional-situations.ts
packages/game-content/src/professional-situation/validate-composition.ts
packages/game-content/src/professional-situation/validate-provider-bridge.ts
packages/game-content/src/professional-situation/validate-semantic-variety.ts
packages/game-content/src/professional-situation/analyze-coverage.ts
packages/game-content/src/professional-situation/create-semantic-signature.ts
packages/game-content/src/professional-situation/create-materialized-id.ts
packages/game-content/src/professional-situation/index.ts
packages/game-core/src/professional-situation/compiled-situation-registry.ts
packages/game-core/src/professional-situation/lookup-professional-situations.ts
packages/game-core/src/professional-situation/materialize-technical-situation.ts
packages/game-core/src/professional-situation/index.ts
packages/game-ui/src/features/content-studio/professional-situations/*
packages/game-ui-fixtures/src/professional-situations/*
content/core/professional-situations/**
```

Test locations mirror packages under `src/**/__tests__` and content fixtures under `content/test-fixtures/professional-situations`.

---

## Task 1 — Stable IDs and public contracts

**Files**

- Create `packages/shared-kernel/src/ids/professional-situation-content.ts`
- Create `packages/game-schema/src/content/professional-situation-content.schema.ts`
- Create `packages/game-content/src/professional-situation/contracts.ts`
- Modify package barrel exports.

**Produces**

- branded IDs for kernel/context/pressure/outcome-pattern/bridge/presentation/composition-set/coverage-target/compiled-variant;
- authoring definition DTOs from ADR-020;
- `ProfessionalSituationSemanticSignature`;
- `ProfessionalSituationRepetitionProfile`;
- `CompiledProfessionalSituationDefinition`;
- compiler diagnostic DTOs.

- [ ] Write schema round-trip tests for one valid minimal component set.
- [ ] Add invalid fixtures for missing stable ID, invalid version and >4 approach intents.
- [ ] Run focused tests and confirm they fail before implementation.
- [ ] Implement only fields needed by the January fixture plus declared extension contracts.
- [ ] Verify no float authoritative field and no React/Tauri/platform import.
- [ ] Run `pnpm check:fast` after scaffold; expected PASS.
- [ ] Commit:

```text
domain: add professional situation content contracts
```

## Task 2 — Semantic signature and materialized ID

**Files**

- Create `packages/game-content/src/professional-situation/create-semantic-signature.ts`
- Create `packages/game-content/src/professional-situation/create-materialized-id.ts`
- Test both modules.

**Consumes**

- stable component IDs/versions;
- compiler rules version;
- semantic fields only.

**Produces**

```ts
createProfessionalSituationSemanticSignature(input): ProfessionalSituationSemanticSignature
createCompiledSituationVariantId(input): CompiledSituationVariantId
```

- [ ] Test identical semantics with different presentation text produce identical semantic signature.
- [ ] Test presentation versions produce distinct materialized variant IDs but same presentation-only group.
- [ ] Test input array/file order cannot alter ID/fingerprint.
- [ ] Test changed dilemma/approach intent changes semantic signature.
- [ ] Implement canonical ordering and serialization using shared primitives.
- [ ] Run tests twice with shuffled fixture input; expected identical snapshots.
- [ ] Commit:

```text
content: add stable professional situation signatures
```

## Task 3 — Composition compiler

**Files**

- Create `packages/game-content/src/professional-situation/compile-professional-situations.ts`
- Create `packages/game-content/src/professional-situation/validate-composition.ts`
- Create compiler tests and fixtures.

**Input**

```ts
type CompileProfessionalSituationContentInput = Readonly<{
  kernels: readonly SituationKernelDefinition[];
  contextFrames: readonly SituationContextFrameDefinition[];
  pressurePackages: readonly SituationPressurePackageDefinition[];
  outcomePatterns: readonly SituationOutcomePatternDefinition[];
  consequenceBridges: readonly SituationConsequenceBridgeDefinition[];
  presentationPacks: readonly SituationPresentationPackDefinition[];
  compositionSets: readonly SituationCompositionSetDefinition[];
  compilerRulesVersion: RulesVersion;
}>;
```

**Output**

```ts
type CompileProfessionalSituationContentResult = Readonly<{
  registry: CompiledProfessionalSituationRegistry;
  diagnostics: readonly ProfessionalSituationContentDiagnostic[];
  report: ProfessionalSituationMaterializationReport;
}>;
```

- [ ] Write failing golden test for one January composition → one compiled variant.
- [ ] Write failing test for stable candidate enumeration after shuffled input.
- [ ] Write failing test that budget overflow is blocking error, not truncation.
- [ ] Write failing test for explicit exclusion and prohibited context.
- [ ] Implement stable tuple enumeration and constraint filtering.
- [ ] Bind semantic snapshot and presentation only after semantic validation.
- [ ] Reject duplicate materialized IDs.
- [ ] Commit:

```text
content: compile bounded professional situation variants
```

## Task 4 — Provider, chronology and professional validators

**Files**

- Create `validate-provider-bridge.ts`
- Extend `validate-composition.ts`
- Add focused validation fixtures.

**Validation gates**

- one concrete dilemma;
- 2–4 distinct approaches;
- pressure changes availability/forecast/compromise/recovery;
- context satisfies provider/stage/era/technology requirements;
- consequence bridge targets only provider allowlist;
- no production evidence from hiring work sample;
- assisted/takeover cannot map to independent autonomy;
- failure/partial has recovery when required;
- presentation does not alter semantic fields;
- no runtime generator/network/LLM requirement.

- [ ] Add one failing fixture per gate.
- [ ] Implement stable diagnostic codes with IDs and remediation hints.
- [ ] Ensure invalid tuples never enter registry.
- [ ] Verify historical/technology validation reuses existing catalog contracts rather than duplicating dates.
- [ ] Commit:

```text
content: validate professional situation ownership and chronology
```

## Task 5 — Semantic duplicate and coverage analysis

**Files**

- Create `validate-semantic-variety.ts`
- Create `analyze-coverage.ts`
- Create deterministic report snapshot tests.

**Produces**

- exact semantic duplicate report;
- presentation-only group report;
- near-duplicate exact-dimension clusters;
- overrepresented dilemma/cause/approach shape report;
- mandatory tuple coverage;
- pairwise coverage for declared dimensions;
- unreachable/never-eligible placeholder analysis input.

- [ ] Test text/name-only reskins are rejected or grouped as presentation variants.
- [ ] Test meaningful pressure/consequence change creates distinct signature.
- [ ] Test pairwise calculation does not demand invalid/deferred tuples.
- [ ] Test coverage cannot be satisfied by presentation-only duplicates.
- [ ] Test report order independent of input order.
- [ ] Implement deterministic exact-field analysis; no embedding/model dependency.
- [ ] Commit:

```text
content: analyze professional situation coverage and duplicates
```

## Task 6 — Runtime immutable registry and lookup

**Files**

- Create `packages/game-core/src/professional-situation/compiled-situation-registry.ts`
- Create `lookup-professional-situations.ts`
- Create `materialize-technical-situation.ts`
- Test lookup/materialization.

**Public API**

```ts
lookupProfessionalSituations(
  registry: CompiledProfessionalSituationRegistry,
  request: ProfessionalSituationLookupRequest
): readonly EligibleProfessionalSituationCandidate[];

materializeTechnicalSituation(
  definition: CompiledProfessionalSituationDefinition,
  providerContext: ProviderSituationMaterializationContext
): Result<TechnicalSituation, ProfessionalSituationMaterializationError>;
```

- [ ] Test lookup returns stable order and reason codes.
- [ ] Test it filters provider/stage/access/technology incompatibility.
- [ ] Test it does not apply Narrative Director weight/pacing.
- [ ] Test materialization preserves existing ADR-016 `TechnicalSituation` contract.
- [ ] Test same request/registry returns identical output.
- [ ] Test no mutation of provider/professional/project/career state.
- [ ] Commit:

```text
core: expose compiled professional situation registry
```

## Task 7 — January content migration

**Files**

```text
content/core/professional-situations/kernels/diagnose-input-cause.jsonc
content/core/professional-situations/contexts/january-personal-project.jsonc
content/core/professional-situations/pressures/limited-observability-input.jsonc
content/core/professional-situations/outcomes/beginner-diagnose.jsonc
content/core/professional-situations/bridges/january-project-input-error.jsonc
content/core/professional-situations/presentation/january-input-error-ru.jsonc
content/core/professional-situations/sets/january-diagnose.jsonc
content/core/professional-situations/coverage/mvp-january.jsonc
```

- [ ] Preserve current title/goal/approaches/outcome semantics.
- [ ] Compile exactly one semantic variant.
- [ ] Confirm four existing approaches remain available under same context.
- [ ] Confirm low-access school route remains valid via provider/access snapshot, not copied into kernel.
- [ ] Confirm one complication and no-reroll fingerprints match expected golden fixture.
- [ ] Confirm result still maps to `input-errors` Work Package and one aggregated episode.
- [ ] Commit:

```text
content: represent January challenge with situation components
```

## Task 8 — Event Engine and Narrative Director integration

**Files**

- Modify Event content schema to reference compiled variant/family selector.
- Modify Director candidate metadata/read model.
- Add integration tests.

**Rules**

- Event Engine owns event requirements, participants, chain/effects wrapper.
- Director owns pacing/selection.
- Neither composes components.
- Director receives semantic repetition profile.
- Required follow-up/arc can override novelty penalties under existing rules.

- [ ] Test Event candidate becomes ineligible if provider context cannot materialize situation.
- [ ] Test selected variant persists before player choice.
- [ ] Test presentation-only variants share semantic cooldown.
- [ ] Test anti-repeat does not starve a mandatory follow-up.
- [ ] Test reload does not re-run candidate selection.
- [ ] Commit:

```text
narrative: integrate compiled professional situation metadata
```

## Task 9 — Persistence and compatibility

**Files**

- Extend MonthRun draft schemas only where current January challenge requires.
- Add migration/recovery tests.

**Persist**

- compiled variant/component IDs/versions;
- semantic/presentation/provider snapshots;
- approach snapshots;
- realized complication;
- fingerprints/provider revision;
- provisional outcome/effects/episode/follow-up.

- [ ] Test presentation update after decision visible resumes old copy.
- [ ] Test removed compiled variant resumes embedded snapshot.
- [ ] Test incompatible provider bridge abandons uncommitted draft safely.
- [ ] Test duplicate answer/commit returns existing result.
- [ ] Test committed history reads without original authoring components.
- [ ] Test no speculative corpus/coverage registry enters save.
- [ ] Commit:

```text
persistence: preserve professional situation snapshots
```

## Task 10 — Content Studio MVP

**Files**

```text
packages/game-ui/src/features/content-studio/professional-situations/ProfessionalSituationOverview.tsx
.../KernelCard.tsx
.../CompositionMatrix.tsx
.../VariantPreview.tsx
.../SituationDiagnostics.tsx
packages/game-ui-fixtures/src/professional-situations/*
```

MVP UI includes:

- focused set overview;
- kernel summary;
- composition validity matrix/list;
- one variant player preview;
- diagnostic list;
- semantic signature;
- long-RU/accessibility fixture.

- [ ] Write Storybook stories before production component wiring.
- [ ] Reuse Challenge UI read model/component for Normal preview.
- [ ] Provide table/list equivalent for matrix.
- [ ] Ensure color is not sole status signal.
- [ ] Ensure Studio uses no production Tauri/SQLite/network permissions.
- [ ] Add component/a11y tests.
- [ ] Commit:

```text
ui: preview professional situation compositions
```

## Task 11 — Balance corpus and release verification

**Files**

- Add deterministic corpus simulator/report command.
- Add golden snapshots for 15 declared fixtures.
- Update verification docs/commands.

- [ ] Measure authored components, candidate tuples, semantic compositions and presentation variants separately.
- [ ] Measure exact/kernel/dilemma/approach-shape repetition.
- [ ] Add dominant-approach fixture and multi-objective assertion.
- [ ] Add never-eligible/never-selected report.
- [ ] Add required tuple/pairwise coverage report.
- [ ] Run `pnpm check:fast`.
- [ ] Run focused content compiler tests.
- [ ] Run `pnpm verify` when scaffold command exists.
- [ ] Record actual outputs in implementation PR.
- [ ] Commit:

```text
test: verify professional situation content corpus
```

## Final review gates

Before merge verify:

- January gameplay meaning unchanged;
- one compiled variant only for MVP;
- runtime has no composition/generation code;
- no duplicate Event/Director/Challenge logic;
- provider effects remain typed/owned;
- stable IDs independent of input/display order;
- active decision resumes exactly;
- presentation variants do not evade anti-repeat;
- no one universal content quality score;
- no generic DSL/graph editor/LLM authority;
- docs, schemas, fixtures and plan match ADR-020.

## Deferred

- 6–10 first-year kernels and 12–24 variants;
- full coverage heatmaps;
- multi-month professional arc authoring;
- Open Source/Company contexts;
- leadership/systemic kernels;
- embeddings/LLM offline suggestions;
- visual graph authoring;
- live author analytics;
- runtime generation of any kind.
