---
title: "UI-02B Desktop Routing Implementation Plan"
type: plan
status: completed
canon: true
updated: 2026-07-27
---

# UI-02B Desktop Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real `/` and `/month/current` desktop routes while keeping one root-owned January controller and introducing no new persistence projection or routing dependency.

**Architecture:** A pure route module resolves URL paths into a closed route union. A small History API hook owns browser navigation. `App` invokes `useJanuarySession()` exactly once, then composes a route-aware `RuntimeDesktop` that owns global navigation and renders either an honest overview placeholder or the existing January workspace. Route state is presentation state only and never enters saves, checkpoints, receipts, journals, or deterministic game state.

**Tech Stack:** React 19.2, TypeScript 7, browser History API, Vitest 4, Testing Library, Storybook 10, existing Runtime Human design tokens and `DesktopShell`.

## Global Constraints

- Preserve one root-owned `useJanuarySession()` lifecycle across all route transitions.
- Preserve January controller coalescing, typed callbacks, persisted state and deterministic outputs.
- Do not add React Router, TanStack Router or another dependency in this slice.
- Do not add a Career Overview persistence read model; UI-02C owns that projection.
- Do not invent salary, activity, streak, productivity, XP or other metrics.
- Unknown paths resolve to a typed safe Overview route.
- Normal anchor semantics must survive modified clicks and external browser behavior.
- Planned navigation entries remain non-interactive.
- Final branch contains no temporary workflow.

---

### Task 1: Define the pure route contract

**Files:**
- Create: `apps/desktop/src/routing/desktop-route.ts`
- Test: `tests/desktop-route.test.ts`
- Modify: `tests/tsconfig.json`

**Interfaces:**

```ts
export type DesktopRouteId = "overview" | "current-month";
export type DesktopRoute = Readonly<{ id: DesktopRouteId; path: string }>;
export function resolveDesktopRoute(pathname: string): DesktopRoute;
export function hrefForDesktopRoute(id: DesktopRouteId): string;
```

- [ ] Write RED tests for `/`, `/month/current`, trailing slash, query-independent pathname input and unknown paths.
- [ ] Confirm the focused test fails because the module does not exist.
- [ ] Implement normalized exact matching with Overview fallback.
- [ ] Confirm the focused test passes.

### Task 2: Add History API state

**Files:**
- Create: `apps/desktop/src/routing/use-desktop-route.ts`
- Test: `tests/use-desktop-route.test.tsx`

**Interfaces:**

```ts
export type DesktopRouteState = Readonly<{
  route: DesktopRoute;
  navigate(id: DesktopRouteId): void;
}>;
```

- [ ] Initialize from `window.location.pathname`.
- [ ] Use `history.pushState` only when the target path differs.
- [ ] Subscribe to `popstate` and clean up the listener.
- [ ] Test programmatic navigation, duplicate navigation and back/forward-style popstate updates.

### Task 3: Make shell route navigation injectable

**Files:**
- Modify: `apps/desktop/src/shell/DesktopShell.tsx`
- Modify: `tests/desktop-shell.test.tsx`

**Interfaces:**

```ts
onNavigate?(id: string): void;
```

- [ ] Intercept only unmodified primary-button clicks for known route items.
- [ ] Preserve Ctrl/Meta/Shift/Alt clicks and non-primary clicks.
- [ ] Current route remains an ordinary accessible link.
- [ ] Planned entries remain spans with `aria-disabled=true`.

### Task 4: Separate January workspace from application composition

**Files:**
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.tsx`
- Modify: `tests/january-1990-runtime-screen.test.tsx`
- Modify: `apps/desktop/src/january/JanuaryRuntimeScreen.stories.tsx`

- [ ] Remove `DesktopShell` and global navigation from the January component.
- [ ] Keep the playable month region, typed choices, busy blocking, score maxima and terminal/session context unchanged.
- [ ] Move shell assertions to the route-aware desktop composition tests.
- [ ] Wrap January Storybook states through the application composition or an explicit story decorator outside the feature.

### Task 5: Add honest Overview placeholder and route-aware desktop composition

**Files:**
- Create: `apps/desktop/src/overview/CareerOverviewPlaceholder.tsx`
- Create: `apps/desktop/src/overview/career-overview.css`
- Create: `apps/desktop/src/RuntimeDesktop.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/main.tsx`
- Test: `tests/runtime-desktop-routing.test.tsx`

**Architecture:**

```tsx
export function App() {
  const session = useJanuarySession();
  const routing = useDesktopRoute();
  return <RuntimeDesktop route={routing.route} navigate={routing.navigate} session={session} />;
}
```

- [ ] `RuntimeDesktop` owns navigation model, breadcrumb, era, profile and save status.
- [ ] `/` renders only source-supported session availability and a CTA to the current month.
- [ ] `/month/current` renders the existing January workspace.
- [ ] Unknown path is already resolved to Overview by the pure resolver.
- [ ] Test active navigation, route transitions and both route contents.
- [ ] Test that the January session factory is invoked once across route transitions.

### Task 6: Stories, documentation and acceptance

**Files:**
- Create or modify Storybook stories for Overview and Current Month.
- Modify: `docs/EXECUTION-STATUS.jsonc`
- Regenerate: `docs/MANIFEST.jsonc`, `docs/CATALOG.md`

- [ ] Add `desktop-routing` milestone linked to issue #44.
- [ ] Record explicit exclusions for Career Overview projection and new persistence reads.
- [ ] Run docs generation/check.
- [ ] Run permanent docs and full Windows foundation workflows on one unchanged head.
- [ ] Review imports, route lifecycle, navigation semantics and final diff.
- [ ] Squash-merge with expected-head protection.

## Follow-up

UI-02C replaces the honest placeholder with an application-layer `CareerOverviewView` derived from existing save, active MonthRun and committed-result boundaries. It must not change the route lifecycle introduced here.
