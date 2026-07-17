# Project & Technical Work Package Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate SD-002 as the authoritative project/work-package architecture while preserving the Experience Provider boundary from ADR-013.

**Architecture:** Project Engine owns project lifecycle, scope, work packages, quality, debt, defects, releases and participant contribution. Product, Open Source, Company, Career and Progression consume typed outcomes and do not duplicate project truth.

**Tech Stack:** Markdown system-design specifications, immutable TypeScript contracts, deterministic MonthRun rules, logical SQLite persistence schema and data-driven JSONC content definitions.

## Global Constraints

- Runtime Human remains programmer-first.
- Work Package is an aggregated meaningful unit, not a Jira ticket or daily task.
- No universal action points or mandatory percentage sliders.
- Project Engine does not change skills or grade directly.
- Product/market success is not technical evidence automatically.
- Authoritative arithmetic is integer/fixed-point.
- Provider outcome and progression evidence commit atomically.
- Do not expose every defect, debt item or employee task to the player.

---

## Task 1 — Decision and research trace

**Files:**
- Create `docs/adr/ADR-014-authoritative-project-work-package-model.md`
- Create `docs/research/SD-002-PROJECT-WORK-PACKAGE-ENGINE-2026-07-17.md`
- Modify `docs/adr/README.md`
- Modify `docs/research/README.md`

- [ ] Record Project Engine ownership and extension boundaries.
- [ ] Accept Work Package as minimum authoritative technical work unit.
- [ ] Accept multidimensional quality, explicit uncertainty, debt pressure, latent/materialized defects and immutable releases.
- [ ] Record research sources and applicability.

## Task 2 — Normative project specification

**Files:**
- Create `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`
- Rewrite `docs/game-design/PROJECTS-AND-PRODUCTS.md` as overview and extension map.

- [ ] Define terminology and lifecycle state machines.
- [ ] Define scope, requirements, work packages, progress, forecast and decisions.
- [ ] Define quality, debt, defects, incidents, releases and maintenance.
- [ ] Define participant contribution, ownership and delegation.
- [ ] Define Product/Open Source/Company/Career/Progression interfaces.
- [ ] Define TypeScript contracts, pure functions, invariants and tests.

## Task 3 — Architecture, MonthRun and persistence

**Files:**
- Modify `docs/architecture/DOMAIN-MODEL.md`
- Modify `docs/architecture/MODULE-BOUNDARIES.md`
- Modify `docs/simulation/MONTH-SIMULATION.md`
- Modify `docs/simulation/SUSPENDED-MONTH-RUN.md`
- Modify `docs/persistence/SAVE-MODEL.md`
- Modify `docs/persistence/MIGRATIONS.md`
- Modify `docs/persistence/SAVE-COMPATIBILITY.md`

- [ ] Add authoritative ProjectState and append-only release/major-decision records.
- [ ] Add provider phases, deterministic IDs/RNG scopes and atomic project/progression commit.
- [ ] Define active work-package checkpoint and compatibility fingerprints.
- [ ] Preserve historical release/debt/defect meaning when content is removed.

## Task 4 — Content and extension contracts

**Files:**
- Modify `docs/content/CONTENT-ARCHITECTURE.md`
- Modify `docs/game-design/COMPANY-SYSTEM.md`
- Modify `docs/game-design/OPEN-SOURCE-SYSTEM.md`
- Modify `docs/game-design/CAREER-SYSTEM.md`
- Modify `docs/events/EVENT-CONTENT-SCHEMA.md`

- [ ] Add project archetype, work-package template, quality profile, debt/defect and release policy definitions.
- [ ] Ensure extensions consume technical outcomes rather than duplicating quality/debt/bugs.
- [ ] Prevent narrative choices from directly manufacturing project completion.

## Task 5 — UI, balance and vertical slice

**Files:**
- Create `docs/ui/PROJECT-WORK-PACKAGE-UI.md`
- Modify `docs/simulation/BALANCE-SIMULATION.md`
- Modify `docs/plans/VERTICAL-SLICE-PLAN.md`
- Modify `docs/plans/ROADMAP.md`
- Modify `docs/INDEX.md`
- Modify `AGENTS.md`

- [ ] Define novice/advanced project read models and forecast ranges.
- [ ] Add anti-farming, debt spiral, bug farming, release spam, overparallelization and delegation-credit tests.
- [ ] Limit vertical slice to one small project, two work packages, one quality profile and one release decision.
- [ ] Link SD-002/ADR-014 and add required verification rules.

## Verification

- [ ] Compare branch with `main`; `behind_by` must be zero.
- [ ] Review for ticket-level micromanagement, single quality score, direct skill changes, duplicated product/company state and non-deterministic estimates.
- [ ] Open PR, mark ready and squash-merge after documentation verification.
