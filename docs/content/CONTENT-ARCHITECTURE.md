---
title: "Архитектура контента"
type: content
status: draft
canon: true
depends_on: [ADR-013, ADR-014, ADR-015, ADR-019, ADR-020]
updated: 2026-07-18
---

# Архитектура контента

Нормативные решения:

- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md)
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md)
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md)
- [ADR-019 — Historical Technology & Ecosystem](../adr/ADR-019-authoritative-historical-technology-ecosystem-model.md)
- [ADR-020 — Professional Situation Content Composition](../adr/ADR-020-authoritative-professional-situation-content-composition-model.md)

Связанные спецификации:

- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md)
- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md)
- [Professional Situation Content Engine](../game-design/PROFESSIONAL-SITUATION-CONTENT-ENGINE.md)
- [Professional Situation Content](PROFESSIONAL-SITUATION-CONTENT.md)
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [Technology Ecosystem Engine](../game-design/TECHNOLOGY-ECOSYSTEM-ENGINE.md)

## 1. Goal

Content is immutable data without executable scripts. It creates a bounded number of understandable situations, choices and outcomes. A schema field or definition type exists only when current gameplay uses it.

## 2. Source format and pipeline

- JSONC definitions;
- localization files;
- asset manifests;
- historical source registry.

```text
JSONC/source registry
→ schema/reference validation
→ semantic/chronology/source-scope validation
→ bounded professional-situation materialization
→ casual-complexity lint
→ balance/reachability/coverage lint
→ immutable registries
→ semantic fingerprints/snapshots
```

Professional-situation materialization happens only at content build. Runtime never combines kernels, contexts, pressures, bridges or presentation packs.

## 3. Implementation profiles

### MVP Casual

- 5 professional skills;
- 1 technology family and 1 Tier A technology;
- 1 meaningful technology version band;
- 1 platform/toolchain/ecosystem context;
- 1 home and 1 low-access route;
- learning activities;
- 1 project archetype and 2 packages;
- one authored professional-situation kernel represented as one compiled variant;
- three base qualities;
- one uncertainty/debt/issue branch;
- 4–6 events;
- minimal equipment/housing/era/localization.

### First Playable Year / Recommended entry

Only after first-month proof:

- selected additional skills/technology contexts;
- 6–10 professional-situation kernels as a starting hypothesis;
- 12–24 semantic variants across focused composition sets;
- build/diagnose/improve/integrate coverage;
- semantic anti-repeat and duplicate reports;
- sparse transfer graph and meaningful migrations;
- multiple project archetypes;
- career/product/open-source content when their phases require it;
- richer local/technology contexts.

### Extended

- broader historical technology catalog;
- incidents/rollback and systemic situations;
- teams/delegation/company portfolios;
- Open Source and leadership contexts;
- richer Content Studio coverage/sequence analysis;
- offline authoring suggestions under human review;
- AI-era and alternate-future content.

Extended schemas are not required before the feature exists.

## 4. Definition ownership

- Content definitions are immutable data.
- Content compiler validates and materializes definitions.
- Core owns deterministic state transitions.
- Provider owns domain context/application.
- Professional Challenge Engine owns approach outcome.
- Event Engine owns event requirements, participants, chains and declarative effects.
- Narrative Director owns pacing/selection among eligible candidates.
- Progression consumes `ExperienceEpisode` and owns professional interpretation.
- Content cannot directly change mastery, grade, project, career, equipment, money or relationship state.

## 5. Professional definitions

### SkillDefinition

- stable ID;
- localization;
- UI visibility/relevance;
- practice tags;
- optional capability phrases.

### Technology definitions

Specialized contracts live in `TECHNOLOGY-ECOSYSTEM-CONTENT.md`.

MVP uses family, technology, version band, platform, toolchain, ecosystem, compatibility, local availability and context definitions. Content does not own practical access, familiarity or provider outcome.

### LearningActivityDefinition

- goal and observable result;
- required access;
- relevant skills/technology context;
- challenge band;
- outcome classes;
- assistance options;
- recovery/next step.

Content never mints evidence directly.

## 6. Professional situation definitions

Specialized contracts live in `PROFESSIONAL-SITUATION-CONTENT.md`.

### SituationKernelDefinition

Owns professional goal, archetype, invariant dilemma, 2–4 semantic approach intents, outcome pattern and stage limits.

### SituationContextFrameDefinition

Binds kernel to a provider/source, stage, era, technology selectors, participant role slots, access assumptions and provider contract.

### SituationPressurePackageDefinition

Adds at most two visible causes that materially change approach availability, forecast, stakes, compromise or recovery.

### SituationConsequenceBridgeDefinition

Maps semantic Challenge outcome classes to typed provider proposals, episode facts, follow-ups and recovery. It cannot apply effects directly.

### SituationPresentationPackDefinition

Owns localization, vocabulary, accessibility and result copy only. Presentation changes cannot alter semantic signature.

### SituationCompositionSetDefinition

Declares explicit allowed components, compatibility constraints, exclusions, materialization budget and coverage targets. Full Cartesian expansion is forbidden.

### CompiledProfessionalSituationDefinition

Immutable runtime definition containing:

- stable materialized ID/version;
- component refs;
- compiled Technical Situation template;
- eligibility/provider contract;
- semantic signature;
- repetition/follow-up profile;
- semantic snapshot/fingerprint.

Runtime receives compiled definitions only.

## 7. Project definitions

### ProjectArchetypeDefinition

- stable ID and human goal;
- era eligibility;
- allowed technology contexts;
- a few package templates;
- three base qualities;
- simple uncertainty/debt/risk;
- compact outcomes/releases;
- optional compiled professional-situation selectors.

### WorkPackageTemplateDefinition

- stable ID;
- objective/kind;
- challenge/work/uncertainty bands;
- relevant skills and technology constraints;
- compact outcome classes;
- optional meaningful compiled-situation hook;
- anti-repeat key.

Not required in MVP: component graph, detailed participant plan, debt/defect ledger, rollout/support policy or package dependency graph.

## 8. Technology ownership

- Historical Technology Catalog owns source-backed global chronology/support/compatibility.
- City/Era owns explicitly fictional local diffusion.
- Equipment/School/NPC/Economy/Employment own practical access.
- Technology Context Engine projects immutable context.
- Learning/Project/Career own outcomes.
- Progression owns familiarity/evidence.

Content cannot buy/install equipment, change access, change professional state, calculate project outcome or create career offer.

## 9. Content tiers and version bands

- Tier A: persistent identity/familiarity and meaningful decisions.
- Tier B: identity with shared family mechanics and limited unique content.
- Tier C: context/tag/requirement without standalone progression.

Libraries/packages/tools default to Tier C.

Technology band exists only for meaningful gameplay change in paradigm/API, compatibility, tooling/ecosystem, platform/deployment, support, market opportunity or learning/migration burden. No semver mirroring or runtime package solver.

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
core.situation-kernel.*
core.situation-context.*
core.situation-pressure.*
core.situation-outcome-pattern.*
core.situation-bridge.*
core.situation-presentation.*
core.situation-composition-set.*
core.situation-coverage-target.*
source.technology.*
```

IDs never derive from display names and are never reused. Generated professional-situation IDs depend only on stable component IDs/versions and compiler rules version, never file/object/display order.

## 11. Definition metadata

Relevant definition includes only applicable fields:

- version;
- author/review status;
- localization;
- era/availability;
- source refs where historical;
- compatibility/fingerprint metadata;
- UI/profile tier;
- migration/tombstone metadata.

Do not require irrelevant metadata for simple fictional content.

## 12. Historical/source metadata

Every historical fact records source refs/class, date precision, observed scope/methodology, supported claims, limitations, confidence and observed versus inferred fields.

Official sources are preferred for release/standard/support/compatibility. Surveys, repositories, labor data and expert radars remain scoped to their claim class. Broad adoption/ecosystem claims require triangulation or explicit estimate.

Professional dilemmas that do not depend on a factual historical claim may use design provenance rather than fabricated source refs.

## 13. Semantic validation

### Progression/learning

- valid skill/technology IDs;
- unavailable context not directly learnable;
- assisted/partial/failure semantics preserved;
- passive availability creates no familiarity/evidence;
- provider mapping stable;
- Normal UI bounded.

### Professional situations

Reject when:

- kernel lacks concrete dilemma;
- ordinary situation has fewer than 2 or more than 4 approaches;
- approach intents are semantic duplicates or universally dominated;
- pressure does not change choice/outcome/recovery;
- context violates provider/stage/era/technology constraints;
- bridge targets effect outside provider ownership;
- hiring/interview mints production evidence;
- assisted/takeover maps to independent autonomy;
- partial/failure lacks required recovery;
- presentation changes semantics;
- composition budget exceeded;
- stable ID depends on order/text;
- runtime generation/network/LLM is required.

### Technology

- category/family/tier valid;
- prerequisites and version bands ordered;
- support/adoption/ecosystem/local access separate;
- fictional local basis explicit;
- fallback exists;
- no universal score.

### Projects

- clear goal and aggregated package;
- reachable outcome/recovery;
- no direct professional mutation;
- deterministic uncertainty;
- no duplicate Product/Company/Career/Technology state.

## 14. Casual-complexity lint

Blocks/warns:

- too many visible skills/technology traits;
- technology with no current decision;
- every library/package as progression;
- required tech-tree navigation;
- one universal score;
- exact popularity/chance/reward numbers in Normal UI;
- project package as daily ticket;
- professional situation as syntax/API quiz;
- presentation-only variants counted as new gameplay;
- composition set with unbounded Cartesian expansion;
- multiple unrelated blocking decisions;
- source/coverage details required for ordinary choice;
- future-system fields without current gameplay.

## 15. Balance/reachability/coverage lint

- all declared outcomes reachable;
- failure/blocked state has recovery;
- low-access path exists;
- newest/mainstream not universally dominant;
- legacy has value and exit route;
- hidden context/outcome does not reroll;
- professional approaches have distinguishable trade-offs;
- no globally dominant approach in declared fixtures;
- duplicate semantic signatures reviewed;
- required coverage tuples satisfied;
- presentation-only duplicate cannot satisfy semantic coverage;
- materialization inside budget;
- no never-eligible corpus explosion;
- monthly report can explain result;
- committed history remains readable after content change.

## 16. Runtime registries

MVP runtime receives only active:

- skill/technology/context definitions;
- learning/project/event definitions;
- one compiled professional-situation variant;
- era/access data;
- source snapshots/fingerprints needed by active content.

No authoring kernels, coverage report, duplicate cluster, empty Extended registry, live internet metrics or runtime generator is required by gameplay runtime.

Development Content Studio may load authoring components and compiler diagnostics in a separate development-only surface.

## 17. Fingerprints and snapshots

Separate semantic fingerprints cover source registry, technology context, project/progression content, professional-situation components, materialized variant semantics, presentation/localization and provider contract.

Cosmetic localization does not alter semantic signature. Active visible situation stores semantic/presentation/provider snapshots to prevent reroll or meaning changes after update.

## 18. Modding

Data-only mods may add supported definitions and focused composition sets.

Forbidden:

- executable scripts/raw HTML/network fetch;
- runtime LLM calls;
- raw state patches or direct domain mutations;
- unbounded ticket/version/package/situation expansion;
- fake historical facts;
- missing stable IDs/migration/tombstones;
- presentation-only spam declared as semantic variety;
- runtime generation required for compatibility.

## 19. Content Studio

Initial professional-situation previews:

- corpus overview;
- kernel/dilemma/approach card;
- context-pressure compatibility matrix/list;
- materialized player preview;
- provider bridge/result/follow-up;
- semantic signature and duplicate cluster;
- coverage/repetition report;
- deterministic fixture;
- RU long-text/accessibility.

Technology/project previews remain available. Full graph editors and automatic production generation are deferred.

## 20. Forbidden drift

- schema completeness before gameplay;
- executable content;
- direct state/evidence effects;
- universal quality/technology/content score;
- content IDs from names;
- project/ticket/version/situation explosion;
- runtime free composition or LLM authority;
- duplicated Event/Director/Challenge logic in content compiler;
- embeddings as authoritative eligibility/duplicate decision;
- dynamic web authority;
- historical claims without provenance;
- global release treated as local/practical access;
- catalog update rewriting committed history.
