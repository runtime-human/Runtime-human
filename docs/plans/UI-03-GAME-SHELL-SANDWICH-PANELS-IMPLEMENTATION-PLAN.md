---
title: "UI-03 Game Shell and Selective Sandwich Panels Implementation Plan"
type: plan
status: accepted
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
- The UI consumes only existing typed projections and status values.
- No invented salary, XP, streak, productivity, relationship, or career metric.
- Primary choices, blocking reasons, errors, retry actions, and route navigation remain directly visible.
- Sandwich panels are used only for secondary context, not every visible section.
- One expanded detail layer per rail or dock group.
- No runtime icon, CSS, or component framework dependency.
- No global document scrolling for supported desktop viewports.
- The native Tauri minimum viewport and CSS minimum viewport must remain aligned.
- Existing PERF-02A work stays independent and is synchronized before final merge.

## Delivery Strategy

The work is split into independent product slices rather than one large visual rewrite:

1. **UI-03A / foundation:** tokens, fixed `GameShell`, `SandwichPanel`, and `SandwichRail`.
2. **UI-03B / Bottom Dock:** controlled tabs with complete keyboard semantics.
3. **UI-03C / Career Overview:** migrate the existing source-backed overview into the shell.
4. **UI-03D / January:** migrate the existing playable month without changing game semantics.
5. **UI-03E / responsive and visual closure:** overlay rail, zoom/reduced-motion regressions, Storybook matrix, and visual review.

PR #70 is intentionally limited to UI-03A. UI-03B–E belong to separate pull requests tracked in Issue #37 and closure issue #74.

## Task 1: Cold Game Tokens and Global Viewport Ownership

**Files:**

- Modify: `apps/desktop/src/design/runtime-human-tokens.css`
- Modify: `apps/desktop/src/main.tsx`
- Modify: `apps/desktop/.storybook/preview.ts`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Test: `tests/runtime-human-design-tokens.test.ts`
- Test: `tests/game-shell-window-contract.test.ts`

- [x] Replace the beige/paper default with cold dark background and restrained teal accent roles.
- [x] Keep semantic surface, foreground, border, state, typography, spacing, focus, motion, and layout tokens.
- [x] Add explicit game-shell dimensions for top bar, player rail, context rail, dock, stage gutter, and minimum viewport.
- [x] Keep tokens loaded before shell and feature CSS in production and Storybook.
- [x] Add anti-regression assertions rejecting beige/paper/glass/AI-dashboard defaults.
- [x] Lock `html`, `body`, and `#root` to the application viewport and remove global scroll.
- [x] Align native Tauri default/minimum window dimensions with the CSS minimum `1180×720`.

## Task 2: Fixed `GameShell` Primitive

**Files:**

- Create: `apps/desktop/src/shell/GameShell.tsx`
- Create: `apps/desktop/src/shell/game-shell.css`
- Modify: `apps/desktop/src/shell/DesktopShell.tsx`
- Test: `tests/game-shell.test.tsx`
- Test: `tests/desktop-shell.test.tsx`

- [x] Add presentation-only slots: Top HUD, Player Rail, Scene, Context Rail, and Bottom Dock.
- [x] Keep central Scene as the largest flexible region.
- [x] Give every region a semantic landmark and accessible name.
- [x] Confine overflow to named interior regions.
- [x] Keep route navigation and live save status directly visible.
- [x] Preserve `DesktopShell` route-click semantics and disabled future navigation.

## Task 3: Controlled `SandwichPanel`

**Files:**

- Create: `apps/desktop/src/panels/SandwichPanel.tsx`
- Create: `apps/desktop/src/panels/sandwich-panel.css`
- Test: `tests/sandwich-panel.test.tsx`

- [x] Support `collapsed | summary | expanded` as externally controlled states.
- [x] Use a real button with `aria-expanded` and `aria-controls`.
- [x] Keep summary visible only for summary/expanded states.
- [x] Mount details only while expanded so hidden controls leave the tab order.
- [x] Add locally scrollable details with stable gutter and overscroll containment.
- [x] Respect reduced motion and existing focus-visible styling.

## Task 4: `SandwichRail` Coordination

**Files:**

- Create: `apps/desktop/src/panels/SandwichRail.tsx`
- Test: `tests/sandwich-rail.test.tsx`
- Test: `tests/sandwich-rail-reconciliation.test.tsx`

- [x] Own presentation state only; content remains typed React nodes.
- [x] Permit at most one expanded detail layer.
- [x] Demote the prior expanded panel to summary/collapsed according to available summary.
- [x] Support critical `promotedId` without stealing focus.
- [x] Reconcile dynamic item sets deterministically.
- [x] Avoid render loops when parents recreate inline item arrays.
- [x] Do not re-promote the same panel on unrelated parent renders.

## UI-03A Verification and Finalization

- [ ] Rebuild and check `docs/MANIFEST.jsonc` and `docs/CATALOG.md`.
- [ ] Run focused token, shell, window, panel, and rail tests.
- [ ] Run formatter, fast lint, type-aware lint, and TypeScript project build.
- [ ] Build the renderer.
- [ ] Run permanent docs and foundation workflows on one unchanged head.
- [ ] Remove temporary write-enabled/helper workflows from the final diff.
- [ ] Review changed files for accidental gameplay, persistence, routing, or performance changes.
- [ ] Synchronize with canonical `main` after independent PERF-02A if required.
- [ ] Mark PR #70 ready only after all current-head evidence is green.

## UI-03B: Controlled Bottom Dock

**Planned files:**

- Create: `apps/desktop/src/dock/BottomGameDock.tsx`
- Create: `apps/desktop/src/dock/bottom-game-dock.css`
- Test: `tests/bottom-game-dock.test.tsx`

- [ ] Use a controlled active tab.
- [ ] Implement `tablist`, `tab`, and `tabpanel` semantics.
- [ ] Add ArrowLeft/ArrowRight/Home/End roving focus.
- [ ] Keep inactive panels outside sequential tab order.
- [ ] Keep route navigation and authoritative state outside the dock.

## UI-03C: Career Overview Migration

- [ ] Consume only the existing `CareerOverviewView`.
- [ ] Keep CTA, blocking reason, and retry action directly visible.
- [ ] Project honest summaries into Player/Context rails.
- [ ] Add no salary, XP, productivity, relationships, or other unavailable metrics.
- [ ] Add Storybook states for 1280×720, 1920×1080, and long Russian strings.

## UI-03D: January Migration

- [ ] Preserve all current choices, callbacks, state kinds, and quality maxima.
- [ ] Keep decisions, errors, and retry actions out of collapsible panels.
- [ ] Replace the paper-card default with dark game surfaces.
- [ ] Keep terminal/code context locally scrollable.
- [ ] Preserve the one-controller route lifecycle.

## UI-03E: Responsive and Visual Closure

- [ ] Add an explicit 1180–1279 overlay rail toggle.
- [ ] Close the overlay with Escape and restore focus.
- [ ] Add a below-minimum supported-size notice without restoring global scroll.
- [ ] Add 200% text zoom and reduced-motion regressions.
- [ ] Review 1280×720, 1600×900, and 1920×1080 layouts.
- [ ] Review loading, decision, committed, blocked, and retryable states.
- [ ] Add final Storybook/visual baselines after design stabilization.

## Completion Gate

The UI roadmap is complete only when:

- UI-03A–E are merged as bounded independent slices;
- no primary action or error is hidden behind disclosure;
- every supported viewport has explicit overflow ownership;
- visual and accessibility matrices pass;
- no invented data or authoritative-state ownership enters the renderer;
- final documentation records actual merge commits rather than planned branch state.
