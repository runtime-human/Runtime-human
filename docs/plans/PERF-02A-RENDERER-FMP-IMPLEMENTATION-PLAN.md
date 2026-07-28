---
title: "PERF-02A Renderer and First Meaningful Paint Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-29
---

# PERF-02A Renderer and First Meaningful Paint Implementation Plan

## Goal

Complete the browser-owned milestone portion of PERF-02A without changing gameplay, persistence, routing, WebView count or the Rust performance snapshot. The renderer must expose one failure-safe, idempotent User Timing sequence that distinguishes JavaScript bootstrap, the first committed React shell, a successfully restored January session and the first frame that can display the actionable restored state.

## Closed milestone contract

```text
app.renderer_bootstrap
app.react_shell_commit
app.january_session_ready
app.first_meaningful_paint
```

Semantics:

- `renderer_bootstrap`: recorded in `main.tsx` after module/style evaluation and root lookup, immediately before `createRoot(...).render(...)`;
- `react_shell_commit`: recorded in an effect after the first `App` commit;
- `january_session_ready`: recorded only after the desktop January controller has been created and the restored typed view is committed to React state;
- `first_meaningful_paint`: scheduled once through `requestAnimationFrame` from the committed ready state. It is not HTML creation, WebView creation or the initial loading shell.

## Constraints

- telemetry errors never change rendering, session state, routing or gameplay results;
- no renderer writes into the Rust recorder and no new Tauri command;
- no arbitrary milestone names or payload/user data;
- no wall-clock timestamps; rely on browser monotonic User Timing;
- StrictMode and rerenders cannot duplicate marks;
- cleanup can cancel a scheduled frame before it fires;
- no fallback timer that would misrepresent a frame boundary;
- one production WebView and the existing root-owned January controller remain unchanged.

## Task 1 — Renderer milestone recorder

Create `apps/desktop/src/performance/renderer-milestones.ts` with:

- closed `RendererMilestoneName` union;
- injectable User Timing and animation-frame ports;
- per-name attempt-once semantics;
- failure-safe `mark`;
- idempotent `scheduleFirstMeaningfulPaint` returning cleanup;
- a production singleton for `main.tsx` and `App`.

## Task 2 — Explicit January readiness

Extend `JanuarySessionState` with `ready: boolean`:

- initial false;
- true only after `getDesktopJanuarySession()` resolves and controller/view state are installed;
- remains false when bootstrap rejects;
- normal start/choose/retry operations do not reset readiness.

## Task 3 — React integration

- mark renderer bootstrap before root render;
- pass the same singleton to `App`;
- mark React shell commit in a post-commit effect;
- when `session.ready` becomes true, mark January ready and schedule FMP;
- preserve current routing and controller lifecycle.

## Task 4 — TDD contracts

- exact closed milestone names;
- duplicate marks produce one port call;
- User Timing failures are swallowed;
- FMP is absent until the injected frame callback runs;
- duplicate scheduling produces one callback;
- cleanup cancels a pending callback and permits StrictMode rescheduling;
- failed January bootstrap does not produce ready/FMP;
- successful bootstrap produces shell, ready and frame-boundary FMP milestones;
- all `JanuarySessionState` fixtures provide the explicit ready field.

## Task 5 — Documentation and evidence preparation

- update the PERF-02A issue with the completed renderer block;
- record the milestone in `EXECUTION-STATUS.jsonc` after merge;
- leave cold/warm Windows evidence collection as the next independent block;
- do not select or implement a runtime optimization until combined Rust/browser evidence exists.

## Next block

Build an opt-in Windows collector that captures:

1. Rust `runtime-human-desktop-performance-snapshot-v1`;
2. browser User Timing entries for the four renderer milestones and existing duration measures;
3. cold-process versus warm-OS-cache classification;
4. new database versus existing clean database;
5. end-to-end load, begin, resume and final commit scenarios;
6. nearest-rank p50/p95/p99 with warning-only budgets.

PERF-02A then ends with exactly one evidence-backed recommendation. FIFO shutdown issue #58 remains separate unless measured idle/shutdown evidence makes it the highest-value next slice.
