---
title: "MonthRun Protocol Implementation Plan"
type: plan
status: active
canon: false
depends_on: [ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-20
---

# MonthRun Protocol Implementation Plan

> **For agentic workers:** use `superpowers:executing-plans` for implementation and `superpowers:verification-before-completion` before merge.

## Goal

Deliver the pure, versioned MonthRun protocol that PR #18 can persist atomically and PR #19 can connect to real gameplay providers.

The primary deliverable is production protocol code:

- closed schema contracts;
- immutable self-verifying checkpoints;
- exhaustive reducer;
- bounded scripted runner;
- strict restore and compatibility checks;
- explicit persistence handoff.

Tests are focused executable gates for these contracts, not a replacement for implementation.

## Architecture

```text
game-schema contracts
        |
        v
game-core checkpoint / reducer / runner
        |
        v
typed durable boundaries
        |
        v
PR #18 Rust + SQLite store
```

No SQLite, Tauri IPC, gameplay formulas, UI, timers, leases, retry scheduler or background worker belongs in PR #17.

## Final checkpoint semantics

`MonthRunCheckpointV1` contains two independent counters:

```text
stepIndex
  number of accepted durable transitions
  increments with every accepted event
  equal to runRevision in V1

programCounter
  index of the next scripted MonthRunStep
  increments only when a scripted step is consumed
```

Scripted events:

```text
start
advance-step
materialize-outcome
suspend-for-decision
complete
```

Administrative or external events that do not consume a scripted step:

```text
accept-decision
mark-committed
fail
mark-incompatible
require-recovery
abandon
```

Exceptional transitions preserve `provisionalState` and write their reason to `terminalReason`.

## File map

### Production

- `packages/game-schema/src/authoritative-json.ts`
- `packages/game-schema/src/month-run.ts`
- `packages/game-schema/src/index.ts`
- `packages/game-core/src/month-run/checkpoint.ts`
- `packages/game-core/src/month-run/transition.ts`
- `packages/game-core/src/month-run/runner.ts`
- `packages/game-core/src/determinism/authoritative-json.ts`
- `packages/game-core/src/index.ts`

### Focused verification

- `tests/month-run-schema.test.ts`
- `tests/month-run-checkpoint.test.ts`
- `tests/month-run-transition.test.ts`
- `tests/month-run-runner.test.ts`
- `tests/month-run-idempotency.test.ts`
- `tests/support/month-run-reference-harness.ts`

### Documentation and automation

- `docs/superpowers/specs/2026-07-20-month-run-protocol-design.md`
- `docs/CATALOG.md`
- `docs/MANIFEST.jsonc`
- `.github/workflows/foundation.yml`
- `.github/workflows/docs.yml`

## Completed implementation

### 1. Schema boundary

- [x] Move `AuthoritativeJsonValue` declaration to `game-schema`.
- [x] Preserve source-compatible re-export from `game-core`.
- [x] Add branded request, save, run and decision IDs.
- [x] Add branded save and run revisions.
- [x] Add begin/resume command envelopes.
- [x] Add closed event, status, phase, result and error unions.
- [x] Restrict protocol identifiers to bounded printable ASCII.

### 2. Checkpoint boundary

- [x] Add canonical detached snapshots.
- [x] Add checkpoint SHA-256 fingerprint.
- [x] Add strict exact-field restore validation.
- [x] Recompute nested materialized-outcome hashes on restore.
- [x] Recompute accepted-answer hashes on restore.
- [x] Reject duplicate outcome, decision and request IDs.
- [x] Validate exact supported determinism algorithms.
- [x] Add golden V1 checkpoint hash.
- [x] Add `programCounter` independently from `stepIndex`.
- [x] Add separate `terminalReason` without overwriting provisional state.

### 3. Transition reducer

- [x] Implement exhaustive status/event switches.
- [x] Increment revision and durable step index once per accepted transition.
- [x] Link every accepted checkpoint to the prior hash.
- [x] Keep rejected and duplicate results referentially unchanged.
- [x] Implement immutable outcome materialization.
- [x] Implement request and decision duplicate/conflict ordering.
- [x] Return malformed runtime data as typed `InvalidCommand`.
- [x] Permit `completed -> recovery-required` while preserving recovery state.
- [x] Advance the scripted program cursor only for consumed program steps.

### 4. Bounded runner

- [x] Select the next function through `steps[programCounter]`.
- [x] Stop immediately at suspended, completed or exceptional boundaries.
- [x] Return the original checkpoint when transition budget is exceeded.
- [x] Reject a missing scripted step before a boundary.
- [x] Treat duplicate scripted output as a non-progress failure.
- [x] Resume from the same scripted instruction after accepting a decision.

### 5. Reference command harness

- [x] Store checkpoints by run ID.
- [x] Enforce one active run per save in the reference model.
- [x] Store request receipts by request ID and canonical payload hash.
- [x] Return stored results for identical retries.
- [x] Reject request ID reuse with another payload.
- [x] Check save and run revisions before execution.
- [x] Keep the harness test-only and outside production exports.

### 6. CI correction

- [x] Move full verification to the trusted self-hosted Windows runner.
- [x] Replace manual commit-status wrapping with direct process exit semantics.
- [x] Pin checkout and Node setup actions.
- [x] Normalize tracked files before verification.
- [x] Move the trusted docs gate away from exhausted hosted minutes.
- [x] Prevent self-hosted execution for untrusted fork pull requests.

## Remaining PR #17 work

### 7. Final contract consistency

- [x] Update the canonical design for `stepIndex` and `programCounter`.
- [x] Document `terminalReason` and provisional-state preservation.
- [ ] Confirm no remaining production or fixture code indexes scripted steps by `stepIndex`.
- [ ] Confirm checkpoint restore rejects the pre-correction field shape.
- [ ] Confirm public package exports do not expose the low-level rehash helper.

### 8. Final verification

Run on the final head:

```text
pnpm verify
node scripts/build-toc.mjs --check
```

The gate includes formatting, lint, typecheck, package-boundary checks, focused protocol tests, renderer build, Storybook build, Rust formatting, Rust check and Rust tests.

- [ ] Full self-hosted verification succeeds on the final head.
- [ ] Docs freshness gate succeeds on the final head.
- [ ] No generated file changes remain.

### 9. Review and merge

- [ ] Perform final adversarial review of schema, reducer, runner and recovery semantics.
- [ ] Review all open automated comments and resolve actionable findings.
- [ ] Update the PR description with final cursor and recovery semantics.
- [ ] Mark PR ready only after final verification is green.
- [ ] Squash merge PR #17 into `main`.

## Explicit PR #18 handoff

PR #18 owns durable persistence. It must not redesign the pure protocol without a new checkpoint version.

### Storage model

- SQLite is the only authoritative durable store.
- Rust owns every authoritative write.
- React receives typed Tauri commands; it never executes arbitrary SQL.
- One dedicated SQLite worker processes a bounded command queue.
- Writes use `BEGIN IMMEDIATE`.
- WAL uses `synchronous=FULL` for durable checkpoint acknowledgement.

### Atomic invariants

- CAS checks both `runRevision` and `checkpointHash`.
- The persisted checkpoint JSON contains both `stepIndex` and `programCounter`.
- One active MonthRun exists per save.
- Request receipt and command result are committed in the same transaction as the checkpoint mutation.
- Final save update, committed MonthRun state, journal entry and receipt are one transaction.
- Identical retries return the stored result without re-running the program or RNG.
- Same request ID with a different payload returns `RequestPayloadConflict`.

### Recovery invariants

- Restore always runs the PR #17 checkpoint validator before exposing a run.
- A newer checkpoint or save schema opens in read-only incompatible mode.
- Exceptional checkpoints retain provisional state and expose `terminalReason`.
- Hash-chain validation across persisted revisions belongs to the durable journal.
- Backup before migration uses SQLite Online Backup API rather than raw file copy.

### PR #18 implementation order

1. Database open/configuration and typed error model.
2. Embedded schema migrations and migration fingerprint.
3. Save, MonthRun, receipt and journal tables.
4. Single-worker command service.
5. Begin/load/checkpoint CAS operations.
6. Resume and durable receipt replay.
7. Atomic final commit.
8. Read-only recovery and backup.
9. Typed Tauri boundary.
10. Crash/reopen verification after the production path exists.

This order intentionally prioritizes the working persistence path. Verification is added at each critical invariant, but fault-injection breadth does not block implementation of the foundational store modules.

## Definition of done

PR #17 is complete when:

- the checkpoint contract is unambiguous;
- scripted execution cannot skip a step after an accepted answer;
- recovery cannot erase provisional state;
- the final head passes full self-hosted verification;
- documentation matches the implementation;
- the PR is reviewed and squash-merged;
- PR #18 can implement storage without inventing new MonthRun semantics.
