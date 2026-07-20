---
title: "Crash-safe MonthRun protocol design"
type: plan
status: active
canon: true
depends_on: [ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-20
---

# Crash-safe MonthRun protocol design

## Goal

PR #17 introduces the pure deterministic MonthRun protocol used later by SQLite persistence and the first gameplay vertical slice. It contains no SQLite, Tauri commands, gameplay formulas, content providers, background workers or UI.

The same scripted month must end with the same checkpoint hash and terminal result when run uninterrupted or restored after every durable boundary.

## Open implementations reviewed

The design was checked against current code and official documentation available in July 2026.

| Source | Mechanism reused | Why the engine is not embedded |
|---|---|---|
| Temporal and Azure Durable Task | deterministic orchestrator, immutable recorded results, explicit signals, versioning discipline | authoritative event-history replay creates code-evolution and infrastructure costs unnecessary for a bounded local month |
| DBOS TypeScript | workflow ID as idempotency key, persisted operation outputs, conflict detection, chaos/recovery tests | Postgres and generic async-step replay couple correctness to source step ordering |
| Restate TypeScript | journal-backed operations, explicit suspension, prompt stop after the main outcome | requires an external journal runtime and solves distributed concerns outside this game |
| XState persistence | explicit state/transition modelling | internal actor snapshots are not a stable save compatibility format |
| Reflow, durare and smol-workflow-engine | SQLite step checkpoints and resume from completed work | projects are young and still use generic step replay; no dependency is justified for the pure kernel |
| SQLite `walcrash*.test` | randomized crash points, abnormal exit, reopen, invariant checks and `integrity_check` | methodology is adopted in PR #18; PR #17 uses serialize/restore fault points |

Primary references:

- https://github.com/temporalio/temporal
- https://github.com/temporalio/samples-typescript
- https://github.com/Azure/durabletask
- https://github.com/dbos-inc/dbos-transact-ts
- https://github.com/restatedev/sdk-typescript
- https://github.com/statelyai/xstate
- https://github.com/sqlite/sqlite/blob/master/test/walcrash.test
- https://danfry1.github.io/reflow-ts/
- https://docs.rs/durare/latest/durare/

## Critical adaptation

Runtime Human adopts these proven ideas:

1. Pure orchestration cannot read clock, locale, filesystem, database, UI or mutable globals.
2. Materialized randomness and accepted answers are immutable recorded facts.
3. Request IDs provide idempotency; same ID with a different payload is a conflict.
4. Suspension, accepted answers, materialization and completion are explicit durable boundaries.
5. Schema/rules/content/determinism compatibility is exact before resume.
6. No work occurs after a boundary result is known.
7. Every durable boundary is covered by restore-equivalence tests.

It rejects event-history replay, persisted actor internals, generic workflow decorators, hidden retries, timers, leases, full event sourcing and silent migration.

A bounded MonthRun is better represented by one explicit versioned checkpoint than by replaying arbitrary source code against a long operation history.

## Package boundary correction

`AuthoritativeJsonValue` is a data contract, not an algorithm. PR #17 moves the type declaration from `game-core` to `game-schema`. `game-core` continues to re-export it so existing imports remain source-compatible. Runtime validation and canonicalization remain in `game-core`.

## Architecture

```text
command or deterministic event
        |
        v
validate identity / revision / compatibility
        |
        v
exhaustive transition reducer
        |
        +--> next immutable running checkpoint
        |
        +--> suspended / completed / typed failure boundary
```

Units:

- `game-schema/month-run.ts`: IDs, revisions, commands, statuses, events and checkpoint DTOs.
- `game-schema/authoritative-json.ts`: shared recursive authoritative JSON type only.
- `game-core/month-run/checkpoint.ts`: create, validate, hash and restore checkpoints.
- `game-core/month-run/transition.ts`: exhaustive legal transition table and duplicate semantics.
- `game-core/month-run/runner.ts`: bounded pure loop to the next durable boundary.
- `tests/month-run-*`: transition matrix, golden checkpoint, crash equivalence and idempotency.

## Identifiers and revisions

Branded IDs:

```ts
type RequestId = string & RequestIdBrand;
type SaveId = string & SaveIdBrand;
type MonthRunId = string & MonthRunIdBrand;
type DecisionId = string & DecisionIdBrand;
type SaveRevision = number & SaveRevisionBrand;
type MonthRunRevision = number & MonthRunRevisionBrand;
```

Parsers require:

- IDs: 1–128 printable ASCII characters, no whitespace or NUL;
- revisions: non-negative safe integers.

## Commands

```ts
type BeginMonthCommandV1 = Readonly<{
  schemaVersion: "begin-month-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  expectedSaveRevision: SaveRevision;
  runId: MonthRunId;
  plan: AuthoritativeJsonValue;
  compatibility: MonthRunCompatibilityV1;
  initialRngState: SerializedXoshiro256State;
}>;

type ResumeMonthCommandV1 = Readonly<{
  schemaVersion: "resume-month-command-v1";
  requestId: RequestId;
  saveId: SaveId;
  runId: MonthRunId;
  expectedRunRevision: MonthRunRevision;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
}>;
```

Typed gameplay plans and answers replace the payloads in later slices without changing these envelopes.

## Compatibility

```ts
type MonthRunCompatibilityV1 = Readonly<{
  checkpointSchema: "month-run-checkpoint-v1";
  rulesFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  saveSchemaFingerprint: Fingerprint;
  determinismManifest: DeterminismManifest;
}>;
```

PR #17 accepts only exact equality. Mismatch produces `incompatible`; it never migrates or rerolls.

## State model

Statuses:

```text
ready
running
suspended
completed
committed
failed
incompatible
recovery-required
abandoned
```

Phases:

```text
initialize
materialize
await-decision
resolve
finalize
```

Legal path:

```text
ready -> running
running -> running
running -> suspended
suspended -> running
running -> completed
completed -> committed
```

Exceptional transitions from `ready`, `running` or `suspended`:

```text
-> failed
-> incompatible
-> recovery-required
-> abandoned
```

`completed` may transition only to `committed` or `recovery-required`. Other terminal states cannot advance. An identical retry may return `duplicate` without changing state.

## Checkpoint V1

```ts
type MonthRunCheckpointV1 = Readonly<{
  schemaVersion: "month-run-checkpoint-v1";
  runId: MonthRunId;
  saveId: SaveId;
  baseSaveRevision: SaveRevision;
  runRevision: MonthRunRevision;
  status: MonthRunStatus;
  phase: MonthRunPhase;
  stepIndex: number;
  plan: AuthoritativeJsonValue;
  compatibility: MonthRunCompatibilityV1;
  rngState: SerializedXoshiro256State;
  provisionalState: AuthoritativeJsonValue;
  materializedOutcomes: readonly MaterializedOutcomeV1[];
  pendingDecision: PendingDecisionV1 | null;
  acceptedDecisions: readonly AcceptedDecisionV1[];
  terminalResult: AuthoritativeJsonValue | null;
  previousCheckpointHash: Fingerprint | null;
  checkpointHash: Fingerprint;
}>;
```

Hash:

```text
fingerprint("month-run-checkpoint-v1", checkpointWithoutHash)
```

Restore verifies exact version, IDs, revisions, authoritative values, status/phase consistency, unique outcome/decision IDs, pending-decision rules, terminal-result rules and hash equality. Corruption is returned as typed data and later mapped to `recovery-required`.

## Outcomes and decisions

```ts
type MaterializedOutcomeV1 = Readonly<{
  outcomeId: string;
  scope: string;
  payload: AuthoritativeJsonValue;
  payloadHash: Fingerprint;
}>;

type PendingDecisionV1 = Readonly<{
  decisionId: DecisionId;
  kind: string;
  prompt: AuthoritativeJsonValue;
  answerSchemaFingerprint: Fingerprint;
}>;

type AcceptedDecisionV1 = Readonly<{
  requestId: RequestId;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
  answerHash: Fingerprint;
}>;
```

Rules:

- one pending decision maximum;
- identical outcome ID + identical payload is a duplicate;
- identical outcome ID + different payload is `MaterializationConflict`;
- identical request/decision/answer is a duplicate;
- same request ID with another payload is `RequestPayloadConflict`;
- same decision ID with another answer is `DecisionAlreadyAnswered`;
- stale revision is `RunRevisionConflict`;
- duplicate dispositions do not increment revision or mutate RNG state.

## Transition API

Closed event union:

```ts
type MonthRunEventV1 =
  | StartRunEventV1
  | AdvanceStepEventV1
  | MaterializeOutcomeEventV1
  | SuspendForDecisionEventV1
  | AcceptDecisionEventV1
  | CompleteRunEventV1
  | MarkCommittedEventV1
  | FailRunEventV1
  | MarkIncompatibleEventV1
  | RequireRecoveryEventV1
  | AbandonRunEventV1;
```

```ts
function transitionMonthRun(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult;
```

Every accepted transition increments `runRevision` exactly once, links `previousCheckpointHash` and creates a new hash. Rejected or duplicate transitions return the original checkpoint object unchanged.

## Pure runner

```ts
type MonthRunStep = (
  checkpoint: MonthRunCheckpointV1,
) => MonthRunEventV1;

function runUntilBoundary(
  checkpoint: MonthRunCheckpointV1,
  steps: readonly MonthRunStep[],
  maxTransitions?: number,
): MonthRunRunResult;
```

Rules:

- default transition budget: 256;
- stop immediately on suspended, completed or exceptional terminal status;
- do not call another step after a boundary;
- budget exhaustion returns `TransitionBudgetExceeded` without mutating the input;
- `committed` requires persistence acknowledgement and is not produced by the scripted runner.

The scripted step seam exists for protocol tests and the next gameplay adapter; function identities are never persisted.

## Reference harness

A test-only harness is created with an explicit scripted program and current save revision:

```ts
createMonthRunReferenceHarness({
  steps,
  saveRevision,
})
```

It stores checkpoints by run ID, one active run per save, and command receipts by request ID + payload hash. It exposes `begin`, `resume` and `load` for tests. It is not exported from any production package and PR #18 replaces it with Rust/SQLite persistence.

## Error model

Expected failures are typed values:

```text
InvalidCommand
RequestPayloadConflict
SaveRevisionConflict
RunRevisionConflict
ActiveRunExists
RunNotFound
IllegalTransition
UnexpectedDecision
DecisionAlreadyAnswered
MaterializationConflict
IncompatibleCheckpoint
CorruptedCheckpoint
TransitionBudgetExceeded
```

Only unreachable exhaustive-switch defects may throw.

## Verification

1. **Transition matrix:** every status/event pair; legal transitions assert exact status/revision, illegal transitions assert unchanged input.
2. **Golden checkpoint:** fixed canonical JSON and hash; intentional format changes require a new version or reviewed fixture update.
3. **Crash equivalence:** uninterrupted scripted run compared with serialize/restore after every accepted transition.
4. **Idempotency:** duplicate begin/resume, payload conflicts, stale revisions and repeated IDs.
5. **Mutation safety:** mutable caller objects are changed after command creation; stored checkpoints remain unchanged.
6. **Repository gates:** docs, format, lint, typecheck, boundaries, Vitest, builds and Rust checks stay green.

## Deferred to PR #18 and PR #19

- `rusqlite`, migrations, WAL configuration and Tauri IPC;
- SQL receipts, hash-chained journal and atomic final save commit;
- process-kill crash injection, reopen and `integrity_check`;
- leases or multi-process reclaim;
- typed MonthPlan gameplay fields and providers;
- automatic migrations, UI and reports.

## Acceptance criteria

- Closed discriminated unions and exhaustive handling.
- Immutable checkpoint per accepted transition.
- Revision increments once per accepted transition.
- Duplicate commands/outcomes leave checkpoint and RNG unchanged.
- Checkpoint self-verifies through canonical fingerprint.
- Restore at every durable boundary reproduces the uninterrupted terminal hash.
- No new runtime dependency.
- Final review checks compatibility, mutation safety, transition exhaustiveness and absence of premature persistence/gameplay abstractions.
