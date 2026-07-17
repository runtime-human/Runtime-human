# Roadmap

Нормативная продуктовая иерархия: [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md).

Roadmap строится вокруг programmer mastery spine. Life, economy, relationships, narrative и company systems добавляются как контекст, последствия и способы выражения профессионального развития, а не как параллельные равноправные продукты.

## Phase 0 — Foundation

- monorepo/toolchains;
- TypeScript 7 exact baseline;
- Oxfmt/Oxlint/type-aware verification;
- architecture tests;
- schemas/content compiler;
- deterministic primitives and manifest;
- integer/fixed-point domain types;
- Tauri/Rust persistence write-boundary;
- explicit Tauri capabilities;
- SQLite 3.51.3+ version gate;
- SQLite/save envelope;
- persisted MonthRun draft model;
- backup/migration/recovery runbook;
- CI fast/full checks;
- base design system;
- Storybook 10 workshop;
- canonical stories для первых game components;
- `ProfessionalEvidence` schema/read model contract;
- programmer-first metrics schema.

Exit:

- core/application/adapters compile independently;
- TypeScript 7, Oxlint type-aware и Storybook tests проходят;
- renderer не имеет authoritative SQL execute capability;
- save fixture открывается;
- MonthRun draft schema существует;
- ProfessionalEvidence fixture валидируется;
- backup/restore smoke подтверждён;
- verification commands работают.

## Phase 1 — Programmer-First Vertical Slice

Реализовать `VERTICAL-SLICE-PLAN.md`.

Дополнительно обязательны:

- historically appropriate beginner technology;
- hands-on programming activity;
- problem decomposition/debugging choice;
- skill + technology progression;
- first ProfessionalEvidence;
- capability/grade-readiness explanation;
- programmer-first monthly report;
- Storybook coverage основных экранов/компонентов slice;
- browser visual/accessibility baseline;
- WebdriverIO critical desktop flow;
- restart на blocking decision;
- Safe Mode/recovery smoke;
- deterministic trace fixture;
- programmer arc starvation/low-income access balance fixtures.

Exit: январь 1990 полностью играется, персонаж получает первый осмысленный programming result и evidence, suspend/resume/save/load проверены desktop E2E, а ключевые UI states воспроизводятся через Storybook.

## Phase 2 — Programmer Progression Core

- fundamentals/core craft/engineering skill graph;
- mastery/fluency/familiarity;
- ProfessionalEvidence aggregation;
- GradeReadiness dimensions;
- Beginner/Intern/Junior/Middle/Senior target bands;
- technology families/transfer matrix;
- technology lifecycle/content tiers;
- school/university learning paths;
- mentoring/feedback quality;
- specialization entry/switching;
- balance policies для breadth/depth и diminishing returns.

Exit:

- путь Beginner → Junior играбелен без скрытого XP-grade;
- skill growth объясним и зависит от task context;
- смена technology/specialization не создаёт обнуление;
- balance simulation не показывает permanent bad start.

## Phase 3 — Career and Work Projects

- job market;
- vacancy generation/shortlist;
- interview/promotion/firing;
- company archetypes и task distributions;
- work packages;
- quality/debt/bugs/incidents;
- evidence recency;
- salary/finance baseline;
- unemployment/re-entry;
- Narrative Director programmer-first pacing metrics.

Exit:

- путь до Middle играбелен;
- работа создаёт разнообразное professional evidence;
- promotion/title/grade различаются;
- увольнение не создаёт soft lock;
- обычная корпоративная карьера имеет самостоятельную ценность.

## Phase 4 — Projects, Products and Open Source

- personal/freelance/research projects;
- scope/quality/debt/release decisions;
- users/revenue/support;
- portfolio value;
- legacy burden;
- contributors/governance/community health;
- sponsorship/funding;
- articles/conferences;
- reputation/fame;
- public expert path;
- open-source maintainer endgame foundations;
- расширение Storybook content fixtures.

Exit:

- минимум четыре независимых профессиональных пути: corporate specialist, freelancer/product creator, open-source maintainer, public expert;
- project gameplay не сводится к progress bar;
- open source имеет failure/recovery/governance, а не только popularity.

## Phase 5 — Human Constraints and Values

- housing progression внутри города;
- equipment/home lab;
- relationships/family;
- health/fatigue/burnout;
- richer NPC arcs;
- life economy/debt/recovery;
- career interruption and return;
- Narrative Director crisis/recovery windows.

Exit:

- карьерные решения имеют устойчивые жизненные последствия;
- life systems не требуют одинакового ежемесячного обслуживания;
- family-first и health-constrained runs сохраняют programmer path;
- life-only events не вытесняют professional core.

## Phase 6 — Senior, Leadership and Company

- Senior evidence model;
- architecture/technical leadership/mentoring;
- Team Lead/Tech Lead/Architect paths;
- employees/teams;
- delegation/autonomy;
- portfolio/products/contracts;
- runway/expenses;
- organizational debt;
- Founder/CTO differentiation;
- succession и temporary absence.

Exit:

- Senior достигается через varied sustained evidence;
- founder/CTO path играбелен без ручного микроменеджмента офиса;
- делегирование является прогрессией;
- direct coding может уменьшаться без исчезновения programmer identity;
- Founder не доминирует одновременно по всем path dimensions.

## Phase 7 — Late Career, Endgame and Future

- Top Programmer;
- late career/retirement/legacy;
- mentoring generations;
- succession/ownership transfer;
- post-2026 fictional future;
- philosophy/legacy arcs, основанные на прожитой истории;
- Content Studio на общих schemas/fixtures;
- stable mod content API;
- release/updater hardening;
- Storybook MCP development integration после security review.

Exit:

- Top Programmer остаётся редким;
- спокойная корпоративная, open-source, public, founder и technical expert careers имеют самостоятельные endgame outcomes;
- retirement/legacy не обесценивают профессиональный путь;
- philosophy является итоговой интерпретацией истории, а не заменой gameplay.

## Cross-cutting gates

На каждом этапе:

- programmer-first decision/outcome metrics;
- GradeReadiness/evidence integrity;
- path parity;
- soft-lock/recovery simulation;
- migration corpus;
- performance budgets;
- accessibility;
- Storybook edge states;
- historical provenance;
- deterministic golden tests;
- supply-chain checks;
- documentation/research traceability;
- no new geography/backend without ADR.

Gameplay feature не проходит gate, если:

- не объяснена связь с programmer mastery/professional expression;
- она создаёт отдельный routine micromanagement loop;
- она вытесняет programmer-core screen/content budget;
- её success измеряется только деньгами/popularity;
- она не имеет failure/recovery и balance metrics.

## Deferred, not baseline

- generic life-sim expansion, не связанная с programmer journey;
- дополнительные профессии для персонажа;
- глубокая медицинская/семейная/налоговая симуляция;
- mutation testing после стабилизации pure core;
- Rust fuzzing после появления import/archive surface;
- offline WebView2 installer после подтверждённого спроса;
- external visual-testing SaaS не требуется.
