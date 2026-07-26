---
title: "Runtime Human — browser User Timing"
type: engine
status: draft
canon: true
updated: 2026-07-26
---

# Runtime Human — browser User Timing

## Purpose

The January desktop composition root publishes observational browser timings for startup sub-operations that are not visible in the application and SQLite benchmark harnesses. These marks are diagnostic evidence only. They do not participate in authoritative state, determinism, persistence or gameplay decisions.

## Measure names

| Measure | Boundary |
|---|---|
| `app.session_bootstrap` | whole `createDesktopJanuarySession` operation |
| `content.manifest` | fetch and parse compiled manifest |
| `content.chunk` | fetch and parse one required compiled chunk; emitted once per chunk |
| `content.registry` | verified registry publication |
| `month.load` | persisted January context load |
| `month.begin` | begin through first decision boundary |
| `month.resume` | non-final decision continuation |
| `month.commit` | final defect decision through committed result |
| `month.retry` | application retry after a retryable rejected operation |

The browser recorder creates a unique start mark for every operation using the form:

```text
runtime-human:<measure-name>:<sequence>:start
```

The mark is cleared after the measure is published. Multiple entries may intentionally share the stable measure name so browser tooling can group them.

## Failure semantics

Timing is strictly observational:

- `performance.mark`, `performance.measure` and `performance.clearMarks` failures are swallowed;
- a successful authoritative operation returns its original value;
- a rejected authoritative operation rethrows its original error;
- timing data is never written to saves, checkpoints, receipts or the determinism manifest;
- non-browser composition can inject the transparent no-op recorder;
- concurrent January actions are coalesced before the timing wrapper, so one accepted runtime mutation produces one timing measure.

## Capturing a trace

1. Run the desktop application in a profiling or development build.
2. Open WebView2 DevTools.
3. Record a Performance trace while loading the January screen and completing the month.
4. Filter User Timing entries by `app.`, `content.` or `month.`.
5. Record the exact commit, Windows build, WebView2 runtime version, power plan and whether content/save data was already warm.

Do not infer Tauri IPC or Rust/SQLite latency from these browser measures alone. Correlate them with `pnpm perf:january:sqlite` and a later Tauri command-boundary trace.

## Interpretation boundary

This slice does not yet measure:

- process creation;
- Rust/Tauri setup;
- Tauri invoke serialization and command dispatch;
- WebView2 initialization;
- React commit or first meaningful paint;
- Windows idle CPU, wakeups, handles, threads or working set.

The next product-facing baseline should add explicit first meaningful paint and Tauri IPC boundaries without changing the measure names above.
