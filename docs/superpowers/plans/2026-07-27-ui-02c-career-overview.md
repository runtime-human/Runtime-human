---
title: "UI-02C Career Overview Implementation Plan"
type: plan
status: active
canon: true
updated: 2026-07-27
---

# UI-02C Career Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion. Implement one independently reviewable behavior at a time.

**Goal:** Replace the temporary Overview placeholder with an authoritative, state-specific Career Overview derived from the existing January session projection, without a second controller, a second persistence read, or invented career metrics.

**Architecture:** `January1990RuntimeView` remains the application projection of save and persisted MonthRun state. A strict `January1990ResultSummary` parser converts the closed committed result payload into typed data. A pure desktop `CareerOverviewView` projector maps `JanuarySessionView` into rendering states. React receives only typed presentation data and never parses authoritative JSON.

**Tech Stack:** TypeScript 7, React 19.2, existing `@runtime-human/game-application`, Vitest 4, Testing Library, Storybook 10, Runtime Human design tokens and `DesktopShell`.

## Global Constraints

- Keep `useJanuarySession()` as the only January controller lifecycle.
- Do not call `loadSave`, `loadActiveMonthRun`, `loadMonthRun`, Tauri `invoke` or `fetch` from Overview.
- Do not add a routing, state-management, charting or component-framework dependency.
- Do not expose raw `AuthoritativeJsonValue` to React components.
- Preserve January gameplay commands, persistence semantics, checkpoints and deterministic outputs.
- Do not invent salary, XP, streak, productivity, activity, timeline or multi-month history.
- A malformed committed result must become a typed blocked Overview state, not an uncaught render error.
- Future navigation entries remain disabled.
- Final branch contains no temporary workflow.

---

### Task 1: Define strict January committed-result summary

**Files:**
- Create: `packages/game-application/src/january-1990/january-result-summary.ts`
- Modify: `packages/game-application/src/january-1990/index.ts`
- Modify: `packages/game-application/src/index.ts`
- Test: `tests/january-1990-result-summary.test.ts`

**Contract:**

```ts
export type January1990QualityScores = Readonly<{
  clarity: number;
  correctness: number;
  reliability: number;
}>;

export type January1990ResultSummary = Readonly<{
  month: "1990-01";
  projectId: string;
  outcomeEventId: string;
  qualityScores: January1990QualityScores;
}>;

export function parseJanuary1990ResultSummary(value: unknown): January1990ResultSummary;
```

- [ ] Write RED tests for a valid complete result.
- [ ] Require exact top-level fields and exact `schemaVersion`/month.
- [ ] Require exact programming outcome and quality score fields.
- [ ] Validate safe integer score ranges against clarity 10, correctness 11 and reliability 9.
- [ ] Require non-empty project and outcome event IDs.
- [ ] Freeze the summary and nested score object.
- [ ] Confirm focused RED before production implementation.
- [ ] Implement the minimal parser and confirm GREEN.

### Task 2: Remove raw committed-result parsing from January presentation

**Files:**
- Modify: `apps/desktop/src/january/january-screen-model.ts`
- Modify: committed fixtures in January tests and stories.
- Test: `tests/january-1990-runtime-screen.test.tsx`

- [ ] Replace local `asRecord`/`score` parsing with `parseJanuary1990ResultSummary`.
- [ ] Remove duplicated raw JSON helpers.
- [ ] Keep the existing committed title, summary, progress and quality progressbars.
- [ ] Keep the existing real quality maxima.
- [ ] Treat invalid committed results as absent scores in January presentation; Overview owns the explicit invalid-result blocked state.

### Task 3: Define pure CareerOverviewView projection

**Files:**
- Create: `apps/desktop/src/overview/career-overview-model.ts`
- Test: `tests/career-overview-model.test.ts`
- Modify: `tests/tsconfig.json` only if the new source boundary is not already included.

**Contract:**

```ts
export type CareerOverviewView =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "new-career"; saveId: SaveId | null }>
  | Readonly<{
      kind: "active-month";
      month: "1990-01";
      stage: "access" | "learning" | "defect";
      progress: 28 | 52 | 76;
      saveId: SaveId;
      runId: MonthRunId;
      runRevision: MonthRunRevision;
    }>
  | Readonly<{
      kind: "completed-month";
      month: "1990-01";
      saveId: SaveId;
      runId: MonthRunId;
      saveRevision: SaveRevision;
      qualityScores: January1990QualityScores;
    }>
  | Readonly<{
      kind: "terminal";
      status: "failed" | "incompatible" | "recovery-required" | "abandoned";
      saveId: SaveId;
      runId: MonthRunId;
    }>
  | Readonly<{
      kind: "blocked";
      reason: "recovery" | "incompatible-persistence" | "incompatible-checkpoint" | "corrupted-checkpoint" | "invalid-result";
      message: string;
    }>
  | Readonly<{ kind: "rejected"; code: string; message: string; retryable: boolean }>;
```

- [ ] RED-test every current January session kind.
- [ ] Map access/learning/defect to exact stage and 28/52/76 progress.
- [ ] Preserve save/run/revision identifiers without formatting them.
- [ ] Parse committed results through the application parser.
- [ ] Convert parser failure into `blocked/invalid-result`.
- [ ] Keep the projector pure and React-free.

### Task 4: Replace placeholder with state-specific CareerOverviewScreen

**Files:**
- Replace: `apps/desktop/src/overview/CareerOverviewPlaceholder.tsx`
- Create: `apps/desktop/src/overview/CareerOverviewScreen.tsx`
- Modify: `apps/desktop/src/overview/career-overview.css`
- Modify: `apps/desktop/src/RuntimeDesktop.tsx`
- Test: `tests/career-overview-screen.test.tsx`

- [ ] Loading shows neutral loading state with no placeholder values.
- [ ] New career shows January 1990 and an action to open the month.
- [ ] Active month shows stage, persisted run revision and real progress.
- [ ] Completed month shows save revision and real quality scores/maxima.
- [ ] Terminal and blocked states preserve their concrete reason/status.
- [ ] Retryable rejection exposes the existing safe retry action only.
- [ ] Non-retryable rejection has no fake recovery action.
- [ ] Screen receives `CareerOverviewView`; it never reads session JSON.

### Task 5: Preserve root lifecycle and route behavior

**Files:**
- Modify: `apps/desktop/src/RuntimeDesktop.tsx`
- Modify: `tests/runtime-desktop-routing.test.tsx`
- Modify: `tests/app-routing-lifecycle.test.tsx` only if additional assertions are required.

- [ ] Project Overview from the existing `session.view`.
- [ ] Pass `session.retry` only as an action; do not create another controller.
- [ ] Overview ↔ Current Month transitions preserve the root session lifecycle.
- [ ] January commands remain callable only from the January workspace.
- [ ] Future navigation remains disabled.

### Task 6: Storybook and visual states

**Files:**
- Modify: `apps/desktop/src/RuntimeDesktop.stories.tsx`
- Create or modify Overview-specific story fixtures as needed.

- [ ] Add loading, new, access, learning, defect, completed, terminal, blocked and retryable rejected stories.
- [ ] Preserve Current Month story.
- [ ] Verify compact desktop, narrow viewport and 200% zoom through Storybook/manual capture where available.
- [ ] Preserve focus-visible and reduced-motion behavior.

### Task 7: Source of truth and acceptance

**Files:**
- Modify: `docs/EXECUTION-STATUS.jsonc`
- Regenerate: `docs/MANIFEST.jsonc`, `docs/CATALOG.md`

- [ ] Add active `career-overview-projection` milestone linked to issue #46.
- [ ] Record the no-new-persistence-read and no-invented-metrics exclusions.
- [ ] Run documentation generation/check.
- [ ] Run permanent docs and full Windows foundation workflows on one unchanged head.
- [ ] Review package boundaries, raw JSON usage, route lifecycle, stories and final diff.
- [ ] Squash-merge with expected-head protection.
- [ ] Close #46 only after merge and post-merge ledger closure.

## Follow-up

After UI-02C, execute PERF-02 #39 to measure process/WebView2/renderer/IPC/queue/SQLite/Windows resource behavior. Select exactly one optimization from evidence. NPC foundation remains after product-facing baseline stabilization; the source research recommends a small deterministic actor model with directed relationships, bounded typed memory, integer utility and storylets rather than runtime LLM agents.
