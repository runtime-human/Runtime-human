# Roadmap

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

Roadmap строится не вокруг максимальной архитектурной модели, а вокруг последовательной проверки gameplay.

Правило:

> Recommended/Extended feature не входит в phase только потому, что для него уже предусмотрен extension seam.

## Phase 0 — Foundation для MVP Casual

- monorepo/TypeScript/Oxc;
- minimal package boundaries;
- deterministic IDs/Manifest/fixed-point;
- Tauri/Rust/SQLite/save/recovery;
- Storybook Foundation;
- minimal professional state;
- minimal project state;
- minimal `ExperienceEpisode`;
- atomic project/progression commit;
- Russian localization foundation;
- focused fixture/test commands.

Не реализовать в Phase 0:

- full evidence schema/browser;
- full ProjectState/debt/defect model;
- complete skill graph;
- Senior/Company/Product systems;
- speculative fields without current gameplay.

Exit:

- minimal fixtures validate;
- MonthRun suspend/resume works;
- deterministic duplicate guards exist;
- one casual screen/story can use public contracts;
- no unused Extended schema burden.

## Phase 1 — Casual Programmer Vertical Slice

Implement `VERTICAL-SLICE-PLAN.md`:

- one small project;
- two Work Packages;
- one technical trade-off;
- three quality bands;
- one uncertainty/debt/known-issue branch;
- one aggregated professional result;
- causal monthly report;
- safe restart;
- Storybook/accessibility/usability fixtures.

Exit:

- player understands first-month goal and choice;
- chooses in 10–20 seconds;
- explains outcome/learning;
- wants to continue to February;
- screen is not perceived as CRM/Jira;
- normal mode sufficient.

Failure to meet product exit criteria blocks additional simulation depth.

## Phase 2 — First Playable Year

Goal: prove that the simple loop remains interesting beyond one month.

Add only:

- 3–5 visible skills with gradual progression;
- several learning activities;
- 2–3 beginner technologies;
- several small projects;
- simple Intern readiness;
- school/family/equipment constraints;
- quiet months and event variety;
- first meaningful recovery paths;
- simple save migration corpus.

Project depth:

- 2–5 packages;
- optional/deferred scope;
- situational quality only when needed;
- significant known issue/debt theme;
- compact release history.

Exit:

- one year is replayable and understandable;
- no repeated-choice fatigue;
- at least two viable learning/project strategies;
- progression feels causal, not XP grind;
- no need for advanced UI to play.

## Phase 3 — Beginner → Junior and Career

- job market/vacancies/interviews;
- employment as automatic commitment;
- simple company archetypes;
- work project requests using shared Project Engine;
- promotion/title separate from grade;
- unemployment/re-entry;
- Intern/Junior readiness;
- additional skills/technology families only as required;
- Details mode for progression/project history.

Project Recommended profile may add:

- meaningful debt/defect records;
- simple team contribution;
- maintenance arcs;
- richer release history.

Exit:

- path to Junior is playable and understandable;
- work does not become weekly task management;
- job loss has recovery;
- professional and life decisions remain balanced;
- no evidence/performance-review UX.

## Phase 4 — Products and Open Source

- Product/Market extension for users/demand/revenue;
- Open Source extension for community/contributors;
- long-lived project value/support;
- public/freelance/maintainer paths;
- only necessary project depth for support/migrations;
- Content preview tools as needed.

Exit:

- Product/Open Source do not duplicate technical ProjectState;
- popularity/revenue do not create technical grade;
- support creates choices, not maintenance clicking;
- project failure/transfer/archive recoverable.

## Phase 5 — Human Constraints and Long-term Life

- richer relationships/family;
- health/fatigue/burnout;
- housing/equipment progression;
- mentors/NPC arcs;
- life economy;
- career interruption/return;
- long-term project continuity.

Exit:

- life systems change choices without monthly chores;
- interruptions preserve mastery/grade/history;
- family/health paths viable;
- technical play not starved.

## Phase 6 — Middle/Senior, Leadership and Company

Only after Beginner→Junior corpus and player demand.

- Middle/Senior grade profiles;
- architecture/review/mentoring;
- Team Lead/Tech Lead/Architect;
- Company teams/hiring/payroll;
- simple delegation/ownership;
- project portfolio abstraction;
- Founder/CTO paths;
- management-to-IC return.

Extended project/progression features may be introduced selectively:

- granular contribution when it changes leadership gameplay;
- incidents/rollback for production projects;
- advanced readiness detail;
- delegation policies;
- situational quality/debt depth.

Exit:

- leadership works without employee/hour micromanagement;
- Senior remains understandable;
- Founder not universally dominant;
- Extended complexity proves product value.

## Phase 7 — Late Career and Endgame

- Top Programmer;
- ecosystem/industry impact;
- mentoring generations;
- ownership transfer/legacy;
- retirement/succession;
- post-2026 future;
- philosophy grounded in lived history;
- mod/content API hardening;
- compaction based on real save corpus.

Exit:

- multiple endgame paths;
- late systems use accumulated history without exposing bureaucracy;
- legacy is readable and meaningful;
- optional advanced details remain secondary.

## Complexity gates for every phase

A feature is blocked when:

- it does not create a current meaningful choice/consequence;
- normal mode requires advanced data;
- it adds unused authoritative fields;
- it increases visible concepts beyond budget;
- it creates maintenance clicking;
- it is justified only by realism/future completeness;
- no playtest hypothesis exists;
- content/testing cost exceeds demonstrated value.

## Cross-cutting gates

- programmer-first fantasy;
- casual comprehension;
- deterministic replay/idempotency;
- provider/module boundaries;
- causality in monthly report;
- bounded blocking decisions;
- accessibility/long RU;
- recovery/soft locks;
- historical provenance;
- save compatibility for actually implemented state;
- no geography/backend expansion without ADR.

## Deferred until proven necessary

- full evidence browser;
- full challenge/grade matrices;
- full technology version graph;
- component/requirement graph;
- debt/defect ledger;
- rollout/support/rollback simulation;
- granular contribution percentages;
- daily employee/ticket simulation;
- portfolio dashboard;
- long-term compaction before real saves;
- Bayesian/IRT/LLM judge;
- generic life-sim expansion and other professions.
