---
title: "Crash-safe SQLite MonthRun persistence design"
type: plan
status: active
canon: true
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-20
---

# Crash-safe SQLite MonthRun persistence design

## 1. Goal

Implement the smallest production persistence boundary required to make the pure MonthRun protocol durable on Windows:

```text
validated TypeScript command
→ typed async Tauri command
→ one managed Rust writer
→ explicit SQLite transaction
→ durable receipt/checkpoint/commit marker
→ typed result
```

The slice persists authoritative snapshots and MonthRun checkpoints exactly. It does not calculate gameplay, interpret project/progression formulas or introduce unimplemented Career/Company schemas.

## 2. Active implementation profile

- Profile: **MVP Casual / Phase 0 Foundation**.
- Scope: save envelope, pending MonthRun, request receipts, committed-run marker, integrity and backup foundation.
- Excluded: gameplay providers, project/progression tables, read-model dashboards, mod ingest, cloud sync, generic workflow engine, full event sourcing, encryption and arbitrary SQL/debug capabilities.

## 3. External source audit

The implementation is informed by primary sources and mature open-source systems:

| Source | Applicable idea | Adaptation policy |
|---|---|---|
| SQLite WAL/atomic commit/backup documentation | WAL pragmas, explicit transactions, crash-point testing, Online Backup API | Directly follow public SQLite contracts; SQLite is public domain |
| rusqlite 0.40.1 | bundled SQLite, transaction and backup APIs, Windows portability | Direct dependency; MIT |
| Tauri 2 command/state documentation | typed commands, owned async arguments, background blocking work | Directly follow official API; permissive project dependency |
| Temporal / Durable Task / Restate / DBOS | durable boundaries, idempotency receipts, compatibility and replay discipline | Architectural study only; no embedded workflow engine and no copied incompatible code |
| SQLite walcrash tests | crash-before/after-commit test matrix | Reproduce project-specific scenarios in original Rust tests |

Code from incompatible or unknown licenses is not copied. Semantics and architecture may be independently reimplemented when they are general engineering ideas.

## 4. Dependency choice

Use:

```toml
rusqlite = { version = "=0.40.1", features = ["bundled", "backup", "limits"] }
sha2 = "=0.10.9"
serde = { version = "=1.0.229", features = ["derive"] }
serde_json = "=1.0.150"
```

Test-only:

```toml
tempfile = "=3.23.0"
```

`rusqlite 0.40.1` bundles SQLite 3.53.2, which is newer than the canonical 3.51.3 WAL-reset safety gate. System SQLite is not used.

## 5. Trust boundary

Renderer never receives:

- raw SQL execution;
- arbitrary filesystem paths;
- shell proxy;
- migration or backup internals;
- connection handles.

Rust accepts only versioned DTOs. All mutating commands carry a request ID and expected revision. All canonical payloads include:

```ts
type CanonicalPayloadV1 = Readonly<{
  schemaVersion: "canonical-payload-v1";
  json: string;
  sha256: string;
}>;
```

Rust verifies:

- exact DTO fields through `serde(deny_unknown_fields)`;
- identifier and revision bounds;
- payload byte limit;
- valid JSON;
- SHA-256 of the exact UTF-8 payload;
- operation-specific invariants.

TypeScript remains responsible for semantic schema validation and canonical serialization. Rust preserves the bytes and validates storage safety; it does not become a gameplay judge.

## 6. Database lifecycle

Open sequence:

1. open a dedicated database path owned by the application;
2. verify `sqlite_version() >= 3.51.3`;
3. set and read back:
   - `journal_mode = WAL`;
   - `synchronous = NORMAL`;
   - `foreign_keys = ON`;
   - `busy_timeout = 5000`;
4. run versioned migrations;
5. run bounded `PRAGMA quick_check(1)`;
6. expose the service only after every gate passes.

One `rusqlite::Connection` is owned by one persistence service behind a mutex. Database work runs through `tauri::async_runtime::spawn_blocking`; no SQLite call executes on the renderer/UI thread.

## 7. Schema v1

### `save_games`

```sql
CREATE TABLE save_games (
  save_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  snapshot_json TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL CHECK (length(snapshot_sha256) = 64),
  last_committed_run_id TEXT,
  CHECK (last_committed_run_id IS NULL OR length(last_committed_run_id) BETWEEN 1 AND 128)
) STRICT;
```

### `pending_month_runs`

```sql
CREATE TABLE pending_month_runs (
  run_id TEXT PRIMARY KEY,
  save_id TEXT NOT NULL UNIQUE REFERENCES save_games(save_id) ON DELETE CASCADE,
  base_save_revision INTEGER NOT NULL CHECK (base_save_revision >= 0),
  run_revision INTEGER NOT NULL CHECK (run_revision >= 0),
  status TEXT NOT NULL,
  checkpoint_json TEXT NOT NULL,
  checkpoint_sha256 TEXT NOT NULL CHECK (length(checkpoint_sha256) = 64),
  compatibility_json TEXT NOT NULL,
  compatibility_sha256 TEXT NOT NULL CHECK (length(compatibility_sha256) = 64)
) STRICT;
```

Only durable boundary statuses are stored: `ready`, `suspended`, `completed`, `failed`, `incompatible`, `recovery-required`, `abandoned`. Transient `running` is never committed by the persistence command.

### `request_receipts`

```sql
CREATE TABLE request_receipts (
  request_id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  save_id TEXT,
  run_id TEXT
) STRICT;
```

The exact normalized Rust-serialized request is stored. Reusing a request ID with byte-identical normalized content returns the stored result. Different content returns `RequestPayloadConflict` without mutation.

### `committed_month_runs`

```sql
CREATE TABLE committed_month_runs (
  run_id TEXT PRIMARY KEY,
  save_id TEXT NOT NULL REFERENCES save_games(save_id),
  base_save_revision INTEGER NOT NULL,
  committed_save_revision INTEGER NOT NULL,
  final_checkpoint_sha256 TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  result_json TEXT NOT NULL
) STRICT;
```

## 8. Operations

### Create save

- exact request replay returns the stored receipt;
- duplicate save ID under another request returns `SaveAlreadyExists`;
- initial revision is zero.

### Begin MonthRun

Within one immediate transaction:

1. replay/conflict-check request receipt;
2. load save and verify expected revision;
3. verify no active pending run exists for the save;
4. insert the durable initial checkpoint;
5. insert the result receipt;
6. commit.

### Store boundary checkpoint

Within one immediate transaction:

1. replay/conflict-check request receipt;
2. load pending run;
3. verify expected stored run revision;
4. verify save/run/base revision identity;
5. require a strictly newer checkpoint revision;
6. require a durable boundary status;
7. update checkpoint and insert receipt atomically.

### Commit MonthRun

Within one immediate transaction:

1. replay/conflict-check receipt;
2. verify pending run exists and is `completed`;
3. verify save revision equals base revision;
4. verify no committed marker exists for the run;
5. replace the authoritative snapshot;
6. increment save revision exactly once;
7. insert immutable committed marker/result;
8. delete pending run;
9. insert receipt;
10. commit.

A crash before commit leaves the old save and pending run. A crash after commit leaves the new save, committed marker and receipt with no pending run. Retrying the same request returns the original receipt.

## 9. Error contract

Stable public codes:

```text
InvalidCommand
PayloadTooLarge
PayloadHashMismatch
StorageUnavailable
UnsupportedSqliteVersion
IntegrityCheckFailed
RequestPayloadConflict
SaveAlreadyExists
SaveNotFound
SaveRevisionConflict
ActiveRunExists
RunNotFound
RunRevisionConflict
RunAlreadyCommitted
InvalidRunBoundary
CorruptedStoredPayload
```

Internal SQL paths and user filesystem paths are not exposed in player-facing messages.

## 10. Backup foundation

Provide a repository/service operation using rusqlite Online Backup API:

1. serialize against commit/migration/restore using the same service lock;
2. copy into a caller-independent application-owned temporary path;
3. close destination;
4. open destination read-only;
5. run `quick_check(1)` and `foreign_key_check`;
6. return verified backup metadata.

Retention UI, manual slot naming and restore UX remain later work. The repository test must prove that a backup contains both the save and active pending MonthRun.

## 11. Tauri integration

Commands are asynchronous and accept owned DTOs. The command clones an `Arc<Mutex<PersistenceService>>`, then delegates SQLite work to `spawn_blocking`.

Initial command surface:

```text
persistence_create_save_v1
persistence_load_save_v1
persistence_begin_month_run_v1
persistence_load_active_month_run_v1
persistence_store_month_run_boundary_v1
persistence_commit_month_run_v1
persistence_create_backup_v1
```

The main capability remains `core:default`; custom commands are registered through `generate_handler!` and do not grant SQL/filesystem plugins.

## 12. Verification matrix

Required before merge:

- TypeScript contract parser and exact JSON fixture tests;
- Rust DTO fixture parity;
- SQLite version and pragma read-back;
- migration idempotency;
- exact request replay and request-ID conflict;
- one-active-run uniqueness;
- stale save/run revision rejection;
- close/reopen at suspended decision;
- boundary checkpoint update without reroll;
- atomic commit and one revision increment;
- duplicate commit replay;
- rollback after an injected SQL constraint failure;
- crash-equivalent reopen before and after commit;
- corrupted payload detection;
- Online Backup API verification;
- no raw SQL/shell/arbitrary filesystem capability;
- full Windows self-hosted `pnpm verify`.

## 13. Deferred work

- gameplay-specific normalized project/progression tables;
- migration corpus beyond schema v1;
- restore/Safe Mode UI;
- rolling retention policy;
- encrypted saves;
- read projections;
- long-save performance benchmark;
- mod/import activation;
- Career/Company/Open Source schemas.
