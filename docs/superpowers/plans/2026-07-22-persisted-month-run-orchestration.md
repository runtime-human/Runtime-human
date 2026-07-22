---
title: "Persisted MonthRun orchestration implementation plan"
type: plan
status: active
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-22
---

# Persisted MonthRun orchestration implementation plan

## Goal

Implement the application layer that connects the merged pure MonthRun protocol to the merged SQLite durable store, including restart recovery and exactly-once-equivalent retries.

Authoritative design:

`docs/superpowers/specs/2026-07-22-persisted-month-run-orchestration-design.md`

## Production sequence

### P19-01 — Canonical persistence envelope helpers

Files:

- `packages/game-application/src/month-run-persistence-payload.ts`
- `tests/month-run-persistence-payload.test.ts`

Implement:

- exact canonical JSON envelope creation;
- stable derived request IDs for begin/boundary/commit/recovery;
- checkpoint record restoration and cross-field validation;
- compatibility envelope creation.

Evidence:

- Unicode/exact-byte hashes;
- deterministic IDs;
- persisted row/checkpoint mismatch rejection.

### P19-02 — Application result and error model

Files:

- `packages/game-application/src/persisted-month-run-types.ts`
- package exports.

Define closed results:

- `idle`;
- `waiting-decision`;
- `committed`;
- `terminal`;
- `blocked`;
- `rejected`.

Errors distinguish deterministic protocol failure, persistence conflict, retryable storage failure and compatibility/recovery block.

### P19-03 — Begin/resume orchestrator

Files:

- `packages/game-application/src/persisted-month-run-orchestrator.ts`
- `tests/persisted-month-run-orchestrator.test.ts`

Implement:

- writable preflight;
- save/run loading;
- begin receipt, current-run reload, start and run;
- decision acceptance and duplicate handling;
- durable boundary persistence;
- completed-run atomic commit;
- accepted/duplicate equivalence;
- one conflict reload without automatic gameplay replay.

### P19-04 — Startup recovery

Files:

- same orchestrator module;
- `tests/persisted-month-run-restart.test.ts`.

Implement matrix:

- no active run -> idle;
- ready -> continue;
- suspended -> waiting;
- completed -> commit;
- corrupt/newer-schema/read-only -> blocked;
- incompatible checkpoint -> blocked before steps execute.

### P19-05 — Reference in-memory persistence harness

Files:

- `tests/helpers/in-memory-persistence-service.ts`.

The harness mirrors the public `PersistenceService`, including:

- request receipt replay/conflict;
- one active run per save;
- revision/hash CAS;
- atomic committed save/run result;
- configurable acknowledgement loss.

It is test-only and cannot become a production persistence alternative.

### P19-06 — January reference program

Files:

- `tests/fixtures/january-reference-program.ts` or local test fixture.

Use a minimal deterministic program:

1. start;
2. materialize one bounded outcome;
3. suspend for one decision;
4. accept answer;
5. complete;
6. commit next save snapshot.

Prove uninterrupted, restarted-at-suspension and acknowledgement-lost runs produce the same committed checkpoint/save hashes.

### P19-07 — Documentation and completion

- update execution ledger;
- regenerate docs catalog/manifest;
- inspect package boundaries and exports;
- remove temporary diagnostics;
- full Windows foundation gate;
- Sonar Quality Gate;
- final adversarial review;
- squash merge with expected head SHA.

## Mandatory invariants

- no persistence call receives transient `running` checkpoint;
- canonical serialization only;
- outer request ID is never replaced on retry;
- derived operation IDs are stable and bounded;
- duplicate persistence result is success-equivalent;
- rejected pure transition performs no write;
- completed checkpoint is committed without rerunning steps;
- recovery never creates a new run when an active one exists;
- incompatible/corrupted/read-only modes invoke neither program steps nor mutation closures;
- no generic workflow framework or background scheduler is introduced.

## Planned commits

```text
1. docs: define persisted MonthRun orchestration
2. feat: add canonical MonthRun persistence envelopes
3. feat: define persisted MonthRun application results
4. feat: orchestrate persisted begin and resume
5. feat: recover persisted MonthRuns after restart
6. test: add restart and acknowledgement-loss harness
7. docs: finalize persisted MonthRun orchestration
```
