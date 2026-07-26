---
title: "OPT-00C Browser User Timing Observability Plan"
type: plan
status: implementation-complete
canon: true
updated: 2026-07-26
---

# OPT-00C Browser User Timing Observability Plan

**Goal:** Add failure-safe browser User Timing marks around January bootstrap, compiled-content loading and MonthRun operations without changing authoritative behavior.

**Architecture:** A small injected `PerformanceRecorder` wraps asynchronous operations. The browser implementation delegates to `performance.mark`, `performance.measure` and `performance.clearMarks`, but catches every recorder error. Application/runtime errors and return values always pass through unchanged.

**Scope:**

- `app.session_bootstrap`;
- `content.manifest`;
- repeated `content.chunk`;
- `content.registry`;
- `month.load`;
- `month.begin`;
- `month.resume`;
- `month.commit`;
- `month.retry`.

**Excluded:** persistence aggregation, Tauri IPC timing, WebView2 first meaningful paint, OS telemetry, performance gates and optimization.

## Completed tasks

- [x] Add recorder contracts and browser/no-op implementations.
- [x] Prove value/error transparency and failure isolation.
- [x] Inject recorder into content loader, desktop bootstrap and session controller.
- [x] Prove exact measure names, concurrent-operation coalescing and unchanged gameplay results.
- [x] Update profiling documentation and execution status.
- [ ] Run permanent gates, Sonar and external review on one unchanged head before merge.
