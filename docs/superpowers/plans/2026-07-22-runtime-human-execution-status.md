---
title: "Runtime Human execution status and next gates"
type: plan
status: superseded
superseded_by: docs/EXECUTION-STATUS.jsonc
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-28
---

# Runtime Human execution status and next gates

Status snapshot: **24 July 2026**. Machine-readable companion: [`../../EXECUTION-STATUS.jsonc`](../../EXECUTION-STATUS.jsonc).

This ledger records implementation state. Accepted ADRs and specialized specifications remain authoritative for design invariants.

## Completed foundation milestones

| Stable work ID | GitHub evidence | State |
|---|---|---|
| `FOUNDATION-01` | PR #15, `63df5b5` | complete |
| `DETERMINISM-01` | PR #16, `7521ff6` | complete |
| `MONTHRUN-01` | PR #17, `66d9ecb` | complete |
| `PERSISTENCE-01` | PR #18, `c41e531` | complete |
| `MR-ORCH-01` | PR #20, `1357124` | complete |

PR #18 delivered the direct `rusqlite` durable store, one-worker ownership, bounded commands, WAL + `synchronous=FULL`, dual-hash CAS, durable receipts, atomic final commit, verified backup, recovery read-only modes, typed Tauri commands and TypeScript persistence service.

PR #20 delivered persisted MonthRun orchestration around that store: recovery preflight, ready/suspended/completed resume paths, deterministic receipt IDs, acknowledgement-loss retry equivalence, exact suspended-decision restoration, atomic commit reconciliation and explicit incompatible/corrupted persistence classification.

## Active work — `CONTENT-01`

GitHub: **draft PR #21**, branch `agent/compiled-content-foundation`.

Goal: provide a deterministic build-time JSONC content compiler without moving content parsing, Ajv or arbitrary scripting into the game runtime.

### Retained architecture

```text
JSONC source
  -> Draft 2020-12 schema validation
  -> normalized-path and stable-ID validation
  -> reference and chronology validation
  -> entry-point reachability validation
  -> immutable era/domain chunks
  -> canonical JSON artifacts and fingerprints
```

Package boundary:

- `@runtime-human/game-content` owns immutable runtime contracts only;
- `@runtime-human/game-content-compiler` owns Ajv, `jsonc-parser`, diagnostics, graph checks and artifact generation;
- renderer, UI, application and runtime content packages do not import Ajv or `jsonc-parser`;
- this work contains no January gameplay content, NPC simulation, UI or persistence-schema change.

### Implemented in the active PR

1. versioned compiled entry, chunk, descriptor, manifest, artifact and bundle contracts;
2. JSONC parsing with deterministic path/line/column diagnostics;
3. JSON Schema Draft 2020-12 validation with safe-integer authoritative values;
4. normalized relative source paths and duplicate normalized-path rejection;
5. duplicate stable-ID and missing-reference diagnostics;
6. own chronology validation;
7. full required-reference availability-window containment;
8. explicit `NO_ENTRY_POINT` graph invariant without cascading unreachable diagnostics;
9. cycle-safe reachability from declared entry points;
10. deterministic code-point ordering for sources, IDs, references, provenance, chunks and artifacts;
11. per-chunk and global content fingerprints through the existing authoritative canonical JSON boundary;
12. compiler split into focused schema, diagnostic, parser, graph-validation, bundle-building and orchestration modules;
13. adversarial tests for malformed JSONC, traversal/absolute paths, normalized path collisions, reversed chronology, cycles and unsafe numbers;
14. checked-in JSONC fixtures plus byte-golden `manifest.json` and chunk artifacts;
15. regression proof that changing one payload changes only its owning chunk and manifest.

### Remaining gates before merge

1. run formatter and apply only deterministic Oxfmt changes;
2. resolve actual TypeScript, lint, boundary or Vitest failures from the modular implementation;
3. verify the checked-in golden fingerprints against the production compiler output;
4. verify Ajv and `jsonc-parser` remain absent from renderer/runtime dependency graphs;
5. regenerate `docs/CATALOG.md` and `docs/MANIFEST.jsonc` after final documentation edits;
6. complete architecture, security and determinism review;
7. resolve all review threads;
8. pass `docs`, `foundation` and Sonar on one unchanged final head;
9. mark PR ready and squash-merge only with the expected head SHA.

## Next stable work IDs

| Work ID | Scope | State |
|---|---|---|
| `DETERMINISM-02` | cross-runtime Xoshiro vectors, parity and RNG call accounting | planned after `CONTENT-01` |
| `NPC-01` | minimal person state and directed relationships | planned, gated by playable need |
| `NPC-02` | typed bounded memory and beliefs | deferred until playtest evidence |
| `NPC-03` | utility social actions | deferred until playtest evidence |
| `NPC-04` | storylets and Narrative Director integration | planned in minimal vertical-slice form |
| `JAN-01` | January 1990 authored content | planned |
| `JAN-02` | deterministic multi-seed balance simulation | planned |
| `JAN-03` | desktop first-playable vertical slice | planned |

Future work uses stable IDs in plans. GitHub PR numbers are recorded only after a PR actually exists; closed PR #19 remains the historical CI experiment and is not reused as an implementation identifier.

## Global merge gate

- one active implementation PR until the first playable slice;
- branch starts from current `main`;
- no arbitrary renderer SQL;
- no nondeterministic time/randomness in authoritative state;
- no runtime LLM authority;
- no merge without resolved Critical/Important findings;
- final self-hosted Windows `foundation` workflow must pass on the unchanged reviewed head;
- the separate docs workflow must verify front matter and generated manifest on the same head.

PR #21 remains draft and must not merge until the content compiler completion plan and final unchanged-head gates are complete.
