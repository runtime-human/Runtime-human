# Архитектура контента

Нормативные решения:

- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md).

Связанные спецификации:

- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

## Goal

Most events, skills, technologies, project archetypes/packages, companies, equipment, housing and historical milestones are data-driven without executable content code.

Definitions parameterize providers; Game Core owns deterministic state transitions.

## Source format

- JSONC structured definitions;
- localization files;
- asset manifests;
- historical source registry.

YAML is not baseline due to typing/agent-edit ambiguity.

## Pipeline

```text
JSONC + source locations
→ schema validation
→ semantic validation
→ chronology validation
→ reference graph validation
→ project/progression/balance lint
→ compile immutable registries
→ compile transfer/provider/project policies
→ semantic fingerprints/snapshots
```

## Content domains

### Professional progression

- skill groups/skills;
- technology families/technologies/version bands;
- directed transfer;
- professional focus/specialization profiles;
- grade/capability profiles;
- learning sources/activities/challenges;
- feedback/assistance/evidence mappings.

### Projects

- `ProjectArchetypeDefinition`;
- `ProjectKindDefinition`;
- `ScopeTemplateDefinition`;
- `WorkPackageTemplateDefinition`;
- `ProjectQualityProfileDefinition`;
- `TechnicalDebtRuleDefinition`;
- `DefectRuleDefinition`;
- `ReleasePolicyDefinition`;
- `MaintenancePolicyDefinition`;
- `EraProjectCapabilityDefinition`.

### Extensions and other domains

- events/chains/NPC;
- products/markets;
- open-source/community;
- companies/careers;
- education;
- equipment/housing;
- conferences;
- eras/city;
- achievements/localization/historical sources.

## Project definitions

### ProjectArchetypeDefinition

Describes:

- allowed kinds/eras;
- default goals/constraints;
- active quality dimensions;
- scope size bands;
- typical uncertainty/debt/defect/maintenance profiles;
- allowed package templates;
- release policy;
- UI visibility/progressive disclosure.

It does not own runtime ProjectState.

### ScopeTemplateDefinition

- stable semantic slice;
- requirements/acceptance criteria;
- value/uncertainty bands;
- dependencies;
- era/project-kind eligibility;
- anti-splitting group.

### WorkPackageTemplateDefinition

- kind/objective family;
- allowed scope refs;
- challenge profile;
- known/latent work bounds;
- uncertainty dimensions;
- quality targets/risk;
- technologies/skill applications;
- participant constraints;
- outcome space/recovery;
- decision hooks;
- anti-repeat key.

A template is not a ticket list and cannot execute formula scripts.

### Quality profile

- active dimensions (normally 3–5);
- target defaults/bands;
- release confidence requirements;
- assessment source policies;
- trade-off/recovery constraints.

### Debt/defect rules

Compiled rules describe bounded categories, affected areas, risk/drag ranges, prevention/materialization mappings and recovery package families.

Content never rolls randomness or mutates state directly.

### Release/Maintenance policies

Release policy describes gates, accepted-risk permissions, era distribution/rollback/support capabilities.

Maintenance policy maps technical state plus external support/dependency signals into routine load or package candidates.

## Definition ownership

- Definitions are immutable data.
- Project Engine owns runtime technical truth.
- Product/Open Source/Company/Career extensions submit typed inputs and consume typed outputs.
- Progression receives `ExperienceEpisode` only.
- Events can request/modify provider decisions but not directly complete packages or mint evidence.

## Stable IDs

Core namespaces:

```text
core.skill.*
core.tech-family.*
core.technology.*
core.transfer.*
core.activity.*
core.challenge.*
core.grade-profile.*
core.project-archetype.*
core.project-kind.*
core.scope-template.*
core.work-package.*
core.quality-profile.*
core.debt-rule.*
core.defect-rule.*
core.release-policy.*
core.maintenance-policy.*
core.era-project-capability.*
```

IDs never derive from display names or get reused.

Historical project/release/evidence records preserve semantic snapshots/tombstones.

## Content metadata

Every object:

- author/review status;
- content version;
- created/last-reviewed dates;
- tags/sourceRefs;
- compatibility range;
- historical availability;
- balance risk tags;
- UI tier;
- migration/tombstone metadata.

## Semantic validation

### Progression

- no duplicate skills/facets;
- Tier C has no proficiency;
- valid technology chronology/transfer;
- partial/failure cannot grant full delivery;
- assistance cannot inflate autonomy;
- grade not one weighted average;
- provider mapping stable.

### Projects

- archetype activates 3–5 quality dimensions unless reviewed exception;
- scope templates have reachable acceptance criteria;
- package principal challenge consistent with dimensions;
- known/latent work bounds valid;
- latent realization bounded/non-negative;
- outcome and recovery reachable;
- active decision reachable but not mandatory routine spam;
- package cannot directly change skills/grade;
- quality targets valid for archetype;
- debt/defect rules reference valid areas/categories;
- release gate feasible for at least one reachable state;
- era allows required technology/tool/distribution;
- anti-splitting/anti-repeat key present;
- Product/Company/OSS fields do not duplicate technical state.

## Balance lint

- too many Tier A technologies;
- too many active project quality dimensions;
- package duration too small/large for meaningful unit;
- project represented only by progress;
- package without trade-off/outcome/recovery;
- package spam/easy-task farming;
- scope splitting/release spam;
- intentional failure/bug/debt farming;
- unbounded parallel package capacity;
- team size linear multiplier without coordination;
- release gate impossible/trivial;
- debt spiral without recovery;
- defect rate zero or unavoidable catastrophe;
- forecast exact despite uncertainty;
- project challenge requires unavailable era technology;
- direct project/professional mutation from event/extension content.

## Immutable runtime

Compiled runtime receives:

- project/progression registries;
- prevalidated templates/policies;
- sparse transfer edges;
- era capabilities;
- semantic fingerprints.

Runtime does not calculate schemas or execute content-defined formulas.

## Modding

Data-only mods may add project archetypes/packages/technologies/events after validation.

Forbidden:

- executable scripts/raw HTML/automatic network fetch;
- overriding core semantics without conflict policy;
- direct SQL/Tauri capabilities;
- direct skill/grade/project-state effects;
- release/defect RNG hooks outside rule registry;
- unbounded per-ticket content;
- missing migration/tombstone policy for active definitions.

Active saves lock semantic fingerprints; historical records use snapshots.

## Content Studio

After vertical slice, Content Studio previews:

- project archetype/scope graph;
- Work Package lifecycle/outcomes;
- uncertainty/forecast ranges;
- quality/debt/defect effects;
- release gates;
- contribution/episode mapping;
- balance fixtures/localization.

It uses production schemas/validators but no privileged persistence.

## Forbidden drifts

- executable formula content;
- hidden side effects outside registries;
- direct skill/grade mutation;
- direct package completion from narrative text;
- one quality score as source of truth;
- Tier C progression bars;
- content IDs from filenames/names;
- canonical historical dates without provenance;
- Project/Product/Company duplicated technical state.
