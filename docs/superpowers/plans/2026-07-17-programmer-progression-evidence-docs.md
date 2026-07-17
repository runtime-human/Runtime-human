# Programmer Progression & Evidence Documentation Implementation Plan

> **Status:** completed on branch `agent/sd001-progression-evidence`; published as draft PR #4.

**Goal:** Integrate SD-001 into Runtime Human canon as an authoritative professional progression/evidence architecture without turning progression into a god-module.

**Architecture:** Experience Providers own domain outcomes; Professional Progression Core converts normalized experience episodes into mastery, fluency, technology familiarity, evidence and grade projections. MonthRunner orchestrates and Rust persistence commits the complete result atomically.

**Tech Stack:** Markdown architecture specifications, TypeScript contract examples, SQLite logical schema, deterministic MonthRun/Rust persistence constraints.

## Global Constraints

- Runtime Human remains programmer-first.
- One turn equals one month; no universal action points or mandatory percentage sliders.
- Grade is not XP, title, salary or tenure.
- Authoritative arithmetic is integer/fixed-point.
- Active MonthRun is crash-safe and deterministic.
- Production writes cross the Rust persistence boundary.
- Do not create a god-module that owns projects, jobs, courses and events.

---

### Task 1: Record the decision

**Files:**
- Create: `docs/adr/ADR-013-authoritative-professional-progression-evidence.md`
- Modify: `docs/adr/README.md`

- [x] Define Experience Provider → ExperienceEpisode → Progression Core boundary.
- [x] Accept mastery/fluency/familiarity separation.
- [x] Accept append-only evidence and authoritative grade awards.
- [x] Define readiness as rebuildable projection.
- [x] Register ADR-013 in the ADR index.

### Task 2: Add normative progression specification

**Files:**
- Create: `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`
- Create: `docs/research/SD-001-PROGRAMMER-PROGRESSION-EVIDENCE-ENGINE-2026-07-17.md`

- [x] Normalize SD-001 as a research/system-design artifact.
- [x] Publish normative contracts and rules.
- [x] Mark numerical values as versioned balance hypotheses where appropriate.

### Task 3: Synchronize architecture and MonthRun

**Files:**
- Modify: `docs/architecture/DOMAIN-MODEL.md`
- Modify: `docs/architecture/MODULE-BOUNDARIES.md`
- Modify: `docs/simulation/MONTH-SIMULATION.md`
- Modify: `docs/simulation/SUSPENDED-MONTH-RUN.md`

- [x] Add `CharacterProfessionalState` to save consistency boundary.
- [x] Separate provider outcomes from progression assessment.
- [x] Add progression phases after provider outcomes and before commit.
- [x] Ensure draft evidence cannot be committed twice after resume.

### Task 4: Synchronize persistence and compatibility

**Files:**
- Modify: `docs/persistence/SAVE-MODEL.md`
- Modify: `docs/persistence/PERSISTENCE-BOUNDARY.md`
- Modify: `docs/persistence/MIGRATIONS.md`
- Modify: `docs/persistence/SAVE-COMPATIBILITY.md`

- [x] Define authoritative skill/technology/focus/grade state.
- [x] Define append-only evidence and monthly practice aggregates.
- [x] Define rebuildable readiness and specialization projections.
- [x] Preserve semantic evidence snapshots when content/mod definitions disappear.

### Task 5: Synchronize content and provider contracts

**Files:**
- Modify: `docs/content/CONTENT-ARCHITECTURE.md`
- Modify: `docs/events/EVENT-CONTENT-SCHEMA.md`
- Modify: `docs/game-design/PROJECTS-AND-PRODUCTS.md`
- Modify: `docs/events/NPC-AND-NARRATIVE-MEMORY.md`

- [x] Add skill, technology family, transfer, activity, challenge and grade profile definitions.
- [x] Add product layer/technical tags without allowing narrative choices to mint mastery directly.
- [x] Define project work-package → ExperienceEpisode contract.
- [x] Define mentor/review/shared-project memory required for evidence context.

### Task 6: Synchronize UI, balance and plans

**Files:**
- Create: `docs/ui/PROFESSIONAL-PROGRESSION-UI.md`
- Modify: `docs/simulation/BALANCE-SIMULATION.md`
- Modify: `docs/plans/VERTICAL-SLICE-PLAN.md`
- Modify: `docs/plans/ROADMAP.md`

- [x] Keep exact weights hidden in normal UI.
- [x] Add demonstrated grade vs current market readiness.
- [x] Add evidence diversity, easy-task farming, course grinding and recency/recovery metrics.
- [x] Limit vertical slice to five skills, one technology family and one evidence flow.

### Task 7: Update navigation and verify consistency

**Files:**
- Modify: `docs/INDEX.md`
- Modify: `docs/research/README.md`
- Modify: `AGENTS.md`

- [x] Link ADR-013, SD-001 and progression specification.
- [x] Require balance comparison for progression changes.
- [x] Review changed files for XP-grade, automatic grade decay, direct narrative mastery and provider ownership contradictions.
- [x] Open draft PR #4 with documentation-only verification results.
