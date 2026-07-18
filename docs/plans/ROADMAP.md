---
title: "Roadmap"
type: plan
status: draft
canon: true
depends_on: [ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020]
updated: 2026-07-18
---

# Roadmap

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md)
- [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md)
- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md)
- [ADR-018](../adr/ADR-018-authoritative-programmer-career-employment-model.md)
- [ADR-019](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [ADR-020](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md)
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md)
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md)
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md)
- [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md)
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [Programmer Career Engine](../game-design/PROGRAMMER-CAREER-ENGINE.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)

Roadmap проверяет gameplay последовательно, а не реализует максимальную архитектурную модель заранее.

> Recommended/Extended feature не входит в phase только потому, что для него существует extension seam.

## Phase 0 — Foundation для MVP Casual

Implement:

- monorepo/TypeScript/Oxc;
- minimal package boundaries;
- deterministic IDs/Manifest/fixed-point;
- Tauri/Rust/SQLite/save/recovery;
- Storybook Foundation;
- minimal professional/project/challenge/learning contracts;
- minimal technology identity/family/context contracts without full catalog/state;
- minimal professional-situation authoring/compiled contracts without generic DSL;
- stable semantic signature/materialized-ID seam;
- minimal `ExperienceEpisode` and atomic provider/progression commit;
- Russian localization and focused fixture/test commands.

Do not implement:

- full evidence/project/debt/defect schemas;
- complete skill/technology graph;
- full challenge/learning/technology/situation catalog;
- broad situation composition or coverage dashboard;
- runtime procedural/LLM generation;
- package/version solver or tech tree;
- daily learning schedule;
- university/credentials/adaptive tutoring/AI;
- Career/Company/Product systems;
- speculative fields.

Exit:

- minimal fixtures validate;
- MonthRun suspend/resume and duplicate guards work;
- one casual screen/story uses public contracts;
- provider/challenge/learning/project/progression/technology/content ownership compiles conceptually;
- materialized IDs independent of input/display order;
- no unused Extended schema burden.

## Phase 1 — Casual Programmer Vertical Slice

Implement `VERTICAL-SLICE-PLAN.md` plus minimum technology/content context:

- one historically valid beginner source;
- one BASIC-like family/technology/version band;
- one PC/DOS-like platform/toolchain/ecosystem profile;
- global chronology separated from fictional local availability;
- home access and low-access school/shared fallback;
- one short learning bridge without second required modal;
- one small project, two packages and one technical situation;
- represent existing January diagnose situation as one kernel/context/pressure/bridge/presentation composition;
- compile exactly one immutable professional-situation variant;
- one technology-informed compatibility/tooling constraint;
- 2–4 project approaches;
- three quality bands and one uncertainty/debt/issue branch;
- one aggregated professional result and causal report;
- exact content snapshot/no-reroll after visible decision;
- safe restart and Storybook/a11y/usability fixtures.

Technology Normal UI shows 3–5 relevant traits, not a tech tree. Player UI does not expose content components, signatures or coverage.

Exit:

- player understands learning/project/technology context and technical choice;
- distinguishes guided result from independent capability;
- distinguishes technology from skill and global existence from practical access;
- names one technology advantage and one constraint;
- chooses ordinary approach in 10–20 seconds;
- low-access fixture reaches meaningful practice/project;
- outcome/learning causality understood;
- restart preserves exact situation, approaches and complication;
- screen is not LMS/CRM/Jira/tech/content dashboard;
- player wants to continue to February.

Failure blocks more simulation/content depth.

## Phase 2 — First Playable Year

Goal: prove learning, technologies, projects, professional situations and life constraints remain interesting beyond one month.

Add only:

- 3–5 visible skills;
- 3–5 learning-source profiles and 6–10 opportunities;
- 2–3 access routes including shared-device path;
- worked example → modification → independent practice → transfer;
- one mentor/peer/community route;
- 2–3 beginner technology identities/families only where gameplay differs;
- sparse directed transfer;
- selected meaningful bands/platform contexts, not every version;
- multiple small projects/challenge contexts;
- 6–10 authored situation kernels as a starting hypothesis;
- build/diagnose/improve/integrate representation;
- focused composition sets with 12–24 semantic variants as a starting hypothesis;
- semantic duplicate/repetition/coverage reports;
- no more than two presentation variants per semantic composition;
- simple Intern readiness;
- school/family/equipment constraints;
- routine aggregation, quiet months, interruption/recovery and migration corpus.

Professional situation depth:

- new variant must change dilemma, available approach meaning, consequence or recovery—not only wording/name/technology label;
- runtime receives precompiled variants only;
- full Cartesian materialization is forbidden;
- critical-flow tuples and selected pairwise coverage replace fake completeness;
- assistance/autonomy, scope/quality and interruption/recovery must be represented;
- approach-shape/cause/provider concentration measured;
- presentation-only variants share semantic repetition profile;
- every kernel has recovery/follow-up where path continuation requires it;
- expansion requires perceived-repetition or coverage evidence.

Technology depth:

- independent release/adoption/support/ecosystem/local/installed-base axes;
- familiar/mainstream/emerging/legacy contextual trade-offs;
- no latest-tech or mainstream dominance;
- no package/version micromanagement;
- source-backed chronology and explicitly fictional local diffusion;
- committed technology snapshots remain compatible.

Project depth:

- 2–5 packages;
- optional/deferred scope;
- situational quality only when needed;
- one significant debt/issue theme;
- compact release history.

Exit:

- one year replayable/understandable without source/choice fatigue;
- at least two viable learning/project/technology strategies;
- player distinguishes similar professional situations by actual trade-off;
- semantic repeat and approach-shape streaks remain within reviewed targets;
- corpus contains no large never-eligible/reskin expansion;
- low-access start reaches capability milestones without permanent deficit;
- mentor/help and wealth/access useful but not dominant;
- progression causal, not XP grind;
- player distinguishes understanding, assistance, independent application, transfer, familiarity and support;
- newest/mainstream/legacy all have contextual viability;
- no advanced UI required.

## Phase 3 — Beginner → Junior and Career Slice

Goal: turn professional history into first-job opportunities/workplace contexts without HR micromanagement.

Implementation sources:

- [Programmer Career Implementation Plan](PROGRAMMER-CAREER-IMPLEMENTATION-PLAN.md);
- [Professional Situation Content Implementation Plan](PROFESSIONAL-SITUATION-CONTENT-IMPLEMENTATION-PLAN.md).

Add only:

- one provenance-backed labor profile;
- three fictional employer archetypes and one entry role family;
- three opportunity templates, one Career Intent and aggregated search;
- at most 1–3 meaningful opportunities;
- employer-visible signals from portfolio/history;
- one portfolio discussion and one shared interview challenge using compiled professional-situation content;
- 1–2 hiring stages with 2–4 approaches;
- standard/conditional/alternate/rejection outcomes;
- two multi-dimensional offers;
- one active position/automatic commitment;
- workplace Project/Challenge/Learning integration;
- one workplace technical/communication situation through compiled registry;
- public technology context signals: relevant band, familiarity gap, trainability, employer toolchain compatibility and legacy/new demand;
- simple workplace trust/allowed scope;
- title separate from grade;
- rejection and layoff/re-entry fixtures;
- deterministic resume.

Do not add:

- full Company/employee/payroll/management/global market;
- visas/relocation/detailed contracts/office politics/multiple jobs;
- application/resume spam;
- exact hire/candidate/performance scores;
- exact technology popularity or universal role-fit;
- separate Career technical-situation grammar;
- IDE/trivia/runtime LLM judge.

Exit:

- first work/Junior path playable and causal;
- opportunity and technology-context differences understood;
- capability, visible signal, familiarity, access, title and grade distinguished;
- interview/workplace situations preserve provider/evidence semantics;
- employer cancellation is distinct from candidate failure;
- salary/referral/credential/mainstream technology not globally dominant;
- hiring/offer/workplace context stable across reload;
- rejection/job loss recoverable;
- employment creates programmer gameplay without weekly task management;
- player wants to continue after first offer/work month.

## Phase 4 — Products and Open Source

Add:

- Product/Market users/demand/revenue extension;
- Open Source community/contributor extension;
- long-lived project value/support;
- public/freelance/maintainer paths;
- community/review learning and Career signals;
- necessary migration/support technology contexts;
- focused Open Source situation contexts only after provider contracts exist;
- selected ecosystem-health dimensions only when they create community/project decisions;
- Content Studio previews/coverage as needed.

Exit:

- Product/OSS do not duplicate ProjectState/Technology Catalog;
- popularity/revenue/community activity do not create grade or universal ecosystem score;
- support/migration create choices, not maintenance clicks;
- public success creates signals, not guaranteed offers;
- OSS situation bridge cannot mutate community/project/progression outside owners;
- project transfer/archive recoverable.

## Phase 5 — Human Constraints and Long-term Life

- richer relationships/family/health/fatigue/burnout;
- housing/equipment progression;
- deeper mentors/NPC arcs;
- life economy;
- career/learning interruption and return;
- long-term project continuity;
- technology reacquisition after band/ecosystem shifts;
- professional follow-ups retain participant/relationship continuity without generic drama generation.

Exit:

- life systems change choices without chores;
- interruptions preserve mastery/grade/history;
- family/health paths viable;
- equipment/access differences do not create permanent soft lock;
- re-entry explains fluency/familiarity/market visibility separately;
- technical play not starved.

## Phase 6 — Middle/Senior, Leadership and Company

Only after Career Slice and player demand.

- Middle/Senior profiles;
- architecture/review/mentoring;
- teaching outcomes;
- Team Lead/Tech Lead/Architect;
- Company teams/headcount/payroll/budget;
- hiring other employees through Company contracts;
- delegation/ownership and project portfolio;
- Founder/CTO and management-to-IC return;
- deeper internal transitions;
- organization tooling/platform policies only when they change leadership/project decisions;
- selected incidents/rollback/technology migration;
- leadership/systemic situation kernels only after their provider/evidence semantics exist.

Exit:

- leadership without employee/hour micromanagement;
- mentoring not passive multiplier;
- Senior understandable;
- Founder/latest stack not universally dominant;
- management title does not replace grade;
- company tooling does not duplicate historical/project technology truth;
- systemic situations do not become hidden arbitrary correctness tests.

## Phase 7 — Late Career and Endgame

- Top Programmer and ecosystem/industry impact;
- mentoring generations;
- ownership transfer/legacy;
- retirement/succession;
- post-2026 explicitly fictional future;
- historically valid AI-era and future learning/hiring/tooling ecosystems;
- offline authoring assistance may suggest draft content under human review;
- mod/content API hardening;
- compaction based on real save corpus.

Exit:

- multiple endgames;
- accumulated history used without bureaucracy;
- legacy readable/meaningful;
- optional advanced details remain secondary;
- real products do not receive invented future chronology;
- runtime LLM generation is not required for variety or continuity.

## Complexity gates for every phase

Block a feature when:

- no current meaningful choice/consequence;
- Normal mode needs advanced data;
- unused authoritative fields are added;
- visible concepts exceed budget;
- it creates maintenance/schedule/application/version clicking;
- it increases total situation count without semantic diversity;
- it requires runtime generation to avoid authoring/validation work;
- justified only by realism/completeness;
- no playtest hypothesis;
- content/testing cost exceeds demonstrated value.

## Cross-cutting gates

- programmer-first fantasy and casual comprehension;
- deterministic replay/idempotency;
- provider/module ownership;
- causal monthly report;
- bounded decisions;
- assisted/independent semantics;
- access equity/recovery;
- learning → project → career transition;
- grade/title/role-fit/trust separation;
- technology/skill/familiarity/support/access separation;
- content compiler/Event/Director/Challenge ownership separation;
- semantic variety rather than presentation reskins;
- materialization budgets and stable IDs;
- mandatory follow-up not starved by novelty penalties;
- latest/mainstream/legacy and salary/referral/credential non-dominance;
- rejection/layoff/migration/re-entry recovery;
- historical provenance and fictional-local marking;
- save compatibility for implemented state;
- accessibility/long RU;
- no geography/backend expansion without ADR.

## Deferred until proven necessary

- full evidence/challenge/grade matrices;
- full technology/version/compatibility/package graph;
- live popularity/download/vulnerability feeds;
- detailed hardware/IDE inventory;
- global technology/labor market;
- component/requirement/debt/defect/rollout ledgers;
- granular contribution;
- daily employee/ticket/learning timetable;
- exact spaced repetition/adaptive Bayesian learner;
- course marketplace/full education institutions;
- AI tutoring/judging before valid gameplay;
- application/resume CRM and exact candidate/performance scores;
- detailed contracts/visas/relocation/office politics/multiple jobs;
- full Company/HR simulation;
- portfolio dashboard;
- generic professional-situation DSL;
- full Cartesian situation generation;
- runtime procedural or LLM-generated gameplay situations;
- embeddings as authoritative duplicate/eligibility decision;
- visual node/graph editor before form/matrix workflow proves insufficient;
- broad Content Studio analytics before first-year corpus;
- long-term compaction before real saves;
- Bayesian/IRT/LLM judge;
- generic life-sim/other professions.
