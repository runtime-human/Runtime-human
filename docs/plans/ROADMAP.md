# Roadmap

Нормативные спецификации:

- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

Roadmap строится вокруг programmer mastery spine. Life, economy, relationships, narrative и company systems добавляются как контекст, последствия и способы выражения профессионального развития.

## Phase 0 — Foundation

- monorepo/toolchains;
- TypeScript 7/Oxc verification;
- architecture tests;
- schemas/content compiler;
- deterministic primitives/manifest;
- integer/fixed-point domain types;
- Tauri/Rust persistence boundary;
- SQLite/save envelope;
- persisted MonthRun draft;
- backup/migration/recovery;
- Storybook workshop;
- `CharacterProfessionalState` contracts;
- `ExperienceEpisode` provider contract;
- claims-based evidence DTO;
- deterministic evidence ID policy;
- grade award/readiness projection contracts;
- progression metrics schema.

Exit:

- core/application/adapters compile independently;
- renderer has no SQL execute;
- save/MonthRun fixture opens;
- professional state/evidence fixture validates;
- duplicate evidence ID test exists;
- backup/restore smoke;
- verification commands work.

## Phase 1 — Programmer-First Vertical Slice

Implement `VERTICAL-SLICE-PLAN.md` with deliberately small ADR-013 scope:

- 2 aptitudes;
- 5 skills;
- 1 technology family/technology;
- 1 provider activity/challenge;
- assisted/independent/partial/failure outcomes;
- 1 `ExperienceEpisode`;
- mastery/fluency/familiarity delta;
- evidence claims/practice aggregate;
- capability/readiness explanation;
- atomic suspend/resume/commit;
- Storybook/browser/desktop tests;
- access/failure/duplicate-evidence balance fixtures.

Exit: January 1990 is playable; first programming result is traceable from provider outcome to committed evidence without duplicate effects after restart.

## Phase 2 — Beginner → Junior Progression Core

- full baseline 13-skill graph;
- mastery/fluency/familiarity/reacquisition;
- challenge bands/facets;
- evidence claims/anti-repeat;
- monthly practice aggregates;
- directed sparse transfer;
- technology Tier A/B/C;
- ProfessionalFocus/derived specialization;
- Beginner/Intern/Junior grade profiles;
- demonstrated/current-market readiness;
- education/school/university providers;
- course/easy-task/mentor farming simulation.

Exit:

- Beginner→Junior playable without XP-grade;
- grade award requires gates/contexts;
- interruption does not erase mastery;
- transfer does not create evidence;
- no permanent bad start/farming dominance.

## Phase 3 — Career and Work Projects

- job market/vacancies/interviews;
- company archetypes/task distributions;
- Project/Career provider work packages;
- quality/debt/bugs/incidents;
- character contribution vs team outcome;
- promotion/title/company level separate from grade;
- unemployment/re-entry;
- current market readiness;
- Middle grade/profile;
- professional pacing metrics.

Exit:

- path to Middle playable;
- work creates varied evidence;
- project outcome + evidence atomic;
- promotion/title/grade differ;
- layoffs/re-entry not soft lock.

## Phase 4 — Projects, Products and Open Source

- personal/freelance/research/product projects;
- scope/quality/debt/release decisions;
- releases/impact/support/legacy;
- OSS contribution/governance/community health;
- sponsorship/funding;
- public expert path;
- provider evidence for review, release, maintenance and impact;
- Storybook content fixtures.

Exit:

- corporate, freelancer/product, OSS and public paths viable;
- project is not one progress bar;
- revenue/fame do not mint technical grade;
- contribution separated from team/community success.

## Phase 5 — Human Constraints and Values

- housing/equipment;
- relationships/family;
- health/fatigue/burnout;
- richer NPC/mentor arcs;
- life economy/debt/recovery;
- career interruption/return;
- current market readiness/reacquisition UX;
- crisis/recovery pacing.

Exit:

- life consequences matter without monthly chores;
- family/health paths preserve programmer progression;
- interruption affects fluency/readiness, not awarded grade;
- life-only events do not starve professional core.

## Phase 6 — Middle → Senior, Leadership and Company

- Senior gate/profile model;
- sustained evidence/context diversity;
- architecture/technical direction/review/mentoring;
- Team Lead/Tech Lead/Architect roles;
- delegation/autonomy/downstream outcome;
- company/team/product portfolio;
- Founder/CTO differentiation;
- management-to-IC return;
- succession/temporary absence;
- anti-management-shortcut balance.

Exit:

- Senior requires varied sustained evidence;
- leadership evidence does not replace core craft floors;
- founder/CTO playable without office micromanagement;
- direct coding can decline without erasing programmer identity;
- Founder not dominant across all dimensions.

## Phase 7 — Late Career, Endgame and Future

- Top Programmer status/achievements;
- strategic/frontier impact;
- mentoring generations;
- retirement/legacy/succession;
- post-2026 future;
- philosophy based on lived history;
- evidence compaction only after real corpus;
- Content Studio/mod API/release hardening;
- Storybook MCP after security review.

Exit:

- Top Programmer rare and multi-path;
- all major career paths have endgame;
- legacy preserves professional history;
- philosophy interprets gameplay rather than replacing it.

## Cross-cutting gates

- programmer-first metrics;
- provider/progression boundary;
- evidence integrity/dedup;
- awarded-grade compatibility;
- demonstrated/current readiness distinction;
- course/easy-task/mentor/management farming;
- path parity;
- soft-lock/recovery;
- migration corpus;
- performance/accessibility/Storybook;
- historical provenance/deterministic goldens;
- supply chain/docs traceability;
- no geography/backend without ADR.

Feature fails gate if:

- provider ownership unclear;
- provider mutates skills/grade directly;
- progression/evidence is untraceable;
- it adds routine micromanagement;
- success is only money/popularity;
- no failure/recovery/balance metrics;
- it expands full Senior/endgame mechanics before lower phase proof.

## Deferred

- generic life-sim expansion;
- other professions;
- deep medical/family/tax simulation;
- Top Programmer formula before Senior corpus;
- full technology version graph;
- evidence compaction before real saves;
- Bayesian/IRT/LLM judge;
- dynamic runtime transfer calculation;
- mutation testing/Rust fuzzing until relevant surfaces stabilize;
- offline WebView2 installer unless demanded;
- external VRT SaaS.
