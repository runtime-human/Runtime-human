---
title: "Crash-safe MonthRun protocol design"
type: plan
status: active
canon: true
depends_on: [ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-20
---

# Crash-safe MonthRun protocol design

## 1. Goal and scope

This specification defines PR #17: the pure, deterministic MonthRun protocol that later persistence and gameplay slices will use.

The deliverable is a versioned state machine, checkpoint format, compatibility validator and reference in-memory execution harness. It must prove deterministic suspend/resume and duplicate-command behavior without introducing SQLite, Tauri commands, gameplay formulas, content providers or UI.

PR #17 is complete when the same scripted run produces the same checkpoint hashes and terminal result when executed:

- without interruption;
- after serialize/restore at every durable boundary;
- after duplicate begin/resume commands;
- after stale revision or incompatible manifest attempts;
- after abandon/recovery transitions.

## 2. Sources inspected

The design was checked against current open implementations and official documentation available in July 2026.

| Source | Reusable mechanism | Why the complete engine is not adopted |
|---|---|---|
| Temporal server and TypeScript samples | deterministic workflow code, explicit signals, immutable recorded results, versioned workflow changes | event-history replay and worker/server infrastructure are unnecessary for one local game month; code evolution can make old histories nondeterministic |
| Azure Durable Task | orchestration replay, deterministic command scheduling, versioned orchestrators, `ContinueAsNew` to bound history | full replay and activity scheduling are substantially broader than the local deterministic simulation boundary |
| DBOS TypeScript | workflow ID as idempotency key, persisted operation outputs, conflict detection, chaos tests and recovery from completed steps | Postgres-backed generic async-step replay couples correctness to step ordering and adds infrastructure not present in Runtime Human |
| Restate TypeScript | journal-backed operations, explicit suspension points, prompt stop after the main outcome, no detached observable work after completion | requires the Restate runtime and journal protocol; MonthRun already owns a narrower checkpoint contract |
| XState persistence | explicit states and transitions, actor restoration | internal actor snapshots are not an acceptable long-lived authoritative save format across machine-code changes |
| Reflow / durare / smol-workflow-engine | embedded SQLite step checkpoints, run reclaim and resume from the next incomplete step | projects are young and generic step replay still creates code-order compatibility risk; no dependency is justified for the pure kernel |
| SQLite official `walcrash*.test` suite | randomized crash injection, reopen after abnormal process exit, invariant checks and `integrity_check` | this methodology belongs to PR #18 persistence tests; PR #17 mirrors it with pure checkpoint-boundary fault fixtures |

Reference repositories and documentation:

- https://github.com/temporalio/temporal
- https://github.com/temporalio/samples-typescript
- https://github.com/Azure/durabletask
- https://github.com/dbos-inc/dbos-transact-ts
- https://github.com/restatedev/sdk-typescript
- https://github.com/statelyai/xstate
- https://github.com/sqlite/sqlite/blob/master/test/walcrash.test
- https://danfry1.github.io/reflow-ts/
- https://docs.rs/durare/latest/durare/

## 3. Critical adaptation for Runtime Human

### 3.1 What is adopted

Runtime Human adopts these proven protocol ideas:

1. **Pure orchestrator boundary.** State transitions cannot read time, locale, filesystem, database, UI or mutable global state.
2. **Immutable materialization.** Once a hidden outcome or decision is recorded, resume consumes the recorded value rather than generating it again.
3. **Idempotency identity.** A request ID identifies one logical command; an identical retry returns the same disposition, while a different payload with the same ID is a conflict.
4. **Explicit durable boundaries.** Suspension, accepted answers, materialized outcomes and completion are represented as checkpointable states.
5. **Versioned compatibility.** Schema, rules, content and determinism fingerprints are validated before a run continues.
6. **No post-terminal work.** After suspended, completed, failed, incompatible, recovery-required, abandoned or committed is returned, the pure runner performs no further transition until a new command is supplied.
7. **Crash-matrix testing.** Every durable boundary is tested by serializing, restoring and comparing continuation with uninterrupted execution.

### 3.2 What is rejected

The protocol deliberately rejects:

- event-history replay as the authoritative recovery mechanism;
- persisted XState actor internals;
- generic async workflow decorators;
- background tasks, leases, retries or timers in the pure kernel;
- full event sourcing of the player life;
- arbitrary provider-defined state-machine states;
- silent migration or substitution of manifests/fingerprints;
- automatic reroll when checkpoint verification fails.

### 3.3 Why an explicit checkpoint DTO wins

A MonthRun is a bounded deterministic computation with at most one global blocking decision in the current design. Persisting the exact restart-critical DTO is smaller and more stable than replaying source code against a long operation history.

The checkpoint is a public compatibility format. Internal helper functions may change without invalidating old runs as long as they still accept the checkpoint version and reproduce the same transition semantics.

## 4. Architecture

```text
BeginMonthCommand / ResumeMonthCommand / internal boundary event
                           |
                           v
               validate command + revision
                           |
                           v
                MonthRun transition reducer
                           |
              +------------+-------------+
              |                          |
              v                          v
      next running checkpoint      terminal boundary
              |               suspended/completed/error
              v                          |
       runUntilBoundary -----------------+
              |
              v
     versioned checkpoint + receipt proposal
```

The implementation is split into four units:

1. `game-schema/month-run` — IDs, commands, statuses and serialized checkpoint contracts.
2. `game-core/month-run/checkpoint` — canonical snapshot validation, hashing and restoration.
3. `game-core/month-run/transition` — exhaustive legal transition table and duplicate-decision semantics.
4. `game-core/month-run/runner` — bounded loop that advances scripted deterministic steps until a durable boundary.

The application and persistence packages are not modified in PR #17.

## 5. Public contracts

### 5.1 IDs and revisions

All identifiers are branded strings created through strict parsers. Revisions are non-negative safe integers.

```ts
type RequestId = string & RequestIdBrand;
type SaveId = string & SaveIdBrand;
type MonthRunId = string & MonthRunIdBrand;
type DecisionId = string & DecisionIdBrand;
type SaveRevision = number & SaveRevisionBrand;
type MonthRunRevision = number & MonthRunRevisionBrand;
```

IDs must contain 1–128 printable ASCII characters and cannot contain whitespace or NUL. Domain-generated IDs may use the existing `stableId` helper before parsing.

### 5.2 Commands

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

The plan and answer remain authoritative JSON payloads in PR #17. Typed gameplay schemas replace these payloads in later vertical slices without changing the command envelope.

### 5.3 Compatibility

```ts
type MonthRunCompatibilityV1 = Readonly<{
  checkpointSchema: "month-run-checkpoint-v1";
  rulesFingerprint: Fingerprint;
  contentFingerprint: Fingerprint;
  saveSchemaFingerprint: Fingerprint;
  determinismManifest: DeterminismManifest;
}>;
```

Compatibility is exact in PR #17. A mismatch returns `incompatible`; no migration is attempted.

### 5.4 Status and phase

```ts
type MonthRunStatus =
  | "ready"
  | "running"
  | "suspended"
  | "completed"
  | "committed"
  | "failed"
  | "incompatible"
  | "recovery-required"
  | "abandoned";

type MonthRunPhase =
  | "initialize"
  | "materialize"
  | "await-decision"
  | "resolve"
  | "finalize";
```

Phase is deliberately broad. Provider-specific stage names do not become persisted protocol states.

## 6. Checkpoint format

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

`checkpointHash` is calculated over every field except itself using:

```text
fingerprint("month-run-checkpoint-v1", checkpointWithoutHash)
```

The restore function verifies:

- exact schema version;
- strict authoritative values;
- valid IDs and revisions;
- legal status/phase combination;
- no duplicate materialization IDs;
- no duplicate accepted decision IDs;
- pending decision absent unless status is `suspended`;
- terminal result present only for `completed` or `committed`;
- committed state has no pending decision;
- checkpoint hash equality.

A verification failure yields a typed `MonthRunCheckpointError`; callers map corruption to `recovery-required` rather than rerolling.

## 7. Transition model

### 7.1 Legal path

```text
ready -> running
running -> running
running -> suspended
suspended -> running
running -> completed
completed -> committed
```

### 7.2 Exceptional path

From `ready`, `running` or `suspended`:

```text
-> failed
-> incompatible
-> recovery-required
-> abandoned
```

From `completed`:

```text
-> committed
-> recovery-required
```

Terminal states cannot transition further in the pure reducer, except an identical retry may return `duplicate` without changing the checkpoint.

### 7.3 Transition events

The reducer accepts a closed union:

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

Each accepted transition increments `runRevision` exactly once and produces a new checkpoint hash. Duplicate disposition does not increment revision or consume RNG.

## 8. Materialization and decision invariants

### 8.1 Materialized outcomes

```ts
type MaterializedOutcomeV1 = Readonly<{
  outcomeId: string;
  scope: string;
  payload: AuthoritativeJsonValue;
  payloadHash: Fingerprint;
}>;
```

The same `outcomeId` may be submitted again only with an identical payload hash. An identical retry is a duplicate; a different payload is `MaterializationConflict`.

### 8.2 Pending decisions

```ts
type PendingDecisionV1 = Readonly<{
  decisionId: DecisionId;
  kind: string;
  prompt: AuthoritativeJsonValue;
  answerSchemaFingerprint: Fingerprint;
}>;
```

Only one pending decision is permitted.

### 8.3 Accepted decisions

```ts
type AcceptedDecisionV1 = Readonly<{
  requestId: RequestId;
  decisionId: DecisionId;
  answer: AuthoritativeJsonValue;
  answerHash: Fingerprint;
}>;
```

A duplicate resume is handled as follows:

- same request ID, decision ID and answer hash: return duplicate with unchanged checkpoint;
- same request ID with another payload: `RequestPayloadConflict`;
- same decision ID with another answer: `DecisionAlreadyAnswered`;
- decision ID not equal to the pending decision: `UnexpectedDecision`;
- stale run revision: `RunRevisionConflict`.

## 9. Runner semantics

`runUntilBoundary` is a pure bounded loop over a supplied deterministic scripted program used by PR #17 tests and later adapted by gameplay providers.

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

- default maximum is 256 transitions;
- every accepted event must advance revision or produce a terminal boundary;
- the loop stops immediately on `suspended`, `completed`, `failed`, `incompatible`, `recovery-required` or `abandoned`;
- no step is called after a boundary result is known;
- exhausting the transition budget returns `TransitionBudgetExceeded` without mutating the input checkpoint;
- `committed` is never produced by `runUntilBoundary`; it requires persistence acknowledgement in PR #18.

The scripted step interface is a test/reference seam, not a general plugin system and not a persisted function identity.

## 10. In-memory reference repository

PR #17 includes a small in-memory repository solely to prove protocol semantics:

```ts
interface MonthRunReferenceRepository {
  begin(command: BeginMonthCommandV1): MonthRunCommandResult;
  resume(command: ResumeMonthCommandV1): MonthRunCommandResult;
  load(runId: MonthRunId): MonthRunCheckpointV1 | null;
}
```

It stores:

- checkpoints by run ID;
- one active run per save;
- command receipts by request ID and payload hash.

It is not exported from the production package root. PR #18 replaces it with Rust/SQLite persistence.

## 11. Error model

All expected failures are typed data, not thrown exceptions:

```ts
type MonthRunProtocolError =
  | InvalidCommand
  | RequestPayloadConflict
  | SaveRevisionConflict
  | RunRevisionConflict
  | ActiveRunExists
  | RunNotFound
  | IllegalTransition
  | UnexpectedDecision
  | DecisionAlreadyAnswered
  | MaterializationConflict
  | IncompatibleCheckpoint
  | CorruptedCheckpoint
  | TransitionBudgetExceeded;
```

Programmer defects in exhaustive-switch assertions may throw and must fail tests immediately.

## 12. Verification strategy

### 12.1 Transition table tests

Every status/event pair is table-tested. Legal pairs assert the exact next status and revision. Illegal pairs assert `IllegalTransition` and byte-identical input.

### 12.2 Checkpoint golden tests

A fixed checkpoint fixture asserts canonical JSON and checkpoint hash. Any intentional format change requires a new checkpoint version or an explicitly reviewed golden update.

### 12.3 Crash-boundary equivalence

A scripted run is executed uninterrupted. It is then repeated with serialize/restore after each accepted transition. Every restored execution must end with the identical terminal checkpoint hash and result.

This is the pure analogue of SQLite's official WAL crash tests, which repeatedly terminate a child during WAL writes, reopen the database, assert invariants and run `integrity_check`.

### 12.4 Duplicate and conflict tests

Tests cover duplicate begin, duplicate resume, same request ID with a different payload, stale revisions, repeated materialization IDs and repeated decision IDs.

### 12.5 Mutation safety

Inputs are frozen or reconstructed from canonical snapshots. Tests pass mutable caller objects, mutate them after command creation and assert stored checkpoints remain unchanged.

## 13. Deferred work

PR #17 does not include:

- `rusqlite`, migrations, WAL settings or Tauri IPC;
- hash-chained SQL journal tables;
- cross-process leases or run reclaim;
- fault injection by killing a process;
- save-state mutation or final atomic commit;
- MonthPlan gameplay schema;
- Learning, Project, Event or Career providers;
- automatic checkpoint migration;
- UI or report generation.

Those belong to PR #18 and PR #19 as previously approved.

## 14. Acceptance criteria

- The state machine is a closed discriminated union with exhaustive transition handling.
- All accepted transitions create a new immutable checkpoint and increment revision once.
- Duplicate commands and outcomes do not alter checkpoint or RNG state.
- Checkpoints verify their own canonical fingerprint.
- Restore at every durable boundary reproduces the uninterrupted terminal hash.
- No new runtime dependency is added.
- Existing determinism tests and all repository verification gates remain green.
- Final review explicitly checks compatibility surface, mutation safety, exhaustive transitions and absence of premature persistence/gameplay abstractions.
