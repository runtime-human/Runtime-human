---
title: "Runtime Human 2.0 — owner design decisions"
type: plan
status: draft
canon: false
updated: 2026-10-17
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

## Decision 02 — advancement/time controls: SELECTED

**Question:** How should time pass and when must the game pause?

**Owner selection (2026-10-16): B — one month + smart fast-forward.**

Other evaluated alternatives:
- A — Exactly one manual click for each month.
- C — Continuous autoplay with occasional interruptions.
- D — Real-time / offline aging in the background.

**Accepted player-facing behavior:**
1. One simulated month remains the indivisible gameplay interval. The default action is **Next month**.
2. Offer bounded convenience advances: **+3 months** and **Until next meaningful event/decision**. They run the same month logic, not a separate accelerated balance model. The earlier proposed **12-month cap** for "until event" is a **provisional UX/safety default**, not a separately approved balancing constant.
3. Routine commitments (learning, project work, life obligations) continue without repeated monthly re-selection until changed, interrupted or completed.
4. **Stop before any blocking choice**: never auto-select a choice or silently apply decision-specific effects. It is permitted to complete preceding months but not to finish the month awaiting the player's decision.
5. Show a concise recap of completed quiet months and retain their chronology; do not hide important outcomes merely because fast-forward was used.
6. No mandatory real-time auto-play and no passage of in-game time when the app is closed in v2's initial gameplay mode.
7. Preserve one coherent, transparent player-facing action to continue after answering the pending choice.

**Suggested implementation/acceptance semantics (requires follow-up architecture/spec acceptance, not production authority yet):**
- `advanceMonth(state, choiceOrContinuation, scopedRng)` is the deterministic unit; a fast-forward command repeats it while eligible and stops at the first unresolved blocking decision, requested bound, or safe terminal/failure condition.
- The blocking decision is materialized/persisted as pending **before** its month is finalized. Resume after the player's explicit selection; never consume additional randomness or reroll the offer just because UI reloads.
- Fast-forward reports separately: requested bound, number of **completed** months, current displayed date, stop reason (`limit-reached`, `decision-required`, `end-of-content`, `blocked`) and chronology highlights.
- A month containing only nonblocking information may proceed automatically while preserving its notable effects and narrative in the recap. Detailed stop-on-notable-event preferences remain **undecided**.
- For a given starting save/seed and player decisions, consecutive single-month advances and smart fast-forward must produce equivalent canonical state, event IDs, chronology and PRNG evolution for every **completed** month. Repeated requests/retries must not duplicate credits or events.
- The persistence boundary, save revision behavior, idempotency and crash recovery must be specified with Rust/SQLite ownership before implementation. Prefer atomic per-completed-month persistence so a cancelled/interrupted fast-forward cannot leave half a month committed; prove this with restart and interruption tests.
- Controls should remain disabled/explicitly blocked if save recovery is required or a choice is pending. An existing active legacy v1 MonthRun must not be converted to this v2 flow in place.

**Unresolved tuning, not owner decisions:** exact maximum fast-forward span and UX guard when no event is eligible (12 months suggested); whether nonblocking milestones also stop; whether repeated accelerate input is supported; how to summarize long quiet stretches; whether a dedicated pause/cancel button is necessary. These must be resolved with a playable test, not a general scheduling engine.

**First focused acceptance fixtures:** sequential vs +3 vs until-event parity, event on first/second/third simulated month, event-free 12-month window, pending decision save/reload, repeated request IDs, mid-batch interruption/restart, and content-exhaustion/recovery stop.

## Decision 03 — character state and attributes: SELECTED

**Question:** How deep should the v2 character's non-professional life state be, and how should it appear in the UI?

**Owner selection (2026-10-17): B — Compact Living Character Model.**

Other evaluated alternatives:
- A — Facts/events only, with almost no internal life variables.
- C — Classic BitLife-style always-visible numerical health, happiness, intelligence, discipline, stress, money and relationships.
- D — Rich RPG personality simulation with interacting needs, drives, routines and advanced social/physical systems.

**Accepted user-facing requirements:**
1. Keep identity, in-game date/age, current life circumstances, current commitments and relevant life history as compact, readable facts. The January 1990/age 12 start remains the established baseline.
2. Allow **one or two salient personality traits**, expressed as human-readable descriptors (e.g., curious, persistent). They bias eligibility, approach and consequences of relevant events; they do **not** constitute a full personality engine.
3. Permit exactly **three small internal life-state dimensions in the initial proposal**: **wellbeing**, **access to opportunities** (including equipment/time/context availability), and **financial stability**. Keep exact numerical scales, threshold tables and persistent-field representation **unfixed until v2 state/schema design and balancing**. Treat money amounts or expenses as future domain decisions rather than inferred from "financial stability".
4. Normally present those states as **qualitative descriptions and situational facts** when they matter to the current decision, rather than exposing three permanent bars or a character-sheet dashboard.
5. Distinguish **actual world facts** (e.g., "school PC available Wednesdays") from summaries of access or wellbeing. Facts are authoritative for event prerequisites where appropriate; an aggregate opportunity band must not arbitrarily replace concrete resources.
6. Maintain a programmer-first game: technical skills, learning, projects, career and technology history are separate upcoming design decisions, **not** extra RPG stats introduced by this selection.
7. Do not add autonomous needs loops for sleep, food, moods, hormones, daily schedules or comprehensive NPC simulation to MVP. Do not use numerical "intelligence" as an opaque gateway.
8. Explain important state changes causally through the monthly result and chronology, including when hidden internal values affected a choice. Do not trap a young or low-resource character in permanent soft locks; meaningful recovery paths must exist.

**Illustrative (not normative) March 1990 Normal UI:**
- "Алексей, 12 лет · школьник".
- "Любознательный, упорный".
- "Самочувствие: в порядке".
- "Компьютер: в школе по средам".
- "Финансы: зависит от семьи".
- Context: "Вы увлечены BASIC, но время за компьютером ограничено; можно учиться или попросить дополнительный доступ."

**Architecture/acceptance direction (not implemented by this log):**
- Prefer bounded, versioned `CharacterStateV2` and explicit world facts / event receipts, with derived `CharacterSummary` presentation projections. The schema, numeric calibration, updates and field-level ownership require a separate compatible design/ADR.
- Only retain traits and internal life-state that change a current meaningful choice, progression, constraint or explained outcome. Life-state mutations happen with the completed month, not through independently running timers.
- Golden fixtures should cover different initial equipment access, family financial context, wellbeing setbacks and trait combinations; a choice must cause a sensible outcome, and fast-forward must agree with individual month steps.
- Test save/reload equivalence, bounded state updates, truthful qualitative bands, deterministic replay and availability of recovery choices after setbacks; no arbitrarily guaranteed outcomes from one personality trait.
- Any character-name/identity schema change must be reconciled with accepted ADR-021 and the in-flight PROG-01 v2 save schema work; existing v1 states and pending MonthRuns remain untouched.

**Explicitly unresolved:** trait acquisition/change rules, exact hidden numeric ranges, whether relationships are part of `CharacterStateV2` or event facts, family financial accounting, life/health event severity, UI details for age/trait discovery. Resolve through later design questions and playtests; none is implicitly accepted here.

## Decision 04 — ongoing activities, learning and idle progression: PENDING

Next owner question: whether a player controls one persistent focus, multiple lightweight commitments, or more detailed schedules; how routine progress should advance automatically. No option selected yet.

## Remaining decision sequence (tentative)

After character state: activities and routine automation; projects and skills; career; event selection and life/NPC depth; historical eras; UI/UX and accessibility; migration/legacy support; acceptance criteria and first playable years.

## Acceptance before converting this draft to canonical architecture

- Owner-reviewed answers to the remaining questions.
- Proposed ADR(s) specifying v2/v1 ownership, compatibility and retirement/rollback.
- Source-of-truth sync across affected docs and execution status.
- Small playable proof: several consecutive years with meaningful divergent histories, deterministic replay and valid saves.
- GitHub-hosted CI results on the eventual implementation PR, with separate review of save-changing work.
