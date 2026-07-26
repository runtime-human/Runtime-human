---
title: "UI-02A Desktop Shell Extraction Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-27
---

# UI-02A Desktop Shell Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Runtime Human desktop chrome from the January 1990 feature into a reusable typed `DesktopShell` without adding routes, new gameplay, or new persistence reads.

**Architecture:** `DesktopShell` owns the application landmark, wordmark, navigation, topbar, profile summary, and a generic status slot. It consumes a closed typed navigation model and plain presentation strings; it does not import January, MonthRun, save, persistence, or game-core types. `JanuaryRuntimeScreen` remains the feature owner of the playable month and composes its current UI inside the shell.

**Tech Stack:** React 19.2, TypeScript 7, CSS custom properties, Vitest 4, Testing Library, Storybook 10, Vite 8.

## Global Constraints

- Preserve every current `JanuaryRuntimeScreen` prop and typed callback.
- Preserve all authoritative January view states and deterministic outputs.
- Preserve the visible Archival Workstation design from `apps/desktop/src/design/DESIGN.md`.
- Do not add a router, new dependency, icon library, state container, persistence projection, or second WebView.
- Future sections remain non-interactive and explicitly disabled.
- The shell must not import from `apps/desktop/src/january`, `@runtime-human/game-*`, or Tauri.
- The final PR must contain no temporary write-enabled workflow.

---

### Task 1: Define the typed shell contract

**Files:**
- Create: `apps/desktop/src/shell/desktop-navigation.ts`
- Create: `apps/desktop/src/shell/DesktopShell.tsx`
- Test: `tests/desktop-shell.test.tsx`
- Modify: `tests/tsconfig.json`

**Interfaces:**
- Produces: `DesktopNavigationItem`, `DesktopShellProps`, and `DesktopShell`.
- `DesktopNavigationItem` is a discriminated union of `route` and `planned` entries.
- `DesktopShellProps` consumes presentation strings, a navigation list, `children`, and `status` React nodes.

- [ ] **Step 1: Write the failing shell contract test**

Create a test that renders one current route and one planned section, then asserts:

```tsx
const navigation = screen.getByRole("navigation", { name: "Разделы карьеры" });
expect(within(navigation).getByRole("link", { name: /Текущий месяц/u })).toHaveAttribute(
  "aria-current",
  "page",
);
expect(within(navigation).getByText("Навыки")).toHaveAttribute("aria-disabled", "true");
expect(screen.getByRole("main")).toHaveTextContent("Содержимое функции");
expect(screen.getByRole("status", { name: "Состояние сохранения" })).toHaveTextContent(
  "Состояние сохранено",
);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm exec vitest run tests/desktop-shell.test.tsx
```

Expected: FAIL because `apps/desktop/src/shell/DesktopShell.tsx` does not exist.

- [ ] **Step 3: Implement the minimal typed contract**

Use this closed model:

```ts
export type DesktopNavigationItem =
  | Readonly<{
      kind: "route";
      id: string;
      index: string;
      label: string;
      detail: string;
      href: string;
      current: boolean;
    }>
  | Readonly<{
      kind: "planned";
      id: string;
      index: string;
      label: string;
    }>;
```

`DesktopShell` renders semantic landmarks and does not know route implementation details beyond `href` and `current`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
pnpm exec vitest run tests/desktop-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/shell tests/desktop-shell.test.tsx tests/tsconfig.json
git commit -m "feat: add reusable desktop shell contract"
```

### Task 2: Separate shell styling from January styling

**Files:**
- Create: `apps/desktop/src/shell/desktop-shell.css`
- Modify: `apps/desktop/src/january/january-runtime.css`
- Modify: `apps/desktop/src/main.tsx`
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.stories.tsx`

**Interfaces:**
- Consumes: semantic tokens from `apps/desktop/src/design/runtime-human-tokens.css`.
- Produces: global shell selectors only in `desktop-shell.css`; January selectors only in `january-runtime.css`.

- [ ] **Step 1: Move existing `.runtime-*` selectors unchanged**

Move the current shell rules from `january-runtime.css` into `desktop-shell.css`, including responsive shell behavior and shared focus treatment. Do not redesign spacing, palette, or breakpoints in this task.

- [ ] **Step 2: Load styles in production and Storybook**

Production import order:

```ts
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./january/january-runtime.css";
```

January Storybook uses the same order.

- [ ] **Step 3: Verify formatting and renderer compilation**

Run:

```bash
pnpm fmt:check
pnpm typecheck
pnpm --filter @runtime-human/desktop build
pnpm --filter @runtime-human/desktop storybook:build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shell/desktop-shell.css apps/desktop/src/january/january-runtime.css apps/desktop/src/main.tsx apps/desktop/src/january/JanuaryRuntimeScreen.stories.tsx
git commit -m "refactor: separate desktop shell styles"
```

### Task 3: Compose January inside the reusable shell

**Files:**
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.tsx`
- Modify: `tests/january-1990-runtime-screen.test.tsx`

**Interfaces:**
- Consumes: `DesktopShell` and `DesktopNavigationItem`.
- Preserves: `JanuaryRuntimeScreenProps`, `onStart`, `onChoose`, `onRetry`, all view-kind rendering, real quality maxima, and busy-state behavior.

- [ ] **Step 1: Define the January shell presentation model**

Keep the following values local to the January composition until routing exists:

```ts
const JANUARY_NAVIGATION: readonly DesktopNavigationItem[] = [
  {
    kind: "route",
    id: "current-month",
    index: "01",
    label: "Текущий месяц",
    detail: "Январь 1990",
    href: "#current-month",
    current: true,
  },
  { kind: "planned", id: "skills", index: "02", label: "Навыки" },
  { kind: "planned", id: "relationships", index: "03", label: "Связи" },
  { kind: "planned", id: "chronology", index: "04", label: "Хронология" },
  { kind: "planned", id: "archive", index: "05", label: "Архив" },
];
```

- [ ] **Step 2: Replace embedded shell markup**

Wrap only the January feature region in:

```tsx
<DesktopShell
  navigation={JANUARY_NAVIGATION}
  breadcrumb="Январь 1990"
  era="Персональные компьютеры"
  profile="Локальная карьера"
  status={saveStatus}
>
  {januaryWorkspace}
</DesktopShell>
```

- [ ] **Step 3: Keep January behavior assertions green**

Run:

```bash
pnpm exec vitest run tests/desktop-shell.test.tsx tests/january-1990-runtime-screen.test.tsx
```

Expected: both suites pass; typed decision, busy blocking, metric maxima, shell navigation, terminal context, and save status remain covered.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/january/JanuaryRuntimeScreen.tsx tests/january-1990-runtime-screen.test.tsx
git commit -m "refactor: compose January in desktop shell"
```

### Task 4: Record and verify the UI-02A slice

**Files:**
- Modify: `docs/EXECUTION-STATUS.jsonc`
- Modify: `docs/MANIFEST.jsonc` if regenerated documentation metadata changes.
- Update: issue #40 and pull request description.

**Interfaces:**
- Produces: a source-of-truth milestone `desktop-shell-extraction` linked to issue #40.
- Leaves issue #40 open for routing and Career Overview.

- [ ] **Step 1: Record the active milestone**

Add scope:

```json
[
  "typed-desktop-navigation",
  "reusable-desktop-shell",
  "shell-style-boundary",
  "january-feature-composition",
  "shell-storybook-and-accessibility-contract"
]
```

Set exclusions to routing, Career Overview, persistence projections, new gameplay, NPCs, and performance optimization.

- [ ] **Step 2: Regenerate and check documentation metadata**

Run:

```bash
node scripts/build-toc.mjs
node scripts/build-toc.mjs --check
```

- [ ] **Step 3: Run the complete permanent verification set**

Run the repository's existing `docs` and `foundation` workflows on one unchanged head. Treat them as final verification, not the implementation itself.

- [ ] **Step 4: Review the final diff**

Confirm:

- `DesktopShell` imports no January or game-domain modules;
- `january-runtime.css` contains no `.runtime-*` selectors;
- no temporary workflow remains;
- no route, persistence, gameplay, or dependency change entered the diff;
- issue #40 remains open with Task 1 complete and later tasks pending.

- [ ] **Step 5: Merge with expected-head protection**

Squash-merge only after the exact unchanged head is green and review threads are resolved.
