---
title: "January 1990 playable slice implementation plan"
type: plan
status: completed
canon: false
depends_on: [ADR-001, ADR-004, ADR-005, ADR-007, ADR-019, ADR-020]
updated: 2026-07-28
---
# January 1990 Playable Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Execute one bounded delivery at a time. Every production change follows RED → GREEN → REFACTOR and merges only after all permanent gates pass on one unchanged head.

**Goal:** Deliver the first deterministic, suspendable, resumable and atomically committable January 1990 gameplay month using verified compiled-content v1.

**Architecture:** Author JSONC remains build-time input. `game-content` validates canonical compiled artifacts and publishes an immutable registry. `game-application` projects that registry through a minimal structural port into content-package-independent `game-core` contracts. Existing MonthRun transitions and the Rust-owned single-writer SQLite store remain authoritative.

**Tech Stack:** TypeScript 7.0.2, Node.js 24, pnpm 11.11.0, Vitest 4.1.10, Oxfmt/Oxlint, React 19, Vite 8, Tauri 2, Rust 1.97 and rusqlite/SQLite.

## Global constraints

- Preserve Xoshiro256**, canonical hashing, MonthRun transitions and checkpoint serialization.
- Preserve the existing Rust-owned single-writer SQLite store, revision/hash CAS, durable receipts, recovery and atomic commit.
- JSONC, Ajv and `jsonc-parser` remain build-time only.
- Runtime accepts canonical compiled JSON only.
- `game-core` must not import or depend on `game-content`.
- `game-content` must not import or depend on `game-core`.
- `game-application` may consume a minimal structural registry port; do not add package or lockfile coupling unless a failing test proves it necessary.
- Content may produce typed inputs and proposals but may not mutate progression, projects, money, equipment or relationships directly.
- No `Math.random()`, wall-clock decisions, locale-dependent sorting or runtime Cartesian expansion.
- No generic mod loader, runtime DSL, city simulation, NPC memory engine, vector memory or authoritative runtime LLM.
- Performance issue #24 may add measurement infrastructure after the playable path exists, but must not delay January or reopen persistence.
- January uses GW-BASIC and DOS context. QBasic is excluded because it belongs to the DOS 5.0/1991 timeline.

## Repository state

| Delivery | State | Evidence |
|---|---|---|
| Repository foundation | complete | PR #15, `63df5b5fef6e0f14c1aac25771eda352482f2930` |
| Determinism kernel | complete | PR #16, `7521ff64ddbe194a7775676f4b9784e482efee13` |
| MonthRun protocol | complete | PR #17, `66d9ecbb9eaf7abd3b72d915883ef1746946d52f` |
| SQLite durable store | complete | PR #18, `c41e531511134f3af4ce581857641b8ef8d7ad1f` |
| Persisted MonthRun orchestration | complete | PR #20, `1357124e85a5b38c41819ec0413183969c679d60` |
| CONTENT-02A compiled repository API | complete | PR #23, `6b5af703f7ae23cf76ccbafb8b8dada8a4455522` |
| CONTENT-02B January registry | complete | PR #25, `4cacfabd051065cbd3c2b2dd5c90e82f63452714` |
| CONTENT-02C runtime loader | complete | PR #26, `2d5066a683e2765e5a259696fd114061772dd65b` |
| Obsolete projection attempt | superseded | PR #27 closed without merge; direct package coupling rejected |
| CONTENT-02D1 projection boundary | active | PR #28, `agent/january-1990-content-projections` |
| CONTENT-02D2 deterministic core MonthRun | next | starts only after PR #28 merge |
| CONTENT-02D3 persisted January composition | queued | starts after pure core MonthRun |
| CONTENT-02E1 thin playable UI | queued | starts after persisted flow is stable |
| CONTENT-02E2 hardening and issue closure | queued | final January delivery |

---

## Completed delivery — CONTENT-02C runtime loader

PR #26 is merged. The final unchanged head passed frozen install, documentation, pinned formatting, lint, TypeScript 7, `content:check`, package boundaries, complete Vitest, renderer, Storybook, Rust, Sonar and review gates.

Delivered contracts:

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

The loader validates canonical bytes, bounds, closed shapes, schema/compiler versions, fingerprints, descriptor agreement, selected-subset closure, references, entry points and immutability. No runtime Ajv, filesystem API, generic mod loader or package-cycle was introduced.

---

## Active delivery — CONTENT-02D1 content projection boundary

### Responsibility map

```text
packages/game-core/src/january-1990/
├── january-content-ids.ts          exact stable IDs and chunk IDs
├── january-reason-codes.ts         stable UI/audit reason codes
├── january-content-context.ts      pure readonly DTOs
└── index.ts                        public January exports

packages/game-application/src/january-1990/
├── january-content-registry-port.ts     minimal structural input port
├── january-content-projection-error.ts  closed deterministic errors
├── january-payload-readers.ts           exact payload/reference guards
├── project-january-content.ts           registry → pure context adapter
└── index.ts                              public application exports

tests/
├── january-1990-contracts.test.ts
├── january-1990-content-projection.test.ts
└── check-boundaries.test.ts
```

### Public interfaces

```ts
export const JANUARY_1990_REQUIRED_CHUNK_IDS: readonly [
  "1990s/ecosystem",
  "1990s/programming",
];

export type JanuaryContentRegistryPort = Readonly<{
  contentFingerprint: Fingerprint;
  get(id: string): JanuaryContentEntryPort | undefined;
}>;

export function projectJanuary1990Content(
  registry: JanuaryContentRegistryPort,
): January1990ContentContext;
```

### Implemented TDD blocks

- [x] RED test for the exact two chunk IDs, 24 stable IDs and closed reason-code set.
- [x] Pure content-package-independent readonly contracts in `game-core`.
- [x] Frozen public ID and reason-code collections.
- [x] Explicit boundary regression: `game-core → game-content` remains forbidden.
- [x] Closed projection errors: `MISSING_CONTENT`, `WRONG_KIND`, `WRONG_CONTENT_TYPE`, `INVALID_PAYLOAD`, `REFERENCE_MISMATCH`.
- [x] Real-artifact golden projection using the committed manifest and both January chunks.
- [x] Exact kind, `contentType`, payload-field and reference checks for all 24 definitions.
- [x] Projection of GW-BASIC/DOS context, two access routes, five skills, two learning activities, personal-utility project, two work packages, first-bug situation and five events.
- [x] Whole-manifest content fingerprint propagated into the context.
- [x] Deep-frozen result.
- [x] No package, tsconfig-reference or lockfile coupling to `game-content`.
- [x] PR #27 closed as superseded; only PR #28 remains canonical.

### Remaining closure work

- [ ] Pass pinned Oxfmt on every changed source/test file.
- [ ] Pass fast lint and type-aware lint.
- [ ] Pass TypeScript 7 project build.
- [ ] Pass focused contract/projection tests and complete Vitest.
- [ ] Pass `content:check` and package-boundary checks.
- [ ] Pass renderer, Storybook and Rust gates unchanged.
- [ ] Confirm Sonar Quality Gate and zero unresolved hotspots.
- [ ] Resolve all review threads.
- [ ] Update PR #28 body with exact final head and evidence.
- [ ] Mark ready only after the same head passes every permanent gate.
- [ ] Squash-merge with `expected_head_sha` equal to the verified head.

### Explicit non-goals

No MonthRun steps, RNG selection, persistence change, UI, NPC state, performance rewrite or generic content interpreter belongs in PR #28.

---

## Next delivery — CONTENT-02D2 deterministic January core MonthRun

### Task 1: decision and plan contracts

**Files:**

```text
packages/game-core/src/january-1990/
├── january-month-plan.ts
├── january-decisions.ts
├── january-answers.ts
└── index.ts

tests/january-1990-month-plan.test.ts
```

**Produces:**

```ts
export type January1990MonthPlanV1 = Readonly<{
  schemaVersion: "january-1990-month-plan-v1";
  month: "1990-01";
  program: "january-1990-v1";
  contentFingerprint: Fingerprint;
  requiredChunkIds: readonly ["1990s/ecosystem", "1990s/programming"];
}>;

export type JanuaryAccessAnswerV1 = Readonly<{
  schemaVersion: "january-access-answer-v1";
  route: "home-pc" | "shared-school-pc";
}>;

export type JanuaryLearningAnswerV1 = Readonly<{
  schemaVersion: "january-learning-answer-v1";
  practice: "read-and-run" | "edit-and-debug";
}>;

export type JanuaryDefectAnswerV1 = Readonly<{
  schemaVersion: "january-defect-answer-v1";
  response: "inspect-listing" | "change-input" | "ask-for-guidance";
}>;
```

- [ ] Write failing parsers for exact field sets and literal values.
- [ ] Reject unknown fields, unsafe values and wrong decision IDs.
- [ ] Keep answers as authoritative JSON DTOs; do not add UI copy.
- [ ] Derive the plan only from `January1990ContentContext`.
- [ ] Freeze every accepted plan/answer.

### Task 2: fixed deterministic step table

**Files:**

```text
packages/game-core/src/january-1990/
├── january-month-steps.ts
├── january-provisional-state.ts
├── january-outcome.ts
└── january-rng-scopes.ts

tests/january-1990-month-run.test.ts
```

**Produces:**

```ts
export function createJanuary1990MonthSteps(
  context: January1990ContentContext,
): readonly MonthRunStep[];
```

**Fixed execution order:**

1. start;
2. suspend for access route;
3. materialize access outcome;
4. suspend for learning practice;
5. materialize input/output work;
6. select one bounded syntax/logic branch;
7. suspend for defect response;
8. materialize programming evidence and visible trade-offs;
9. complete.

- [ ] Write fixed-seed boundary and checkpoint-hash golden tests before production steps.
- [ ] Use only named forks `month/content`, `month/narrative` and `month/outcome`.
- [ ] Record and assert exact bounded RNG calls per scope.
- [ ] Use stable ID tie-breaks before RNG.
- [ ] Suspend only on the three meaningful player decisions.
- [ ] Preserve the existing MonthRun reducer and checkpoint format.
- [ ] Keep duplicate execution RNG-neutral.
- [ ] Ensure every terminal result contains a programming outcome.

### Task 3: compatibility contract

**Files:**

```text
packages/game-core/src/january-1990/january-compatibility.ts
tests/january-1990-compatibility.test.ts
```

**Produces:**

```ts
export function createJanuary1990RulesFingerprint(): Fingerprint;
```

Fingerprint input must include only stable deterministic inputs:

```text
slice ID
plan schema/version
fixed step-table version
answer schema versions
named RNG scopes
required chunk IDs
```

The manifest fingerprint remains a separate `contentFingerprint`; do not combine it into `rulesFingerprint`.

---

## Following delivery — CONTENT-02D3 persisted January composition

### Responsibility map

```text
packages/game-application/src/january-1990/
├── load-january-content.ts
├── create-january-runtime.ts
├── january-compatibility.ts
├── january-commands.ts
└── january-commit-materializer.ts

tests/
├── january-1990-persisted-run.test.ts
├── january-1990-persisted-restart.test.ts
└── january-1990-exactly-once.test.ts
```

### Runtime factory

```ts
export function createJanuary1990Runtime(input: Readonly<{
  persistence: PersistenceService;
  contentRegistry: JanuaryContentRegistryPort;
}>): January1990Runtime;
```

The factory must:

1. project the verified registry;
2. construct the pure plan and fixed step table;
3. build `MonthRunCompatibilityV1` from existing checkpoint/save schema, rules fingerprint, whole-manifest content fingerprint and determinism manifest;
4. supply the existing persisted orchestrator with steps, expected compatibility and commit materializer;
5. expose typed begin/resume/load/commit application commands.

### Restart and exactly-once matrix

- [ ] Same begin request twice returns one durable result.
- [ ] Same resume request twice returns one durable result.
- [ ] Same request ID with another payload returns `RequestPayloadConflict`.
- [ ] Stale save/run revisions mutate nothing.
- [ ] Close/reopen at every decision boundary reproduces the same checkpoint hash.
- [ ] Changed or missing content fingerprint is rejected before continuation.
- [ ] Completed month committed twice advances save revision once.
- [ ] `after_commit_before_reply` recovery returns the persisted receipt.
- [ ] Real SQLite worker tests prove no new schema or arbitrary SQL path is needed.

### Persistence boundary

Do not modify SQLite schema, worker ownership, WAL/FULL settings, CAS, receipts, backup or recovery unless a focused failing test proves an existing contract insufficient. Any required persistence change becomes its own bounded prerequisite PR rather than being hidden in gameplay code.

---

## Following delivery — CONTENT-02E1 thin playable UI

**Files:** follow existing `game-ui` and desktop composition patterns. Do not introduce another state manager or design system.

Required states:

```text
idle
starting
access-decision
learning-decision
programming-work
first-defect-decision
completed
committing
committed
content-incompatible
revision-conflict
recovery-required
fatal-error
```

- [ ] Render one application-owned view model per durable boundary.
- [ ] Dispatch one typed command per explicit player action.
- [ ] Disable duplicate submission while a command is pending.
- [ ] Show stable reason-code explanations and compact programmer-first outcomes.
- [ ] Keep persistence DTOs and compiled payloads out of React components.
- [ ] Add Storybook state for every boundary and error class.
- [ ] Add keyboard, focus, accessible-name and live-region tests.
- [ ] Verify desktop close/reopen returns to the same pending decision.
- [ ] Avoid navigation, design-system or broad visual redesign.

---

## Final delivery — CONTENT-02E2 hardening and issue #22 closure

### Bounded evidence set

For a committed deterministic seed set, record:

- event and choice frequency;
- RNG calls by scope;
- transition count;
- durable-boundary count;
- checkpoint hashes;
- outcome distribution;
- soft-lock detection;
- programmer-action share;
- restart parity;
- exactly-once commit evidence.

### Acceptance criteria

- [ ] Every seed reaches a meaningful programming outcome.
- [ ] No route or decision creates a permanent soft lock.
- [ ] Same seed and answers reproduce identical checkpoints and final result.
- [ ] Every reopen point reproduces the same hash and pending decision.
- [ ] Final save advances exactly once.
- [ ] Content mismatch blocks resume without mutation.
- [ ] UI exposes every recoverable/error state without raw internal data.
- [ ] All permanent workflows, Sonar and review gates pass on one unchanged head.
- [ ] `docs/EXECUTION-STATUS.jsonc` records exact merged commits and evidence.
- [ ] Issue #22 checklist is updated and the issue is closed.

---

## Work after issue #22

### Performance issue #24

Start with measurement, not rewrites:

1. OPT-00 baseline: install, docs, format, lint, typecheck, content, tests, renderer, Storybook and Rust timings;
2. split cacheable and non-cacheable CI work only where evidence supports it;
3. profile Vitest discovery/setup and isolate expensive suites;
4. profile renderer/Storybook bundles and duplicate dependencies;
5. profile Rust compile/test and SQLite test serialization;
6. optimize runtime only against the real January workload.

Do not replace persistence, add pools/ORM, or weaken deterministic verification for benchmark gains.

### First NPC slice

Only after January is complete, introduce guardian, mentor and peer with:

- directed relationships;
- bounded typed memory;
- integer utility actions;
- storylets;
- Narrative Director integration;
- event-driven deterministic updates.

Do not add daily city simulation, vector storage, embeddings or authoritative runtime LLM.

## Deferred

- Generic arbitrary-file mod loading.
- Runtime executable content or generalized DSL.
- Full technology encyclopedia.
- Broad career/company/open-source systems.
- Persistence redesign, connection pools, ORM or frontend SQL.
- NPC city simulation, vector memory and authoritative runtime LLM.
