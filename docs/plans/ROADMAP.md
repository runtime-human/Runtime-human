# Roadmap

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
- canonical stories для первых game components.

Exit:

- core/application/adapters compile independently;
- TypeScript 7, Oxlint type-aware и Storybook tests проходят;
- renderer не имеет authoritative SQL execute capability;
- save fixture открывается;
- MonthRun draft schema существует;
- backup/restore smoke подтверждён;
- verification commands работают.

## Phase 1 — Vertical Slice

Реализовать `VERTICAL-SLICE-PLAN.md`.

Дополнительно обязательны:

- Storybook coverage основных экранов/компонентов slice;
- browser visual/accessibility baseline;
- WebdriverIO critical desktop flow;
- restart на blocking decision;
- Safe Mode/recovery smoke;
- deterministic trace fixture.

Exit: январь 1990 полностью играется, suspend/resume/save/load проверены desktop E2E, а ключевые UI states воспроизводятся через Storybook.

## Phase 2 — Education and Career

- school/university;
- job market;
- interview/promotion/firing;
- skills/technologies/specializations;
- work projects;
- finance baseline;
- Narrative Director pacing metrics.

Exit: путь до Junior/Middle играбелен и balance simulation не показывает soft locks.

## Phase 3 — Projects, Products and Open Source

- personal/freelance projects;
- releases;
- users/revenue/support;
- contributors/governance;
- articles/conferences;
- reputation/fame;
- расширение Storybook content fixtures.

Exit: минимум три независимых карьерных пути.

## Phase 4 — Life and Property

- housing progression внутри города;
- equipment/home lab;
- relationships/family;
- health/fatigue/burnout;
- richer NPC arcs.

Exit: карьерные решения имеют устойчивые жизненные последствия.

## Phase 5 — Company

- employees/teams;
- delegation;
- portfolio/products/contracts;
- runway/expenses;
- organizational events.

Exit: founder/CTO path играбелен без ручного микроменеджмента офиса.

## Phase 6 — Endgame and Future

- Top Programmer;
- late career/retirement/legacy;
- post-2026 fictional future;
- Content Studio на общих schemas/fixtures;
- stable mod content API;
- release/updater hardening;
- Storybook MCP development integration после security review.

## Cross-cutting gates

На каждом этапе:

- migration corpus;
- performance budgets;
- accessibility;
- Storybook edge states;
- historical provenance;
- deterministic golden tests;
- supply-chain checks;
- documentation/research traceability;
- no new geography/backend without ADR.

## Deferred, not baseline

- mutation testing после стабилизации pure core;
- Rust fuzzing после появления import/archive surface;
- offline WebView2 installer после подтверждённого спроса;
- external visual-testing SaaS не требуется.