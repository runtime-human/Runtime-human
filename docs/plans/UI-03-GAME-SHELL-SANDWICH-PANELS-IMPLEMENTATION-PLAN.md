---
title: "UI-03 Game Shell and Selective Sandwich Panels Implementation Plan"
type: plan
status: active
canon: true
updated: 2026-07-30
tracks:
  - "Issue #37"
---

# UI-03 Game Shell and Selective Sandwich Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current page-like beige desktop UI with a fixed-viewport Runtime Human game shell and selectively applied sandwich panels while preserving all authoritative gameplay, routing, persistence, and performance semantics.

**Architecture:** The renderer gains presentation-only primitives (`GameShell`, `SandwichPanel`, `SandwichRail`, `BottomGameDock`) that receive typed React content and never parse or mutate authoritative state. Existing `RuntimeDesktop`, Career Overview, and January projections compose these primitives in staged migrations. Global document scrolling is removed; overflow is confined to named panel and dock regions.

**Tech Stack:** React 19, TypeScript, CSS custom properties, existing History API routing, Storybook, Vitest, Testing Library, Tauri 2 renderer.

## Global Constraints

- No gameplay, save schema, SQLite, Tauri command, route URL, or deterministic output change.
- Preserve one root-owned January controller.
- Preserve `/` and `/month/current`.
- No beige, cream, warm paper UI surfaces.
- No default Tailwind indigo, purple-blue trust gradient, decorative blobs, or generic identical card grid.
- One global accent role; domain colors only identify real game resources.
- No invented salary, XP, productivity, relationship score, events, or other filler data.
- Sandwich panels are used only in Player Rail, Context Rail, Bottom Dock, and optional activity detail.
- Primary decisions, blocking errors, and top navigation never live inside sandwich panels.
- At most one detail panel is expanded per rail by default.
- No global document scroll at 1280×720, 1600×900, and 1920×1080.
- No drag-resize or nested accordion in this implementation.
- Keyboard, focus-visible, reduced-motion, long Russian labels, and 200% text zoom are required gates.

---

## File structure

### New presentation primitives

- `apps/desktop/src/shell/GameShell.tsx` — fixed viewport slot composition and landmarks.
- `apps/desktop/src/shell/game-shell.css` — shell grid, overflow, compact and overlay modes.
- `apps/desktop/src/panels/SandwichPanel.tsx` — controlled disclosure primitive.
- `apps/desktop/src/panels/SandwichRail.tsx` — one-expanded-panel coordination.
- `apps/desktop/src/panels/sandwich-panel.css` — panel layer visuals and motion.
- `apps/desktop/src/dock/BottomGameDock.tsx` — accessible tabbed lower workspace.
- `apps/desktop/src/dock/bottom-game-dock.css` — collapsed/normal dock composition.
- `apps/desktop/src/game-ui/game-ui-model.ts` — presentation-only panel and dock state types.

### Existing composition to modify

- `apps/desktop/src/design/runtime-human-tokens.css`
- `apps/desktop/src/shell/DesktopShell.tsx`
- `apps/desktop/src/shell/desktop-shell.css`
- `apps/desktop/src/RuntimeDesktop.tsx`
- `apps/desktop/src/RuntimeDesktop.stories.tsx`
- `apps/desktop/src/overview/CareerOverviewScreen.tsx`
- `apps/desktop/src/overview/career-overview.css`
- `apps/desktop/src/january/JanuaryRuntimeScreen.tsx`
- `apps/desktop/src/january/january-runtime.css`
- `apps/desktop/src/main.tsx`

### Tests and evidence

- `tests/runtime-human-design-tokens.test.ts`
- `tests/game-shell.test.tsx`
- `tests/sandwich-panel.test.tsx`
- `tests/sandwich-rail.test.tsx`
- `tests/bottom-game-dock.test.tsx`
- `tests/desktop-shell.test.tsx`
- `tests/runtime-desktop-routing.test.tsx`
- `tests/career-overview-screen.test.tsx`
- `tests/january-1990-runtime-screen.test.tsx`
- Storybook stories under the existing desktop, overview, and January story files.

---

### Task 1: Replace the visual token foundation and lock anti-patterns

**Files:**
- Modify: `apps/desktop/src/design/runtime-human-tokens.css`
- Modify: `apps/desktop/src/shell/desktop-shell.css`
- Create: `tests/runtime-human-design-tokens.test.ts`
- Modify: `tests/tsconfig.json`

**Interfaces:**
- Produces: canonical `--game-*` semantic tokens consumed by every later task.
- Preserves: temporary compatibility aliases for unchanged feature CSS until Tasks 6–7 migrate it.

- [ ] **Step 1: Write the failing token contract test**

```ts
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const tokensPath = new URL(
  "../apps/desktop/src/design/runtime-human-tokens.css",
  import.meta.url,
);

describe("Runtime Human game design tokens", () => {
  it("defines the cold game palette and excludes old paper/AI defaults", async () => {
    const css = await readFile(tokensPath, "utf8");

    for (const token of [
      "--game-bg:",
      "--game-surface-1:",
      "--game-fg:",
      "--game-border:",
      "--game-accent:",
      "--game-warning:",
      "--game-danger:",
      "--game-font-display:",
      "--game-font-ui:",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).not.toContain("--surface-paper:");
    expect(css).not.toContain("--surface-paper-raised:");
    expect(css).not.toMatch(/#6366f1|#4f46e5|#8b5cf6|#7c3aed|#a855f7/i);
  });

  it("caps game panel radii below generic AI-card proportions", async () => {
    const css = await readFile(tokensPath, "utf8");
    expect(css).toContain("--game-radius-panel: 6px;");
    expect(css).toContain("--game-radius-dialog: 8px;");
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
pnpm exec vitest run tests/runtime-human-design-tokens.test.ts
```

Expected: FAIL because `--game-*` tokens do not exist and paper tokens still exist.

- [ ] **Step 3: Replace the canonical token root**

Implement the accepted spec values, including:

```css
:root {
  color-scheme: dark;

  --game-bg: #071017;
  --game-bg-deep: #040a0f;
  --game-surface-1: #0b151e;
  --game-surface-2: #101d28;
  --game-surface-3: #162632;
  --game-surface-hover: #1b2e3a;

  --game-fg: #e7f0f2;
  --game-fg-2: #b5c5ca;
  --game-muted: #7f9299;
  --game-disabled: #4c5e65;

  --game-border-soft: rgb(224 244 250 / 8%);
  --game-border: rgb(224 244 250 / 14%);
  --game-border-strong: rgb(224 244 250 / 24%);

  --game-accent: #35b8c7;
  --game-accent-hover: #4bc9d6;
  --game-accent-active: #2696a4;
  --game-accent-on: #031215;

  --game-success: #52be78;
  --game-warning: #d69b45;
  --game-danger: #e55f6e;
  --game-info: #4ca6d8;

  --game-font-display: "Exo 2", "Segoe UI", sans-serif;
  --game-font-ui: "IBM Plex Sans", "Segoe UI", sans-serif;
  --game-font-mono: "Cascadia Mono", Consolas, monospace;

  --game-radius-control: 4px;
  --game-radius-panel: 6px;
  --game-radius-dialog: 8px;

  --game-motion-fast: 100ms;
  --game-motion-enter: 200ms;
  --game-motion-exit: 140ms;
  --game-ease-standard: cubic-bezier(0.23, 1, 0.32, 1);
}
```

Keep only temporary aliases needed by untouched CSS, mapped to the new dark roles. Do not retain paper aliases.

- [ ] **Step 4: Enforce fixed root ownership**

In `desktop-shell.css` set:

```css
html,
body,
#root {
  width: 100%;
  height: 100%;
  min-width: 1180px;
  min-height: 720px;
  overflow: hidden;
}
```

Do not yet restructure `DesktopShell`; that belongs to Task 2.

- [ ] **Step 5: Run focused verification**

```bash
pnpm exec vitest run tests/runtime-human-design-tokens.test.ts
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/design/runtime-human-tokens.css apps/desktop/src/shell/desktop-shell.css tests/runtime-human-design-tokens.test.ts tests/tsconfig.json
git commit -m "style: establish Runtime Human game palette"
```

---

### Task 2: Add the fixed-viewport `GameShell`

**Files:**
- Create: `apps/desktop/src/shell/GameShell.tsx`
- Create: `apps/desktop/src/shell/game-shell.css`
- Modify: `apps/desktop/src/shell/DesktopShell.tsx`
- Modify: `apps/desktop/src/main.tsx`
- Create: `tests/game-shell.test.tsx`
- Modify: `tests/desktop-shell.test.tsx`

**Interfaces:**
- Produces: `GameShellProps` and one fixed viewport landmark tree.
- Consumes: Task 1 semantic tokens.

- [ ] **Step 1: Write RED tests for the slot composition**

```tsx
render(
  <GameShell
    topHud={<div>HUD</div>}
    playerRail={<div>Player</div>}
    scene={<div>Scene</div>}
    contextRail={<div>Context</div>}
    bottomDock={<div>Dock</div>}
  />,
);

expect(screen.getByRole("banner", { name: "Игровой интерфейс" })).toBeVisible();
expect(screen.getByRole("complementary", { name: "Состояние персонажа" })).toBeVisible();
expect(screen.getByRole("main", { name: "Игровая сцена" })).toBeVisible();
expect(screen.getByRole("complementary", { name: "Контекст игры" })).toBeVisible();
expect(screen.getByRole("region", { name: "Игровой док" })).toBeVisible();
```

Also assert the root has `data-layout="game-shell"` and no generic document wrapper.

- [ ] **Step 2: Confirm RED**

```bash
pnpm exec vitest run tests/game-shell.test.tsx tests/desktop-shell.test.tsx
```

Expected: module or landmark assertions fail.

- [ ] **Step 3: Implement `GameShell`**

```tsx
export type GameShellProps = Readonly<{
  topHud: ReactNode;
  playerRail: ReactNode;
  scene: ReactNode;
  contextRail: ReactNode;
  bottomDock: ReactNode;
}>;

export function GameShell(props: GameShellProps) {
  return (
    <div className="runtime-game-shell" data-layout="game-shell">
      <header aria-label="Игровой интерфейс" className="runtime-game-top">
        {props.topHud}
      </header>
      <aside aria-label="Состояние персонажа" className="runtime-game-player">
        {props.playerRail}
      </aside>
      <main aria-label="Игровая сцена" className="runtime-game-scene">
        {props.scene}
      </main>
      <aside aria-label="Контекст игры" className="runtime-game-context">
        {props.contextRail}
      </aside>
      <section aria-label="Игровой док" className="runtime-game-dock">
        {props.bottomDock}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Implement the fixed grid and named overflow regions**

Use CSS grid exactly as defined in the accepted spec. Set `min-width: 0` and `min-height: 0` on all five slots. Only the rail bodies and dock panel may use `overflow: auto` later.

- [ ] **Step 5: Adapt `DesktopShell` without changing navigation behavior**

Keep the existing `DesktopShellProps` and `handleRouteClick` semantics. Internally compose `GameShell`. In this task use temporary simple rail/dock placeholders derived only from existing navigation, profile, breadcrumb, era, and status props. Do not invent game data.

- [ ] **Step 6: Run focused and routing tests**

```bash
pnpm exec vitest run tests/game-shell.test.tsx tests/desktop-shell.test.tsx tests/runtime-desktop-routing.test.tsx tests/app-routing-lifecycle.test.tsx
pnpm typecheck
```

Expected: PASS and one root-owned controller tests remain unchanged.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/shell apps/desktop/src/main.tsx tests/game-shell.test.tsx tests/desktop-shell.test.tsx
git commit -m "refactor: install fixed Runtime Human game shell"
```

---

### Task 3: Add the controlled `SandwichPanel`

**Files:**
- Create: `apps/desktop/src/game-ui/game-ui-model.ts`
- Create: `apps/desktop/src/panels/SandwichPanel.tsx`
- Create: `apps/desktop/src/panels/sandwich-panel.css`
- Create: `tests/sandwich-panel.test.tsx`

**Interfaces:**
- Produces: `SandwichPanelState` and `SandwichPanelProps` exactly as defined by the spec.
- Does not own authoritative or persistent state.

- [ ] **Step 1: Write disclosure semantics tests**

Cover:

- `collapsed` renders header only;
- `summary` renders summary but not details;
- `expanded` renders summary and detail region;
- header is a `button` with stable `aria-controls` and `aria-expanded`;
- clicking cycles `collapsed → summary → expanded → summary` through `onStateChange`;
- detail controls are absent from tab order when not expanded;
- Escape does not collapse an ordinary inline panel.

- [ ] **Step 2: Confirm RED**

```bash
pnpm exec vitest run tests/sandwich-panel.test.tsx
```

- [ ] **Step 3: Implement the controlled primitive**

The component must not call `useState`. It receives state and emits the next state. Use a stable detail id `${id}-details` and `hidden` only where native semantics remain correct; prefer not rendering detail content for non-expanded states.

- [ ] **Step 4: Add scoped motion and reduced motion**

Use `--game-motion-enter`, `--game-motion-exit`, and `--game-ease-standard`. Animate opacity and grid row/clip only; never animate from `scale(0)`.

- [ ] **Step 5: Run focused verification and commit**

```bash
pnpm exec vitest run tests/sandwich-panel.test.tsx
pnpm typecheck
pnpm lint:type-aware
git add apps/desktop/src/game-ui apps/desktop/src/panels tests/sandwich-panel.test.tsx
git commit -m "feat: add selective sandwich panel primitive"
```

---

### Task 4: Add `SandwichRail` coordination

**Files:**
- Create: `apps/desktop/src/panels/SandwichRail.tsx`
- Create: `tests/sandwich-rail.test.tsx`
- Modify: `apps/desktop/src/panels/sandwich-panel.css`

**Interfaces:**
- Consumes: `SandwichPanelState` and `SandwichPanel`.
- Produces: one-expanded-panel coordination and presentation-only panel state map.

- [ ] **Step 1: Write RED coordination tests**

Use descriptors for `events`, `finance`, and `processes`. Verify:

- one panel can be expanded;
- expanding a second changes the first to `summary`;
- a collapsed panel stays collapsed when another opens;
- critical promotion expands `events` without calling `.focus()`;
- nested rail descriptors are rejected by TypeScript structure, not runtime recursion.

- [ ] **Step 2: Implement `SandwichRail`**

Keep state in the rail component for the current renderer session. Expose optional controlled state only if `RuntimeDesktop` requires it later; do not introduce global state management.

- [ ] **Step 3: Verify and commit**

```bash
pnpm exec vitest run tests/sandwich-panel.test.tsx tests/sandwich-rail.test.tsx
pnpm typecheck
git add apps/desktop/src/panels tests/sandwich-rail.test.tsx
git commit -m "feat: coordinate game rail panel layers"
```

---

### Task 5: Add the accessible `BottomGameDock`

**Files:**
- Create: `apps/desktop/src/dock/BottomGameDock.tsx`
- Create: `apps/desktop/src/dock/bottom-game-dock.css`
- Create: `tests/bottom-game-dock.test.tsx`

**Interfaces:**
- Produces: `BottomGameDock`, `BottomGameDockItem`, and `activeId`/`onActiveIdChange` contract.
- Uses tabs, not disclosure semantics.

- [ ] **Step 1: Write RED tab-pattern tests**

Verify:

- one `tablist`;
- roving tab focus with ArrowLeft/ArrowRight/Home/End;
- one visible `tabpanel`;
- inactive panels not rendered into sequential focus order;
- labels and counts remain visible in compact mode;
- no route navigation callback is invoked.

- [ ] **Step 2: Implement controlled dock**

```ts
type BottomGameDockItem = Readonly<{
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}>;
```

The parent owns `activeId`. Dock height is controlled by CSS states `compact | normal | expanded`; first product use is `normal`.

- [ ] **Step 3: Verify and commit**

```bash
pnpm exec vitest run tests/bottom-game-dock.test.tsx
pnpm typecheck
pnpm lint:type-aware
git add apps/desktop/src/dock tests/bottom-game-dock.test.tsx
git commit -m "feat: add Runtime Human bottom game dock"
```

---

### Task 6: Migrate Career Overview to the game composition

**Files:**
- Modify: `apps/desktop/src/RuntimeDesktop.tsx`
- Modify: `apps/desktop/src/overview/CareerOverviewScreen.tsx`
- Modify: `apps/desktop/src/overview/career-overview.css`
- Modify: `apps/desktop/src/RuntimeDesktop.stories.tsx`
- Modify: `tests/career-overview-screen.test.tsx`
- Modify: `tests/runtime-desktop-routing.test.tsx`

**Interfaces:**
- Consumes: existing `CareerOverviewView` projection unchanged.
- Composes: `GameShell`, Player Rail sandwich panels, Context Rail sandwich panels, and Bottom Dock.

- [ ] **Step 1: Write RED composition assertions**

For loading, new career, active January, completed, blocked, terminal, and retryable states assert:

- central scene landmark is present;
- CTA remains visible and has the same callback;
- blocking/retry content is directly visible, never inside a collapsed panel;
- no text named `Authoritative Career Overview`, `Следующий слой`, or implementation jargon remains;
- no invented metrics are introduced;
- relevant rail headers exist with honest summaries.

- [ ] **Step 2: Build presentation-only rail content**

Use only values already present in `CareerOverviewView`. When a reference-screen block lacks authoritative data, omit it or show a precise unavailable state; do not fabricate a placeholder number.

- [ ] **Step 3: Replace hero/note cards**

The overview scene becomes a career-stage visual surface with current January state and action. Remove the large editorial h1 composition and identical card geometry.

- [ ] **Step 4: Add Storybook full and dense states**

Add 1280×720 and 1920×1080 viewport parameters and a long-Russian-copy edge story.

- [ ] **Step 5: Verify and commit**

```bash
pnpm exec vitest run tests/career-overview-model.test.ts tests/career-overview-screen.test.tsx tests/runtime-desktop-routing.test.tsx
pnpm --filter @runtime-human/desktop storybook:build
pnpm --filter @runtime-human/desktop build
git add apps/desktop/src/RuntimeDesktop.tsx apps/desktop/src/overview apps/desktop/src/RuntimeDesktop.stories.tsx tests/career-overview-screen.test.tsx tests/runtime-desktop-routing.test.tsx
git commit -m "feat: migrate career overview to game shell"
```

---

### Task 7: Migrate January and remove paper UI roles

**Files:**
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.tsx`
- Modify: `apps/desktop/src/january/january-runtime.css`
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.stories.tsx`
- Modify: `tests/january-1990-runtime-screen.test.tsx`
- Modify: `tests/runtime-human-design-tokens.test.ts`

**Interfaces:**
- Consumes: existing January screen model, choices, callbacks, quality scores, and terminal listing unchanged.
- Produces: dark scene-oriented decision surface with selective activity/context layers.

- [ ] **Step 1: Extend RED assertions**

Verify all existing January states still expose the same action labels and choice values. Add assertions that:

- the decision region is always directly visible;
- choices are never descendants of a sandwich detail region;
- blocked and retryable errors are directly visible;
- terminal/code context may scroll locally;
- paper tokens and paper class names are absent.

- [ ] **Step 2: Replace the paper card**

Use dark game surfaces and strong hierarchy. Keep the terminal as a scoped monospace context surface. Use semantic warning/danger/success state strips rather than recoloring the entire card beige/green/red.

- [ ] **Step 3: Add selective activity/context panels**

Only secondary details such as session metadata or passive effects may use sandwich layers. Do not hide choices, current prompt, quality result, or recovery action.

- [ ] **Step 4: Verify all January stories and tests**

```bash
pnpm exec vitest run tests/january-1990-screen-model.test.ts tests/january-1990-runtime-screen.test.tsx tests/runtime-desktop-routing.test.tsx
pnpm --filter @runtime-human/desktop storybook:build
pnpm --filter @runtime-human/desktop build
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/january tests/january-1990-runtime-screen.test.tsx tests/runtime-human-design-tokens.test.ts
git commit -m "style: migrate January to simulator game surfaces"
```

---

### Task 8: Complete responsive, accessibility, visual, and documentation gates

**Files:**
- Modify: `apps/desktop/src/shell/game-shell.css`
- Modify: `apps/desktop/src/panels/sandwich-panel.css`
- Modify: `apps/desktop/src/dock/bottom-game-dock.css`
- Modify: `apps/desktop/src/RuntimeDesktop.stories.tsx`
- Modify: `docs/EXECUTION-STATUS.jsonc`
- Modify: `docs/INDEX.md`
- Modify: `docs/CATALOG.md`
- Modify: `docs/MANIFEST.jsonc`
- Modify: this plan status to `completed` after merge commit is known.

**Interfaces:**
- Completes: UI-03 shell baseline.
- Leaves: future Skills, Relationships, Chronology, NPC, and gameplay expansion separate.

- [ ] **Step 1: Add minimum-size and overlay-rail behavior**

At 1180–1279px convert one side rail to an overlay with an explicit toggle. Below 1180×720 render the supported-size notice while preserving settings/help access. Do not re-enable document scroll.

- [ ] **Step 2: Add keyboard and zoom regression coverage**

Cover:

- top navigation;
- panel disclosure;
- dock roving focus;
- overlay Escape behavior;
- no focus theft on critical promotion;
- 200% text zoom fixture;
- reduced-motion fixture.

- [ ] **Step 3: Run complete repository verification**

```bash
pnpm docs:generate
pnpm docs:check
pnpm fmt:check
pnpm lint
pnpm lint:type-aware
pnpm typecheck
pnpm content:check
pnpm boundaries:check
pnpm test
pnpm --filter @runtime-human/desktop build
pnpm --filter @runtime-human/desktop storybook:build
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml -- --test-threads=1
```

- [ ] **Step 4: Perform visual review**

Capture and inspect Storybook/application screenshots at:

- 1280×720;
- 1600×900;
- 1920×1080;
- long Russian text;
- loading;
- active decision;
- completed result;
- blocked;
- retryable error;
- reduced motion.

Reject the result if it resembles a generic SaaS dashboard without the Runtime Human logo.

- [ ] **Step 5: Update canonical execution records**

Record actual PR and merge SHA only after merge. Do not mark this plan completed before the product PR lands.

- [ ] **Step 6: Commit documentation closure in a separate PR**

```bash
git add docs
git commit -m "docs: close Runtime Human game shell redesign"
```

---

## Review and merge sequence

1. Finish and merge the independent PERF-02A PR #69 first.
2. Rebase this UI branch on the resulting `main` without importing evidence-only temporary workflows.
3. Keep the first UI product PR limited to Tasks 1–3 if the diff becomes too broad.
4. Use separate PRs for Career Overview migration and January migration when either exceeds a focused reviewer-sized change.
5. Require an unchanged green head, empty unresolved review threads, Storybook visual inspection, and no generated build outputs in the final diff.
6. Close or rewrite the stale warm-paper direction in issue #37 only after the accepted spec and first implementation slice are merged.

## Plan self-review

- Spec coverage: fixed viewport, selective panels, dock semantics, anti-beige palette, accessibility, responsive behavior, state coverage, and architecture invariants all map to explicit tasks.
- Placeholder scan: no `TBD`, `TODO`, generic “handle edge cases”, or unnamed tests remain.
- Type consistency: `SandwichPanelState`, `SandwichPanelProps`, `GameShellProps`, and dock item contracts are defined once and reused consistently.
- Scope: gameplay, persistence, NPCs, release packaging, drag-resize, and new authoritative metrics remain excluded.
