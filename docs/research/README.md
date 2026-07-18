# Deep Research и System Design — индекс

Каталог хранит нормализованные исследования, системные анализы и design corrections Runtime Human.

Research/system-design становится каноном только после accepted ADR и synchronization профильных спецификаций.

## 2026-07-16

1. [DR-001 — Аудит стека и архитектуры](DR-001-STACK-ARCHITECTURE-AUDIT-2026-07-16.md)
2. [DR-002 — Многоязычное исследование gamedev/desktop-практик](DR-002-MULTILINGUAL-GAMEDEV-STACK-RESEARCH-2026-07-16.md)
3. [Синтез технических исследований](DR-SYNTHESIS-2026-07-16.md)

## 2026-07-17

1. [DR-003 — Programmer-First synthesis](DR-003-PROGRAMMER-FIRST-DESIGN-SYNTHESIS-2026-07-17.md)
2. [SD-001 — Programmer Progression & Evidence Engine](SD-001-PROGRAMMER-PROGRESSION-EVIDENCE-ENGINE-2026-07-17.md)
3. [SD-002 — Project & Technical Work Package Engine](SD-002-PROJECT-WORK-PACKAGE-ENGINE-2026-07-17.md)
4. [DC-001 — Casual-first complexity correction](DC-001-CASUAL-FIRST-COMPLEXITY-CORRECTION-2026-07-17.md)
5. [SD-003 — Professional Challenge & Capability Engine](SD-003-PROFESSIONAL-CHALLENGE-CAPABILITY-ENGINE-2026-07-17.md)

## 2026-07-18

1. [SD-004 — Programmer Learning, Practice, Mentorship & Access Engine](SD-004-PROGRAMMER-LEARNING-PRACTICE-MENTORSHIP-ACCESS-ENGINE-2026-07-18.md)

## Нормативные результаты

### DR-003

- programmer-first hierarchy;
- life/narrative as context and consequences.

### SD-001 → ADR-013

- Experience Providers → `ExperienceEpisode`;
- mastery/fluency/familiarity semantics;
- traceable professional outcomes;
- awarded grade vs readiness;
- deterministic MonthRun/persistence.

### SD-002 → ADR-014

- Project Engine owns technical truth;
- aggregated Work Packages, not tickets;
- uncertainty, quality, debt/risk and release boundaries;
- project outcome + progression atomic commit.

### DC-001 → ADR-015

- Runtime Human is casual-first;
- architectural possibility is not mandatory implementation;
- MVP Casual / Recommended / Extended profiles;
- normal UI uses bounded human-readable concepts;
- evidence, debt, defects, contribution and release detail are staged;
- expanded simulation requires playtest evidence.

### SD-003 → ADR-016

- concrete `TechnicalSituation`, not generic skill buttons;
- 2–4 player approaches with contextual trade-offs;
- deterministic challenge outcome and reason codes;
- Provider owns domain application;
- Progression owns capability/evidence/grade;
- six reusable challenge archetypes;
- no hidden correct-combination table, IDE or LLM judge;
- challenge breadth expands only after playtest evidence.

### SD-004 → ADR-017

- learning source differs by affordances, access and context rather than XP multiplier;
- access is a projection from equipment/era/NPC/economy owners;
- learning, practice, transfer and professional evidence remain distinct;
- worked examples, self-explanation, retrieval, practice and feedback are approaches/factors, not separate score systems;
- mentorship uses explicit assistance levels and cannot mint autonomy/grade;
- low-access starts require alternative routes and recovery;
- practical technical problems delegate to Professional Challenge Engine;
- AI assistance separates explanation/verification from full delegation;
- no daily schedule, knowledge XP or course marketplace in baseline.

Normative specs:

- `docs/game-design/CASUAL-SIMULATION-DESIGN.md`;
- `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`;
- `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`;
- `docs/game-design/PROGRAMMER-LEARNING-ENGINE.md`;
- `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`;
- `docs/ui/PROFESSIONAL-CHALLENGE-UI.md`;
- `docs/ui/PROGRAMMER-LEARNING-UI.md`;
- `docs/content/PROGRAMMER-LEARNING-CONTENT.md`;
- `docs/simulation/PROGRAMMER-LEARNING-BALANCE.md`.

## Правила

- official documentation and primary research have priority;
- secondary sources support failure modes/practical confirmation;
- raw research is normalized;
- fact, interpretation and project applicability separated;
- architecture changes require ADR;
- implementation complexity requires current gameplay justification;
- extension seams do not create automatic roadmap items;
- formulas/thresholds remain versioned hypotheses until playtest;
- integration requires canon/contracts/tests/plans/traceability synchronization.