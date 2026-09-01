# AI Harness Wave 9 Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile Wave 9 AI-first harness work onto current `main` without changing gameplay authority, then activate domain skill routing and a non-enforcing evaluator planner in shadow mode.

**Architecture:** Keep Studio as the repository-task/evaluator plane and `gamectl` as the game-semantic plane. Wave 9 only changes agent routing, evaluator planning, and operational documentation; it must not alter game-core, persistence, schemas, simulation semantics, or production runtime behavior.

**Tech Stack:** Node 24 ESM scripts, Vitest 4, JSON configuration under `.studio`, Markdown skill contracts, pnpm workspace.

**Spec:** `.opencode/Runtime-Human-AI-First-Harness-Waves-9-14-Execution-Plan-2026-08-31.md` plus `docs/architecture/AI-FIRST-GAME-DEVELOPMENT.md` and `docs/engineering/GAMECTL.md` on current `main`.

## Global Constraints

- `game-core` remains pure deterministic TypeScript and untouched in this slice.
- `.studio/models.json` remains the sole model-routing authority; policy stores profile keys, never concrete model names.
- Evaluator planning is `shadow` only and cannot authorize skipping mandatory evaluator gates.
- R3 always retains independent tester plus R3 reviewer.
- Planned skills are not activated until their commands/contracts exist; scenario and persistence remain planned in Wave 9.
- `gamectl` keeps Git/PR semantics out of its command layer.
- No new dependencies.

---

### Task 1: Lock Wave 9 behavior with RED tests

**Files:**
- Create: `tests/studio-skill-routing.test.ts`
- Create: `tests/studio-evaluator-policy.test.ts`

**Interfaces:**
- Consumes: `selectSkills(zones, risk, skills)` from `scripts/studio/context-lib.mjs` and CLI entry `scripts/studio/evaluator-plan.mjs`.
- Produces: executable behavior contract for active balance/simulation/harness routing and `runtime-human-evaluator-plan-v1`.

- [ ] **Step 1:** Add tests proving balance → `runtime-balance`, simulation → `runtime-simulation`, tooling → `runtime-harness`, scenario → `runtime-implement`, and R3 prepends `runtime-architecture`.
- [ ] **Step 2:** Add evaluator tests proving docs sampling remains shadow/non-enforcing, gameplay requires tester+reviewer, persistence requested at R2 elevates to R3, and unknown class/risk exit 2.
- [ ] **Step 3:** Run `pnpm exec vitest run --project tooling-node tests/studio-skill-routing.test.ts tests/studio-evaluator-policy.test.ts` and confirm RED because Wave 9 production files/config are absent or still planned.

### Task 2: Implement minimal active skill routing

**Files:**
- Create: `.agents/skills/runtime-balance/SKILL.md`
- Create: `.agents/skills/runtime-simulation/SKILL.md`
- Create: `.agents/skills/runtime-harness/SKILL.md`
- Modify: `.studio/skill-map.json`
- Modify: `scripts/studio/context-lib.mjs`

**Interfaces:**
- Consumes: current zone names and active/planned skill registry.
- Produces: deterministic smallest matching skill set; R3 prepends `runtime-architecture`.

- [ ] **Step 1:** Activate only balance, simulation and harness skills with bounded responsibilities matching already-implemented repository capabilities.
- [ ] **Step 2:** Update `ZONE_SKILLS`/selection logic so active domain skills are selected while planned scenario still falls back to `runtime-implement`.
- [ ] **Step 3:** Re-run focused routing test and confirm GREEN.

### Task 3: Implement shadow evaluator planner

**Files:**
- Create: `scripts/studio/evaluator-plan.mjs`
- Modify: `.studio/verification-policy.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `adaptiveReview.evaluatorProfiles`, change classes, risk minima, `.studio/models.json` profile keys.
- Produces: deterministic `runtime-human-evaluator-plan-v1` with `mode: "shadow"`, `enforceable: false`, effective risk, deterministic gate and tester/reviewer/cross-family dispositions.

- [ ] **Step 1:** Add `adaptiveReview.mode = "shadow"` and refresh stale notes that simulation/Nx/affected tooling is already implemented.
- [ ] **Step 2:** Implement strict `--change-class`, `--risk`, optional `--json`; reject unknown values with exit 2.
- [ ] **Step 3:** Enforce risk floor and mandatory R3 tester/reviewer pair in the planner model.
- [ ] **Step 4:** Add `studio:evaluate` script.
- [ ] **Step 5:** Run both focused Wave 9 test files and confirm GREEN.

### Task 4: Reconcile operational canon with current main

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/agents/README.md`
- Modify: `docs/architecture/AI-FIRST-GAME-DEVELOPMENT.md`

**Interfaces:**
- Consumes: actual current `gamectl` and simulation capabilities on `main`.
- Produces: operational documentation that no longer describes implemented simulation/replay/Nx/Storybook MCP features as planned, while scenario/persistence remain planned.

- [ ] **Step 1:** Mark runtime-balance/runtime-simulation/runtime-harness active and retain scenario/persistence as planned.
- [ ] **Step 2:** Update the AI-first roles/roadmap text to reflect implemented simulation/replay and current `gamectl` commands without inventing future capabilities.
- [ ] **Step 3:** Run `pnpm studio:skills:check`, `pnpm studio:check`, and `pnpm docs:check`.

### Task 5: Candidate verification and PR handoff

**Files:** none beyond prior tasks.

**Interfaces:**
- Consumes: completed Wave 9 branch.
- Produces: GitHub PR against current `main` with machine-verifiable evidence.

- [ ] **Step 1:** Run `pnpm studio:verify -- --tier V2`.
- [ ] **Step 2:** Open a draft PR against `main` and wait for GitHub-hosted CI evidence for the exact head.
- [ ] **Step 3:** Inspect changed files and verify there are no gameplay, persistence, schema, production Tauri or dependency changes.
- [ ] **Step 4:** Only after green evidence, supersede old PR #83; keep #84 stacked work untouched until Wave 9 lands.
