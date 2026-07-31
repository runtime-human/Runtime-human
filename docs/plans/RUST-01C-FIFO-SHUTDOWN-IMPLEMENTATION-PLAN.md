---
title: "RUST-01C Typed FIFO Persistence Shutdown Implementation Plan"
type: plan
status: accepted
canon: true
updated: 2026-07-30
---

# RUST-01C Typed FIFO Persistence Shutdown Implementation Plan

> **For agentic workers:** execute this plan task-by-task with test-first changes and one reviewable commit per closed behavior.

**Goal:** Remove the 100 ms persistence-worker polling loop while guaranteeing that every command accepted before shutdown is processed before SQLite checkpoint, clean-shutdown marking and connection close.

**Architecture:** Keep the existing single dedicated SQLite thread and bounded `std::sync::mpsc::sync_channel(64)`. Replace the out-of-band `AtomicBool` with a mutex-protected admission state and send an explicit shutdown message through the same FIFO queue. Serialize concurrent shutdown callers with a small shutdown gate; the first caller closes admission, enqueues the marker, waits for the worker close acknowledgement and joins the thread, while later callers observe the completed idempotent state.

**Tech stack:** Rust 1.97.1, `std::sync::mpsc`, `std::sync::Mutex`, `std::thread::JoinHandle`, `rusqlite`, existing persistence crash tests and self-hosted Windows verification.

## Global constraints

- Preserve one SQLite connection owned by one dedicated worker thread.
- Preserve `sync_channel(64)` and ordinary-command `try_send` behavior.
- Preserve `PersistenceError::Overloaded` for a full ordinary-command queue.
- Preserve `PersistenceError::Unavailable` after shutdown admission closes.
- Preserve WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, dual CAS and durable receipts.
- Do not add Tokio, Crossbeam, flume or another channel dependency.
- Do not change Tauri IPC contracts or authoritative payload schemas.
- Do not weaken the existing crash failpoint `after_shutdown_checkpoint_before_clean_marker`.

---

## File map

- Modify `apps/desktop/src-tauri/src/persistence/worker.rs`: typed worker messages, admission gate, blocking receive loop, serialized idempotent shutdown and drop fallback.
- Modify `apps/desktop/src-tauri/src/persistence/shutdown_tests.rs`: public lifecycle regressions for clean drop, post-shutdown rejection and idempotency.
- Create `apps/desktop/src-tauri/src/persistence/worker_shutdown_tests.rs`: direct FIFO worker tests that prove an accepted operation ahead of the marker completes before close.
- Modify `apps/desktop/src-tauri/src/persistence/mod.rs`: register the new focused test module.
- Modify `docs/EXECUTION-STATUS.jsonc` only after the implementation PR is merged; do not mark RUST-01C complete from its feature branch.

## Task 1 — Lock the shutdown contract with failing tests

- [ ] Add `worker_shutdown_tests` to `persistence/mod.rs` under `#[cfg(test)]`.
- [ ] Add a direct worker test that queues `RecoveryStatus` followed by `Shutdown`, then asserts the query response arrives and the shutdown acknowledgement is emitted.
- [ ] Add a public test that calls `PersistenceHandle::shutdown()` twice and expects both calls to succeed.
- [ ] Add a public test that calls a persistence query after shutdown and expects `PersistenceError::Unavailable`.
- [ ] Add a public test that drops the last handle without explicit shutdown, reopens the database and observes `RecoveryStatus::Healthy`.
- [ ] Run the focused Rust tests and confirm they fail for the missing typed marker/idempotent behavior rather than for fixture or path errors.
- [ ] Commit only the failing tests.

Focused command:

```powershell
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml persistence::worker_shutdown_tests persistence::shutdown_tests -- --nocapture
```

## Task 2 — Introduce one typed FIFO message stream

- [ ] Replace `SyncSender<QueuedDatabaseCommand>` / `Receiver<QueuedDatabaseCommand>` with `SyncSender<WorkerMessage>` / `Receiver<WorkerMessage>`.
- [ ] Define exactly two message variants:

```rust
enum WorkerMessage {
    Operation(QueuedDatabaseCommand),
    Shutdown { closed: SyncSender<()> },
}
```

- [ ] Keep queue-depth accounting only for `Operation`; shutdown is lifecycle control and must not distort persistence operation telemetry.
- [ ] Wrap every ordinary queued command in `WorkerMessage::Operation`.
- [ ] Replace `recv_timeout` with blocking `recv()`.
- [ ] On `Operation`, dispatch exactly as before.
- [ ] On `Shutdown`, call `Database::close()`, signal `closed`, and return the close result from the worker.
- [ ] On channel disconnect, close the database and return its close result.
- [ ] Run the focused tests and confirm the direct FIFO test passes.
- [ ] Commit the typed worker stream.

## Task 3 — Close admission without racing the marker

- [ ] Replace `shutdown_requested: Arc<AtomicBool>` with `admission: Mutex<AdmissionState>`.
- [ ] Define the closed state as a private enum rather than a public boolean:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AdmissionState {
    Open,
    Closed,
}
```

- [ ] In ordinary `send`, lock admission, reject `Closed`, reserve queue depth, and perform `try_send` while the gate remains held.
- [ ] In shutdown, lock the same admission gate, transition `Open -> Closed`, and enqueue `WorkerMessage::Shutdown` before releasing it.
- [ ] Use blocking `SyncSender::send` for the shutdown marker so a temporarily full bounded queue drains rather than losing the lifecycle command.
- [ ] Preserve queue-depth rollback for `Full` and `Disconnected` ordinary sends.
- [ ] Run the focused tests and confirm post-shutdown rejection passes.
- [ ] Commit admission closure.

## Task 4 — Make explicit and implicit shutdown idempotent

- [ ] Add `shutdown_gate: Mutex<()>` to serialize concurrent explicit shutdown callers.
- [ ] The first caller closes admission, sends the marker, waits for close acknowledgement and joins the unique `JoinHandle`.
- [ ] Later callers acquire the gate after the first caller and return success when the worker handle is already consumed.
- [ ] Keep `JoinHandle` uniquely owned in `Mutex<Option<JoinHandle<WorkerResult>>>`.
- [ ] Make `Drop for PersistenceInner` use the same marker-before-join protocol when explicit shutdown never ran.
- [ ] Never detach the worker: every path must consume and join the handle.
- [ ] Run the focused tests and confirm explicit idempotency and implicit clean drop pass.
- [ ] Commit idempotent lifecycle ownership.

## Task 5 — Preserve crash and recovery semantics

- [ ] Run the existing child-process failpoint test for `after_shutdown_checkpoint_before_clean_marker`.
- [ ] Verify an interrupted close remains `UncleanButValid` and does not write a false clean marker.
- [ ] Run all persistence tests, including January replay, receipts, CAS, backup and recovery suites.
- [ ] Run `cargo fmt --all -- --check`, `cargo check --locked` and `cargo clippy --locked --all-targets -- -D warnings` if clippy is available on the pinned toolchain.
- [ ] Run the repository `foundation` and `docs` workflows on the unchanged feature head.
- [ ] Record measured idle-worker wakeups before/after only through the existing PERF evidence track; do not invent a CPU percentage from code inspection.
- [ ] Open a draft PR referencing issue #58 and keep it independent from PR #69 and PR #70.

## Acceptance criteria

- Worker idle state uses blocking `Receiver::recv()` and has no 100 ms polling constant.
- Every ordinary command whose `try_send` returned success before shutdown is ahead of the marker and is dispatched before close.
- No ordinary command is accepted after admission transitions to closed.
- Explicit shutdown is safe to call more than once.
- Dropping the final handle without explicit shutdown still performs checkpoint, clean marker, SQLite close and thread join.
- Existing crash/recovery, durability, telemetry and public IPC contracts remain unchanged.
- No new runtime dependency is added.
