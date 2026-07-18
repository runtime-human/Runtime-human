# Архитектура контента

Нормативные решения:

- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md)
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)

Связанные спецификации:

- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md)
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)
- [Technology Ecosystem Content](TECHNOLOGY-ECOSYSTEM-CONTENT.md)

## 1. Goal

Content is immutable data without executable scripts. It creates a small number of understandable situations, choices and outcomes. A schema field or definition type exists only when current gameplay uses it.

## 2. Source format and pipeline

- JSONC definitions;
- localization files;
- asset manifests;
- historical source registry.

```text
JSONC/source registry
→ schema validation
→ semantic/chronology/reference/source-scope validation
→ casual-complexity lint
→ balance/reachability lint
→ immutable registries
→ semantic fingerprints/snapshots
```

## 3. Implementation profiles

### MVP Casual

- 5 professional skills;
- 1 technology family and 1 Tier A technology;
- 1 meaningful technology version band;
- 1 platform/toolchain/ecosystem context;
- 1 home and 1 low-access route;
- learning activities;
- 1 project archetype and 2 packages;
- three base qualities;
- one uncertainty/debt/issue branch;
- 4–6 events;
- minimal equipment/housing/era/localization.

### Recommended

- selected additional skills/technology families;
- sparse transfer graph and meaningful migrations;
- multiple project archetypes;
- career/product/open-source content;
- situational quality/debt/issue records;
- richer local/technology contexts.

### Extended

- broader historical technology catalog;
- multiple platforms/toolchains;
- richer compatibility/migrations;
- incidents/rollback;
- teams/delegation/company portfolios;
- open-source ecosystem health;
- advanced grade/evidence profiles;
- AI-era and alternate-future technology content.

Extended schemas are not required before the feature exists.

## 4. Professional definitions

### SkillDefinition

- stable ID;
- localization;
- UI visibility/relevance;
- practice tags;
- optional capability phrases.

### Technology definitions

Specialized contracts live in `TECHNOLOGY-ECOSYSTEM-CONTENT.md`.

MVP uses:

- `TechnologyFamilyDefinition`;
- `TechnologyDefinition`;
- `TechnologyVersionBandDefinition`;
- `PlatformProfileDefinition`;
- `ToolchainProfileDefinition`;
- `EcosystemProfileDefinition`;
- `CompatibilityProfileDefinition`;
- `LocalTechnologyAvailabilityDefinition`;
- `TechnologyContextTemplate`.

Content does not own practical access, familiarity or provider outcome.

### LearningActivityDefinition

- goal;
- required access;
- relevant skills/technology context;
- challenge band;
- expected outcome classes;
- assistance options;
- recovery/next step.

Core derives professional interpretation from provider outcome tags. Content never mints evidence directly.

## 5. Project definitions

### ProjectArchetypeDefinition

- stable ID and human goal;
- era eligibility;
- allowed technology contexts;
- a few package templates;
- three base qualities;
- simple uncertainty/debt/risk;
- compact outcomes/releases;
- UI copy.

### WorkPackageTemplateDefinition

- stable ID;
- objective/kind;
- challenge/work/uncertainty bands;
- relevant skills and technology constraints;
- compact outcome classes;
- optional meaningful decision hook;
- anti-repeat key.

Not required in MVP:

- component/scope graph;
- participant plan;
- detailed debt/defect ledgers;
- rollout/support policies;
- package dependency graph.

### Quality/outcome

Base qualities: functional, usability, maintainability. Situational dimensions only with a current decision.

Outcomes include completed, assisted, partial, failure-with-recovery, early-with-limitation and delayed as needed.

## 6. Technology content ownership

### Historical Technology Catalog

Owns source-backed global chronology, support and compatibility evidence.

### City/Era/local content

Owns explicitly fictional local diffusion and institutions/channels.

### Runtime owners

Equipment/School/NPC/Economy/Employment own practical access. Technology Context Engine projects immutable context. Learning/Project/Career own outcomes. Progression owns familiarity/evidence.

Content cannot directly:

- buy/install equipment;
- change access owner state;
- change familiarity/mastery/grade;
- change Work Package/project outcome;
- create career offer/hire;
- mutate save.

## 7. Technology content tiers

- Tier A: persistent identity/familiarity and meaningful decisions.
- Tier B: identity with shared family mechanics and limited unique content.
- Tier C: context/tag/requirement without standalone progression.

Libraries/packages/tools default to Tier C. Promotion to Tier A/B needs current gameplay justification.

## 8. Version-band policy

Band exists only for meaningful change in current gameplay:

- paradigm/API;
- compatibility;
- tooling/ecosystem;
- platform/deployment;
- support/maintenance;
- market/project opportunity;
- learning/migration burden.

No semver/patch mirroring or runtime package solver.

## 9. Historical/source metadata

Every historical fact records:

- source refs;
- source class;
- date precision;
- observed period where relevant;
- geography/platform/population/methodology;
- supported claims;
- limitations;
- confidence;
- observed versus inferred fields.

Official sources preferred for release/standard/support/compatibility. Surveys, repository data, labor data and expert radars remain scoped to their claim class.

Broad/mainstream ecosystem/adoption claims require source triangulation or explicit estimate/hypothesis.

## 10. Stable IDs

MVP namespaces include:

```text
core.skill.*
core.tech-family.*
core.technology.*
core.tech-band.*
core.platform.*
core.toolchain.*
core.ecosystem-profile.*
core.compatibility-profile.*
core.local-tech-availability.*
core.tech-context.*
core.activity.*
core.project-archetype.*
core.work-package.*
core.quality.*
core.event.*
source.technology.*
```

IDs never derive from display names and are never reused. Historical records preserve semantic snapshots/tombstones.

## 11. Definition metadata

Every relevant definition includes:

- version;
- author/review status;
- localization;
- era/availability;
- source refs where historical;
- compatibility/fingerprint metadata;
- UI tier/profile;
- migration/tombstone metadata when needed.

Do not require irrelevant metadata for simple fictional content.

## 12. Semantic validation

### Progression/learning

- valid skill/technology IDs;
- unavailable context not directly learnable;
- assisted/partial/failure semantics preserved;
- passive availability creates no familiarity/evidence;
- provider mapping stable;
- normal UI bounded.

### Technology

- category/family/tier valid;
- Tier A has a current consumer;
- prerequisite/platform chronology valid;
- version band justified and ordered;
- support/adoption/ecosystem/local access separate;
- ecosystem dimensions individually sourced or marked inferred;
- local fictional basis explicit;
- practical fallback exists;
- compatibility/migration graph valid;
- no universal score.

### Projects

- clear goal and aggregated meaningful package;
- reachable outcome/recovery;
- no direct professional mutation;
- active profile only;
- base quality valid;
- deterministic uncertainty;
- no duplicate Product/Company/Career/Technology state.

## 13. Casual-complexity lint

Blocks/warns:

- too many visible skills/technology traits;
- technology with no current decision;
- every library/package as progression;
- semver/patch content explosion;
- required tech-tree navigation;
- universal score/winner label;
- exact popularity/benchmark numbers in Normal UI;
- more than 2–5 packages or three base qualities without review;
- package as daily ticket;
- multiple unrelated blocking decisions;
- unimplemented future-system fields;
- source details required for ordinary choice.

## 14. Balance/reachability lint

- all declared outcomes reachable;
- failure/blocked state has recovery;
- low-income/no-home-device has technology route;
- newest/mainstream not universally dominant;
- legacy has value and exit route;
- migration/transfer/easy switching cannot farm progression;
- hidden context/outcome does not reroll;
- one decision has distinguishable trade-offs;
- monthly report can explain result;
- committed history remains readable after content change.

## 15. Runtime registry

MVP runtime receives only active:

- skill/technology/family definitions;
- one band/platform/toolchain/ecosystem/local context;
- learning/project definitions;
- event/era/access data;
- source snapshots and fingerprints needed by active content.

No empty Extended registries or live internet metrics.

## 16. Fingerprints

Separate semantic fingerprints:

- source registry;
- technology identity/bands;
- compatibility/migration;
- ecosystem evidence/profile;
- local availability;
- provider context;
- project/progression content;
- localization-only.

Cosmetic localization does not invalidate active outcome; semantic context change may.

## 17. Modding

Data-only mods may add content supported by current API.

Forbidden:

- executable scripts/raw HTML/network fetch;
- raw state patches;
- direct professional/project/career/access mutations;
- unbounded ticket/version/package content;
- fake historical facts without source/fictional marking;
- post-2026 invented real-product history;
- missing migration/tombstone policy.

## 18. Content Studio

Initial previews:

- technology context card and 3–5 traits;
- access fallback;
- technology choice and disabled reason;
- compatibility/support warning;
- project/package/quality/outcome;
- professional explanation;
- source/confidence details;
- localization/a11y;
- deterministic fixture replay.

Full graph editors are deferred.

## 19. Forbidden drift

- schema completeness before gameplay;
- executable content;
- direct state/evidence effects;
- one quality or technology score;
- every library as progression;
- content IDs from names;
- project/ticket/version explosion;
- dynamic web authority;
- canonical historical claims without provenance;
- global release treated as local/practical access;
- catalog update rewriting committed history.