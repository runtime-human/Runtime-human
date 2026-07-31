---
title: "Runtime Human Game Shell and Selective Sandwich Panels Design"
type: plan
status: accepted
canon: true
updated: 2026-07-30
supersedes:
  - "Issue #37 Archival Workstation visual direction"
---

# Runtime Human Game Shell and Selective Sandwich Panels Design

## Purpose

Runtime Human must read as a desktop life-and-programmer simulator, not as a website, SaaS dashboard, AI assistant, editorial page, or vertically scrolling document. The redesign preserves all authoritative January state, deterministic gameplay, typed Tauri commands, persistence semantics, routing, and renderer milestones. It replaces only the presentation and interaction shell.

The approved visual direction is a dark graphite and cold teal game interface around a warm contextual scene. Beige, cream, warm paper cards, default indigo, purple-blue trust gradients, generic rounded dashboard tiles, decorative blobs, invented metrics, and filler copy are prohibited.

## Source principles

The design uses `nexu-io/open-design` as a method source rather than copying one bundled brand:

- package design intent separately from compiled semantic tokens;
- synchronize prose, tokens, fixtures, and implementation;
- use semantic variables instead of repeated raw colors;
- treat component fixtures as executable design evidence;
- design loading, empty, error, populated, and edge states;
- preserve visible focus, keyboard semantics, contrast, and reduced motion;
- use one accent role sparingly;
- reject default AI interface patterns.

Source references:

- `https://github.com/nexu-io/open-design/blob/main/docs/design-systems.md`
- `https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md`
- `https://github.com/nexu-io/open-design/blob/main/craft/color.md`
- `https://github.com/nexu-io/open-design/blob/main/craft/typography.md`
- `https://github.com/nexu-io/open-design/blob/main/craft/state-coverage.md`

## Current-state review

The current shell is structurally a web page:

- `runtime-shell` grows with `min-height: 100vh` instead of owning one fixed viewport;
- the left navigation is a sticky page sidebar rather than a game rail;
- content grows in normal document flow;
- mobile breakpoints convert the app into a horizontally scrolling web navigation;
- Career Overview is a large hero card plus note card;
- January uses a large light `surface-paper` decision card;
- global and feature-level vertical growth can create page scroll;
- the shell exposes no reusable layer for context-sensitive dense information;
- all panels are effectively always expanded.

The existing typed route lifecycle, one root-owned January controller, state projections, Storybook states, and read-only rendering boundaries remain valid and must be retained.

## Core composition

The desktop application owns exactly one fixed viewport:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Top HUD: logo · sections · date · resources · system actions     │
├─────────────┬──────────────────────────────────┬─────────────────┤
│ Player Rail │ Scene Stage                      │ Context Rail    │
│ identity    │ visual scene                     │ events          │
│ vital state │ current activity overlay         │ finances        │
│ needs       │ month/date strip                 │ obligations     │
│             │                                  │ processes       │
├─────────────┴──────────────────────────────────┴─────────────────┤
│ Bottom Dock: one active workspace + compact inactive tabs         │
└──────────────────────────────────────────────────────────────────┘
```

Canonical large-screen grid:

```css
.runtime-game-shell {
  display: grid;
  grid-template:
    "top top top" var(--game-topbar-height)
    "player scene context" minmax(0, 1fr)
    "dock dock dock" var(--game-dock-height)
    / var(--game-player-rail-width) minmax(0, 1fr) var(--game-context-rail-width);
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}
```

`html`, `body`, and `#root` own the full available height and use `overflow: hidden`. Scroll is local and purposeful.

## Selective sandwich panel model

A sandwich panel is a vertically layered game panel with up to three semantic layers:

1. **Header layer** — always visible; title, compact state, alert count, expand/collapse control.
2. **Summary layer** — optional; one-line or two-line decision-relevant overview.
3. **Detail layer** — expanded content; rows, controls, history, or contextual actions.

Allowed controlled states:

```ts
type SandwichPanelState = "collapsed" | "summary" | "expanded";
```

The primitive is controlled by its parent. It never writes to authoritative saves, MonthRun state, SQLite, or routing. Panel state may live in React presentation state and may later be stored in local UI preferences, but is not part of career determinism.

### Where sandwich panels are required

Use them when all of the following are true:

- the information has a stable compact summary;
- details are useful only in some decisions;
- several related modules must share one narrow rail;
- keeping the header visible preserves orientation;
- expansion does not hide the primary action or scene;
- local scrolling is preferable to page scrolling.

Initial required uses:

- Player Rail: `Характеристики` and `Потребности`;
- Context Rail: `События`, `Финансы`, `Обязательства`, and `Постоянные процессы`;
- Bottom Dock: active `Журнал`, `Отношения`, `Навыки`, `Проекты`, or `Цели` workspace;
- optional scene overlay details after the current activity summary.

### Where sandwich panels are forbidden

Do not use them for:

- the central visual scene;
- the current primary decision and its choices;
- the top-level route navigation;
- primary CTA confirmation;
- blocking errors or recovery-required states;
- short content that already fits without compression;
- every card merely to create visual motion;
- nested panels deeper than one level.

### Expansion policy

- At most one detail layer is expanded per rail by default.
- Opening one Context Rail panel collapses the previous expanded panel to `summary`.
- Critical events may promote `События` from `collapsed` or `summary` to `expanded`, but never steal keyboard focus automatically.
- Player Rail remembers its local state for the current renderer session.
- Bottom Dock has exactly one active workspace; inactive workspaces are compact tabs, not hidden accordions.
- No drag-resize in the first implementation. Fixed state transitions are more predictable, testable, and accessible.
- No panel expansion changes the current route.

## Game surfaces and color roles

The shell uses cold dark neutral surfaces. Warm tones belong to scene art and contextual imagery, not to application cards.

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

  --stat-health: #dc5c70;
  --stat-energy: #d9a63e;
  --stat-intellect: #4ba8d5;
  --stat-discipline: #54bd78;
  --stat-mood: #45c0bc;
  --stat-relationship: #9d71cf;
}
```

Neutrals occupy most pixels. The global accent appears in no more than two strong visible roles per screen: active navigation/current selection and the primary action. Domain colors identify resources and are not substitute accents.

The following old roles are removed from product UI:

- `--surface-paper`;
- `--surface-paper-raised`;
- warm paper borders;
- phosphor-lime as universal accent;
- serif hero treatment for routine gameplay decisions.

## Typography

Use no more than two families:

```css
--game-font-display: "Exo 2", "Segoe UI", sans-serif;
--game-font-ui: "IBM Plex Sans", "Segoe UI", sans-serif;
```

A system fallback must remain usable before optional local font assets are introduced. Numeric HUD values use `font-variant-numeric: tabular-nums`. Monospace is scoped to code, terminal output, IDs in diagnostic views, and keyboard hints; it is not a universal visual motif.

Canonical scale:

- caption: 12px;
- small: 13px;
- body: 15px;
- control: 16px;
- section: 18px;
- title: 24px;
- display: 32–36px.

Uppercase labels use positive tracking. Large headings use slight negative tracking. No primary gameplay text may be below 12px at 100% scaling.

## Component boundaries

### `GameShell`

Owns the fixed viewport grid, landmarks, responsive mode, and slots. It does not know January result parsing or gameplay commands.

```ts
type GameShellProps = Readonly<{
  topHud: ReactNode;
  playerRail: ReactNode;
  scene: ReactNode;
  contextRail: ReactNode;
  bottomDock: ReactNode;
}>;
```

### `SandwichPanel`

Owns layer semantics and interaction, not content projection.

```ts
type SandwichPanelProps = Readonly<{
  id: string;
  title: string;
  state: SandwichPanelState;
  summary?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  onStateChange(state: SandwichPanelState): void;
}>;
```

The header uses a real `button` with `aria-expanded` and `aria-controls`. Collapsed content is removed from sequential keyboard navigation. The detail region has a stable id.

### `SandwichRail`

Coordinates the one-expanded-panel policy for a rail. It accepts panel descriptors and emits presentation-only state changes. It does not clone or reinterpret domain models.

### `BottomGameDock`

Owns tabs and one active panel. It uses the tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`) rather than nested disclosure buttons.

### Feature projections

Career Overview and January continue receiving typed application views. They compose the shell primitives but do not parse raw persistence JSON and do not invent resources absent from the authoritative model.

## Scroll and overflow policy

Global scrolling is prohibited.

Allowed scroll containers:

- expanded Context Rail detail region;
- expanded Player Rail detail region when required;
- Bottom Dock active tab panel;
- modal dialog body;
- long history/archive screen;
- code/terminal output when content exceeds its viewport.

Each scroll container must:

- have a visible boundary or fade affordance;
- use `overscroll-behavior: contain`;
- preserve keyboard access;
- avoid nested vertical scroll containers;
- keep the panel header and primary action visible.

At 200% text zoom, the shell may switch to compact overlay rails rather than re-enable document scroll.

## Responsive behavior

Runtime Human is a desktop game, not a mobile-first website.

### 1600px and wider

- full three-column shell;
- Player Rail 280–304px;
- Context Rail 304–336px;
- Bottom Dock 192–224px;
- central scene remains largest.

### 1280–1599px

- compact rails;
- summaries shorten but keep labels;
- Bottom Dock shows one active tab and compact inactive tabs;
- no global scroll.

### 1180–1279px

- one side rail may become an overlay drawer;
- scene and Top HUD remain fixed;
- drawers are modal only when they cover interactive scene content;
- focus is contained only for modal overlays.

Below 1180×720, show a supported-minimum-size notice with settings/help access rather than collapsing into a long mobile page.

## Motion

- control response: 80–120ms;
- panel expansion/collapse: 180–220ms strong ease-out;
- dock expansion: 220–280ms;
- route/scene transition: 300–420ms only when spatial continuity matters;
- no continuous glow, floating blobs, looping gradients, or decorative particles;
- no animation from `scale(0)`;
- resource changes may use one short number transition or highlight pulse.

`prefers-reduced-motion: reduce` removes transforms and uses immediate or short opacity changes. State and meaning must never depend on animation.

## Accessibility and interaction

- All interactive controls are reachable and operable by keyboard.
- Focus-visible is clearly distinguishable from hover.
- Body text contrast target is at least 4.5:1; large text and component boundaries at least 3:1.
- Panel state is announced through native disclosure semantics.
- Critical changes use scoped live regions; ordinary expansion does not announce redundant prose.
- Color is never the only carrier of health, risk, or status.
- Touch/click targets are at least 36×36 CSS pixels in the desktop shell.
- Escape closes an overlay rail or modal, but does not collapse ordinary inline panels unexpectedly.
- Reduced-motion and 200% text zoom are acceptance gates.

## State coverage

Every shell and feature component is represented in Storybook for applicable states:

- loading;
- empty/new career;
- active/populated;
- warning/blocked;
- retryable error;
- terminal/recovery-required;
- dense/edge content;
- long Russian labels;
- 1280×720 compact layout;
- 1920×1080 full layout;
- reduced motion.

SandwichPanel fixtures additionally cover all three states, disabled controls inside detail content, one-expanded rail coordination, and critical-event promotion without focus theft.

## Data and architecture invariants

The redesign must not change:

- deterministic gameplay outputs;
- January state machine or choice identifiers;
- save schema or SQLite schema;
- Tauri command names, arguments, or responses;
- persistence worker architecture;
- route URLs `/` and `/month/current`;
- one root-owned January controller;
- renderer performance milestone semantics;
- recovery and error classifications.

Panel state and dock state are presentation-only. No fake salary, XP, productivity, social score, or event is added to fill the reference layout.

## Migration strategy

1. Introduce new canonical tokens and anti-pattern guard tests.
2. Add `GameShell`, `SandwichPanel`, `SandwichRail`, and `BottomGameDock` in isolation with Storybook fixtures.
3. Convert the existing `DesktopShell` to the fixed viewport composition while preserving its public navigation behavior.
4. Migrate Career Overview to the scene-plus-rails layout.
5. Migrate January to a dark game decision surface and contextual scene, removing paper roles.
6. Add selective sandwich content only where the decision matrix requires it.
7. Complete responsive, keyboard, focus, reduced-motion, and visual regression gates.

Each step is an independently reviewable PR slice. Do not combine the complete visual redesign with gameplay or persistence work.

## Acceptance criteria

- No global page scroll at 1280×720, 1600×900, or 1920×1080.
- Central scene is the largest visual area.
- Beige and warm paper UI surfaces are absent.
- No default indigo or purple-blue trust gradient is introduced.
- No generic grid of identical rounded cards is used as the main composition.
- Sandwich panels appear only in the approved rails/dock contexts.
- At most one detail panel is expanded per rail by default.
- Primary decisions and blocking errors are never hidden in a sandwich panel.
- Current January actions and route behavior remain unchanged.
- Keyboard, focus-visible, reduced-motion, long Russian labels, and 200% text zoom pass.
- Storybook covers normal and edge states.
- The UI is recognizably Runtime Human without relying on its logo.

## Out of scope

- free-form drag-resizable docking;
- nested accordion trees;
- user-authored dashboard layouts;
- mobile website redesign;
- new gameplay mechanics;
- new authoritative resources;
- NPC engine implementation;
- icon-library migration in the first shell slice;
- release packaging and updater;
- changes to PERF-02A evidence semantics.
