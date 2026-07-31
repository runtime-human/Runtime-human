---
title: "UI-03 Task 1 Checkpoint"
type: index
status: accepted
canon: false
updated: 2026-07-30
tracks:
  - "Issue #37"
  - "PR #70"
---

# UI-03 Task 1 Checkpoint

Task 1 establishes the dark game-token foundation, fixed renderer viewport ownership and the first controlled sandwich-panel primitives without changing gameplay, routes, persistence or deterministic state.

## Verification contract

- `runtime-human-design-tokens.test.ts` rejects the previous paper surfaces and generic purple/indigo defaults.
- `game-shell.test.tsx` verifies semantic landmarks and fixed slot composition.
- `sandwich-panel.test.tsx` verifies controlled disclosure and accessible state.
- Formatter output is committed as product code; temporary formatting automation is removed.
- The branch must pass the normal foundation, docs and focused UI workflow from a non-bot commit before Task 2 starts.

## Sequencing

PR #70 remains independent from PERF-02A product behavior. It may continue through reviewable UI tasks, but final synchronization and performance comparison must use the merged PERF-02A capture harness rather than ad hoc visual timing.
