---
title: "SQLite Durable Store final design addendum"
type: plan
status: accepted
canon: true
depends_on: [ADR-004, ADR-005, ADR-007, ADR-010, ADR-015]
updated: 2026-07-28
---

# SQLite Durable Store final design addendum

This addendum records the final implementation decisions that supersede outdated names or assumptions in `2026-07-21-month-run-sqlite-durable-store-design.md`.

All unaffected design sections remain valid.

---

# 1. Three integrity layers

The persisted MonthRun uses three different hashes. They must never be conflated.

## 1.1. Serialized checkpoint payload SHA-256

```text
checkpoint_payload_sha256
```

Definition:

```text
SHA256(exact UTF-8 bytes of checkpoint_json)
```

Purpose:

- detects byte changes in the stored payload;
- participates in durable compare-and-swap;
- is independent from JSON reserialization in Rust.

## 1.2. Internal checkpoint fingerprint

```text
checkpoint_hash
```

Definition:

```text
fingerprint(
  namespace = "month-run-checkpoint-v1",
  checkpoint fields except checkpointHash
)
```

Purpose:

- proves the checkpoint's own deterministic state envelope;
- is recomputed independently by Rust at the trust boundary;
- participates in durable compare-and-swap.

## 1.3. Journal entry hash

```text
entry_sha256
```

Definition:

```text
SHA256(canonical journal entry envelope)
```

Purpose:

- links durable storage boundaries;
- includes the previous journal entry hash;
- includes source and result durable checkpoint hashes.

A valid serialized payload hash does not prove a valid internal checkpoint fingerprint. A valid checkpoint fingerprint does not prove journal continuity. Recovery verifies all required layers.

---

# 2. Transient predecessor versus durable source

`previousCheckpointHash` inside a MonthRun checkpoint refers to the immediately preceding pure-kernel checkpoint. Several transient `running` transitions may occur between two persisted durable boundaries.

Therefore:

```text
new_checkpoint.previousCheckpointHash
```

is not required to equal the last persisted durable checkpoint hash.

The database journal separately records:

```text
source_checkpoint_payload_sha256
source_checkpoint_hash
checkpoint_payload_sha256
checkpoint_hash
```

This proves:

```text
stored durable source -> stored durable result
```

without falsely claiming that no transient checkpoints existed between them.

---

# 3. Final `month_runs` integrity columns

The implementation uses:

```text
checkpoint_json
checkpoint_payload_sha256
checkpoint_hash
previous_checkpoint_hash
compatibility_json
compatibility_payload_sha256
```

`previous_checkpoint_hash` stores the checkpoint's immediate pure-kernel predecessor field for recovery/inspection. It is not the durable CAS source.

The durable CAS source is supplied separately in the command and query predicate.

---

# 4. Final durable-boundary CAS

A boundary command carries:

```text
expectedRunRevision
expectedCheckpointPayloadSha256
expectedCheckpointHash
runRevision
status
checkpoint
```

The update predicate compares all durable source identity fields:

```sql
UPDATE month_runs
SET
    run_revision = :next_revision,
    status = :next_status,
    checkpoint_json = :next_json,
    checkpoint_payload_sha256 = :next_payload_sha256,
    checkpoint_hash = :next_checkpoint_hash,
    previous_checkpoint_hash = :next_transient_predecessor,
    updated_sequence = :operation_sequence
WHERE run_id = :run_id
  AND save_id = :save_id
  AND run_revision = :expected_revision
  AND checkpoint_payload_sha256 = :expected_payload_sha256
  AND checkpoint_hash = :expected_checkpoint_hash;
```

Before SQL, Rust validates:

- exact command fields;
- save/run identity;
- next revision and durable status;
- exact checkpoint payload SHA-256;
- internal checkpoint fingerprint;
- compatibility equality with the stored run.

Zero affected rows are classified through the current record as not-found, revision conflict or checkpoint-hash conflict. Persistence never retries a stale CAS automatically.

---

# 5. Final commit command

Rust does not synthesize a `committed` checkpoint.

The application supplies:

```text
committedCheckpoint
```

produced by the pure MonthRun reducer.

The commit command validates:

- current stored run is `completed`;
- current revision, serialized SHA and internal checkpoint hash match expected values;
- committed checkpoint belongs to the same save/run;
- committed checkpoint revision is exactly expected run revision + 1;
- committed checkpoint status is `committed`;
- committed checkpoint `previousCheckpointHash` equals the completed internal checkpoint hash;
- committed checkpoint compatibility is unchanged;
- final snapshot and result canonical payloads are valid.

One `BEGIN IMMEDIATE` transaction performs:

1. receipt classification;
2. save revision CAS;
3. MonthRun row update to the supplied committed checkpoint;
4. committed save revision/result persistence;
5. journal append;
6. receipt insert;
7. commit.

The historical MonthRun row is retained.

---

# 6. Final journal schema semantics

Each entry stores:

```text
run_id
sequence
event_kind
source_checkpoint_payload_sha256
source_checkpoint_hash
checkpoint_payload_sha256
checkpoint_hash
previous_entry_sha256
entry_sha256
created_sequence
```

Entry zero (`created`) has no source durable checkpoint. Every later entry requires both source hashes.

Recovery validates:

- contiguous sequence from zero;
- source hashes equal the previous entry result hashes;
- `previous_entry_sha256` equality;
- recomputed entry hash;
- final entry result equals the current MonthRun row.

The journal remains a compact durable-boundary log, not full event sourcing.

---

# 7. Final backup protocol

Backup is an external two-phase operation because filesystem publication and SQLite receipt insertion cannot be one transaction.

Protocol:

1. classify existing receipt;
2. derive a deterministic internal backup ID from request ID hash and normalized payload hash;
3. detect same request/different payload backup files;
4. create `<backup-id>.sqlite3.partial`;
5. run the Online Backup API in bounded page batches;
6. close destination;
7. reopen destination through the strict read-only database path;
8. verify schema, manifest, quick check, foreign keys, requested save and active-run state;
9. atomically rename within the application backup directory;
10. insert durable receipt;
11. return metadata without a path.

Crash cases:

- before rename: the next attempt removes/replaces its own incomplete `.partial` file;
- after rename/before receipt: the next attempt inspects the verified snapshot itself, recreates metadata and inserts the missing receipt;
- after receipt: duplicate request verifies the referenced file and returns stored metadata;
- same request ID/different payload: reject before overwrite.

No backup file is overwritten and no raw live-WAL file copy is used.

---

# 8. Final recovery behavior

## 8.1. Unclean but valid

On an unclean writable open, verify:

- all save snapshot hashes and JSON;
- save schema fingerprint shape;
- all MonthRun authoritative payloads encountered by the run scan;
- internal checkpoint fingerprints;
- compatibility payloads;
- complete durable journal chains;
- receipt result hashes and JSON;
- committed run/save links;
- one-active-run cardinality.

If valid, continue writable with status:

```text
unclean-but-valid
```

## 8.2. Application corruption

If SQLite page/foreign-key integrity is sufficient for read-only access but application hashes or links fail:

1. drop the writable connection without marking clean shutdown;
2. reopen the existing file read-only;
3. start the worker in `RecoveryReadOnly` mode;
4. report status `corrupted`, `writable=false`;
5. reject every mutation with `RecoveryRequired`;
6. allow recovery-status and safe diagnostic reads;
7. never rewrite or restore automatically.

## 8.3. Newer schema

A newer `user_version` opens through the strict read-only path with status:

```text
newer-schema-read-only
```

It is not classified as corruption.

---

# 9. Final shutdown order

After the queue is drained:

1. the owning worker requests `PRAGMA wal_checkpoint(PASSIVE)`;
2. if it succeeds, write `clean_shutdown=true` in an immediate transaction;
3. close the connection;
4. join the worker thread.

If checkpoint or marker persistence fails, clean shutdown is not claimed. The next startup uses the expanded integrity path.

---

# 10. Final crash evidence

PR #18 uses two targeted mechanisms instead of a production failpoint framework:

## 10.1. Transaction rollback

A temporary SQLite trigger aborts the MonthRun committed-state update after the save CAS statement. The operation must leave:

```text
old save revision
+ completed MonthRun
+ no committed journal entry
+ no commit receipt
```

## 10.2. Lost acknowledgement

A child process:

1. opens a completed MonthRun;
2. executes the final commit;
3. terminates immediately without clean shutdown or caller acknowledgement.

The parent reopens and must observe:

```text
new save revision exactly once
+ committed MonthRun
+ journal entry
+ receipt
```

Retrying the identical request returns the duplicate result and does not increment the save again.

A broader failpoint framework is deferred until a real migration or defect requires statement-level localization.
