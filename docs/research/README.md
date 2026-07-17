# Deep Research и System Design — индекс

Этот каталог хранит нормализованные исследования и системные анализы Runtime Human.

Исследование не является источником истины само по себе. Его выводы становятся каноном после отражения в accepted ADR и профильных спецификациях.

## 2026-07-16

1. [DR-001 — Аудит стека и архитектуры](DR-001-STACK-ARCHITECTURE-AUDIT-2026-07-16.md)
2. [DR-002 — Многоязычное исследование gamedev/desktop-практик](DR-002-MULTILINGUAL-GAMEDEV-STACK-RESEARCH-2026-07-16.md)
3. [Синтез технических исследований](DR-SYNTHESIS-2026-07-16.md)

## 2026-07-17

1. [DR-003 — Programmer-First synthesis](DR-003-PROGRAMMER-FIRST-DESIGN-SYNTHESIS-2026-07-17.md)
2. [SD-001 — Programmer Progression & Evidence Engine](SD-001-PROGRAMMER-PROGRESSION-EVIDENCE-ENGINE-2026-07-17.md)

DR-003 закрепил programmer-first product hierarchy.

SD-001 спроектировал authoritative progression/evidence architecture:

- Experience Providers → `ExperienceEpisode`;
- mastery/fluency/familiarity;
- claims-based append-only evidence;
- awarded grade milestone;
- demonstrated/current-market readiness projections;
- deterministic MonthRun/persistence integration.

Нормативные результаты SD-001:

- `docs/adr/ADR-013-authoritative-professional-progression-evidence.md`;
- `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`;
- синхронизированные domain, MonthRun, persistence, content, project, NPC, balance, UI и plan documents.

## Правила

- официальная документация имеет приоритет над блогами/форумами;
- secondary sources используются для failure modes и practical confirmation;
- versions и current facts перепроверяются перед реализацией;
- raw research нормализуется: citations, дубли и неподтверждённые формулировки очищаются;
- fact, interpretation и applicability разделяются;
- архитектурное решение требует ADR;
- результат считается внедрённым только после synchronization канона, contracts, migrations, tests, plans и traceability;
- formulas/thresholds, требующие playtest, остаются versioned hypotheses, а не неизменным каноном.
