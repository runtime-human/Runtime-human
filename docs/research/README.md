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
2. [SD-005 — Programmer Career, Hiring & Labor Market Engine](SD-005-PROGRAMMER-CAREER-HIRING-LABOR-MARKET-ENGINE-2026-07-18.md)
3. [SD-006 — Historical Technology, Tooling & Ecosystem Engine](SD-006-HISTORICAL-TECHNOLOGY-TOOLING-ECOSYSTEM-ENGINE-2026-07-18.md)
4. [SD-007 — Professional Situation & Content Architecture](SD-007-PROFESSIONAL-SITUATION-CONTENT-ARCHITECTURE-2026-07-18.md)

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

### SD-005 → ADR-018

- Career sees market-visible signals, not hidden professional truth;
- Grade, readiness, role fit, position/title and workplace trust remain distinct;
- search routine aggregates around one Career Intent and 1–3 meaningful opportunities;
- requirements separate hard access, capability, familiarity, signals, trainable gaps and preferences;
- hiring uses portfolio/situational/work-sample stages and shared Challenge/Learning engines;
- offers compare professional and life trade-offs under partial uncertainty;
- employment is an automatic commitment and provides project/challenge/learning contexts;
- no single performance score; workplace trust controls allowed scope;
- promotion is organizational and does not award Professional Grade;
- layoff/closure do not erase grade/history;
- labor market is compact and provenance-backed by era/region/industry/role family.

### SD-006 → ADR-019

- global technology chronology, fictional local diffusion and practical access remain distinct;
- technology identity, family, version band, platform/toolchain, ecosystem, familiarity, demand and support remain distinct;
- lifecycle uses independent release/adoption/support/ecosystem/local/installed-base axes;
- no universal technology/popularity/ecosystem score or latest-tech upgrade path;
- version bands represent gameplay-relevant compatibility/support/tooling shifts rather than semver;
- ecosystem is a set of affordances and risks, not a fixed multiplier;
- Learning, Project and Career consume one immutable technology context but retain outcome ownership;
- adoption evidence preserves source scope and methodology;
- local city diffusion is explicitly fictional and low-access starts retain fallback routes;
- committed project/history snapshots survive catalog changes.

### SD-007 → ADR-020

- professional situation semantics remain authored in reusable kernels;
- context, pressure, provider consequence and presentation are separate typed components;
- composition happens in content build, not runtime;
- compiler materializes only explicit compatible tuples inside hard budgets;
- Event Engine and Narrative Director keep chain/pacing ownership;
- Challenge Engine keeps deterministic outcome ownership;
- presentation-only variants do not count as new semantic variety or evade anti-repeat;
- stable semantic signatures support duplicate detection and repetition control;
- coverage uses critical tuples and selected pairwise interactions, not full Cartesian generation;
- runtime LLM generation/judging remains forbidden; later offline suggestions produce ordinary reviewed data only.

Normative specs:

- `docs/game-design/CASUAL-SIMULATION-DESIGN.md`;
- `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`;
- `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`;
- `docs/game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md`;
- `docs/game-design/PROGRAMMER-LEARNING-ENGINE.md`;
- `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`;
- `docs/game-design/PROGRAMMER-CAREER-ENGINE.md`;
- `docs/game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md`;
- `docs/ui/PROFESSIONAL-CHALLENGE-UI.md`;
- `docs/ui/PROFESSIONAL-SITUATION-CONTENT-UI.md`;
- `docs/ui/PROGRAMMER-LEARNING-UI.md`;
- `docs/ui/PROGRAMMER-CAREER-UI.md`;
- `docs/ui/TECHNOLOGY-ECOSYSTEM-UI.md`;
- `docs/content/PROFESSIONAL-SITUATION-CONTENT.md`;
- `docs/content/PROGRAMMER-LEARNING-CONTENT.md`;
- `docs/content/PROGRAMMER-CAREER-CONTENT.md`;
- `docs/content/HISTORICAL-LABOR-MARKET-CATALOG.md`;
- `docs/content/HISTORICAL-TECHNOLOGY-CATALOG.md`;
- `docs/content/TECHNOLOGY-ECOSYSTEM-CONTENT.md`;
- `docs/simulation/PROFESSIONAL-SITUATION-CONTENT-BALANCE.md`;
- `docs/simulation/PROGRAMMER-LEARNING-BALANCE.md`;
- `docs/simulation/PROGRAMMER-CAREER-BALANCE.md`;
- `docs/simulation/TECHNOLOGY-ECOSYSTEM-BALANCE.md`.

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
