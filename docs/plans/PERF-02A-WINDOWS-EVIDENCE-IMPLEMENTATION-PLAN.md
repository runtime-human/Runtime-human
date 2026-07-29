---
title: "PERF-02A Windows Evidence Collection Implementation Plan"
type: plan
status: active
canon: true
updated: 2026-07-29
---

# PERF-02A Windows Evidence Collection Implementation Plan

## Goal

Produce source-backed, opt-in Windows evidence that joins the existing Rust desktop snapshot with browser User Timing and exact scenario metadata. Raw captures must be immutable, generated outside Git, keep incomparable clocks separate and end PERF-02A with exactly one evidence-backed optimization recommendation or `collect-more-evidence`.

## Current delivery state

### Completed

- PR #67 / merge `783f54b17cd7bd4b88c5e7aac4719afa1c0dadac`: closed capture/report contracts, lossless repeated spans, exact semantic validation, duplicate identity rejection, nearest-rank percentiles, warning-only budgets and report CLI.
- PR #68 / merge `ac3e21daa0f8e11707ce4f9df5e68fbf7032db19`: execution ledger moved to the Windows capture harness constraint.
- Rust startup milestones, renderer/FMP milestones, read-only snapshot command and Tauri/queue/SQLite operation correlation already exist in production code.

### Active

PR #69 implements the first real Windows path, deliberately limited to:

```text
startup-shell-fmp
+ cold-process
+ new-database
+ explicit cold/warm OS-cache classification
+ warmup/measurement role
```

A standalone launch always creates a new process and an isolated empty database. It must not label that evidence as `warm-process` or `existing-clean-database`.

## Dependency and integration decision

### E2a dependencies

Use only:

- `@wdio/tauri-service 1.2.0` in the isolated `tools/desktop-evidence` workspace;
- its standalone `createTauriCapabilities`, `startWdioSession` and `cleanupWdioSession` API;
- canonical `driverProvider: external`;
- standard WebDriver `browser.execute()` for renderer User Timing;
- evidence-only `window.__TAURI__.core.invoke` for the existing read-only Rust snapshot.

Do not add in E2a:

- `@wdio/cli`, Mocha or runner packages;
- `tauri-plugin-wdio`;
- a new Rust IPC command;
- a production capability or dependency;
- renderer-to-Rust telemetry writes;
- network upload or analytics storage.

`browser.tauri.execute()` and a Rust plugin bridge may be introduced later only if standard WebDriver execution cannot reach a required read-only surface.

## Phase E2a — isolated startup capture

### Build isolation

- compile an explicit Cargo feature `performance-evidence`;
- use a separate Tauri config with `withGlobalTauri: true` and no bundle;
- keep the normal production config and default Cargo feature set unchanged;
- require exactly one absolute `--runtime-human-evidence-data-dir` argument in evidence builds;
- fail closed when the argument is missing, empty, relative or duplicated;
- create and delete a temporary application-data directory for every run.

### Capture contract

The CLI requires explicit:

- commit SHA;
- process class;
- OS-cache class;
- database class;
- sample role;
- sample index.

For E2a, process must be `cold-process` and database must be `new-database`. Output must be a `.json` file under ignored `artifacts/performance/raw/`.

Default filenames include the complete classification and sample index so groups cannot overwrite each other. Existing raw files are never overwritten.

### Browser and Rust data

1. Start the evidence executable through the standalone Tauri service.
2. Wait for `app.first_meaningful_paint`.
3. Read the closed browser mark/measure set.
4. Invoke `desktop_get_performance_snapshot_v1` through evidence-only global Tauri.
5. Join the two independent timelines without subtracting their origins.
6. Validate the complete object through `runtime-human-desktop-performance-capture-v1`.
7. Write one immutable raw capture.
8. Close WebDriver/app processes and remove temporary application data even when capture fails.

### E2a completion gates

- [x] isolated workspace and root project reference;
- [x] evidence-only Cargo feature and Tauri config;
- [x] fail-closed temporary data path;
- [x] strict honest startup classifications;
- [x] collision-free ignored raw output policy;
- [x] immutable raw file write;
- [x] pure harness contract tests;
- [x] self-hosted Rust PATH bootstrap made restart-safe;
- [ ] materialized pnpm lockfile;
- [ ] formatter, lint, type-aware lint and TypeScript build green;
- [ ] default and evidence-feature Rust checks/tests green;
- [ ] evidence executable built without bundle;
- [ ] one Windows warmup capture produced and inspected without committing it;
- [ ] unchanged-head permanent docs/foundation gates green;
- [ ] PR #69 reviewed and merged.

## Clock policy

Rust `Instant` and browser `performance.now()` have different origins. The report must not subtract one from the other.

Reported timelines:

1. Rust process timeline: process entry → setup/worker/window milestones;
2. browser timeline: renderer bootstrap → shell commit → January ready → FMP;
3. browser end-to-end measures: content/session/month operations;
4. external harness timeline: OS process launch → observed milestone, only after an app-process-only clock exists.

Calling `startWdioSession()` is not an app process timestamp because it includes driver preparation, Edge-driver checks and WebDriver session creation. E2a therefore leaves external durations empty rather than publishing a false process-to-FMP value.

## Phase E2b — exact external process timing

Implement a separately reviewed app-process-only clock using one of:

- a public service launch hook;
- a controlled external launcher with preserved WebDriver attach semantics;
- an evidence-only monotonic process-entry beacon;
- another mechanism whose error and origin are explicitly tested.

Required outputs:

- `processToMainWindowObservedMicros`;
- `processToShellFmpMicros`;
- `processToJanuaryReadyMicros`.

Do not infer these values from driver/session setup time.

## Phase E2c — remaining real scenarios

Add scenarios one at a time:

1. `startup-january-ready`;
2. `load-persisted-context` using a deliberately prepared copied database;
3. `begin-month-run`;
4. `resume-month-run`;
5. `final-commit`.

Operation captures must use before/after Rust snapshots and retain only newly observed operation IDs/events. A long-lived process may then be classified as `warm-process`; an existing database may be classified only after the harness actually provisions one.

## Phase E3 — evidence matrix and recommendation

For every supported group:

- run warmups separately from measurements;
- preserve every raw sample;
- report sample count, min/max, nearest-rank p50/p95/p99, dropped Rust events and missing metrics;
- keep warning budgets separate from correctness;
- document whether OS cache state is controlled or only observed.

Compare user-visible contributions:

- Tauri/process setup;
- persistence worker startup;
- renderer bootstrap, shell commit and FMP;
- January restoration;
- Tauri dispatch, queue wait and SQLite duration;
- shutdown/idle resources only when PERF-02B evidence exists.

Select exactly one next action:

- renderer/WebView startup optimization;
- persistence startup optimization;
- IPC/queue optimization;
- SQLite-path optimization;
- typed FIFO shutdown from issue #58;
- `collect-more-evidence`.

Issue #58 remains deferred until evidence shows idle polling or shutdown ordering is the highest-value next slice.
