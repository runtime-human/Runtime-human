# Architecture Decision Records

## Accepted

- [ADR-001 — Реальный исторический календарь и старт в 1990 году](ADR-001-historical-calendar-and-start.md)
- [ADR-002 — Бесплатное распространение без Steam и целевого рынка ЕС](ADR-002-free-non-eu-distribution.md)
- [ADR-003 — Один фиксированный вымышленный мегаполис](ADR-003-fixed-fictional-metropolis.md)
- [ADR-004 — Граница выполнения persistence](ADR-004-persistence-execution-boundary.md)
- [ADR-005 — Приостановленный MonthRun](ADR-005-suspended-month-run.md)
- [ADR-006 — Авторитетная числовая модель](ADR-006-numeric-model.md)
- [ADR-007 — Determinism Manifest](ADR-007-determinism-manifest.md)
- [ADR-008 — Browser и desktop E2E](ADR-008-desktop-e2e.md)
- [ADR-009 — Narrative Director](ADR-009-narrative-director.md)
- [ADR-010 — Авторитетное состояние сейва](ADR-010-authoritative-save-state.md)
- [ADR-011 — TypeScript 7 как production baseline](ADR-011-typescript-7-baseline.md)
- [ADR-012 — Storybook как UI и content workshop](ADR-012-storybook-ui-content-workshop.md)
- [ADR-013 — Авторитетная модель профессиональной прогрессии и evidence](ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-014 — Авторитетная модель Project & Work Package](ADR-014-authoritative-project-work-package-model.md)
- [ADR-015 — Casual-first abstraction и бюджет сложности](ADR-015-casual-first-abstraction-and-complexity-budget.md)
- [ADR-016 — Авторитетная модель профессиональных ситуаций и подходов](ADR-016-authoritative-professional-challenge-model.md)
- [ADR-017 — Авторитетная модель обучения программированию и доступа](ADR-017-authoritative-programmer-learning-access-model.md)
- [ADR-018 — Авторитетная модель карьеры программиста, найма и занятости](ADR-018-authoritative-programmer-career-employment-model.md)
- [ADR-019 — Авторитетная модель исторических технологий, tooling и ecosystem context](ADR-019-authoritative-historical-technology-ecosystem-model.md)

## Decision sequence

- ADR-004–012: technical Deep Research 2026-07-16.
- ADR-013: SD-001 professional progression boundary.
- ADR-014: SD-002 project/work-package boundary.
- ADR-015: DC-001 casual-first correction; architecture seams remain, but MVP/roadmap implement only gameplay-proven complexity.
- ADR-016: SD-003 professional challenge boundary; concrete situation/approach/outcome bridges providers, projects and progression.
- ADR-017: SD-004 learning/access boundary; source affordances, practice, feedback and access routes lead to `ExperienceEpisode` without XP or schedule ownership.
- ADR-018: SD-005 career boundary; employer-visible signals lead to opportunities, hiring, offer, employment context and transitions without replacing grade/evidence or Company/Project truth.
- ADR-019: SD-006 technology/ecosystem boundary; source-backed chronology and fictional local diffusion create immutable provider context without a tech tree, universal score or ownership drift.

ADR-015 constrains implementation scope of ADR-013/014/016/017/018/019 without отмены their ownership, determinism and compatibility guarantees.

## Proposed

Нет активных proposed ADR.

## Статусы

- `Proposed` — подготовлено к обсуждению.
- `Accepted` — канон.
- `Superseded` — заменено.
- `Rejected` — отклонено.

Изменение статуса сопровождается причиной и синхронизацией спецификаций.

## Research traceability

- [DR-001 — аудит стека и архитектуры](../research/DR-001-STACK-ARCHITECTURE-AUDIT-2026-07-16.md)
- [DR-002 — многоязычное исследование](../research/DR-002-MULTILINGUAL-GAMEDEV-STACK-RESEARCH-2026-07-16.md)
- [Technical synthesis](../research/DR-SYNTHESIS-2026-07-16.md)
- [DR-003 — Programmer-First synthesis](../research/DR-003-PROGRAMMER-FIRST-DESIGN-SYNTHESIS-2026-07-17.md)
- [SD-001 — Programmer Progression & Evidence Engine](../research/SD-001-PROGRAMMER-PROGRESSION-EVIDENCE-ENGINE-2026-07-17.md)
- [SD-002 — Project & Work Package Engine](../research/SD-002-PROJECT-WORK-PACKAGE-ENGINE-2026-07-17.md)
- [DC-001 — Casual-first complexity correction](../research/DC-001-CASUAL-FIRST-COMPLEXITY-CORRECTION-2026-07-17.md)
- [SD-003 — Professional Challenge & Capability Engine](../research/SD-003-PROFESSIONAL-CHALLENGE-CAPABILITY-ENGINE-2026-07-17.md)
- [SD-004 — Programmer Learning, Practice, Mentorship & Access](../research/SD-004-PROGRAMMER-LEARNING-PRACTICE-MENTORSHIP-ACCESS-ENGINE-2026-07-18.md)
- [SD-005 — Programmer Career, Hiring & Labor Market](../research/SD-005-PROGRAMMER-CAREER-HIRING-LABOR-MARKET-ENGINE-2026-07-18.md)
- [SD-006 — Historical Technology, Tooling & Ecosystem Engine](../research/SD-006-HISTORICAL-TECHNOLOGY-TOOLING-ECOSYSTEM-ENGINE-2026-07-18.md)