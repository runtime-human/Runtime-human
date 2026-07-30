---
title: "PERF-02A Windows Evidence Collection Implementation Plan"
type: plan
status: accepted
canon: true
updated: 2026-07-30
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
- the embedded WebDriver provider exposed only by the `performance-evidence` Cargo feature;
- optional Rust dependency `tauri-plugin-wdio-webdriver` in evidence builds only;
- an evidence-only Tauri capability containing `core:default` and `wdio-webdriver:default`;
- standard WebDriver `browser.execute()` for renderer User Timing;
- evidence-only `window.__TAURI__.core.invoke` for the existing read-only Rust snapshot.

The first external-driver attempt was rejected after a real Windows run repeatedly failed before application attach with `DevToolsActivePort file doesn't exist`, even after removing custom Edge options. The embedded provider removes the separate `tauri-driver` and EdgeDriver process boundary while preserving the same application binary and WebDriver protocol.

Do not add in E2a:

- `@wdio/cli`, Mocha or runner packages;
- `tauri-plugin-wdio` or its frontend bridge;
- a new Rust IPC command;
- a capability in the normal production config;
- a non-optional production dependency;
- renderer-to-Rust telemetry writes;
- network upload or analytics storage.

`browser.tauri.execute()` and the richer WDIO Rust/frontend plugin bridge may be introduced later only if standard WebDriver execution cannot reach a required read-only surface.

## Phase E2a — isolated startup capture

### Build isolation

- compile an explicit Cargo feature `performance-evidence`;
- register the embedded WebDriver plugin only under that feature;
- use a separate Tauri config with `withGlobalTauri: true`, evidence-only capability and no bundle;
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

1. Start the evidence executable through the standalone Tauri service and embedded WebDriver server.
2. Wait for `app.first_meaningful_paint`.
3. Read the closed browser mark/measure set.
4. Invoke `desktop_get_performance_snapshot_v1` through evidence-only global Tauri.
5. Join the two independent timelines without subtracting their origins.
6. Validate the complete object through `runtime-human-desktop-performance-capture-v1`.
7. Write one immutable raw capture.
8. Close the WebDriver/app process and remove temporary application data even when capture fails.

### E2a completion gates

- [x] isolated workspace and root project reference;
- [x] evidence-only Cargo feature and Tauri config;
- [x] fail-closed temporary data path;
- [x] strict honest startup classifications;
- [x] collision-free ignored raw output policy;
- [x] immutable raw file write;
- [x] pure harness contract tests;
- [x] self-hosted Rust PATH bootstrap made restart-safe;
- [x] external-driver failure reproduced and rejected;
- [x] embedded provider isolated behind the evidence feature;
- [ ] materialized Cargo and pnpm lockfiles;
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

Calling `startWdioSession()` is not an app process timestamp because it includes provider preparation and WebDriver session creation. E2a therefore leaves external durations empty rather than publishing a false process-to-FMP value.

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

Do not infer these values from provider/session setup time.

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

Select exactly one next performance action:

- renderer/WebView startup optimization;
- persistence startup optimization;
- IPC/queue optimization;
- SQLite-path optimization;
- `collect-more-evidence`.

Issue #58 is handled independently as RUST-01C because FIFO shutdown ordering is a correctness invariant and the existing 100 ms polling loop is statically proven unnecessary. PERF-02B must still measure its resource effect before claiming a CPU percentage or ranking it against user-visible startup work.
