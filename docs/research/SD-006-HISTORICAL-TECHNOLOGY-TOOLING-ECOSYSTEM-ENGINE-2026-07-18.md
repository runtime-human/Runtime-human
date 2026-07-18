---
title: "SD-006 — Historical Technology, Tooling & Ecosystem Engine"
type: research
status: draft
canon: false
depends_on: [ADR-019]
updated: 2026-07-18
---

# SD-006 — Historical Technology, Tooling & Ecosystem Engine

- **Дата:** 2026-07-18
- **Статус:** normalized research; решения интегрированы через ADR-019
- **Scope:** technology identity/family/version bands, historical chronology, platform/toolchain, ecosystem affordances, local diffusion, provider context and compatibility
- **Implementation profile:** MVP Casual first; Recommended/Extended only after playtest evidence

## Executive verdict

Runtime Human не нужен полный каталог компьютерной истории и не нужен линейный tech tree.

Нужен engine, который отвечает на вопрос:

> Что эта технология, её окружение и доступность означают для конкретного учебного, проектного или карьерного решения персонажа в этом месяце и в этой эпохе?

Собственная формула:

```text
source-backed global technology history
→ fictional local diffusion
→ practical access
→ multi-axis technology/ecosystem context
→ provider choice and consequence
→ professional history
```

## Problem statement

Проект уже содержит technology families, familiarity, version bands, transfer and historical availability, но остаются пробелы:

- lifecycle описан слишком линейно;
- не определён authoritative owner technology context;
- ecosystem maturity может превратиться в один multiplier;
- adoption, support, local availability и market demand могут смешаться;
- version bands не имеют полного compatibility/source contract;
- Learning, Project и Career могут создавать разные несовместимые technology projections;
- historical catalog может вырасти в энциклопедию;
- latest technology может стать dominant strategy;
- local 1990 context пока не имеет bounded playable model.

## Research questions

1. Как отделить technology identity от skill и project truth?
2. Как моделировать lifecycle без одной линейной стадии?
3. Как представить ecosystem health/maturity без universal score?
4. Какие source classes подтверждают release, support, adoption и recommendation?
5. Когда version difference заслуживает gameplay band?
6. Как сохранить local fictional city при реальной chronology?
7. Как встроить context в Learning, Project и Career?
8. Как сделать 1990 playable без hardware/IDE/package inventory?
9. Как сохранить old projects/saves при catalog updates?
10. Как моделировать AI-era tools без automatic productivity/evidence multiplier?

## Existing canon synthesis

### Professional truth

Progression owns mastery, fluency, familiarity, evidence and grade. Availability or popularity cannot mutate professional state.

### Provider truth

Learning owns learning outcome, Project owns technical project outcome, Career owns opportunity/employment outcome. Technology context must not become a god-module.

### Historical/local split

Global release and source-backed chronology are not the same as fictional city availability or character access.

### Casual-first constraint

Normal UI should expose only current relevant concepts. Architecture seams do not justify a full technology graph in MVP.

## Historical anchors

### Early PC/BASIC context

Microsoft’s official history records the 1981 IBM PC launch with MS-DOS 1.0 and Microsoft language products including BASIC, COBOL and Pascal. Its 1986 history records QuickBASIC 2.0 and GW-BASIC 3.2. These facts support a BASIC-family personal-computer context being globally plausible before the January 1990 start, but they do not prove fictional local availability.

Sources:

- https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1981
- https://learn.microsoft.com/en-us/shows/history/history-of-microsoft-1986

### Python

Official Python history records Python 0.9.0 in 1991 and subsequent early releases. Python must not be available at the January 1990 start.

Source:

- https://docs.python.org/3/license.html#history-and-license

### JavaScript/ECMAScript

Ecma International records the first ECMA-262 edition in June 1997. Implementation history and standard publication must remain distinct milestones.

Sources:

- https://ecma-international.org/publications-and-standards/standards/ecma-262/
- https://ecma-international.org/ecma-262/1.0/

### Git

Official Git history places its creation in 2005 after the Linux kernel community’s BitKeeper transition. Tool chronology must be validated against era.

Source:

- https://git-scm.com/book/en/v2/Getting-Started-A-Short-History-of-Git

### Docker and Kubernetes

Official Docker history places its public introduction/demo in 2013. Official Kubernetes history places the first commit/public release in 2014 and version 1.0 in 2015.

Sources:

- https://www.docker.com/blog/docker-celebrates-10-years/
- https://www.docker.com/company/
- https://kubernetes.io/blog/2024/06/06/10-years-of-kubernetes/
- https://kubernetes.io/blog/2015/07/15/kubernetes-v1-0-release/

Research implication:

> First release, production maturity, ecosystem breadth, demand and support are separate facts.

## Support lifecycle research

Official .NET support policy distinguishes LTS/STS releases and explicit support dates. Python and Kubernetes likewise publish maintained release lines/support windows.

Sources:

- https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- https://devguide.python.org/versions/
- https://kubernetes.io/releases/

Research implication:

- support status must be version-band specific;
- support is not adoption;
- unsupported technology can retain installed-base demand;
- actively supported technology can remain niche.

## Adoption and ecosystem evidence

### GitHub Octoverse

GitHub’s report measures activity on GitHub. It is useful for repository-platform trends but not a universal language ranking.

Source:

- https://github.blog/news-insights/octoverse/octoverse-2025/

### Stack Overflow Developer Survey

The survey distinguishes use, desired and admired measures and is limited by respondent population/methodology.

Source:

- https://survey.stackoverflow.co/2025/technology/

### JetBrains Developer Ecosystem

Large survey evidence is useful as an independent source class but remains bounded by methodology and audience.

Source:

- https://www.jetbrains.com/lp/devecosystem-2025/

### Thoughtworks Technology Radar

The radar is an opinionated recommendation artifact based on observed project/client experience. `Adopt`, `Trial`, `Assess` and `Hold` are not popularity stages.

Source:

- https://www.thoughtworks.com/radar

Research implication:

```text
repository activity ≠ professional usage
developer usage ≠ desire
expert recommendation ≠ adoption
job demand ≠ technical suitability
package count ≠ ecosystem health
```

No source class can populate every dimension.

## Ecosystem-health research

Software ecosystem health research treats health as multi-dimensional and problem-specific. Technical, community and business perspectives differ. Package ecosystem studies also show that dependency/maintainer concentration, update lag and abandonment can create risk even in large ecosystems.

Project implication:

- no one ecosystem health score;
- component breadth and maintenance risk are separate;
- large ecosystem can improve delivery and increase dependency burden;
- current decision should select only relevant dimensions;
- full community/business simulation remains outside baseline Technology Engine.

## Analog games

### Game Dev Tycoon

Useful patterns:

- historical technology waves;
- research unlocks future options;
- projects reveal knowledge;
- new platforms/technologies change opportunities.

Reject:

- hidden optimal combinations;
- linear research upgrades;
- success score as universal validation.

### Software Inc.

Useful patterns:

- technology/project context matters;
- employees differ by specialization;
- frameworks/tools and market evolve;
- legacy and iteration can matter.

Reject:

- full company/employee/office management;
- research department as primary technology acquisition;
- broad management simulation in character career.

### Computer Tycoon

Useful only as evidence that computer history can support strategy and technological waves.

Reject:

- grand-strategy hardware market;
- detailed product specification and global competition.

### while True: learn()

Useful for the fantasy of discovering and applying technical ideas.

Reject:

- puzzle programming as the baseline mechanic;
- specialized ML content as general programmer development.

## Design synthesis

### Technology is not a skill

Technology familiarity is context-specific. Transferable skills remain Programming, Debugging, Testing, Architecture and related capabilities.

### Technology is not one product name

A meaningful playable context combines:

- identity/family;
- version band;
- platform/runtime;
- toolchain;
- ecosystem affordances;
- support;
- local/practical access;
- project/career relevance.

### Ecosystem is not a multiplier

Context may provide examples, debugging tools, testing, components, deployment support and feedback. The same context may add fragmentation, dependency risk, setup or maintenance burden.

### Lifecycle is multi-axis

Recommended axes:

1. release maturity;
2. adoption/demand;
3. support/maintenance;
4. ecosystem capability;
5. local diffusion;
6. installed-base/legacy value.

A single stage cannot express real combinations.

### Version bands are gameplay boundaries

Create a band only when a character faces a meaningful compatibility, support, tooling, deployment, learning or market decision. Do not model every release.

### Local city remains fictional

Real chronology constrains fictional diffusion. It does not dictate exact local percentages, institutions or access.

### Context is immutable per attempt

Provider receives a snapshot. Close/restart cannot alter availability, support warning, option set or hidden context.

## Proposed ownership

### Historical Technology Catalog

- source-backed global chronology;
- major bands;
- prerequisites;
- support/compatibility;
- scoped ecosystem evidence.

### City/Era

- fictional local diffusion;
- channels/institutions/cost/rarity;
- era-valid local project/career contexts.

### Equipment/School/NPC/Economy/Employment

- practical access.

### Technology Context Engine

- pure projection and validation;
- snapshot/fingerprint/reason codes;
- provider-compatible affordances and constraints.

### Learning/Project/Career

- their own situations and outcomes.

### Progression

- familiarity, transfer, evidence and grade.

## Primary contracts

```text
HistoricalTechnologyRecord
TechnologyVersionBandDefinition
PlatformProfileDefinition
ToolchainProfileDefinition
EcosystemProfileDefinition
CompatibilityProfileDefinition
LocalTechnologyAvailabilityDefinition
PracticalTechnologyAccess
TechnologyContextSnapshot
```

## Technology-choice taxonomy

- stay with familiar stable context;
- choose mainstream ecosystem;
- experiment with emerging technology;
- preserve legacy compatibility;
- migrate version/technology;
- improve tooling/verification;
- reduce scope for platform compatibility;
- defer until access exists.

These are contextual approaches, not globally correct answers.

## 1990 first slice

### Required

- one BASIC-like family/technology;
- one PC/DOS-like platform profile;
- one aggregate toolchain;
- one printed manual/source route;
- home access fixture;
- school/shared fallback;
- one project compatibility constraint;
- one technology-informed choice;
- one committed snapshot.

### Not required

- all 1990 languages;
- exact computer models;
- memory/storage simulation;
- separate IDE products;
- package/library catalog;
- professional market statistics;
- version-by-version BASIC history.

### Expected player experience

```text
Эта среда доступна мне сейчас.
Я понимаю, что она помогает быстро начать.
Я вижу, чего ей не хватает.
Я могу продолжить, улучшить проверку или попробовать новый context позже.
```

## Later-era use

### 1990s–2000s

- local networks/web;
- new language/runtime families;
- version control and open-source distribution;
- formalized toolchains;
- migration from isolated desktop contexts.

### 2010s

- cloud/container/tooling ecosystems;
- strong open-source components;
- DevOps/testing/delivery affordances;
- faster ecosystem shifts.

### 2020s

- remote/cloud/local model contexts;
- AI explanation/generation/review/agents;
- lower search cost;
- higher verification/provenance/integration concerns.

These are future content budgets, not mandatory early implementation.

## AI tools synthesis

AI modes must be distinct:

- explanation;
- completion;
- generation;
- diagnosis;
- review/verification;
- agentic execution.

Technology context determines access/integration/verification burden. Learning/Challenge/Project determine whether the player understood, verified and delivered. No `AI productivity +30%` baseline.

## Failure modes

1. Every technology gets a bar.
2. Newest technology dominates.
3. Mainstream ecosystem dominates all contexts.
4. Legacy becomes a dead end.
5. One survey becomes universal popularity truth.
6. Support and demand are merged.
7. Local availability equals global release.
8. Version bands mirror semver.
9. Technology Engine calculates project outcomes.
10. Catalog update rewrites old projects.
11. Rich start is the only viable access path.
12. AI use grants competence automatically.
13. Normal UI becomes a graph/dashboard.

## Verification strategy

### Schema/chronology

- stable IDs;
- source precision;
- prerequisite ordering;
- version-band ordering;
- support lifecycle;
- future boundary.

### Context

- global/local/practical separation;
- multi-axis combinations;
- salience 3–5 traits;
- deterministic snapshot;
- provider ownership.

### Balance

- latest/mainstream/legacy dominance;
- access equity;
- migration/transfer farming;
- ecosystem-size assumption;
- low-access recovery.

### Compatibility

- committed history immutable;
- active fingerprint mismatch recovery;
- tombstones;
- controlled migration;
- no reroll/duplicate.

### Playtest

- player names advantage and constraint;
- player distinguishes technology from skill;
- player understands access versus familiarity;
- player sees why old/new choices can both be reasonable;
- player does not need Details.

## MVP recommendation

Implement technology context only after/with contracts needed by Phase 0–2. The first implementation should remain:

- one family;
- one Tier A technology;
- one band/platform/toolchain/ecosystem profile;
- one access fallback;
- one project/learning decision;
- no separate full technology screen.

## Decision

Adopt ADR-019 and create specialized engine/UI/balance/content/catalog specifications. Synchronize existing Skills & Technologies, Historical Catalog, Content Architecture, City/Era, provider boundaries, persistence and roadmap. Keep broad historical catalog, company/open-source ecosystem simulation and AI-era content deferred until their phases.