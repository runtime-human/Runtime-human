---
title: "Runtime Human 2.0 — owner design decisions"
type: plan
status: draft
canon: false
updated: 2026-10-16
---

# Runtime Human 2.0 — owner design decisions (work-in-progress)

## Status and authority

This is a **non-canonical decision log** for the owner-led redesign conversation, not a substitute for accepted ADRs. Decisions explicitly selected by the owner are recorded here. Choices still being discussed are marked pending. No existing accepted ADR, implementation, save format, UI contract, or in-flight PR is superseded merely by creating this file. Before implementation/merge of the redesign, reconcile relevant ADRs, specialized specifications, roadmap, execution status, affected open PRs, and docs indexes. Do not alter `main` or auto-merge stacked drafts.

Base examined: `main` at `271dfea13da47f87a976d993ac591ccb30677a78` (2026-10-16 verification).

## Decision 01 — architecture scope: SELECTED

**Question:** How extensively should Runtime Human be simplified?

**Owner selection (2026-10-16): B — Compact Game Core v2.**

Other evaluated alternatives:
- A — Evolve current engine and reduce mostly UI complexity.
- C — Rewrite the app from scratch.
- D — Operate two gameplay modes on a shared engine.

**Product intent:** A low-complexity, text-and-buttons, offline-first programmer life simulation combining BitLife-style life events and consequential choices with idle-style automatic routine progress. Preserve the programmer-first identity and the historical technology timeline. Retain the canonical January 1990 start (age 12) and month as the atomic simulation interval until explicitly changed. Avoid an IDE, generic management dashboard, life-wide micromanagement, mandatory realtime play, and runtime LLM.

**Architecture direction:**
1. Introduce a compact, pure, deterministic **Game Core v2** for month-by-month player state transitions, projects, learning, historical availability, and event results; only implement state that supports immediate gameplay.
2. Reuse compatible, proven infrastructure: Tauri/React desktop shell at a simpler UI presentation level; Rust-owned SQLite durable persistence; versioned deterministic PRNG; content provenance/validation and useful historical sources; existing focused tests and game simulation tools where they fit.
3. Keep the existing January v1 runtime, active save/checkpoint compatibility, and in-flight PR contracts intact during design and migration. Do not rewrite existing saves in place or silently change their meaning.
4. Specify the v2 save schema, transition/rollback policy, content loading boundary, and test gates in dedicated follow-up decisions before implementation. Whether v1 saves can be imported is **undecided**, and must not be assumed.
5. New UI direction: one readable gameplay page with current month, character context, a short narrative, at most one consequential decision in an ordinary month, understandable outcomes, chronicle, and one primary advance control. Minimize nonessential stats and navigation.

**Rationale:** Existing foundations are technically strong, but production gameplay remains concentrated on the January 1990 vertical slice while architecture, content contracts, specialized verification, and multi-step persistence have grown. A small core prioritizes shipped playable years and choices over general-purpose simulation machinery without discarding valuable durable infrastructure.

**Non-goals of this record:** No code changes, runtime cutover, save migration, authoritatively accepted ADR, CI acceptance, deletions, renaming of existing v1 rulesets, or merge approvals.

**Risks / follow-up gates:** existing ADR authority; save and running MonthRun compatibility; concurrent stacked draft PRs; deterministic replay; state schema versioning; historical content provenance; precise decision/auto-advance behavior; accessibility and Russian UI; GitHub-hosted verification. The rollout requires explicit owner signoff and a separate implementation plan.

## Decision 02 — advancement/time controls: PENDING

To be selected in the next owner question:
- A: one explicit click for every month;
- B: manual next month plus bounded fast-forward / until-next-meaningful-decision; simulation stops before a blocking choice (recommended candidate);
- C: largely automatic play with periodic intervention;
- D: realtime/offline-progress aging.

The exact limits for consecutive months, whether nonblocking highlights interrupt acceleration, and autoplay policy are **not decided**.

## Remaining decision sequence (tentative)

After time controls: minimal saved character state; activities and routine automation; projects and skills; career; event selection and life/NPC depth; historical eras; UI/UX and accessibility; migration/legacy support; acceptance criteria and first playable years.

## Acceptance before converting this draft to canonical architecture

- Owner-reviewed answers to the remaining questions.
- Proposed ADR(s) specifying v2/v1 ownership, compatibility and retirement/rollback.
- Source-of-truth sync across affected docs and execution status.
- Small playable proof: several consecutive years with meaningful divergent histories, deterministic replay and valid saves.
- GitHub-hosted CI results on the eventual implementation PR, with separate review of save-changing work.
