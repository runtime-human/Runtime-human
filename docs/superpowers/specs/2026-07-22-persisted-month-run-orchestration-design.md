---
title: "Persisted MonthRun application orchestration design"
type: plan
status: active
canon: true
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-22
---

# Persisted MonthRun application orchestration design

## Decision

Runtime Human connects the pure MonthRun kernel to SQLite through a small explicit TypeScript application orchestrator.

```text
UI command
  -> PersistedMonthRunOrchestrator
       -> pure checkpoint / reducer / runner
       -> typed PersistenceService
       -> SQLite worker
  -> closed application result
```

The application restores versioned checkpoints. It does not embed a generic event-replay or workflow engine.

## Responsibilities

The orchestrator owns:

- persistence recovery preflight;
- save/run loading;
- checkpoint create/restore/compatibility checks;
- pure transitions and deterministic steps;
- canonical payload envelopes;
- stable derived receipt IDs;
- durable-boundary persistence;
- atomic completed-run commit;
- startup recovery classification.

It does not own SQLite transactions, gameplay in Rust, UI, content compilation, backup policy or runtime LLM work.

## Construction

```ts
type PersistedMonthRunOrchestratorOptions = Readonly<{
  persistence: PersistenceService;
  steps: readonly MonthRunStep[];
  expectedCompatibility: MonthRunCompatibilityV1;
  materializeCommit(input: Readonly<{
    save: SaveRecordV1;
    completedCheckpoint: MonthRunCheckpointV1;
  }>): Readonly<{
    snapshot: AuthoritativeJsonValue;
    result: AuthoritativeJsonValue;
  }>;
}>;
```

`materializeCommit` remains application/domain composition. Rust only stores its canonical bytes.

## Result model

Public results are closed:

```text
idle
waiting-decision
committed
terminal
blocked
rejected
```

Transient `ready` and `running` states are advanced internally until a durable boundary or deterministic rejection.

## Begin

1. Require writable recovery status.
2. Load save and compare revision.
3. Create the ready checkpoint.
4. Persist begin with a derived receipt ID.
5. Reload the current run even after duplicate begin: an earlier invocation may already have progressed after storing its begin receipt.
6. Start and run until a durable boundary.
7. Persist the boundary by revision + serialized SHA-256 + internal fingerprint CAS.
8. Commit automatically when completed.

## Resume

1. Require writable recovery status.
2. Load and restore the run checkpoint.
3. Compare save/run identity, revision and compatibility.
4. Apply `accept-decision` with the original outer request ID.
5. Treat a pure duplicate answer as success-equivalent.
6. Run to the next durable boundary.
7. Store it with a derived boundary receipt ID.
8. Commit automatically when completed.

The caller must reuse the same outer request ID after timeout. Derived IDs are stable 64-character hashes, so every retry targets the same durable receipt.

## Commit

1. Require `completed` with a terminal result.
2. Load the current save at `baseSaveRevision`.
3. Call `materializeCommit`.
4. Produce the committed checkpoint using the pure `mark-committed` transition.
5. Canonicalize committed checkpoint, save snapshot and result.
6. Call the one atomic persistence commit with a derived commit receipt ID.
7. Treat accepted and duplicate results identically.

## Restart matrix

| Persisted state | Behavior |
|---|---|
| no active run | `idle` |
| ready | continue deterministically to the next boundary |
| suspended | return the unchanged pending decision |
| completed | atomically commit exactly once |
| unclean but valid | proceed after persistence integrity scan |
| corrupted/newer schema/migration mismatch | `blocked`; do not execute or mutate |
| incompatible checkpoint | block; never recreate silently |

Recovery receipt IDs include operation kind, run ID, source revision and source checkpoint hash.

## Canonical bytes

Every payload uses `canonicalizeAuthoritative` and `sha256Hex`. `JSON.stringify` is not an authoritative persistence serializer.

## Conflict policy

- duplicate receipt -> success-equivalent;
- payload conflict -> reject;
- stale save/run/hash -> reload once and accept only an already-equal desired boundary;
- unavailable/overloaded -> retryable rejection with the same outer request ID;
- pure-kernel rejection -> no persistence mutation.

## Evolution

- orchestration result changes require a new result schema;
- persistence DTO changes require a new command marker;
- checkpoint semantics require a new checkpoint schema;
- algorithm changes require new compatibility fingerprints;
- compatible historical runs resume from explicit state, not replay history.

## Definition of done

- begin, resume and restart use the real persistence service;
- all bytes are canonical and hashed;
- all writes have deterministic receipt IDs;
- duplicate calls do not rerun committed work;
- every durable boundary is stored;
- completed months commit atomically once;
- ready/suspended/completed restart paths are tested;
- read-only/corrupt/incompatible states execute no gameplay or writes;
- final repository gate is green on an unchanged head.
