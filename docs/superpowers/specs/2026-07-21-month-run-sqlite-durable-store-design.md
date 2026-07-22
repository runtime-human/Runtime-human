---
title: "SQLite Durable Store design"
type: plan
status: active
canon: true
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-21
---

# SQLite Durable Store design

## 1. Decision

Runtime Human uses one application-owned SQLite database as the only authoritative durable store. The renderer never executes SQL and never writes save state directly.

```text
React / TypeScript application
        |
        | versioned typed Tauri command
        v
Rust persistence facade
        |
        | bounded command queue
        v
single database worker thread
        |
        | explicit SQL + short transactions
        v
rusqlite + bundled SQLite
```

The store persists the exact canonical bytes produced by the TypeScript deterministic core. Rust verifies envelopes, hashes, revisions and storage invariants, but does not calculate gameplay.

This design replaces the earlier stacked draft. The earlier draft remains available at `archive/month-run-persistence-stacked-20260721` as research material only. Its mutex ownership, `synchronous=NORMAL`, manual CI status publication and split pending/committed table model are not normative.

## 2. Scope

### 2.1. Included in PR #18

- versioned TypeScript persistence DTOs and parsers;
- shared TypeScript/Rust canonical fixture;
- one dedicated SQLite worker and bounded queue;
- database path ownership, open, close and read-only open;
- bundled SQLite version gate;
- defensive connection configuration;
- embedded migrations and migration manifest fingerprint;
- STRICT schema v1;
- save creation and loading;
- MonthRun creation, loading and checkpoint compare-and-swap;
- one active MonthRun per save;
- durable request receipts;
- compact hash-linked durable-boundary journal;
- atomic completed MonthRun commit;
- Online Backup API foundation;
- startup integrity and recovery classification;
- typed Tauri commands and a TypeScript invoke adapter;
- redacted diagnostics;
- reopen, rollback and crash-boundary verification around implemented operations.

### 2.2. Explicitly excluded

- gameplay formulas or MonthRun execution in Rust;
- arbitrary SQL, shell or filesystem commands exposed to the renderer;
- an ORM, query builder, connection pool or generic repository framework;
- full event sourcing or a generic workflow engine;
- Career, Company, Product, Open Source or NPC domain tables;
- cloud synchronization;
- encryption at rest;
- backup retention UI, restore wizard and user-selected backup paths;
- analytics/read-model database;
- background autosave policy beyond explicit durable commands.

## 3. Source audit and adaptation policy

| Source | Useful mechanism | Runtime Human adaptation | License/copy policy |
|---|---|---|---|
| SQLite official WAL, transaction, pragma and backup documentation | WAL lifecycle, `BEGIN IMMEDIATE`, durability semantics, Online Backup API | follow the public contracts directly | SQLite public domain |
| `rusqlite 0.40.1` | bundled SQLite, explicit transactions, statement cache, backup API | direct dependency with an explicit feature set | MIT |
| `rusqlite_migration 2.6.0` | atomic ordered migrations using `user_version` | use for migration application; add an app-owned manifest hash | MIT |
| Tauri 2 official command/state documentation | typed commands, managed state, async IPC lifecycle | one managed persistence handle and a closed command surface | permissive project dependency |
| GitButler | database handle, explicit immediate transactions, existing-file read-only open | independently implement the small lifecycle pattern | Fair Source: ideas only, no copied code |
| Yaak | repository operations receive an already-open transaction | use explicit transaction ownership without its pool/query abstractions | MIT; independent implementation preferred |
| Silvermine Tauri SQLite plugin | exclusive writer, path validation, bounded resources, cleanup | adopt resource limits and exclusive-writer discipline, not frontend SQL | MIT |
| SQLite `walcrash` tests and Turso deterministic testing | crash-point and reopen methodology | project-specific failpoint/child-process tests | methodology only |
| Temporal, Durable Task, Restate and DBOS | idempotency keys and durable-operation receipts | retain receipt semantics without replaying generic workflow history | architecture study only |

The repository does not copy AGPL, Fair Source or unknown-license implementation code. General engineering patterns are independently implemented and reviewed against the Runtime Human contracts.

## 4. Dependency profile

### 4.1. Runtime dependencies

```toml
rusqlite = {
  version = "=0.40.1",
  default-features = false,
  features = ["bundled", "backup", "cache", "limits"]
}
rusqlite_migration = "=2.6.0"
serde = { version = "=1.0.229", features = ["derive"] }
serde_json = "=1.0.150"
sha2 = "=0.11.0"
thiserror = "=2.0.19"
tracing = "=0.1.44"
```

`tracing-subscriber` is not required in the persistence crate unless the desktop shell begins owning subscriber initialization in this PR. The store emits spans/events through `tracing`; application-wide formatting remains a shell concern.

### 4.2. Test dependencies

```toml
tempfile = "=3.27.0"
```

`proptest` and a failpoint crate are deferred until the production operations exist. The initial crash matrix uses a tiny project-owned failpoint enum and child-process harness, avoiding a test framework becoming the center of the implementation.

### 4.3. Why these choices

- `default-features = false` avoids the default SQLite WASM FFI dependency in a native desktop binary.
- `bundled` fixes the SQLite engine used by the application instead of trusting an arbitrary system DLL.
- `backup` exposes the Online Backup API.
- `cache` allows explicit prepared-statement reuse on the single connection.
- `limits` permits runtime payload/SQL limits.
- SQLx is not used because async pooling does not improve a one-writer local workload and obscures connection/transaction ownership.
- `tokio-rusqlite`, `r2d2_sqlite` and `deadpool-sqlite` are not used because the required actor is smaller and has a closed command vocabulary.
- SeaQuery, Diesel and SeaORM are not used because the critical CAS SQL should remain visible and auditable.

## 5. Trust boundary

The renderer can request domain operations only:

```text
persistence_create_save_v1
persistence_load_save_v1
persistence_begin_month_run_v1
persistence_load_month_run_v1
persistence_load_active_month_run_v1
persistence_store_month_run_boundary_v1
persistence_commit_month_run_v1
persistence_create_backup_v1
persistence_get_recovery_status_v1
```

No command accepts:

- SQL text;
- a database path;
- a backup destination path;
- a migration identifier;
- a raw transaction handle;
- a shell command;
- a generic JSON patch.

All command arguments are owned, versioned DTOs with `serde(deny_unknown_fields)`. Every mutating command carries a bounded request ID. Every optimistic mutation carries the expected revision and, where applicable, the expected checkpoint hash.

## 6. Canonical payload envelope

Rust stores authoritative JSON as exact UTF-8 bytes wrapped by:

```ts
type CanonicalPayloadV1 = Readonly<{
  schemaVersion: "canonical-payload-v1";
  json: string;
  sha256: Sha256Hex;
}>;
```

Validation order:

1. exact envelope fields and schema marker;
2. UTF-8 byte limit, initially 4 MiB;
3. valid JSON text;
4. lowercase 64-character SHA-256;
5. recompute SHA-256 over the exact UTF-8 bytes;
6. operation-specific identity checks against the envelope.

Rust does not reserialize gameplay payloads before storage. Reserializing would make another serializer part of save compatibility. It may deserialize a minimal identity projection for cross-field validation.

## 7. Worker ownership and queue

### 7.1. Handle

```rust
pub(crate) struct PersistenceHandle {
    sender: SyncSender<DatabaseCommand>,
    worker: Option<JoinHandle<()>>,
}
```

The implementation may use `std::sync::mpsc::sync_channel` initially. The channel is bounded to 64 commands. This gives backpressure without adding an async runtime dependency solely for queueing.

Each command owns a one-response sender. The async Tauri facade delegates the blocking send/receive operation through `tauri::async_runtime::spawn_blocking`.

### 7.2. Worker

The worker thread exclusively owns:

- the writable `rusqlite::Connection`;
- prepared-statement cache;
- migration execution;
- transactions;
- backup serialization;
- clean-shutdown marker updates.

No `Arc<Mutex<Connection>>` is exported. No repository function can acquire another connection implicitly.

### 7.3. Queue semantics

- full queue returns `PersistenceOverloaded`;
- closed queue returns `PersistenceUnavailable`;
- command response cancellation does not cancel a transaction already executing;
- after commit, a dropped caller may retry with the same request ID and receive the stored receipt;
- shutdown rejects new commands, drains the current command, writes the clean-shutdown marker and joins the thread;
- worker panic is converted to an unavailable state and never silently respawned with uncertain ownership.

## 8. Database path and lifecycle

The writable path is resolved once from Tauri application data through the Rust setup path. It is never supplied by the renderer.

Open/create sequence:

1. resolve and create the application-owned directory;
2. verify the target is a normal file path, not a directory or traversal result;
3. open the connection with create/read/write flags;
4. verify bundled SQLite version is at least 3.51.3;
5. apply connection limits and defensive configuration;
6. configure and read back required pragmas;
7. inspect `user_version` and migration metadata;
8. create a verified pre-migration backup when upgrading a non-empty database;
9. apply migrations in one immediate transaction;
10. verify migration manifest fingerprint;
11. run `quick_check(1)` and `foreign_key_check`;
12. validate application metadata;
13. set `clean_shutdown = false`;
14. expose the handle only after every gate succeeds.

Read-only open sequence:

1. require an existing regular file;
2. open with read-only and no-create flags;
3. do not migrate or mutate pragmas/metadata;
4. read schema version and manifest;
5. classify newer schema as `IncompatibleSchema` rather than corruption;
6. run bounded integrity checks where supported;
7. expose only export/diagnostic read operations.

## 9. SQLite configuration

Required writable connection settings:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Required database configuration:

- defensive mode enabled;
- trusted schema disabled;
- double-quoted string literals disabled for DDL and DML;
- extension loading unavailable;
- no attached database support through public commands.

All settings are read back and verified. Refusal to enter WAL or FULL is a startup failure.

The store keeps SQLite's default automatic WAL checkpoint policy initially. It does not issue `TRUNCATE` on every commit or every startup. Controlled shutdown may request a PASSIVE checkpoint and record its result without treating an incomplete passive checkpoint as corruption.

## 10. Migration model

`rusqlite_migration` owns ordered migration application and `PRAGMA user_version`. Runtime Human additionally owns a deterministic migration manifest fingerprint because `user_version` alone cannot detect edited historical SQL.

Manifest input:

```text
migration number
+ stable migration name
+ exact SQL bytes
+ ordered separator
```

The SHA-256 is compiled into the binary and stored in `app_metadata` after successful migration.

Open rules:

| Database state | Action |
|---|---|
| new database | apply all migrations, store manifest |
| supported older version | verified backup, apply pending migrations, store new manifest |
| current version + matching manifest | normal open |
| current version + different manifest | `MigrationHistoryMismatch` |
| newer version | read-only incompatible mode |
| malformed metadata | recovery-required classification |

A migration is never silently rerun after an ambiguous failure. SQLite transaction rollback plus the backup protects the previous schema; startup inspects both version and manifest before deciding the next action.

## 11. Schema v1

All application tables are `STRICT`. JSON checks are used only where supported by the bundled engine and where they do not make recovery of malformed payloads impossible; authoritative hashes remain the application-level integrity boundary.

### 11.1. `app_metadata`

```sql
CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
) STRICT;
```

Reserved keys:

```text
migration_manifest_sha256
save_schema_fingerprint
clean_shutdown
last_opened_app_version
```

### 11.2. `save_games`

```sql
CREATE TABLE save_games (
    save_id TEXT PRIMARY KEY NOT NULL,
    revision INTEGER NOT NULL CHECK (revision BETWEEN 0 AND 9007199254740991),
    snapshot_json TEXT NOT NULL,
    snapshot_sha256 TEXT NOT NULL CHECK (
        length(snapshot_sha256) = 64
        AND snapshot_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    save_schema_fingerprint TEXT NOT NULL CHECK (
        length(save_schema_fingerprint) = 64
        AND save_schema_fingerprint NOT GLOB '*[^0-9a-f]*'
    ),
    last_committed_run_id TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    updated_sequence INTEGER NOT NULL CHECK (updated_sequence >= created_sequence),
    CHECK (last_committed_run_id IS NULL OR length(last_committed_run_id) BETWEEN 1 AND 128)
) STRICT;
```

`created_sequence` and `updated_sequence` are monotonic application operation counters, not wall-clock timestamps. Authoritative storage does not call system time.

### 11.3. `month_runs`

```sql
CREATE TABLE month_runs (
    run_id TEXT PRIMARY KEY NOT NULL CHECK (length(run_id) BETWEEN 1 AND 128),
    save_id TEXT NOT NULL REFERENCES save_games(save_id) ON DELETE RESTRICT,
    base_save_revision INTEGER NOT NULL CHECK (base_save_revision BETWEEN 0 AND 9007199254740991),
    run_revision INTEGER NOT NULL CHECK (run_revision BETWEEN 0 AND 9007199254740991),
    status TEXT NOT NULL CHECK (status IN (
        'ready', 'suspended', 'completed', 'committed',
        'failed', 'incompatible', 'recovery-required', 'abandoned'
    )),
    checkpoint_json TEXT NOT NULL,
    checkpoint_sha256 TEXT NOT NULL CHECK (
        length(checkpoint_sha256) = 64
        AND checkpoint_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    previous_checkpoint_sha256 TEXT,
    compatibility_json TEXT NOT NULL,
    compatibility_sha256 TEXT NOT NULL CHECK (
        length(compatibility_sha256) = 64
        AND compatibility_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    committed_save_revision INTEGER CHECK (
        committed_save_revision IS NULL
        OR committed_save_revision BETWEEN 0 AND 9007199254740991
    ),
    result_json TEXT,
    result_sha256 TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    updated_sequence INTEGER NOT NULL CHECK (updated_sequence >= created_sequence),
    CHECK (
        previous_checkpoint_sha256 IS NULL
        OR (length(previous_checkpoint_sha256) = 64
            AND previous_checkpoint_sha256 NOT GLOB '*[^0-9a-f]*')
    ),
    CHECK (
        (status = 'committed' AND committed_save_revision IS NOT NULL
            AND result_json IS NOT NULL AND result_sha256 IS NOT NULL)
        OR
        (status <> 'committed' AND committed_save_revision IS NULL)
    )
) STRICT;
```

One active run per save:

```sql
CREATE UNIQUE INDEX ux_month_runs_one_active_per_save
ON month_runs(save_id)
WHERE status IN ('ready', 'suspended', 'completed');
```

Transient `running` checkpoints are never persisted. Terminal historical runs remain in one table instead of being moved between pending/committed tables; this preserves identity and simplifies atomic state transitions.

### 11.4. `request_receipts`

```sql
CREATE TABLE request_receipts (
    request_id TEXT PRIMARY KEY NOT NULL CHECK (length(request_id) BETWEEN 1 AND 128),
    operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 64),
    payload_sha256 TEXT NOT NULL CHECK (
        length(payload_sha256) = 64
        AND payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    result_json TEXT NOT NULL,
    result_sha256 TEXT NOT NULL CHECK (
        length(result_sha256) = 64
        AND result_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    save_id TEXT,
    run_id TEXT,
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    CHECK (save_id IS NULL OR length(save_id) BETWEEN 1 AND 128),
    CHECK (run_id IS NULL OR length(run_id) BETWEEN 1 AND 128)
) STRICT;
```

The receipt stores the normalized command payload hash, not raw arbitrary SQL and not a Rust debug representation. Identical request ID + payload hash returns the stored result. Same request ID + another payload hash returns `RequestPayloadConflict` before any mutation.

### 11.5. `month_run_journal`

```sql
CREATE TABLE month_run_journal (
    run_id TEXT NOT NULL REFERENCES month_runs(run_id) ON DELETE RESTRICT,
    sequence INTEGER NOT NULL CHECK (sequence >= 0),
    event_kind TEXT NOT NULL CHECK (length(event_kind) BETWEEN 1 AND 64),
    previous_entry_sha256 TEXT,
    entry_sha256 TEXT NOT NULL CHECK (
        length(entry_sha256) = 64
        AND entry_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    checkpoint_sha256 TEXT NOT NULL CHECK (
        length(checkpoint_sha256) = 64
        AND checkpoint_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    created_sequence INTEGER NOT NULL CHECK (created_sequence >= 0),
    PRIMARY KEY (run_id, sequence),
    CHECK (
        previous_entry_sha256 IS NULL
        OR (length(previous_entry_sha256) = 64
            AND previous_entry_sha256 NOT GLOB '*[^0-9a-f]*')
    )
) STRICT, WITHOUT ROWID;
```

The journal is not full event sourcing. It records only durable boundaries:

```text
created
suspended
completed
failed
incompatible
recovery-required
abandoned
committed
```

Accepted decisions are already included in the persisted checkpoint. A journal row is created whenever that checkpoint becomes a durable boundary.

## 12. Transaction ownership

Repository functions that participate in a mutation receive `&Transaction`; they never open or commit their own transaction.

```rust
fn load_receipt(tx: &Transaction<'_>, request_id: &str) -> Result<Option<Receipt>>;
fn insert_receipt(tx: &Transaction<'_>, receipt: &Receipt) -> Result<()>;
fn load_month_run(tx: &Transaction<'_>, run_id: &str) -> Result<Option<StoredMonthRun>>;
fn update_checkpoint_cas(tx: &Transaction<'_>, command: &StoreBoundary) -> Result<()>;
```

Every write operation begins with `TransactionBehavior::Immediate`. This discovers writer contention before intermediate reads and ensures the receipt check and mutation observe one transaction snapshot.

## 13. Operation protocols

### 13.1. Create save

In one immediate transaction:

1. classify existing request receipt;
2. verify no save with the same ID exists;
3. allocate one monotonic operation sequence;
4. insert revision-zero save and schema fingerprint;
5. build a versioned result;
6. insert receipt with result bytes/hash;
7. commit.

### 13.2. Begin MonthRun

In one immediate transaction:

1. classify receipt;
2. load save and compare expected save revision;
3. validate the ready checkpoint identity and compatibility envelope;
4. rely on the partial unique index to enforce one active run;
5. insert `month_runs` row;
6. append `created` journal entry;
7. insert receipt;
8. commit.

### 13.3. Persist durable boundary

Required command fields include:

- expected run revision;
- expected checkpoint SHA-256;
- next run revision;
- next checkpoint SHA-256;
- previous checkpoint SHA-256;
- durable status.

CAS SQL:

```sql
UPDATE month_runs
SET run_revision = :next_revision,
    status = :status,
    checkpoint_json = :checkpoint_json,
    checkpoint_sha256 = :next_hash,
    previous_checkpoint_sha256 = :expected_hash,
    updated_sequence = :sequence
WHERE run_id = :run_id
  AND save_id = :save_id
  AND run_revision = :expected_revision
  AND checkpoint_sha256 = :expected_hash
  AND status IN ('ready', 'suspended');
```

Exactly one changed row means success. Zero rows triggers a fresh read that distinguishes `RunNotFound`, terminal run, revision conflict and hash conflict. More than one row is an internal invariant failure.

The transaction then appends the journal entry and receipt before commit.

### 13.4. Resume receipt

The application core accepts the decision and produces a new checkpoint before calling storage. Persistence never replays or interprets the answer. It stores the resulting next durable checkpoint with the same CAS protocol. Retrying the outer command returns the stored receipt without running RNG or the MonthRun program again.

### 13.5. Atomic completed-run commit

In one immediate transaction:

1. classify receipt;
2. load run and save;
3. require run status `completed`;
4. compare expected run revision and checkpoint hash;
5. compare save revision with the run's base save revision;
6. validate new canonical save snapshot/result envelopes;
7. update `save_games` through revision CAS;
8. update the same `month_runs` row to `committed`, preserving final checkpoint and setting committed save revision/result;
9. append `committed` journal entry;
10. insert receipt;
11. commit.

After any process or power failure the visible state is one of:

- old save + completed run and no commit receipt;
- new save + committed run + journal entry + receipt.

No state where only part of the commit is durable is valid.

## 14. Receipt and result format

Receipts are durable API responses. The stored result is a closed versioned DTO, canonicalized before hashing. It never contains:

- SQL text;
- absolute paths;
- stack traces;
- raw SQLite messages;
- non-deterministic timestamps.

A command completed in SQLite but whose IPC response was lost is recovered by the same request ID. A caller must not generate a new request ID merely because a response timed out.

## 15. Error contract

Stable public codes:

```text
InvalidCommand
PayloadTooLarge
PayloadHashMismatch
PersistenceOverloaded
PersistenceUnavailable
StorageUnavailable
UnsupportedSqliteVersion
IncompatibleSchema
MigrationHistoryMismatch
IntegrityCheckFailed
RequestPayloadConflict
SaveAlreadyExists
SaveNotFound
SaveRevisionConflict
ActiveRunExists
RunNotFound
RunRevisionConflict
CheckpointHashConflict
RunAlreadyCommitted
InvalidRunBoundary
CorruptedStoredPayload
BackupFailed
RecoveryRequired
```

Internal errors retain a source chain for local diagnostics. IPC errors expose the stable code and a safe message. SQLite extended codes may be logged, but SQL and filesystem paths are redacted.

## 16. Backup and recovery

### 16.1. Backup

Backup is executed by the same worker so it cannot race an authoritative write on that connection.

1. select an application-owned destination path;
2. reject an existing destination unless the operation explicitly owns replacement;
3. open destination connection;
4. execute the rusqlite Online Backup API incrementally;
5. close destination;
6. reopen destination read-only;
7. verify schema, manifest, `quick_check(1)` and `foreign_key_check`;
8. verify requested save and any active MonthRun are present;
9. return safe metadata and an internal backup identifier.

Raw file copy of the database while WAL is active is forbidden.

### 16.2. Unclean shutdown

On writable open:

1. read previous `clean_shutdown` value;
2. set it to false before serving commands;
3. if previous value was not true, run the expanded application integrity path;
4. inspect every active MonthRun payload hash and journal tail;
5. classify incompatible, corrupt or recovery-required records without silently rewriting them.

Controlled shutdown writes `clean_shutdown = true` in an immediate transaction after the queue is drained.

### 16.3. Recovery status

The first PR exposes a typed status only:

```text
healthy
unclean-but-valid
newer-schema-read-only
migration-history-mismatch
corrupted
backup-available
```

Restore UI and automatic replacement are later work. The store must never overwrite the primary database merely because a backup exists.

## 17. Tauri lifecycle

During `setup`:

1. resolve the application data path;
2. construct `PersistenceHandle`;
3. wait for worker startup result;
4. call `app.manage(handle)` only after a successful open;
5. register all commands in one `generate_handler!` invocation.

Commands are async and take owned DTOs. They copy/clone only the small sender handle, never the connection. Blocking queue interaction is performed outside the UI thread.

On application exit the shell requests worker shutdown and joins it. If graceful shutdown cannot complete, the next startup treats the prior session as unclean.

## 18. TypeScript application adapter

`game-persistence-contracts` owns DTOs and parsers. `game-application` owns an adapter over a tiny invoke port:

```ts
type InvokePort = <T>(command: string, arguments_: Readonly<Record<string, unknown>>) => Promise<T>;
```

The application package does not import `@tauri-apps/api`. The desktop composition root supplies the real invoke implementation.

Responsibilities:

- parse/normalize outgoing commands;
- use exact command names;
- parse closed Rust responses;
- preserve request IDs across retries;
- map safe persistence errors to application errors;
- never fall back to direct SQL or generic invoke.

## 19. Security and resource limits

- database and backup paths are application-owned;
- all SQL values use bound parameters;
- no dynamic table/column names from payloads;
- canonical payload is capped at 4 MiB;
- result payload is bounded independently;
- queue capacity is 64;
- SQLite busy timeout is 5 seconds;
- statement and column limits are configured where supported;
- read lists use explicit limits/keyset pagination when introduced;
- diagnostics redact paths and payload contents;
- no remote code, extension loading or attached databases;
- self-hosted workflows remain read-only and reject fork PR execution.

## 20. Verification strategy

Verification follows implementation, not the reverse. Each production block receives the smallest evidence necessary to prove its boundary.

### 20.1. Fast contract gates

- TypeScript parser exact-field and bound checks;
- shared TypeScript/Rust fixture parity;
- exact payload SHA-256 verification.

### 20.2. File-backed database gates

- version/pragma read-back;
- migration idempotency and manifest mismatch;
- STRICT constraints and partial unique index;
- receipt replay/conflict;
- save and checkpoint CAS;
- atomic commit rollback;
- close/reopen after each durable boundary;
- backup verification.

`:memory:` databases are not sufficient for WAL, reopen, backup or file-lock behavior.

### 20.3. Crash gates

After the production transaction path is stable, a child process exits at selected boundaries:

```text
before_begin_immediate
after_receipt_lookup
after_checkpoint_cas
after_save_cas
after_run_committed
after_receipt_insert
before_commit
after_commit_before_reply
```

The parent reopens the database and checks:

- `quick_check` is `ok`;
- no foreign-key violations;
- save revision advanced zero or one time;
- at most one receipt per request;
- committed run matches the new save revision;
- uncommitted run did not change the save;
- checkpoint and journal chains are continuous.

### 20.4. Full gate

Final PR head must pass:

```text
pnpm verify
```

on the trusted self-hosted Windows runner, plus documentation freshness and external review.

## 21. Performance budget

Initial targets for a normal local database on the connected Windows machine:

- worker startup/open without migration: under 100 ms after OS cache warm-up;
- point load of one save or run: under 10 ms p95;
- durable boundary transaction: under 25 ms p95 excluding deliberate storage stalls;
- final commit: under 50 ms p95;
- queue memory: bounded by 64 command envelopes;
- no connection pool and no idle background thread beyond the one worker;
- no payload clone larger than one canonical command/result pair across a transaction.

These are measurement gates, not promises embedded in authoritative behavior. Optimization follows profiling.

## 22. Evolution rules

- historical migration SQL is immutable after merge;
- changing checkpoint semantics requires a new checkpoint schema, not a migration that guesses intent;
- changing a persistence command shape requires a new command schema marker;
- adding a new table requires a numbered migration and manifest update;
- renderer SQL remains forbidden even for convenience;
- a second read connection requires measured contention and a separate decision;
- encryption, cloud sync and mod activation require dedicated threat models;
- the pure MonthRun protocol remains the source of gameplay truth.

## 23. Definition of done

PR #18 is complete when:

- the database is exclusively owned by one bounded worker;
- schema v1 and migration manifest open/reopen deterministically;
- WAL, FULL, foreign keys and busy timeout are verified;
- save creation/loading is durable and idempotent;
- MonthRun begin/load/CAS preserves the PR #17 checkpoint contract;
- one active run per save is enforced by SQLite and application errors;
- identical request retries replay a receipt without rerunning work;
- final commit is all-or-nothing and increments the save revision once;
- the compact journal links every durable boundary;
- Online Backup API produces a verified snapshot;
- unclean startup is classified safely;
- Tauri exposes only typed domain commands;
- no raw SQL, generic workflow engine or gameplay calculation enters Rust;
- the final Windows verification and review are green.
