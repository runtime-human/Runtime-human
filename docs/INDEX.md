---
title: "Runtime Human — индекс документации"
type: index
status: draft
canon: true
depends_on: [ADR-013, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020]
updated: 2026-07-29
---

# Runtime Human — индекс документации

## Источник истины

1. Accepted ADR.
2. Специализированная спецификация.
3. Master/Full Architecture.
4. Current execution ledger, implementation plan и merged PR.
5. Research/system-design reports.

Research не становится каноном без ADR/spec synchronization. Generated [CATALOG.md](CATALOG.md) и [MANIFEST.jsonc](MANIFEST.jsonc) перечисляют документы, но не заменяют этот curated source-of-truth index.

## Текущее исполнение

- [EXECUTION-STATUS.jsonc](EXECUTION-STATUS.jsonc) — главный текущий execution ledger: завершённые milestones, активная фаза, verification gate и следующий constraint.
- [RUST-01B production logging](plans/RUST-01B-PRODUCTION-LOGGING-IMPLEMENTATION-PLAN.md) / [issue #57](https://github.com/MrFr3di/Runtime-human/issues/57) — текущий ограниченный Rust delivery slice: bounded JSONL sink, redaction, rotation, dropped-line status и lifecycle flush.
- [PERF-02A startup/IPC/queue timeline](https://github.com/MrFr3di/Runtime-human/issues/51) — Rust startup recorder, read-only snapshot, persistence queue/SQLite spans и Tauri command linkage завершены; renderer/FMP и Windows evidence остаются.
- [RUST-01C FIFO shutdown](https://github.com/MrFr3di/Runtime-human/issues/58) — отдельный следующий Rust-кандидат, который не смешивается с измерительным baseline до PERF-02A evidence.
- [UI roadmap](https://github.com/MrFr3di/Runtime-human/issues/37) — UI-02 завершён; Skills, Relationships, Chronology и visual quality остаются отдельными последующими срезами.
- [PERF master track](https://github.com/MrFr3di/Runtime-human/issues/24) → [product-facing baseline](https://github.com/MrFr3di/Runtime-human/issues/39) → PERF-02A → one measured optimization.

Следующий порядок работ:

```text
RUST-01B redacted production logging
→ PERF-02A renderer / React commit / January ready / first meaningful paint
→ opt-in cold/warm Windows evidence collector
→ exactly one evidence-backed optimization
→ PERF-02B idle resources and 100-cycle stabilization
→ NPC foundation and UI-03 projections
```

## Performance evidence

- [Performance budgets](performance/PERFORMANCE-BUDGETS.md) — scope taxonomy и warning-only targets.
- [Profiling runbook](performance/PROFILING-RUNBOOK.md) — воспроизводимые Windows application/SQLite runs и interpretation policy.
- [OPT-00 application evidence](performance/OPT-00-EVIDENCE.json) — in-memory January baseline.
- [OPT-00B SQLite evidence](performance/OPT-00B-EVIDENCE.json) — file-backed single-worker SQLite baseline.
- [OPT-00C User Timing evidence](performance/OPT-00C-EVIDENCE.json) — browser content/session/month observability.

## Ключевой продуктовый канон

- [ADR-015 — Casual-first abstraction и бюджет сложности](adr/ADR-015-casual-first-abstraction-and-complexity-budget.md)
- [Casual Simulation Design](game-design/CASUAL-SIMULATION-DESIGN.md)
- [Gameplay Canon](game-design/GAMEPLAY-CANON.md)
- [Programmer-First Design](game-design/PROGRAMMER-FIRST-DESIGN.md)
- [DC-001 — Casual-first correction](research/DC-001-CASUAL-FIRST-COMPLEXITY-CORRECTION-2026-07-17.md)

Приоритет реализации:

```text
MVP Casual → playtest → Recommended → proven Extended features
```

## Professional progression

- [ADR-013 — Professional Progression & Evidence](adr/ADR-013-authoritative-professional-progression-evidence.md)
- [Professional Progression Engine](game-design/PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Professional Progression UI](ui/PROFESSIONAL-PROGRESSION-UI.md)
- [SD-001 analysis](research/SD-001-PROGRAMMER-PROGRESSION-EVIDENCE-ENGINE-2026-07-17.md)

## Professional challenges

- [ADR-016 — Professional Challenge Model](adr/ADR-016-authoritative-professional-challenge-model.md)
- [Professional Challenge Engine](game-design/PROFESSIONAL-CHALLENGE-ENGINE.md)
- [Professional Challenge UI](ui/PROFESSIONAL-CHALLENGE-UI.md)
- [Professional Challenge Balance](simulation/PROFESSIONAL-CHALLENGE-BALANCE.md)
- [Professional Challenge Implementation Plan](plans/PROFESSIONAL-CHALLENGE-IMPLEMENTATION-PLAN.md)
- [SD-003 analysis](research/SD-003-PROFESSIONAL-CHALLENGE-CAPABILITY-ENGINE-2026-07-17.md)

## Professional situation content architecture

- [ADR-020 — Professional Situation Content Composition](adr/ADR-020-authoritative-professional-situation-content-composition-model.md)
- [Professional Situation Content Engine](game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md)
- [Professional Situation Content](content/PROFESSIONAL-SITUATION-CONTENT.md)
- [Content Studio UI](ui/PROFESSIONAL-SITUATION-CONTENT-UI.md)
- [Balance, Coverage & Variety](simulation/PROFESSIONAL-SITUATION-CONTENT-BALANCE.md)
- [Persistence & Compatibility](persistence/PROFESSIONAL-SITUATION-CONTENT-COMPATIBILITY.md)
- [Implementation Plan](plans/PROFESSIONAL-SITUATION-CONTENT-IMPLEMENTATION-PLAN.md)
- [SD-007 analysis](research/SD-007-PROFESSIONAL-SITUATION-CONTENT-ARCHITECTURE-2026-07-18.md)

## Programmer learning and access

- [ADR-017 — Programmer Learning & Access Model](adr/ADR-017-authoritative-programmer-learning-access-model.md)
- [Programmer Learning Engine](game-design/PROGRAMMER-LEARNING-ENGINE.md)
- [Programmer Learning UI](ui/PROGRAMMER-LEARNING-UI.md)
- [Programmer Learning Balance](simulation/PROGRAMMER-LEARNING-BALANCE.md)
- [Programmer Learning Content](content/PROGRAMMER-LEARNING-CONTENT.md)
- [Programmer Learning Implementation Plan](superpowers/plans/2026-07-18-programmer-learning-engine.md)
- [SD-004 analysis](research/SD-004-PROGRAMMER-LEARNING-PRACTICE-MENTORSHIP-ACCESS-ENGINE-2026-07-18.md)

## Programmer career, hiring and employment

- [ADR-018 — Programmer Career, Hiring & Employment Model](adr/ADR-018-authoritative-programmer-career-employment-model.md)
- [Programmer Career Engine](game-design/PROGRAMMER-CAREER-ENGINE.md)
- [Career overview](game-design/CAREER-SYSTEM.md)
- [Programmer Career UI](ui/PROGRAMMER-CAREER-UI.md)
- [Programmer Career Balance](simulation/PROGRAMMER-CAREER-BALANCE.md)
- [Programmer Career Content](content/PROGRAMMER-CAREER-CONTENT.md)
- [Historical Labor Market Catalog](content/HISTORICAL-LABOR-MARKET-CATALOG.md)
- [Programmer Career Implementation Plan](plans/PROGRAMMER-CAREER-IMPLEMENTATION-PLAN.md)
- [SD-005 analysis](research/SD-005-PROGRAMMER-CAREER-HIRING-LABOR-MARKET-ENGINE-2026-07-18.md)

## Historical technology, tooling and ecosystems

- [ADR-019 — Historical Technology & Ecosystem Model](adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [Technology Ecosystem Engine](game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Skills & Technologies](game-design/SKILLS-AND-TECHNOLOGIES.md)
- [Technology Ecosystem UI](ui/TECHNOLOGY-ECOSYSTEM-UI.md)
- [Technology Ecosystem Balance](simulation/TECHNOLOGY-ECOSYSTEM-BALANCE.md)
- [Technology Ecosystem Content](content/TECHNOLOGY-ECOSYSTEM-CONTENT.md)
- [Historical Technology Catalog](content/HISTORICAL-TECHNOLOGY-CATALOG.md)
- [Technology Context Compatibility](persistence/TECHNOLOGY-CONTEXT-COMPATIBILITY.md)
- [Technology Ecosystem Implementation Plan](plans/TECHNOLOGY-ECOSYSTEM-IMPLEMENTATION-PLAN.md)
- [SD-006 analysis](research/SD-006-HISTORICAL-TECHNOLOGY-TOOLING-ECOSYSTEM-ENGINE-2026-07-18.md)

## Projects

- [ADR-014 — Project & Work Package Model](adr/ADR-014-authoritative-project-work-package-model.md)
- [Project & Work Package Engine](game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [Project & Work Package UI](ui/PROJECT-WORK-PACKAGE-UI.md)
- [SD-002 analysis](research/SD-002-PROJECT-WORK-PACKAGE-ENGINE-2026-07-17.md)

## Исследования

- [Research/System Design Index](research/README.md)
- [DR-001](research/DR-001-STACK-ARCHITECTURE-AUDIT-2026-07-16.md)
- [DR-002](research/DR-002-MULTILINGUAL-GAMEDEV-STACK-RESEARCH-2026-07-16.md)
- [Technical synthesis](research/DR-SYNTHESIS-2026-07-16.md)
- [DR-003 Programmer-First](research/DR-003-PROGRAMMER-FIRST-DESIGN-SYNTHESIS-2026-07-17.md)

## Архитектура

- [Master Architecture](architecture/MASTER-ARCHITECTURE.md)
- [Full Architecture](architecture/FULL-ARCHITECTURE-PLAN.md)
- [System Context](architecture/SYSTEM-CONTEXT.md)
- [Module Boundaries](architecture/MODULE-BOUNDARIES.md)
- [Domain Model](architecture/DOMAIN-MODEL.md)
- [Repository Structure](architecture/REPOSITORY-STRUCTURE.md)
- [Dependency Rules](architecture/DEPENDENCY-RULES.md)
- [Data Flow](architecture/DATA-FLOW.md)

## Игровой дизайн

- [Character Progression](game-design/CHARACTER-PROGRESSION.md)
- [Skills & Technologies](game-design/SKILLS-AND-TECHNOLOGIES.md)
- [Technology Ecosystem Engine](game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Professional Situation Content Engine](game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md)
- [Monthly Loop](game-design/MONTHLY-GAME-LOOP.md)
- [Career](game-design/CAREER-SYSTEM.md)
- [Projects & Products Overview](game-design/PROJECTS-AND-PRODUCTS.md)
- [Open Source](game-design/OPEN-SOURCE-SYSTEM.md)
- [Company](game-design/COMPANY-SYSTEM.md)
- [Relationships & Health](game-design/RELATIONSHIPS-AND-HEALTH.md)
- [Life Cycle & Legacy](game-design/LIFE-CYCLE-AND-LEGACY.md)
- [City & Era](game-design/CITY-AND-ERA-EVOLUTION.md)

## Симуляция и события

- [Month Simulation](simulation/MONTH-SIMULATION.md)
- [Suspended MonthRun](simulation/SUSPENDED-MONTH-RUN.md)
- [Calendar](simulation/CALENDAR.md)
- [Determinism](simulation/DETERMINISM.md)
- [Numeric Policy](simulation/NUMERIC-POLICY.md)
- [Randomness](simulation/RANDOMNESS.md)
- [Balance Simulation](simulation/BALANCE-SIMULATION.md)
- [Professional Challenge Balance](simulation/PROFESSIONAL-CHALLENGE-BALANCE.md)
- [Professional Situation Content Balance](simulation/PROFESSIONAL-SITUATION-CONTENT-BALANCE.md)
- [Programmer Learning Balance](simulation/PROGRAMMER-LEARNING-BALANCE.md)
- [Programmer Career Balance](simulation/PROGRAMMER-CAREER-BALANCE.md)
- [Technology Ecosystem Balance](simulation/TECHNOLOGY-ECOSYSTEM-BALANCE.md)
- [Event Engine](events/EVENT-ENGINE.md)
- [Narrative Director](events/NARRATIVE-DIRECTOR.md)
