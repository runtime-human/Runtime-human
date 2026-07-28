---
title: "UI-02C Career Overview Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-27
---

# UI-02C Career Overview Implementation Plan

> **For agentic workers:** use `superpowers:test-driven-development`, `superpowers:systematic-debugging` and `superpowers:verification-before-completion`. Keep each change independently reviewable and preserve the unchanged-head merge policy.

## Goal

Replace the temporary Career Overview placeholder with an authoritative, state-specific view derived from the already loaded January session. Do not create a second controller, a second persistence read or career metrics that do not exist in the save.

## Reviewed architecture

```text
Rust-owned SQLite
→ persisted MonthRun orchestration
→ January1990RuntimeView
→ JanuarySessionView
→ pure CareerOverviewView projection
→ CareerOverviewScreen
```

The committed January payload crosses two separate boundaries:

```text
Game Core
  owns January1990ResultV1 creation, validation, canonical IDs and score limits

Game Application
  owns January1990ResultSummary read-model projection

React
  receives typed presentation data and never interprets AuthoritativeJsonValue
```

This ownership correction is mandatory. Duplicating the closed January result schema in `game-application` previously allowed Storybook and tests to use invented IDs that the real Game Core never emits.

## Global constraints

- `useJanuarySession()` remains the only January controller lifecycle.
- Overview does not call `loadSave`, `loadActiveMonthRun`, `loadMonthRun`, Tauri `invoke` or `fetch`.
- Route state is not authoritative state.
- No new router, state manager, chart library or component framework.
- No salary, XP, streak, productivity, activity feed, fake timeline or multi-month history.
- January commands, checkpoints, persistence semantics and deterministic outputs remain unchanged.
- Malformed committed data becomes typed `blocked/invalid-result`, not a render crash.
- Unexpected programmer/runtime errors are rethrown rather than hidden as invalid user data.
- Future navigation entries remain disabled.
- Final PR contains no temporary write-enabled workflow.

## Task 1 — Game Core owns the January result contract

**Files**

- Modify: `packages/game-core/src/january-1990/january-outcome.ts`
- Modify: `packages/game-core/src/january-1990/index.ts`
- Modify: `packages/game-core/src/index.ts`
- Test: `tests/january-1990-result-summary.test.ts`

**Required behavior**

- [x] Add `parseJanuary1990Result(value)` beside `createJanuary1990Result`.
- [x] Require the exact top-level and programming-outcome field sets.
- [x] Require `january-1990-result-v1`, `january-1990-programming-outcome-v1` and month `1990-01`.
- [x] Require canonical `JANUARY_1990_CONTENT_IDS`, not arbitrary non-empty strings.
- [x] Reuse the existing provisional-state parser for choices, evidence IDs and reason codes.
- [x] Require finalized non-null fields and non-empty evidence.
- [x] Enforce real score maxima: clarity 10, correctness 11, reliability 9.
- [x] Verify top-level and nested identity equality.
- [x] Return deeply immutable result data.
- [x] Make `createJanuary1990Result` pass through the same parser so creator/parser cannot drift.

## Task 2 — Application layer projects, but does not revalidate the domain

**Files**

- Modify: `packages/game-application/src/january-1990/january-result-summary.ts`
- Modify: `packages/game-application/src/january-1990/index.ts`
- Modify: `packages/game-application/src/index.ts`

**Required behavior**

- [x] Delegate validation to `parseJanuary1990Result` from Game Core.
- [x] Re-export the single score-maximum source.
- [x] Preserve canonical ID types in `January1990ResultSummary`.
- [x] Return an immutable summary containing month, project ID, outcome event ID and quality scores.
- [x] Remove the duplicate closed-field parser and duplicate evidence validation from application code.

## Task 3 — Remove raw result parsing from January presentation

**Files**

- Modify: `apps/desktop/src/january/january-screen-model.ts`
- Test: `tests/january-1990-runtime-screen.test.tsx`

- [x] Replace local `asRecord`/`score` helpers with the application summary projector.
- [x] Preserve existing January committed copy, progress and quality progressbars.
- [x] Preserve the real metric maxima.
- [x] Treat invalid persisted result data as unavailable score data in the January workspace.
- [ ] Narrow the presentation catch to known validation errors only before final review.

## Task 4 — Pure CareerOverviewView projection

**Files**

- Create: `apps/desktop/src/overview/career-overview-model.ts`
- Test: `tests/career-overview-model.test.ts`

- [x] Cover loading, idle, three decision stages, committed, terminal, blocked and rejected.
- [x] Map access/learning/defect to 28/52/76 progress.
- [x] Preserve typed save/run/revision IDs.
- [x] Convert known result-validation failure to `blocked/invalid-result`.
- [x] Rethrow unexpected non-validation errors.
- [x] Keep the projector pure, deterministic and React-free.

## Task 5 — State-specific CareerOverviewScreen

**Files**

- Delete: `apps/desktop/src/overview/CareerOverviewPlaceholder.tsx`
- Create: `apps/desktop/src/overview/CareerOverviewScreen.tsx`
- Modify: `apps/desktop/src/overview/career-overview.css`
- Test: `tests/career-overview-screen.test.tsx`

- [x] Loading has no placeholder values.
- [x] New career shows January 1990 and an action to open it.
- [x] Active month shows the real stage, persisted run revision and progress.
- [x] Completed month shows save revision and real quality scores/maxima.
- [x] Terminal and blocked states preserve the concrete status or reason.
- [x] Retry CTA appears only for retryable rejection and calls the existing session retry action.
- [x] Screen receives only `CareerOverviewView`.
- [x] Focus-visible, reduced motion and responsive layout use existing design tokens.

## Task 6 — Preserve root lifecycle and navigation

**Files**

- Modify: `apps/desktop/src/RuntimeDesktop.tsx`
- Verify: existing routing and lifecycle tests

- [x] Build Overview from the existing `session.view`.
- [x] Keep one root-owned January session across route changes.
- [x] Keep January commands in the January workspace.
- [x] Keep future navigation disabled.
- [x] Add no persistence or IPC request.

## Task 7 — Canonical fixtures, stories and regression coverage

**Files**

- Create: `apps/desktop/src/january/january-result.fixture.ts`
- Modify: `apps/desktop/src/RuntimeDesktop.stories.tsx`
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.stories.tsx`
- Modify: `tests/january-1990-result-summary.test.ts`
- Modify: `tests/career-overview-model.test.ts`
- Modify: `tests/january-1990-runtime-screen.test.tsx`

- [x] Replace invented IDs with exported Game Core constants.
- [x] Build UI fixtures through `createJanuary1990Result`.
- [x] Cover non-canonical project, work-package and evidence IDs.
- [x] Keep Storybook states for loading, new, access, learning, defect, completed, terminal, blocked and retryable rejected.
- [x] Preserve Current Month story.
- [ ] Capture a real WebView2/DPI/200%-zoom visual baseline in a later visual-QA slice; Storybook build alone is not pixel-level evidence.

## Task 8 — Source of truth and final acceptance

**Files**

- Modify: `docs/EXECUTION-STATUS.jsonc`
- Regenerate: `docs/MANIFEST.jsonc`, `docs/CATALOG.md`

- [x] Record the active `career-overview-projection` milestone and exclusions.
- [x] Record zero additional persistence reads and one January controller lifecycle.
- [ ] Update milestone evidence with the reviewed Game Core parser ownership.
- [ ] Remove `.github/workflows/ui-02c-refinalize.yml` before review.
- [ ] Run canonical formatting, docs generation and content check.
- [ ] Run permanent docs and full Windows foundation gates on one unchanged head.
- [ ] Inspect the final diff, package boundaries, Storybook matrix and review threads.
- [ ] Update PR #48 description from obsolete RED state to the actual implementation.
- [ ] Move PR #48 out of draft and squash-merge with expected-head protection.
- [ ] Close issue #46 only after merge.

## Task 9 — Post-merge closure

Create a separate docs-only PR after PR #48 merges.

- [ ] Mark `career-overview-projection` complete.
- [ ] Record the PR #48 merge SHA and unchanged-head evidence.
- [ ] Change the current phase to `product-facing-performance-baseline`.
- [ ] Keep parent issues #37 and #40 open unless all parent acceptance criteria are demonstrably complete.
- [ ] Keep #24 and #39 open as the performance tracks.

## Next execution program

### P0 — PERF-02, issue #39

1. Measure process start, Tauri setup, WebView2 creation, renderer bootstrap, React commit, shell FMP and January session ready.
2. Measure browser invoke, Rust dispatch, persistence queue depth/wait and SQLite duration.
3. Capture cold and warm startup separately.
4. Capture Windows private working set, handles, threads, idle CPU and wakeups.
5. Keep telemetry observational and outside save/checkpoint/journal/receipt data.
6. Publish versioned, warning-only evidence.
7. Select exactly one optimization from measured user impact.

### P1 — Documentation governance

1. Update `docs/INDEX.md` to foreground the execution ledger, current UI track and performance evidence.
2. Extend `scripts/build-toc.mjs` to validate the documented status enum.
3. Enforce `completed` metadata for plans under `docs/superpowers/plans/`.
4. Mark stale plans superseded rather than silently deleting them.

### P2 — Persistence hot path only after measurement

Preserve the approved single-writer `rusqlite`, WAL/FULL, `BEGIN IMMEDIATE`, revision+hash CAS, durable receipts and journal. Introduce a coarse read or async bridge only when PERF-02 proves that IPC/queue/SQLite composition is a meaningful bottleneck.

### P3 — NPC foundation after the product baseline

Implement a small deterministic actor set, directed relationships, bounded typed memory, integer utility and storylets. Do not introduce runtime LLM authority, vector memory or full-population daily simulation.
