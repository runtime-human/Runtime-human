---
title: "PERF-02A Desktop Startup and Persistence Timeline Plan"
type: plan
status: proposed
canon: true
updated: 2026-07-27
---

# PERF-02A Desktop Startup and Persistence Timeline Plan

## Goal

Create one observational, cross-boundary diagnostic timeline for the real Windows desktop path without changing gameplay, persistence durability, worker scheduling, SQLite configuration or authoritative state.

```text
process entry
→ Tauri setup
→ persistence worker ready
→ main window available
→ renderer bootstrap
→ React shell commit
→ January session ready
→ first meaningful paint

frontend invoke
→ Rust command dispatch
→ persistence queue enqueue/dequeue
→ SQLite operation
→ Rust response
→ browser completion
```

## Current evidence boundary

The repository already measures:

- application/in-memory January scenarios;
- file-backed `PersistenceHandle` + SQLite scenarios;
- browser User Timing for content and January session operations.

It does not currently expose:

- a common process-relative startup origin;
- Tauri setup or persistence-ready milestones;
- renderer bootstrap, shell commit or first meaningful paint as a versioned sample;
- Tauri command dispatch/response spans;
- persistence queue depth or queue wait;
- separation of queue wait from SQLite operation duration.

## Non-negotiable constraints

- Observational only; telemetry failures never change operation values or errors.
- No timing data in saves, checkpoints, receipts, journal, backups or determinism fingerprints.
- No replacement of the bounded `sync_channel(64)` in this slice.
- No new SQLite pool, ORM, cache, generic event bus or analytics platform.
- Preserve direct `rusqlite`, one worker/connection, WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, CAS and durable receipts.
- Budgets remain warning-only.
- Production keeps one WebView.
- Raw samples must be bounded and explicitly requested; no background upload or network delivery.

## Task 1 — Closed diagnostic contracts

Define a small versioned diagnostic model owned by the platform boundary:

```text
runtime-human-desktop-performance-snapshot-v1
```

Each event contains:

- closed milestone/span name;
- monotonic microseconds relative to the process origin;
- optional duration in microseconds;
- optional queue depth;
- operation category only, never payload or user data.

Required validation:

- safe non-negative integers;
- bounded event count;
- closed field sets and names;
- chronological ordering where applicable;
- immutable TypeScript projection.

## Task 2 — Rust startup milestones

Instrument `apps/desktop/src-tauri/src/main.rs` around:

1. process entry;
2. Tauri setup start;
3. persistence worker ready;
4. setup complete;
5. main window available.

Use a process-owned monotonic origin. Do not infer wall-clock timestamps and do not block setup on telemetry publication.

## Task 3 — Persistence queue and operation spans

Instrument the existing worker without changing its scheduling semantics:

- assign an observational enqueue instant before `try_send`;
- maintain atomic current/max queue depth;
- record dequeue/queue-wait at the worker;
- time only the database operation inside dispatch;
- record overloaded/disconnected outcomes without command payloads;
- decrement depth exactly once for every accepted command;
- preserve the existing response and error values if recording fails.

Closed operation names should correspond to the existing typed commands rather than SQL statements.

## Task 4 — Tauri command boundary

Record:

- command dispatch entry;
- completion after `spawn_blocking`;
- total Rust command duration;
- queue and database spans linked by an observational operation ID.

Do not expose database paths, save IDs, request payloads, errors with user data or serialized authoritative JSON.

## Task 5 — Renderer and paint milestones

Extend the existing desktop performance seam with:

- renderer bootstrap;
- React shell commit;
- January session ready;
- first meaningful paint.

First meaningful paint is the first frame containing the actionable Runtime Human shell/state, not HTML load. Use `requestAnimationFrame` after the committed UI state and make duplicate reporting idempotent.

## Task 6 — Read-only snapshot command

Expose one typed development/evidence command that returns and drains or snapshots bounded diagnostic data according to an explicit contract.

Rules:

- read-only;
- no arbitrary query/filter language;
- no telemetry writes from renderer into Rust;
- no persistence schema/table;
- no capability broader than the exact command;
- release behavior must remain safe when the command is unused.

## Task 7 — Evidence collector

Add an opt-in Windows collector that:

- launches the real Tauri application;
- waits for the requested terminal milestone;
- retrieves the typed snapshot;
- records host/source profile;
- emits versioned JSON under `artifacts/performance/`;
- separates cold application and warm-OS-cache runs;
- computes nearest-rank p50/p95/p99 from raw samples;
- reports targets as warnings only.

Initial scenarios:

1. new process → shell first meaningful paint;
2. new process → January session ready;
3. load persisted context end to end;
4. begin MonthRun end to end;
5. final commit end to end.

Idle resources and 100-cycle stabilization remain PERF-02B, not this slice.

## Task 8 — Verification

Required contracts:

- telemetry failure cannot alter fulfilled/rejected operation results;
- queue depth returns to zero after success, failure and overload;
- queue wait and database duration are non-negative and separately represented;
- startup milestones are emitted once and ordered;
- FMP is emitted once after React content commit;
- no authoritative payload appears in diagnostics;
- no persistence schema or generated content changes;
- renderer, Storybook and Rust builds remain valid;
- permanent docs/foundation gates pass on one unchanged head.

## Delivery order

1. Start only from `main` after UI-02C and its status closure merge.
2. RED contract tests for diagnostic DTOs and failure isolation.
3. Rust monotonic recorder and startup milestones.
4. Worker queue/operation instrumentation.
5. typed Tauri read-only snapshot boundary.
6. renderer/FMP milestones.
7. opt-in evidence collector and runbook update.
8. collect evidence before proposing any optimization.

## Follow-up decision

PERF-02A must end with one evidence-backed recommendation for the next optimization slice. Possible outcomes include WebView2/renderer startup, synchronous persistence startup, Tauri command overhead, queue contention or SQLite/recovery. It must not implement all of them.
