---
title: "January 1990 playable slice implementation plan"
type: plan
status: active
canon: false
depends_on: [ADR-001, ADR-004, ADR-005, ADR-007, ADR-019, ADR-020]
updated: 2026-07-25
---
# January 1990 Playable Slice Implementation Plan

> Execute one bounded delivery at a time. Every delivery follows RED → GREEN → REFACTOR and may merge only after all permanent checks pass on one unchanged head.

## Goal

Deliver the first deterministic, suspendable, resumable and atomically committable January 1990 month through the complete production path:

```text
JSONC authoring sources
→ build-time compiler
→ canonical manifest/chunks
→ verified runtime subset loader
→ provider-owned January projections
→ deterministic MonthRun boundaries
→ persisted resume
→ exactly-once atomic commit
→ thin programmer-first UI
```

## Authoritative constraints

- TypeScript Game Core remains authoritative for deterministic simulation.
- Existing Xoshiro256** state/forks, canonical hashing and MonthRun transition contracts remain unchanged.
- Existing Rust single-writer SQLite persistence, revision/hash CAS, durable receipts and atomic commit remain unchanged. No persistence redesign is part of CONTENT-02. The reviewed persistence direction is already fixed around typed commands and a single durable writer.
- JSONC, Ajv and `jsonc-parser` are build-time only.
- Runtime accepts only versioned canonical compiled JSON and never authoring paths/comments.
- `@runtime-human/game-content` must not depend on `@runtime-human/game-core`; the caller injects a closed pair of `canonicalize` / `fingerprint` primitives from game-core, preserving dependency direction while reusing the authoritative implementation.
- Content is immutable data. It cannot directly mutate progression, projects, money, equipment or relationships.
- No `Math.random()`, wall-clock decisions, object-order dependence or runtime Cartesian template expansion.
- No NPC memory/utility engine, city simulation, runtime LLM, generic scripting or mod platform in this issue.
- Performance issue #24 may add measurement infrastructure, but cannot delay January or reopen persistence.

## Current repository state

| Delivery | State | Evidence |
|---|---|---|
| CONTENT-02A | complete | PR #23 merged at `6b5af703f7ae23cf76ccbafb8b8dada8a4455522` |
| CONTENT-02B | complete | PR #25 merged at `4cacfabd051065cbd3c2b2dd5c90e82f63452714` |
| CONTENT-02C | active | draft PR #26, branch `agent/compiled-content-runtime-loader` |
| CONTENT-02D | planned | starts only from the verified PR #26 merge commit |
| CONTENT-02E | planned | starts only after deterministic MonthRun/restart evidence exists |

January uses GW-BASIC and DOS context. QBasic is excluded because it belongs to the DOS 5.0/1991 timeline.

## Delivery sequence

1. PR #26 — CONTENT-02C: verified compiled-content runtime loader.
2. PR #27 — CONTENT-02D1: January provider-owned domain projections.
3. PR #28 — CONTENT-02D2: deterministic MonthRun, compatibility and restart/commit integration.
4. PR #29 — CONTENT-02E1: thin playable programmer-first UI.
5. PR #30 — CONTENT-02E2: balance/restart matrix, documentation closure and issue #22 completion.
6. Only then start the bounded guardian/mentor/peer NPC slice.

---

## CONTENT-02A — Source discovery and transactional publication

**Status:** complete in PR #23.

Delivered:

- deterministic configured `.jsonc` discovery;
- repository-relative POSIX paths;
- symlink/junction and containment rejection;
- staged artifact publication with rollback;
- deterministic `missing` / `changed` / `unexpected` diagnostics;
- closed build/check orchestration independent of runtime/UI.

No further work is required unless a regression is demonstrated.

---

## CONTENT-02B — January registry and production build surface

**Status:** complete in PR #25.

Delivered:

- exact 24 stable January definitions;
- exactly `1990s/ecosystem` and `1990s/programming` chunks;
- GW-BASIC/DOS historical chronology separated from fictional local access;
- provenance and complete reachability;
- fixed repository config and executable `content:build` / `content:check`;
- canonical generated artifacts with terminal LF;
- permanent non-mutating `content:check` before renderer build;
- exact-byte, source-order and authoring-comment independence evidence.

No additional content belongs in PR #26.

---

## CONTENT-02C — Verified runtime loader (PR #26)

### Runtime contracts

**Files:**

```text
packages/game-content/src/
├── content-errors.ts
├── compiled-content-runtime.ts
├── select-required-chunks.ts
├── content-registry.ts
├── content-loader.ts
└── index.ts

tests/compiled-content-runtime-loader.test.ts
```

### Parser requirements

- [x] parse with native `JSON.parse` only;
- [x] cap artifact bytes, depth, nodes, collection sizes, object keys and strings;
- [x] reject unsafe integers, `-0` and lone UTF-16 surrogates;
- [x] require canonical compiler bytes, with an optional single terminal LF;
- [x] reject duplicate JSON keys indirectly through canonical-byte equality;
- [x] enforce exact manifest/chunk/entry/provenance field sets;
- [x] enforce the same identifier, chunk-segment, month and provenance bounds as build-time schema;
- [x] enforce manifest-wide unique content IDs and valid entry points;
- [x] recompute fingerprints through caller-injected authoritative game-core primitives;
- [x] reject incompatible schema/compiler versions and corrupt fingerprints;
- [x] deep-freeze accepted manifests, chunks, entries and payloads.

### Required-subset registry requirements

- [x] select exactly `1990s/ecosystem` and `1990s/programming` for January;
- [x] allow a verified selected subset when future chunks exist in the same manifest;
- [x] reject missing, extra, duplicate or descriptor-mismatched selected chunks;
- [x] require all references from loaded entries to resolve inside the selected closure;
- [x] publish only after complete validation;
- [x] expose immutable `get`, `require` and `listByKind` APIs;
- [x] retain the whole-manifest content fingerprint for MonthRun compatibility;
- [x] add no package dependency or lockfile churn to `game-content`;
- [x] keep source paths, comments, filesystem and network ingestion outside the package.

### PR #26 final gate

- [ ] `pnpm install --frozen-lockfile` on the final head;
- [ ] `pnpm docs:check` and `pnpm fmt:check`;
- [ ] `pnpm lint` and `pnpm lint:type-aware`;
- [ ] `pnpm typecheck` with TypeScript 7.0.2;
- [ ] `pnpm content:check`;
- [ ] `pnpm boundaries:check`;
- [ ] focused loader tests and complete `pnpm test`;
- [ ] renderer and Storybook production builds;
- [ ] Rust format/check/test gates unchanged-green;
- [ ] Sonar Quality Gate, zero new issues and zero unresolved hotspots;
- [ ] zero unresolved review threads;
- [ ] update PR body with exact final head and evidence;
- [ ] mark ready only after the same head passes every gate;
- [ ] squash-merge with `expected_head_sha` equal to that verified head.

---

## CONTENT-02D1 — January provider-owned projections (PR #27)

### Goal

Convert immutable content definitions into small existing-domain inputs without introducing a generic rules engine.

### Files

```text
packages/game-core/src/january-1990/
├── january-content-context.ts
├── january-access-provider.ts
├── january-learning-provider.ts
├── january-project-provider.ts
├── january-event-provider.ts
└── january-month-plan.ts

tests/january-1990-projections.test.ts
```

### Contracts

- [ ] define explicit typed January IDs/constants at the integration boundary;
- [ ] resolve technology context from global chronology, local availability and practical access;
- [ ] project the two access routes into existing decision/proposal contracts;
- [ ] project two learning activities into Progression-owned evidence proposals;
- [ ] project one project archetype and two work packages into Project-owned proposals;
- [ ] project the authored first-bug situation and five events into Event-owned candidates;
- [ ] expose stable reason codes for UI explanations;
- [ ] reject missing/wrong-kind/wrong-payload definitions at construction time;
- [ ] do not let content mutate authoritative state directly;
- [ ] do not add a generalized payload interpreter, service locator or plugin API.

### Tests

- [ ] every required stable ID resolves with the expected kind/content type;
- [ ] wrong-kind and malformed payload projections fail closed;
- [ ] all proposals are deterministic and order-independent;
- [ ] access, learning, project and event owners remain explicit;
- [ ] no provider imports UI, persistence or wall-clock APIs.

---

## CONTENT-02D2 — Deterministic MonthRun and persisted compatibility (PR #28)

### Goal

Run the complete January flow through existing MonthRun boundaries and the existing persisted orchestrator.

### Fixed step table

1. resolve/choose access route;
2. choose learning/practice approach;
3. start the personal utility work package;
4. surface one bounded defect/constraint branch;
5. resolve the response choice;
6. materialize compact results and explanations;
7. complete and atomically commit the month.

### Contracts

- [ ] define a versioned fixed January step table;
- [ ] use named Xoshiro forks `month/content`, `month/narrative` and `month/outcome`;
- [ ] document and assert bounded RNG calls per step;
- [ ] suspend only at meaningful player decisions;
- [ ] include compiled-content schema/compiler/content fingerprint and required chunk IDs in compatibility context;
- [ ] reject resume when content is missing, changed or incompatible;
- [ ] produce identical continuation from the same checkpoint and answer;
- [ ] preserve existing checkpoint hash/revision CAS and durable receipt protocol;
- [ ] commit through the existing persisted MonthRun orchestrator exactly once;
- [ ] make no SQL/schema change unless an existing compatibility field is proven insufficient by a failing test.

### Verification matrix

- [ ] fixed seed → fixed boundaries and checkpoint hashes;
- [ ] suspend/reopen/resume at every player boundary;
- [ ] stale answer/revision fails without mutation;
- [ ] duplicate begin/resume/commit returns the existing receipt;
- [ ] content fingerprint mismatch fails before continuation;
- [ ] crash/reopen before and after final commit preserves exactly-once semantics;
- [ ] final save revision advances once and only once;
- [ ] no `Math.random`, `Date.now` or locale-dependent ordering enters Game Core.

---

## CONTENT-02E1 — Thin playable UI (PR #29)

### Goal

Expose the completed application flow without moving decisions or business rules into React.

### Contracts

- [ ] one January entry/resume surface;
- [ ] compact access, learning, programming-task and defect choices;
- [ ] visible trade-offs and stable reason-code explanations;
- [ ] loading, recoverable incompatibility and persistence-conflict states;
- [ ] close/reopen resumes the same pending boundary;
- [ ] final outcome emphasizes programming actions, not generic life-sim clicking;
- [ ] UI dispatches typed application commands and renders returned state only;
- [ ] no new design system, broad navigation rewrite or direct content/persistence access.

### UI tests

- [ ] each boundary renders the application-owned options;
- [ ] one command is emitted per explicit user action;
- [ ] pending actions cannot double-submit;
- [ ] resume and incompatibility states are understandable;
- [ ] keyboard/focus/accessibility checks pass;
- [ ] Storybook states cover every January boundary and error class.

---

## CONTENT-02E2 — Hardening and source-of-truth closure (PR #30)

### Balance and trace evidence

Run a bounded, committed seed set and record:

- event/choice frequency;
- RNG call counts by named scope;
- transition/boundary counts;
- outcome distribution;
- soft-lock detection;
- programmer-action share versus contextual actions;
- restart result parity;
- exactly-once commit evidence.

### Closure criteria

- [ ] no seed in the bounded set soft-locks;
- [ ] every run reaches a meaningful programming outcome;
- [ ] no event/NPC/system outside January scope dominates the flow;
- [ ] all required restart points reproduce the same hashes;
- [ ] all permanent docs/foundation/Sonar/review gates pass on one unchanged head;
- [ ] issue #22 checklist and source-of-truth status are updated with exact evidence;
- [ ] January is recorded complete;
- [ ] the next slice is guardian/mentor/peer only.

---

## Work explicitly deferred

- performance micro-optimizations before a playable workload exists;
- persistence redesign, pooling, ORM or frontend SQL;
- generic content/mod loading from arbitrary files or URLs;
- full technology encyclopedia;
- generic runtime DSL or executable content;
- NPC city simulation, vector memory and authoritative runtime LLM;
- broad career/company/open-source systems.

## Next slice after issue #22

Add only three active roles—guardian, mentor and peer—with directed relationships, bounded typed memory, integer utility actions, storylets and Narrative Director integration. Keep all authoritative decisions deterministic and keep LLM use outside runtime.
