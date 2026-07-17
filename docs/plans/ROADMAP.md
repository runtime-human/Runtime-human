# Roadmap

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md)
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md)

Roadmap строится вокруг programmer mastery и реальных project outcomes. Life, Product, Open Source и Company расширяют общий technical core.

## Phase 0 — Foundation

- monorepo, TypeScript 7, Oxc;
- architecture tests;
- schemas/content compiler;
- deterministic primitives, manifest, fixed-point;
- Tauri/Rust/SQLite/save/recovery;
- Storybook;
- professional state, episode, evidence and grade contracts;
- ProjectState, WorkPackage and Release contracts;
- schema versions and semantic fingerprints;
- deterministic package, release and evidence IDs;
- persistence and migration fixtures;
- balance report schemas.

Exit:

- package boundaries compile independently;
- renderer has no SQL execute capability;
- save, MonthRun, project and professional fixtures validate;
- duplicate ID constraints exist;
- backup/restore smoke passes;
- verification commands exist.

## Phase 1 — Programmer + Project Vertical Slice

Implement `VERTICAL-SLICE-PLAN.md`:

- 2 aptitudes, 5 skills, 1 technology;
- one small personal project;
- 3 scope slices;
- 2 Work Packages;
- one deterministic uncertainty;
- 3 quality dimensions;
- one optional debt or known-defect branch;
- one release or recovery outcome;
- contribution snapshot;
- one episode and evidence flow;
- suspend, resume and atomic commit;
- Storybook, browser, desktop and balance fixtures.

Exit: January 1990 is playable from project start to release or recovery without rerolls or duplicate records.

## Phase 2 — Beginner → Junior + Project Core

### Progression

- full 13-skill graph;
- mastery, fluency, familiarity and reacquisition;
- challenge bands, evidence and anti-repeat;
- directed transfer and technology tiers;
- focus, specialization and Beginner/Intern/Junior profiles;
- education providers.

### Project

- full WorkPackage lifecycle;
- scope and requirements;
- latent work and forecasts;
- quality profiles and confidence;
- debt aggregates and significant records;
- latent and known defects;
- releases and maintenance;
- contribution mapping.

Exit:

- Beginner to Junior works without XP-grade;
- personal and learning projects support varied outcomes;
- project is not one progress bar or daily-task simulator;
- project random state is deterministic;
- no dominant farming or permanent bad start.

## Phase 3 — Career and Work Projects

- vacancies, interviews and employment;
- company archetypes and role expectations;
- typed Career to Project requests;
- work and freelance project archetypes;
- team contribution and ownership;
- deadline, quality, debt and incident flows;
- promotion/title separate from grade;
- unemployment and re-entry;
- Middle profile and current market readiness.

Exit:

- path to Middle is playable;
- work projects create varied traceable outcomes and evidence;
- team result differs from character contribution;
- project, progression and career consequences commit atomically;
- job loss has recovery.

## Phase 4 — Products and Open Source

- Product/Market extension for users, demand, revenue and support;
- Open Source extension for contributors, governance, community and funding;
- long-lived releases, maintenance and migrations;
- typed extension signals;
- public, freelance and maintainer paths;
- release impact and support burden;
- Storybook and Content Studio previews.

Exit:

- Product and Open Source do not duplicate technical ProjectState;
- major professional paths remain viable;
- revenue and popularity do not create technical grade;
- project transfer, archive and failure are recoverable.

## Phase 5 — Human Constraints and Values

- housing and equipment;
- relationships and family;
- health, fatigue and burnout;
- mentor and NPC arcs;
- life economy and recovery;
- career interruption and return;
- project continuity and key-person consequences;
- crisis and recovery pacing.

Exit:

- life changes capacity and risk without repetitive chores;
- interruptions affect fluency, readiness and continuity without deleting mastery, grades or history;
- family and health paths remain viable;
- life events do not starve technical play.

## Phase 6 — Senior, Leadership and Company

- Senior gates and evidence diversity;
- architecture, review, mentoring and technical direction;
- Team Lead, Tech Lead and Architect roles;
- Company teams, hiring, payroll and portfolio;
- project ownership, delegation and guardrails;
- organizational versus technical debt;
- Founder and CTO paths;
- management-to-IC return, succession and absence;
- multi-project portfolio abstraction.

Exit:

- Senior requires sustained varied evidence;
- Company uses shared Project Engine;
- delegation works without hourly micromanagement;
- direct, team and delegated contribution remain distinct;
- Founder is not universally dominant.

## Phase 7 — Late Career, Endgame and Future

- Top Programmer achievements;
- strategic and frontier projects;
- ecosystem and industry impact;
- mentoring generations;
- ownership transfer, sale and legacy maintenance;
- retirement and succession;
- post-2026 future;
- philosophy grounded in lived history;
- compaction after a real save corpus;
- mod API and release hardening.

Exit:

- Top Programmer is rare and multi-path;
- major careers have endgames;
- releases, evidence and project legacy remain preserved;
- philosophy interprets gameplay outcomes.

## Cross-cutting gates

- programmer-first metrics;
- Project, extension and Progression boundaries;
- deterministic IDs and replay;
- forecast calibration;
- multidimensional quality and confidence;
- debt, defect and release integrity;
- team versus player contribution;
- farming and overparallelization checks;
- path parity, recovery and soft locks;
- migration and compatibility corpus;
- performance, accessibility and Storybook;
- historical provenance and deterministic goldens;
- supply-chain and documentation traceability;
- no geography or backend expansion without ADR.

A feature fails the gate when ownership is duplicated, the project becomes repetitive task clicking, quality is reduced to one authoritative number, hidden outcomes change after reload, project success is confused with mastery or popularity, or recovery and balance tests are missing.

## Deferred

- generic life-sim expansion and other professions;
- deep medical, family or tax simulation;
- full Product, Company or Open Source in vertical slice;
- Top Programmer formula before Senior corpus;
- full technology version graph;
- package and evidence compaction before real saves;
- Bayesian, IRT or LLM judge;
- executable content and dynamic runtime transfer calculation;
- daily employee or ticket simulation;
- mutation testing and Rust fuzzing before relevant surfaces stabilize;
- optional installer and external visual-testing services until needed.
