---
title: "SQLite Durable Store implementation plan"
type: plan
status: completed
canon: false
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-28
---

# SQLite Durable Store implementation plan

> Execute with `superpowers:executing-plans`. Use the smallest focused verification that proves each production boundary, then run the full trusted Windows gate before review and merge.

## Goal

Deliver a production Rust/SQLite/Tauri persistence layer for the merged MonthRun protocol. The store must make save snapshots, checkpoint boundaries, request receipts and final month commits durable without moving gameplay logic into Rust.

The authoritative design is:

`docs/superpowers/specs/2026-07-21-month-run-sqlite-durable-store-design.md`

## Delivery principles

1. Production path first: contracts, worker, database lifecycle, schema, repositories, transactions, backup and IPC.
2. Tests are narrow executable evidence for a completed boundary, not the main deliverable.
3. No generic abstractions before two real call sites require them.
4. Critical SQL remains explicit and local to the repository operation.
5. No renderer SQL, paths, transaction handles or generic JSON patches.
6. Every mutation is one `BEGIN IMMEDIATE` transaction containing receipt classification and result persistence.
7. Every optimistic MonthRun mutation compares both revision and checkpoint hash.
8. Historical migration bytes become immutable after merge.
9. CI/workflow changes are excluded unless the branch cannot be verified with the already-merged read-only self-hosted workflow.
10. The branch remains draft until the complete store and Tauri boundary are executable.

## Baseline

- Base commit: PR #17 squash merge `66d9ecbb9eaf7abd3b72d915883ef1746946d52f`.
- Rust: 1.97, edition 2024.
- Tauri: 2.11.5.
- Node: 24.
- pnpm: 11.11.0.
- TypeScript: 7.0.2.
- Existing `game-persistence-contracts` package is empty.
- Existing Tauri shell has no persistence module or managed state.
- Existing MonthRun protocol owns checkpoint creation, validation and gameplay transitions.

## Source decisions

### Direct dependencies

| Dependency | Exact version | Features | Purpose |
|---|---:|---|---|
| `rusqlite` | 0.40.1 | `default-features=false`, `bundled`, `backup`, `cache`, `limits` | SQLite ownership, transactions, statement cache, backup |
| `rusqlite_migration` | 2.6.0 | none | ordered atomic migrations and `user_version` |
| `serde` | 1.0.229 | derive | IPC/storage DTOs |
| `serde_json` | 1.0.150 | none | exact JSON envelope validation and result bytes |
| `sha2` | 0.11.0 | none | payload, manifest, receipt and journal hashes |
| `thiserror` | 2.0.19 | none | internal error source chains |
| `tracing` | 0.1.44 | none | redacted spans/events |
| `tempfile` | 3.27.0 | dev only | file-backed database verification |

### Deferred dependencies

- `tracing-subscriber`: desktop-wide logging configuration is a separate shell concern.
- `proptest`: add after stable production commands exist and model generation provides value.
- `fail`: first use a project-owned failpoint enum; add a crate only if child-process coverage becomes cumbersome.
- `tokio`: Tauri already supplies an async runtime; the worker uses a bounded standard sync channel.

## Target file map

```text
packages/game-persistence-contracts/src/
├── contracts.ts
├── parsers.ts
├── canonical-payload.ts
├── responses.ts
└── index.ts

packages/game-application/src/
├── persistence-port.ts
├── persistence-service.ts
└── index.ts

fixtures/persistence/
└── month-run-persistence-v1.json

apps/desktop/src-tauri/src/persistence/
├── mod.rs
├── error.rs
├── contracts.rs
├── hash.rs
├── migrations.rs
├── database.rs
├── worker.rs
├── repositories/
│   ├── mod.rs
│   ├── metadata.rs
│   ├── receipts.rs
│   ├── saves.rs
│   ├── month_runs.rs
│   └── journal.rs
├── operations/
│   ├── mod.rs
│   ├── create_save.rs
│   ├── load.rs
│   ├── begin_month_run.rs
│   ├── store_boundary.rs
│   ├── commit_month_run.rs
│   └── backup.rs
├── commands.rs
└── recovery.rs
```

The exact split may remain flatter until files become difficult to review. Do not create empty architecture folders merely to match the map.

---

# Phase A — Public contracts and exact bytes

## Task A1 — Define persistence DTOs

### Files

- Create `packages/game-persistence-contracts/src/contracts.ts`.
- Create `packages/game-persistence-contracts/src/responses.ts` if response unions make `contracts.ts` unwieldy.
- Modify `packages/game-persistence-contracts/src/index.ts`.

### Production work

Define:

- `Sha256Hex`;
- `CanonicalPayloadV1`;
- `DurableMonthRunStatus`;
- create/load save commands and records;
- begin/load/store/commit MonthRun commands and records;
- backup/recovery queries and metadata;
- closed mutation/query result unions;
- stable persistence error codes.

`StoreMonthRunBoundaryCommandV1` must contain:

```ts
expectedRunRevision
expectedCheckpointSha256
runRevision
status
checkpoint
```

The expected hash is mandatory; the old stacked DTO compared revision only and must not be restored.

`CommitPersistedMonthRunCommandV1` must contain:

```ts
expectedSaveRevision
expectedRunRevision
expectedCheckpointSha256
snapshot
result
```

### Constraints

- reuse branded IDs/revisions from `game-schema`;
- no wall-clock timestamp fields;
- no raw path fields;
- no stringly generic operation command;
- durable statuses exclude transient `running`;
- records use one `MonthRunRecordV1` lifecycle shape rather than separate pending/committed identities.

### Focused evidence

One schema/exports test proves the package compiles and public unions are closed. Do not build a broad test matrix before parsers exist.

### Commit boundary

```text
feat: define durable persistence contracts
```

## Task A2 — Implement runtime parsers

### Files

- Create `packages/game-persistence-contracts/src/parsers.ts`.
- Create `packages/game-persistence-contracts/src/canonical-payload.ts` if shared helpers justify it.
- Create/extend `tests/persistence-contracts.test.ts`.

### Production work

Implement exact-field parsers for every inbound/outbound DTO.

Parser rules:

- exact schema markers;
- exact key sets;
- 1–128 printable ASCII IDs without whitespace;
- non-negative JavaScript-safe revisions;
- lowercase SHA-256;
- 4 MiB UTF-8 canonical payload cap;
- valid JSON;
- durable-status whitelist;
- begin checkpoint identity matches save/run/base revision and is ready/revision zero;
- boundary checkpoint identity matches save/run/revision/status;
- `previousCheckpointHash` inside the new checkpoint matches `expectedCheckpointSha256`;
- commit references a completed checkpoint at the expected revision/hash;
- compatibility payload equals the checkpoint compatibility value by canonical bytes or deterministic structural equality.

Do not recompute SHA-256 in TypeScript using a new dependency. Hash creation remains in the canonical core/application integration; parser validates shape. Rust independently recomputes exact bytes at the trust boundary.

### Focused evidence

Cover only high-risk parser cases:

- unknown key;
- unsafe revision;
- malformed hash;
- oversized Unicode payload by UTF-8 bytes;
- mismatched checkpoint identity;
- transient status rejection;
- expected-hash mismatch.

### Commit boundary

```text
feat: validate durable persistence commands
```

## Task A3 — Shared golden fixture

### Files

- Create `fixtures/persistence/month-run-persistence-v1.json`.
- Extend TypeScript focused test.

### Production work

Generate fixture data from real PR #17 checkpoint shapes:

- revision-zero save snapshot;
- ready checkpoint and compatibility;
- suspended checkpoint after accepted deterministic steps;
- completed checkpoint;
- create/begin/store/commit commands;
- expected response envelopes and exact SHA-256 values.

The fixture contains canonical JSON strings, not pretty-printed nested objects used as a second source of truth.

### Focused evidence

TypeScript parsers accept the fixture and detect one tampered exact-byte hash.

### Commit boundary

```text
chore: add cross-language persistence fixture
```

---

# Phase B — Rust trust boundary and dependencies

## Task B1 — Add exact Rust dependencies

### Files

- Modify `apps/desktop/src-tauri/Cargo.toml`.
- Regenerate `apps/desktop/src-tauri/Cargo.lock` on the trusted Windows runner or a verified local toolchain.

### Production work

Use the exact dependency profile from the design. Keep `serde` and `serde_json` in runtime dependencies because Tauri commands and storage DTOs use them outside tests.

Check the resolved SQLite engine is at least 3.51.3. Record the actual bundled version in the PR description after `cargo test` reports it; do not hard-code an unverified transitive version in documentation.

### Dependency review

- inspect added transitive crates;
- verify licenses are compatible;
- ensure no default rusqlite WASM FFI feature enters the lockfile;
- ensure no system SQLite link path is selected.

### Focused evidence

`cargo tree -e features -p rusqlite` or equivalent lock inspection plus `cargo check --locked`.

### Commit boundary

```text
build: add durable SQLite dependencies
```

## Task B2 — Rust DTO parity and error model

### Files

- Create `apps/desktop/src-tauri/src/persistence/mod.rs`.
- Create `apps/desktop/src-tauri/src/persistence/error.rs`.
- Create `apps/desktop/src-tauri/src/persistence/contracts.rs`.
- Create `apps/desktop/src-tauri/src/persistence/hash.rs`.
- Modify `apps/desktop/src-tauri/src/main.rs` to compile the module, without registering commands yet.

### Production work

Implement:

- Rust DTOs with `camelCase` and `deny_unknown_fields`;
- exact payload-byte SHA-256;
- safe integer, ID, status and hash validation;
- minimal checkpoint identity projection;
- `PersistenceError` using `thiserror` internally;
- serializable `PersistenceErrorV1` with safe public code/message;
- source-preserving SQLite/IO/migration variants that do not serialize internals.

Error mapping must distinguish:

- invalid command;
- payload hash mismatch;
- overload/unavailable;
- SQLite availability;
- schema incompatibility;
- conflict/invariant errors;
- backup/recovery errors.

### Focused evidence

Rust loads the shared fixture, validates every command, recomputes exact hashes and rejects a tampered payload. No broad database tests yet.

### Commit boundary

```text
feat: validate persistence DTOs in Rust
```

---

# Phase C — Database foundation

## Task C1 — Embedded migration set and manifest

### Files

- Create `apps/desktop/src-tauri/src/persistence/migrations.rs`.
- Add SQL files only if `include_str!` improves review; otherwise keep one static SQL constant for schema v1.

### Production work

Define migration 1 containing:

- `app_metadata`;
- `save_games`;
- `month_runs`;
- partial unique active-run index;
- `request_receipts`;
- `month_run_journal`.

Implement:

```rust
fn migrations() -> Migrations<'static>;
fn migration_manifest_sha256() -> String;
```

Manifest hash input is deterministic and includes migration number, name and exact SQL bytes. Store expected current schema version as one constant.

Never include formatting generated at runtime or filesystem ordering in the hash.

### Focused evidence

- deterministic known manifest hash;
- `migrations.validate()` succeeds;
- schema SQL contains no prohibited non-deterministic default timestamp.

### Commit boundary

```text
feat: define durable store migration v1
```

## Task C2 — Database open and configuration

### Files

- Create `apps/desktop/src-tauri/src/persistence/database.rs`.
- Create `apps/desktop/src-tauri/src/persistence/recovery.rs` with status types only if needed.

### Production work

Implement:

```rust
Database::open_or_create(path, open_context)
Database::open_existing_read_only(path)
Database::close()
```

Writable open:

- minimum SQLite 3.51.3;
- `busy_timeout(5s)`;
- defensive mode;
- trusted schema false;
- DQS DDL/DML false;
- WAL with read-back;
- FULL synchronous with read-back value 2;
- foreign keys with read-back;
- connection limits;
- schema version and migration manifest checks;
- migration application;
- bounded quick/foreign-key checks;
- clean-shutdown state transition.

Read-only open:

- existing file only;
- no create, migration or metadata mutation;
- detect newer schema and return a typed read-only classification;
- do not attempt to change WAL mode.

### Correct old-draft defects

- use `FULL`, never `NORMAL`;
- do not treat every unsupported schema as generic storage unavailable;
- do not expose raw SQLite/path text publicly;
- do not run a forced TRUNCATE checkpoint on open.

### Focused evidence

One file-backed test verifies pragmas, schema version, tables/indexes and reopen. One test verifies newer schema classification without mutation. One test verifies manifest mismatch.

### Commit boundary

```text
feat: open and migrate the durable SQLite store
```

## Task C3 — Dedicated bounded worker

### Files

- Create `apps/desktop/src-tauri/src/persistence/worker.rs`.
- Extend `persistence/mod.rs` exports.

### Production work

Implement:

```rust
PersistenceHandle::start(path, context)
PersistenceHandle::execute(command)
PersistenceHandle::shutdown()
```

Use a named thread and `sync_channel(64)`. `DatabaseCommand` is a closed enum; do not send generic closures from Tauri.

Initial commands:

```text
Health
CreateSave
LoadSave
BeginMonthRun
LoadMonthRun
LoadActiveMonthRun
StoreBoundary
CommitMonthRun
CreateBackup
GetRecoveryStatus
Shutdown
```

The worker owns the connection and dispatches to operation functions. Startup returns an explicit result before the handle is exposed.

Shutdown behavior:

- reject new work;
- execute the current command;
- mark clean shutdown;
- optional PASSIVE checkpoint;
- close connection;
- join thread.

### Focused evidence

- ordered execution through one thread;
- queue-full maps to overload;
- shutdown joins and a reopen observes clean state.

### Commit boundary

```text
feat: add bounded SQLite worker
```

---

# Phase D — Explicit repositories

## Task D1 — Metadata and monotonic operation sequence

### Files

- Create repository module(s) under `persistence/repositories` or keep in `repository.rs` while small.

### Production work

Implement transaction-scoped functions:

- get/set metadata;
- allocate next operation sequence;
- validate migration/save schema metadata;
- read/write clean-shutdown marker.

The operation sequence can be stored as metadata and incremented in the same immediate transaction as each mutation. It replaces authoritative wall-clock timestamps.

### Focused evidence

Two consecutive committed mutations receive strictly increasing sequence values; a rolled-back mutation does not advance the durable value.

### Commit boundary

```text
feat: add durable metadata sequencing
```

## Task D2 — Receipt repository

### Production work

Implement:

```rust
classify_receipt(tx, request_id, operation, payload_hash)
insert_receipt(tx, receipt)
```

Classification:

```text
missing -> execute
same request + same operation + same payload hash -> duplicate(result)
same request + any other operation/hash -> RequestPayloadConflict
```

Validate stored result hash on load. A corrupt receipt returns `CorruptedStoredPayload`; it is never ignored and recomputed.

### Focused evidence

One accepted replay and one payload-conflict case around a real operation.

### Commit boundary

```text
feat: persist idempotency receipts
```

## Task D3 — Save repository

### Production work

Implement:

- insert revision-zero save;
- load and verify snapshot hash;
- update through revision CAS;
- set `last_committed_run_id` in final commit only.

SQL is explicit and returns affected-row counts. Mapping functions validate nullability and safe integer bounds.

### Focused evidence

Create/load/reopen and stale revision zero-row behavior.

### Commit boundary

```text
feat: persist authoritative save snapshots
```

## Task D4 — MonthRun and journal repositories

### Production work

Implement:

- insert ready run;
- load by run ID;
- load one active run by save ID;
- CAS update by run ID + save ID + revision + checkpoint hash;
- commit lifecycle update;
- append/read journal tail;
- validate journal and checkpoint hash linkage.

Let the partial unique index be the final arbiter of one-active-run. Convert its specific constraint failure to `ActiveRunExists` after confirming the existing active row.

### Focused evidence

Begin/reopen, active uniqueness, stale revision, stale hash and journal linkage.

### Commit boundary

```text
feat: persist MonthRun lifecycle and journal
```

---

# Phase E — Production operations

## Task E1 — Create/load save

### Files

- Create operation module(s), or implement methods on `Database` if that is simpler and still cohesive.

### Production work

`create_save` transaction:

1. validate command before transaction;
2. begin immediate;
3. classify receipt;
4. reject existing save;
5. allocate sequence;
6. insert save;
7. build deterministic result bytes/hash;
8. insert receipt;
9. commit.

`load_save` is read-only but verifies stored payload hash before returning.

### Focused evidence

Accepted, duplicate, conflict and corrupted stored payload.

### Commit boundary

```text
feat: implement durable save commands
```

## Task E2 — Begin and load MonthRun

### Production work

`begin_month_run` transaction follows the design exactly. It verifies:

- save exists and expected revision matches;
- checkpoint is ready/revision zero;
- base save revision matches;
- compatibility envelope matches;
- no active run exists;
- receipt and created journal entry are atomic.

Loading a run verifies:

- checkpoint exact hash;
- compatibility exact hash;
- persisted identity matches row columns;
- journal tail checkpoint hash matches the row.

### Focused evidence

Accepted, duplicate, stale save, active conflict and close/reopen.

### Commit boundary

```text
feat: begin and recover durable MonthRun
```

## Task E3 — Store boundary through revision/hash CAS

### Production work

Implement the exact CAS from the design.

Before SQL:

- command parser validates next checkpoint identity;
- durable status only;
- next revision strictly greater than expected;
- checkpoint `previousCheckpointHash` equals expected hash.

After zero affected rows, issue a diagnostic read inside the same transaction to map the correct stable conflict. Do not retry automatically.

On success append journal and receipt, then commit.

### Focused evidence

- suspended boundary accepted and survives reopen;
- exact duplicate returns receipt;
- stale revision changes nothing;
- correct revision + wrong hash changes nothing;
- constraint failure rolls back row, journal and receipt together.

### Commit boundary

```text
feat: store MonthRun boundaries with hash CAS
```

## Task E4 — Atomic final commit

### Production work

In one transaction:

- receipt classification;
- completed run/revision/hash verification;
- base save revision verification;
- save snapshot CAS to next revision;
- MonthRun state update to committed;
- result persistence;
- committed journal entry;
- receipt insertion;
- commit.

Do not delete the MonthRun row. Historical committed identity remains addressable and auditable.

### Focused evidence

- accepted commit increments save once;
- duplicate commit returns same result;
- stale save/run/hash leaves all tables unchanged;
- injected failure before commit leaves old save + completed run;
- reopen after commit observes new save + committed run + receipt + journal.

### Commit boundary

```text
feat: commit completed MonthRun atomically
```

---

# Phase F — Backup and recovery

## Task F1 — Online Backup API

### Files

- Create `apps/desktop/src-tauri/src/persistence/backup.rs` or operation module.

### Production work

- destination selected inside application backup directory;
- backup serialized through worker;
- incremental `rusqlite::backup::Backup` loop;
- no raw source-file copy;
- destination closed and reopened read-only;
- schema/manifest/integrity verification;
- save/active-run presence verification;
- safe backup metadata returned.

Migration path calls the same lower-level verified backup primitive before applying a pending migration to a non-empty database.

### Focused evidence

Backup contains save, suspended run, receipt and journal; source can remain open; destination passes integrity checks.

### Commit boundary

```text
feat: create verified SQLite backups
```

## Task F2 — Recovery classification

### Production work

On unclean open:

- quick/foreign-key checks;
- validate every active checkpoint and compatibility hash;
- validate receipt result hashes for active operations;
- validate journal tail linkage;
- return a closed recovery status;
- never auto-rewrite or auto-restore corrupt data.

Read-only incompatible mode exposes metadata/export-oriented queries only. Mutation commands reject with `IncompatibleSchema` or `RecoveryRequired`.

### Focused evidence

- unclean but valid database becomes usable with status;
- tampered checkpoint becomes recovery-required;
- newer schema opens read-only without migration;
- primary file is not replaced automatically.

### Commit boundary

```text
feat: classify durable store recovery state
```

---

# Phase G — Tauri and application integration

## Task G1 — Tauri managed state and commands

### Files

- Create `apps/desktop/src-tauri/src/persistence/commands.rs`.
- Modify `apps/desktop/src-tauri/src/main.rs`.
- Inspect `apps/desktop/src-tauri/capabilities/default.json`; modify only if custom command identifiers require it.

### Production work

- resolve app data path in `setup`;
- start worker and fail startup visibly if persistence cannot open;
- `manage(PersistenceHandle)`;
- register all commands in one `generate_handler!`;
- async command functions with owned DTOs;
- use `spawn_blocking` for bounded worker interaction;
- serializable safe errors;
- graceful shutdown hook.

No SQL, shell, dialog or arbitrary filesystem plugin permission is added.

### Focused evidence

Compilation plus one command-surface smoke test. Do not attempt a full UI automation suite in this PR.

### Commit boundary

```text
feat: expose typed Tauri persistence commands
```

## Task G2 — TypeScript application adapter

### Files

- Create `packages/game-application/src/persistence-port.ts`.
- Create `packages/game-application/src/persistence-service.ts`.
- Modify package exports.
- Add desktop composition adapter if needed.

### Production work

- tiny generic `InvokePort` owned by application boundary;
- one method per persistence operation;
- exact Tauri command names in one constant map;
- outgoing parser validation;
- response parser validation;
- request ID preserved on retries;
- safe error mapping;
- no import of Tauri API in the domain/application package.

### Focused evidence

Fake invoke port proves command name/payload/result mapping and duplicate retry request-ID preservation.

### Commit boundary

```text
feat: connect application to durable store
```

---

# Phase H — Hardening and completion

## Task H1 — Crash-boundary harness

### Production-first rule

Do not start this task until create/begin/store/commit/backup are implemented and passing their focused gates.

### Work

Add a small child-process executable/test mode with named failpoints:

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

Parent creates fixture DB, launches child with one failpoint, waits for abrupt exit, reopens and verifies the design invariants.

Keep the initial matrix targeted to boundary transactions. Do not generate a giant fuzz framework in PR #18.

### Commit boundary

```text
test: verify persistence crash boundaries
```

## Task H2 — Security and adversarial review

Review explicitly:

- no renderer SQL/path command;
- no dynamic SQL identifiers;
- all values bound;
- every mutation includes receipt in same transaction;
- every MonthRun mutation compares revision and hash;
- zero-row CAS maps without retry;
- partial unique index covers exactly active statuses;
- terminal histories cannot reactivate silently;
- migrations/manifest cannot be edited undetected;
- backup uses API, not file copy;
- read-only open does not mutate;
- public errors redact SQL/paths/payload;
- worker shutdown cannot detach an owning thread;
- no wall-clock value in authoritative rows;
- final code follows ADR-004/005/007/010/015.

Resolve Critical and Important findings before ready-for-review.

## Task H3 — Documentation and generated indexes

- update this plan checkboxes/status;
- update canonical design where implementation intentionally differs;
- add implemented dependency/schema/migration table;
- regenerate `docs/CATALOG.md` and `docs/MANIFEST.jsonc` through the repository generator;
- update PR description with actual bundled SQLite version and verification evidence.

## Task H4 — Final verification and merge

On final head:

```text
pnpm verify
```

Confirm independently:

- docs success;
- formatting/lint/typecheck/boundaries;
- TypeScript focused tests;
- renderer and Storybook build;
- Rust formatting;
- `cargo check --locked`;
- Rust tests including file-backed persistence and targeted crash cases;
- no unresolved review threads;
- CodeRabbit/other automated review has no actionable Critical/Important finding.

Then:

1. mark PR ready;
2. request final automated review;
3. fix actionable findings and rerun full gate if head changes;
4. squash merge with expected head SHA;
5. verify `main` workflow result;
6. delete or retain archive branch according to repository cleanup policy.

---

# Detailed acceptance matrix

| Requirement | Implementation evidence | Verification evidence |
|---|---|---|
| one writer | worker exclusively owns `Connection` | ordered worker test + code review |
| bounded memory | `sync_channel(64)` | queue-full result |
| deterministic bytes | canonical payload stored unchanged | TS/Rust fixture hash parity |
| durable commits | WAL + FULL read-back | file-backed pragma check |
| writer conflict early | immediate transactions | transaction behavior review |
| schema evolution | migrations + manifest hash | reopen/mismatch/newer-version cases |
| one active run | partial unique index | conflicting begin |
| idempotency | receipt in same transaction | duplicate/conflicting request |
| optimistic concurrency | revision + checkpoint hash CAS | stale revision/hash cases |
| crash-safe finalization | save/run/journal/receipt one transaction | injected rollback + reopen |
| safe backup | Online Backup API | verified destination snapshot |
| safe recovery | no silent rewrite/restore | tamper/newer-schema classification |
| renderer isolation | typed commands only | capability and command audit |
| no gameplay in Rust | storage validates envelopes only | module/API review |
| clean shutdown | queue drain + marker + join | shutdown/reopen case |
| safe diagnostics | stable codes, redacted sources | serialization review |

# Planned commit sequence

```text
1. docs: define SQLite durable store architecture
2. docs: add durable store implementation plan
3. feat: define durable persistence contracts
4. feat: validate durable persistence commands
5. chore: add cross-language persistence fixture
6. build: add durable SQLite dependencies
7. feat: validate persistence DTOs in Rust
8. feat: define durable store migration v1
9. feat: open and migrate the durable SQLite store
10. feat: add bounded SQLite worker
11. feat: add durable metadata sequencing
12. feat: persist idempotency receipts
13. feat: persist authoritative save snapshots
14. feat: persist MonthRun lifecycle and journal
15. feat: implement durable save commands
16. feat: begin and recover durable MonthRun
17. feat: store MonthRun boundaries with hash CAS
18. feat: commit completed MonthRun atomically
19. feat: create verified SQLite backups
20. feat: classify durable store recovery state
21. feat: expose typed Tauri persistence commands
22. feat: connect application to durable store
23. test: verify persistence crash boundaries
24. docs: finalize durable store implementation
```

Commits may be combined when the connector cannot atomically update tightly coupled files, but review boundaries remain the same. No commit should combine unrelated CI/security policy changes with persistence behavior.
