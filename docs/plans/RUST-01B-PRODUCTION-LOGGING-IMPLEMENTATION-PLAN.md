---
title: "RUST-01B Production Logging Implementation Plan"
type: plan
status: draft
canon: true
updated: 2026-07-29
---

# RUST-01B Production Logging Implementation Plan

## Goal

Install one Rust-owned, bounded and failure-isolated production logging sink for the Tauri desktop process. The sink must make startup, persistence recovery and controlled shutdown diagnosable without logging authoritative payloads, filesystem paths, save/run/request identifiers or user-facing free-form text.

## Reviewed dependency decision

### Add now

- `tracing-subscriber = 0.3.23` with `fmt`, `json`, `env-filter` and `registry` features;
- `tracing-appender = 0.2.5` for a bounded lossy off-thread writer, daily rotation, retention and lifecycle flush.

### Keep as development tools, not production dependencies

- `tauri-plugin-devtools` for opt-in local IPC/span inspection;
- `criterion`, `dhat`, `cargo-bloat`, `cargo-llvm-lines` and Windows Performance Recorder for targeted profiling after PERF-02A evidence.

### Do not add now

- `tauri-plugin-log`: it would add a frontend-facing plugin surface and duplicate the existing `tracing` instrumentation rather than complete it;
- `tokio`, `crossbeam-channel`, `flume` or `parking_lot`: the current single-worker bounded `std::sync::mpsc` design remains an explicit PERF-02A invariant;
- `mimalloc`/`jemallocator`: allocator replacement has no measured memory or allocation bottleneck;
- SQLx, Diesel, SeaORM, `r2d2` or `deadpool`: they would weaken the deliberately explicit single-writer `rusqlite` transaction model;
- React Query, Zustand, Redux, React Router, Radix or a component framework: the current single-session lifecycle and typed desktop routing do not yet need them.

## Architecture

```text
Tauri setup
  → resolve app log directory
  → build daily rolling appender with bounded retention
  → create lossy bounded non-blocking writer
  → install one global JSON tracing subscriber
  → manage WorkerGuard + ErrorCounter in Tauri state

Tauri RunEvent::Exit
  → persistence shutdown
  → emit redacted lifecycle event
  → Tauri managed state drops
  → WorkerGuard flushes remaining log lines
```

Logging initialization failure is represented by an inactive diagnostics state and never aborts Tauri setup, persistence opening or gameplay.

## Redaction contract

Allowed fields:

- closed event name;
- operation category;
- public persistence error code;
- schema/revision numbers;
- durations and queue depth;
- recovery classification;
- dropped log line count.

Forbidden fields:

- database or backup paths;
- save/run/request IDs;
- checkpoint/result/command JSON;
- raw `PersistenceError` display/source chains;
- user-facing text;
- SQL statements and bound values.

## Task 1 — Define diagnostics state and typed status

- Create `src/diagnostics.rs`.
- Add `RuntimeDiagnostics` holding optional `WorkerGuard` and `ErrorCounter`.
- Add `runtime-human-logging-status-v1` DTO with `active` and `droppedLines`.
- Add read-only `desktop_get_logging_status_v1` Tauri command.
- Ensure inactive initialization remains a valid state.

## Task 2 — Install bounded rolling JSON sink

- Resolve `PathResolver::app_log_dir()` during the first setup operation.
- Use daily rotation and retain eight matching files so at least seven complete historical files normally remain after rotation cleanup.
- Use `NonBlockingBuilder` with a fixed line budget and `lossy(true)` so logging cannot block persistence or UI execution.
- Preserve the `WorkerGuard` until after persistence shutdown.
- Default to `info`.
- Honor `RUST_LOG` only in debug builds; release builds ignore the environment and remain fixed at `info`.

## Task 3 — Replace unsafe free-form logging

- Add a closed `PersistenceError::diagnostic_code()` projection.
- Replace shutdown `%error` logging with the closed diagnostic code.
- Keep response-channel-drop logging static and payload-free.
- Add startup, ready and exit lifecycle events with allowlisted fields only.

## Task 4 — TDD and failure isolation

- Test active/inactive status projection.
- Test dropped-line count projection independently of filesystem output.
- Test debug/release filter policy as a pure function.
- Test diagnostic persistence error codes do not expose messages or paths.
- Verify logger initialization failure does not prevent persistence setup through a pure construction seam.

## Task 5 — Documentation and closure

- Update `docs/INDEX.md` current execution section after implementation.
- Record the RUST-01B milestone in `docs/EXECUTION-STATUS.jsonc` without marking PERF-02A complete.
- Regenerate documentation catalog/manifest.
- Run permanent repository verification on one unchanged head.
- Merge the dedicated PR, close issue #57 and leave issue #58 open for the evidence-backed FIFO shutdown slice.

## Next program after RUST-01B

1. PERF-02A renderer bootstrap, React shell commit, January ready and first meaningful paint milestones.
2. Opt-in Windows evidence collector joining Rust snapshot and browser User Timing.
3. Exactly one evidence-backed optimization recommendation.
4. RUST-01C FIFO shutdown if idle wakeups or shutdown latency are confirmed as meaningful, otherwise prioritize the measured renderer/IPC/SQLite bottleneck.
