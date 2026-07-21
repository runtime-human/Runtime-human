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

PR #17 introduces the pure deterministic MonthRun protocol used by SQLite persistence in PR #18 and by the first gameplay vertical slice in PR #19. It contains no SQLite, Tauri commands, gameplay formulas, content providers, background workers or UI.

The same scripted month must end with the same checkpoint hash and terminal result when run uninterrupted or restored after every durable boundary.

## Open implementations reviewed

The design was checked against current code and official documentation available in July 2026.

| Source | Mechanism reused | Why the engine is not embedded |
|---|---|---|
| Temporal and Azure Durable Task | deterministic orchestrator, immutable recorded results, explicit signals, versioning discipline | authoritative event-history replay creates code-evolution and infrastructure costs unnecessary for a bounded local month |
| DBOS TypeScript | workflow ID as idempotency key, persisted operation outputs, conflict detection, chaos/recovery tests | Postgres and generic async-step replay couple correctness to source step ordering |
| Restate TypeScript | journal-backed operations, explicit suspension, prompt stop after the main outcome | requires an external journal runtime and solves distributed concerns outside this game |
| XState persistence | explicit state and transition modelling | internal actor snapshots are not a stable save compatibility format |
| Reflow, durare and smol-workflow-engine | SQLite step checkpoints and resume from completed work | generic step replay is unnecessary for the bounded MonthRun kernel |
| SQLite `walcrash*.test` | randomized crash points, abnormal exit, reopen and invariant checks | methodology is adopted in PR #18; PR #17 uses serialize/restore fault points |

Runtime Human adopts explicit suspension, immutable materialized outputs, idempotency receipts, strict compatibility and crash-point verification. It rejects event-history replay, persisted actor internals, generic workflow decorators, hidden retries, timers, leases, full event sourcing and silent migration.

## Package boundaries

- `game-schema/month-run.ts`: IDs, revisions, commands, statuses, events and checkpoint DTOs.
- `game-schema/authoritative-json.ts`: recursive authoritative JSON data contract.
- `game-core/month-run/checkpoint.ts`: detached snapshots, checkpoint hashing, strict validation and restore.
- `game-core/month-run/transition.ts`: exhaustive legal transition table and duplicate semantics.
- `game-core/month-run/runner.ts`: bounded pure execution to the next durable boundary.
- `tests/support/month-run-reference-harness.ts`: test-only receipt and active-run reference store.

`AuthoritativeJsonValue` is declared in `game-schema`. `game-core` re-exports it for source compatibility, while canonicalization remains in `game-core`.

## Architecture

```text
Begin or Resume command
        |
        v
validate identity / expected revision / compatibility
        |
        v
restore or create immutable checkpoint
        |
        v
run scripted program using programCounter
        |
        v
exhaustive transition reducer
        |
        +--> running checkpoint
        |
        +--> suspended / completed / exceptional boundary
```

The protocol has two independent counters:

- `stepIndex`: number of accepted durable transitions; increments for every accepted event and is equal to `runRevision` in V1.
- `programCounter`: index of the next deterministic scripted step; advances only when a scripted step is consumed.

This separation is mandatory. Accepting a user answer is a durable transition but is not an element in the scripted step array and therefore must not skip the next scripted step.

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

- identifiers: 1–128 printable ASCII characters without whitespace or NUL;
- outcome IDs, scopes and decision kinds: 1–256 printable ASCII characters without whitespace or NUL;
- revisions and counters: non-negative safe integers.

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

Typed gameplay plans and answers replace the generic authoritative payloads in later slices without changing these envelopes.

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

Resume requires exact equality. A mismatch produces an incompatible result; PR #17 never migrates or rerolls a checkpoint.

## State model

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

`completed` may transition only to `committed` or `recovery-required`. Other terminal states cannot advance. Identical retries may return `duplicate` without mutation.

Phases:

```text
initialize
materialize
await-decision
resolve
finalize
```

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
  programCounter: number;
  plan: AuthoritativeJsonValue;
  compatibility: MonthRunCompatibilityV1;
  rngState: SerializedXoshiro256State;
  provisionalState: AuthoritativeJsonValue;
  materializedOutcomes: readonly MaterializedOutcomeV1[];
  pendingDecision: PendingDecisionV1 | null;
  acceptedDecisions: readonly AcceptedDecisionV1[];
  terminalResult: AuthoritativeJsonValue | null;
  terminalReason: AuthoritativeJsonValue | null;
  previousCheckpointHash: Fingerprint | null;
  checkpointHash: Fingerprint;
}>;
```

Hash:

```text
fingerprint("month-run-checkpoint-v1", checkpointWithoutHash)
```

Restore verifies:

- exact field sets and schema version;
- IDs, revisions, counters and authoritative values;
- exact compatibility and supported determinism algorithms;
- status, phase, pending-decision, terminal-result and terminal-reason consistency;
- unique outcome, decision and request IDs;
- nested outcome and answer hashes;
- outer checkpoint hash.

`provisionalState` is never overwritten by an exceptional transition. Failure or recovery information is stored separately in `terminalReason`, preserving the state needed for diagnostics and recovery.

## Counter semantics

Every accepted transition:

1. increments `runRevision` once;
2. increments `stepIndex` once;
3. links `previousCheckpointHash` to the prior checkpoint;
4. creates a new checkpoint hash.

The following events consume one scripted program step and increment `programCounter`:

```text
start
advance-step
materialize-outcome
suspend-for-decision
complete
```

The following accepted events do not consume a scripted step:

```text
accept-decision
mark-committed
fail
mark-incompatible
require-recovery
abandon
```

Rejected and duplicate transitions return the original checkpoint object unchanged and increment neither counter.

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
- identical outcome ID, scope and payload is a duplicate;
- identical outcome ID with different scope or payload is `MaterializationConflict`;
- identical request, decision and answer is a duplicate;
- same request ID with another payload is `RequestPayloadConflict`;
- same decision ID with another answer is `DecisionAlreadyAnswered`;
- stale revision is `RunRevisionConflict`;
- duplicate dispositions consume no RNG and mutate no checkpoint field.

## Transition API

```ts
function transitionMonthRun(
  checkpoint: MonthRunCheckpointV1,
  event: MonthRunEventV1,
): MonthRunTransitionResult;
```

The event union is closed and exhaustive:

```text
start
advance-step
materialize-outcome
suspend-for-decision
accept-decision
complete
mark-committed
fail
mark-incompatible
require-recovery
abandon
```

Expected malformed data is returned as typed `InvalidCommand`; only an unreachable exhaustive-switch defect may throw.

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

- the next step is `steps[current.programCounter]`;
- default transition budget is 256;
- stop immediately on suspended, completed or exceptional terminal status;
- do not call another step after a boundary;
- a missing step before a boundary is a typed transition-budget failure;
- budget exhaustion returns the original input checkpoint;
- `committed` requires persistence acknowledgement and is never produced by the scripted runner.

Function identities are never persisted. Only the versioned checkpoint and compatibility fingerprints cross the durable boundary.

## Reference harness

The test-only harness stores:

- checkpoints by run ID;
- one active run per save;
- command receipts by request ID and canonical payload hash.

It exposes `begin`, `resume` and `load` only to protocol tests. PR #18 replaces it with Rust and SQLite persistence.

## Error model

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

## Verification

1. Transition matrix covers legal, illegal and exceptional paths.
2. Golden checkpoint fixes the canonical V1 shape and hash.
3. Serialize/restore equivalence is checked after every accepted transition.
4. Decision acceptance is crash-equivalent and does not consume a scripted step.
5. Duplicate commands and outcomes preserve object identity, counters and RNG state.
6. Recovery preserves provisional state and stores its reason separately.
7. Repository format, lint, typecheck, build, Storybook and Rust gates remain green.

## Deferred to PR #18 and PR #19

- `rusqlite`, migrations, WAL configuration and typed Tauri IPC;
- SQL receipts, atomic checkpoint CAS and final save commit;
- persisted hash-chain validation and active-run uniqueness;
- Online Backup API, read-only recovery and process-kill crash injection;
- typed MonthPlan gameplay providers, UI and reports.

## Acceptance criteria

- Closed discriminated unions and exhaustive handling.
- Immutable checkpoint per accepted transition.
- `runRevision` and `stepIndex` increment exactly once per accepted transition.
- `programCounter` advances only for consumed scripted steps.
- Duplicate commands and outcomes leave checkpoint and RNG unchanged.
- Exceptional transitions preserve provisional state.
- Checkpoint self-verifies through canonical fingerprint.
- Restore at every durable boundary reproduces the uninterrupted terminal hash.
- No new runtime dependency.
- Final review confirms compatibility, mutation safety, transition exhaustiveness and absence of premature persistence or gameplay abstractions.
