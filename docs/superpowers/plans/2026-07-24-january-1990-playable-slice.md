---
title: "January 1990 playable slice implementation plan"
type: plan
status: active
canon: false
depends_on: [ADR-001, ADR-004, ADR-005, ADR-007, ADR-019, ADR-020]
updated: 2026-07-24
---
# January 1990 Playable Slice Implementation Plan

> **For agentic workers:** execute one bounded delivery at a time. Every delivery follows RED → GREEN → REFACTOR and may merge only after all permanent checks pass on one unchanged head.

**Goal:** Deliver the first deterministic, suspendable, resumable and atomically committable January 1990 gameplay month using verified compiled-content v1.

**Architecture:** Build-time JSONC compiles to canonical immutable artifacts. `game-content` validates and publishes a selected runtime registry; `game-application` composes that registry with pure `game-core` January contracts; existing MonthRun and Rust SQLite orchestration remain authoritative.

**Tech Stack:** TypeScript 7.0.2, Node.js 24, pnpm 11.11.0, Vitest 4.1.10, Oxfmt/Oxlint, React 19, Vite 8, Tauri 2, Rust 1.97 and rusqlite/SQLite.

## Global constraints

- Preserve Xoshiro256**, canonical hashing, MonthRun transitions and checkpoint serialization.
- Preserve the existing Rust-owned single-writer SQLite store, revision/hash CAS, durable receipts and atomic commit.
- JSONC, Ajv and `jsonc-parser` remain build-time only.
- Runtime accepts canonical compiled JSON only.
- `game-core` must not import `game-content`.
- `game-content` must not import `game-core`.
- `game-application` is the allowed composition layer for content + core + persistence.
- Content may produce typed inputs/proposals but may not mutate progression, projects, money, equipment or relationships directly.
- No `Math.random()`, wall-clock decisions, locale-dependent sorting or runtime Cartesian expansion.
- No generic mod loader, runtime DSL, city simulation, NPC memory engine, vector memory or runtime LLM.
- Performance issue #24 may add measurement infrastructure but must not delay January or reopen persistence.

## Repository state

| Delivery | State | Evidence |
|---|---|---|
| CONTENT-02A | complete | PR #23 merged at `6b5af703f7ae23cf76ccbafb8b8dada8a4455522` |
| CONTENT-02B | complete | PR #25 merged at `4cacfabd051065cbd3c2b2dd5c90e82f63452714` |
| CONTENT-02C | active | draft PR #26, `agent/compiled-content-runtime-loader` |
| CONTENT-02D1 | planned | PR #27, January projection boundary |
| CONTENT-02D2 | planned | PR #28, deterministic persisted MonthRun |
| CONTENT-02E1 | planned | PR #29, thin playable UI |
| CONTENT-02E2 | planned | PR #30, hardening and issue closure |

January uses GW-BASIC and DOS context. QBasic is excluded because it belongs to the DOS 5.0/1991 timeline.

---

## PR #26 — CONTENT-02C: verified compiled-content runtime loader

### Files

```text
packages/game-content/src/
├── content-errors.ts
├── compiled-content-shape.ts
├── compiled-content-invariants.ts
├── compiled-content-runtime.ts
├── select-required-chunks.ts
├── content-registry.ts
├── content-loader.ts
└── index.ts

tests/compiled-content-runtime-loader.test.ts
docs/EXECUTION-STATUS.jsonc
```

### Public interfaces

```ts
export type CompiledContentRuntimePrimitives = Readonly<{
  canonicalize(value: unknown): string;
  fingerprint(namespace: string, value: unknown): Fingerprint;
}>;

export function createCompiledContentRuntime(
  primitives: CompiledContentRuntimePrimitives,
): CompiledContentRuntime;

export type ContentRegistry = Readonly<{
  contentFingerprint: Fingerprint;
  get(id: string): CompiledContentEntryV1 | undefined;
  require(id: string): CompiledContentEntryV1;
  listByKind(kind: ContentKindV1): readonly CompiledContentEntryV1[];
}>;
```

### Delivered parser behavior

- [x] Parse through native `JSON.parse` only.
- [x] Limit artifact bytes, JSON depth, node count, collection size, object keys and strings.
- [x] Reject unsafe integers, negative zero and lone UTF-16 surrogates.
- [x] Require canonical compiler bytes with an optional single terminal LF.
- [x] Reject duplicate JSON keys through canonical-byte mismatch.
- [x] Enforce closed manifest/chunk/entry/provenance field sets.
- [x] Match build-time identifier, chunk-segment, month and provenance bounds.
- [x] Enforce manifest-wide content-ID uniqueness and entry-point integrity.
- [x] Recompute fingerprints through injected authoritative game-core primitives.
- [x] Reject incompatible schema/compiler versions and corrupt fingerprints.
- [x] Deep-freeze accepted artifacts and payloads.

### Delivered registry behavior

- [x] Select exactly `1990s/ecosystem` and `1990s/programming` for January.
- [x] Load a verified selected subset when later-era descriptors exist.
- [x] Reject missing, unexpected, duplicate or descriptor-mismatched chunks.
- [x] Require all references in the selected closure to resolve.
- [x] Publish only after complete validation.
- [x] Expose immutable `get`, `require` and `listByKind` APIs.
- [x] Retain the whole-manifest content fingerprint.
- [x] Add no package dependency or lockfile churn to `game-content`.
- [x] Keep internal validators out of the package root API.

### Final closure steps

- [ ] Run `pnpm install --frozen-lockfile --reporter=silent` on the final head.
- [ ] Run `pnpm docs:check` and `pnpm fmt:check`.
- [ ] Run `pnpm lint` and `pnpm lint:type-aware`.
- [ ] Run `pnpm typecheck` with TypeScript 7.0.2.
- [ ] Run `pnpm content:check` and `pnpm boundaries:check`.
- [ ] Run focused loader tests and complete `pnpm test`.
- [ ] Run renderer and Storybook production builds.
- [ ] Run Rust format/check/test gates.
- [ ] Confirm Sonar Quality Gate and zero unresolved security hotspots.
- [ ] Confirm zero unresolved review threads.
- [ ] Update PR body with exact final head and evidence.
- [ ] Mark ready only after the same head passes every gate.
- [ ] Squash-merge with `expected_head_sha` equal to that verified head.

---

## PR #27 — CONTENT-02D1: January content projection boundary

### Architecture correction

The previous draft placed content-consuming files directly in `game-core`. That violates the approved dependency graph. The corrected split is:

```text
game-content
  compiled types + verified immutable registry
        ↓
game-application
  closed registry-to-context adapter
        ↓
game-core
  pure January DTOs, reason codes and deterministic rules
```

Only `game-application → game-content` is added. `game-core → game-content` remains forbidden.

### Task 1: approve the composition dependency

**Files:**

- Modify: `packages/game-application/package.json`
- Modify: `packages/game-application/tsconfig.json`
- Modify: `scripts/check-boundaries.mjs`
- Modify: `tests/check-boundaries.test.ts`
- Modify: `pnpm-lock.yaml` importer only

**Produces:**

```text
game-application may depend on game-content
game-core may not depend on game-content
game-ui may not bypass game-application
```

- [ ] Add a failing boundary test where application declares/imports `game-content`.
- [ ] Run `pnpm vitest run tests/check-boundaries.test.ts` and verify the intended failure.
- [ ] Add `game-content` to the approved application dependencies.
- [ ] Add the package dependency, TypeScript project reference and lockfile importer link.
- [ ] Re-run the boundary test and `pnpm boundaries:check`.
- [ ] Commit as `build: allow application content composition`.

### Task 2: define pure January contracts in game-core

**Files:**

```text
packages/game-core/src/january-1990/
├── january-content-ids.ts
├── january-reason-codes.ts
├── january-content-context.ts
└── index.ts

packages/game-core/src/index.ts
tests/january-1990-contracts.test.ts
```

**Produces:**

```ts
export const JANUARY_1990_REQUIRED_CHUNK_IDS: readonly [
  "1990s/ecosystem",
  "1990s/programming",
];

export type January1990ContentContext = Readonly<{
  schemaVersion: "january-1990-content-context-v1";
  month: "1990-01";
  contentFingerprint: Fingerprint;
  technology: JanuaryTechnologyContext;
  accessRoutes: readonly JanuaryAccessRoute[];
  skills: readonly JanuarySkillDefinition[];
  learningActivities: readonly JanuaryLearningActivity[];
  project: JanuaryProjectDefinition;
  situation: JanuarySituationDefinition;
  events: readonly JanuaryEventDefinition[];
}>;
```

- [ ] Write a failing test for the exact 24 stable IDs and two chunk IDs.
- [ ] Define content-package-independent readonly DTOs.
- [ ] Define closed stable reason codes for access, learning, project and defect explanations.
- [ ] Freeze exported constant collections.
- [ ] Export only public January contracts from `game-core`.
- [ ] Run `pnpm vitest run tests/january-1990-contracts.test.ts` and `pnpm typecheck`.
- [ ] Commit as `feat: add January 1990 core contracts`.

### Task 3: add a closed projection error model

**Files:**

```text
packages/game-application/src/january-1990/
├── january-content-projection-error.ts
└── index.ts
```

**Produces:**

```ts
export type JanuaryContentProjectionErrorCode =
  | "MISSING_CONTENT"
  | "WRONG_KIND"
  | "WRONG_CONTENT_TYPE"
  | "INVALID_PAYLOAD"
  | "REFERENCE_MISMATCH";

export class JanuaryContentProjectionError extends Error {
  readonly code: JanuaryContentProjectionErrorCode;
  readonly contentId: string;
}
```

- [ ] Write one failing test per error code using a minimal fake registry.
- [ ] Implement the closed error class without transport/UI concerns.
- [ ] Verify all error objects are deterministic and contain the stable ID.
- [ ] Commit as `feat: add January projection errors`.

### Task 4: project the real registry into a pure context

**Files:**

```text
packages/game-application/src/january-1990/
├── project-january-content.ts
├── january-payload-readers.ts
└── index.ts

packages/game-application/src/index.ts
tests/january-1990-content-projection.test.ts
```

**Consumes:** `ContentRegistry`, January core IDs/contracts.

**Produces:**

```ts
export function projectJanuary1990Content(
  registry: ContentRegistry,
): January1990ContentContext;
```

- [ ] Load the committed manifest and two chunks through `createCompiledContentRuntime` in the test.
- [ ] Write a failing golden assertion for the exact projected context.
- [ ] Require every January stable ID through the registry.
- [ ] Verify expected kind, exact `contentType`, closed payload keys and expected references.
- [ ] Project GW-BASIC/DOS technology context and two access routes.
- [ ] Project five skills and two learning activities without applying progression.
- [ ] Project the personal-utility archetype and two work packages without mutating projects.
- [ ] Project first-bug plus five events without selecting an event.
- [ ] Attach stable reason codes and the registry content fingerprint.
- [ ] Deep-freeze the returned context.
- [ ] Add negative tests for missing ID, wrong kind, wrong content type, malformed payload and wrong references.
- [ ] Run focused tests, typecheck and boundaries.
- [ ] Commit as `feat: project January compiled content`.

### PR #27 closure

- [ ] Full unchanged-head repository verification.
- [ ] Sonar and review-thread closure.
- [ ] No MonthRun steps, UI or persistence changes in the diff.
- [ ] Squash-merge from the verified head.

---

## PR #28 — CONTENT-02D2: deterministic persisted January MonthRun

### Task 1: replace the protocol fixture with production rules

**Files:**

```text
packages/game-core/src/january-1990/
├── january-month-plan.ts
├── january-month-steps.ts
├── january-outcome.ts
└── january-compatibility.ts

packages/game-core/src/index.ts
tests/january-1990-month-run.test.ts
```

**Produces:**

```ts
export function createJanuary1990MonthPlan(
  context: January1990ContentContext,
): MonthPlanV1;

export function createJanuary1990MonthSteps(
  context: January1990ContentContext,
): readonly MonthRunStep[];
```

**Fixed step table:**

1. start;
2. choose/resolve access route;
3. choose learning practice;
4. materialize input/output work;
5. select the bounded syntax/logic branch;
6. accept the response;
7. materialize programming outcome/evidence;
8. complete.

- [ ] Write fixed-seed boundary and checkpoint-hash tests first.
- [ ] Use named Xoshiro forks `month/content`, `month/narrative` and `month/outcome`.
- [ ] Assert bounded RNG calls per scope.
- [ ] Suspend only at meaningful decisions.
- [ ] Keep all effects typed and core-owned.
- [ ] Remove production reliance on fake fixture compatibility values.

### Task 2: build compatibility from verified content

**Files:**

```text
packages/game-application/src/january-1990/
├── create-january-runtime.ts
├── january-compatibility.ts
└── january-commit-materializer.ts

tests/january-1990-persisted-run.test.ts
```

**Produces:**

```ts
export function createJanuary1990Runtime(input: {
  persistence: PersistenceService;
  registry: ContentRegistry;
}): PersistedMonthRunOrchestrator;
```

- [ ] Bind game-core canonicalize/fingerprint into `createCompiledContentRuntime` once in application.
- [ ] Project the registry and build production steps.
- [ ] Derive `rulesFingerprint` from slice ID, plan version, compiler version and required chunk IDs.
- [ ] Use the whole manifest fingerprint as `contentFingerprint`.
- [ ] Reuse existing checkpoint/save schema and determinism manifest fields.
- [ ] Supply existing orchestrator `steps`, `expectedCompatibility` and `materializeCommit`.
- [ ] Add no SQL/schema changes unless a failing test proves an existing field insufficient.

### Task 3: persisted restart and exactly-once matrix

- [ ] Begin with the same request twice and verify one durable receipt/result.
- [ ] Suspend/reopen/resume at every decision boundary.
- [ ] Repeat an accepted answer and receive the persisted result.
- [ ] Reuse a request ID with another payload and receive `RequestPayloadConflict`.
- [ ] Reject stale run revision without mutation.
- [ ] Reject changed/missing compiled content before continuation.
- [ ] Commit twice and verify the save revision advances once.
- [ ] Run process-reopen tests against the real SQLite worker.
- [ ] Confirm no new persistence API or arbitrary SQL path exists.

---

## PR #29 — CONTENT-02E1: thin playable UI

**Files:** follow existing `game-ui` and desktop composition patterns; do not introduce a new design system.

- [ ] Render January idle/start/resume state.
- [ ] Render application-owned access, learning and defect choices.
- [ ] Dispatch one typed application command per explicit action.
- [ ] Disable duplicate submission while a command is pending.
- [ ] Render stable reason-code explanations and compact programmer-first outcomes.
- [ ] Handle incompatible content, persistence conflict and recovery-blocked states.
- [ ] Add Storybook states for every boundary and error class.
- [ ] Add keyboard, focus and accessibility tests.
- [ ] Verify close/reopen returns to the same pending boundary.

---

## PR #30 — CONTENT-02E2: hardening and issue #22 closure

### Bounded trace evidence

Record for a committed seed set:

- event and choice frequency;
- RNG calls by scope;
- transition and durable-boundary counts;
- outcome distribution;
- soft-lock detection;
- programmer-action share;
- restart parity;
- exactly-once commit evidence.

### Closure

- [ ] No seed soft-locks.
- [ ] Every run reaches a meaningful programming outcome.
- [ ] Restart points reproduce identical hashes.
- [ ] The final save advances once.
- [ ] All permanent workflows, Sonar and review gates pass on one unchanged head.
- [ ] Update execution status and issue #22 checklist with exact evidence.
- [ ] Record January complete and close issue #22.

---

## Deferred work

- Micro-optimization before the playable workload exists.
- Persistence redesign, pools, ORM or frontend SQL.
- Generic content/mod loading from arbitrary files or URLs.
- Runtime executable content or generalized DSL.
- Full technology encyclopedia.
- Broad career/company/open-source systems.
- NPC city simulation, vector memory and authoritative runtime LLM.

## Next slice after issue #22

Introduce only guardian, mentor and peer with directed relationships, bounded typed memory, integer utility actions, storylets and Narrative Director integration. Keep simulation event-driven and deterministic; do not add daily city simulation, vector storage or authoritative runtime LLM.
