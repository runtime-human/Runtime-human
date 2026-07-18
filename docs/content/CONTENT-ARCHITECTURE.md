---
title: "CONTENT-ARCHITECTURE"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Архитектура контента

Нормативные решения:

- [ADR-013 — Professional Progression](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014 — Project & Work Package](../adr/ADR-014-authoritative-project-work-package-model.md);
- [ADR-015 — Casual-first Complexity](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

Связанные спецификации:

- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

## 1. Goal

Game content is data-driven without executable scripts. Content creates a small number of understandable situations, choices and outcomes.

A schema field or definition type is added only when current gameplay uses it.

## 2. Source format

- JSONC definitions;
- localization files;
- asset manifests;
- historical source registry.

Pipeline:

```text
JSONC
→ schema validation
→ semantic/chronology/reference validation
→ casual-complexity lint
→ balance/reachability lint
→ immutable registry
→ fingerprints/snapshots
```

## 3. Implementation profiles

### MVP Casual content domains

- 5 professional skills;
- 1 technology family;
- 1 fully playable technology;
- learning activities;
- 1 project archetype;
- 2 Work Package templates;
- 3 project quality definitions;
- 1 uncertainty rule;
- 1 debt/known-issue branch;
- 4 professional/project outcomes;
- 4–6 events;
- minimal equipment/housing/era/localization.

### Recommended

- more skills/technologies;
- multiple project archetypes;
- optional/deferred scope;
- situational quality;
- significant debt/issue definitions;
- career/product/open-source content.

### Extended

- technology versions/large transfer graph;
- components/requirements;
- defect/incident/rollback policies;
- team/delegation content;
- company portfolios;
- advanced grade/evidence profiles.

Extended schemas are not required before feature implementation.

## 4. MVP progression definitions

### SkillDefinition

- stable ID;
- localization;
- UI visibility/relevance;
- broad practice tags;
- optional capability phrases.

### TechnologyDefinition

- stable ID/family;
- historical availability;
- equipment/access requirements;
- learning difficulty;
- simple familiarity labels;
- project compatibility;
- source references.

### LearningActivityDefinition

- goal;
- required access;
- relevant skills/technology;
- challenge band;
- expected outcomes;
- assistance options;
- recovery/next step.

Detailed evidence mapping can be produced by Core rules from outcome tags; content does not directly mint evidence.

## 5. MVP project definitions

### ProjectArchetypeDefinition

Contains:

- stable ID;
- title/goal template;
- era eligibility;
- allowed technology;
- two or a few package templates;
- three base qualities;
- simple uncertainty/debt/risk rules;
- outcome/release options;
- UI copy.

### WorkPackageTemplateDefinition

Contains:

- stable ID;
- human objective;
- kind;
- challenge band;
- work range;
- uncertainty band/rule;
- relevant skills/technology;
- possible compact outcomes;
- optional meaningful decision hook;
- anti-repeat key.

It does not require:

- component/scope graph;
- multiple quality targets;
- participant plan;
- debt/defect ledgers;
- rollout/support policy.

### CasualQualityDefinition

Base IDs:

- functional;
- usability;
- maintainability.

Situational quality definition is introduced only with a project using it.

### CasualOutcomeDefinition

- completed;
- assisted completion;
- partial;
- failure with recovery;
- early release with limitation;
- delayed result.

Only needed outcomes are authored for a package.

## 6. Definition ownership

- Content definitions are immutable data.
- Core owns deterministic state transitions.
- Project Engine owns project truth.
- Progression consumes `ExperienceEpisode`.
- Events request typed transitions.
- Content cannot directly change mastery, grade, project progress, quality, debt or release truth.

## 7. Stable IDs

MVP namespaces:

```text
core.skill.*
core.tech-family.*
core.technology.*
core.activity.*
core.project-archetype.*
core.work-package.*
core.quality.*
core.event.*
```

Additional namespaces are added with actual domains.

IDs never derive from display names and are never reused.

Historical records preserve semantic snapshots/tombstones.

## 8. Metadata

Every definition:

- version;
- author/review status;
- localization;
- era/availability;
- sourceRefs where historical;
- compatibility range;
- UI profile/tier;
- migration/tombstone metadata when needed.

Do not require irrelevant metadata for purely fictional simple content.

## 9. Semantic validation

### Progression

- skill/technology IDs valid;
- unavailable technology not learnable;
- assisted/partial/failure semantics valid;
- passive activity cannot create full delivery;
- provider mapping stable;
- normal UI has bounded relevant skills.

### Projects

- project has a clear goal;
- package is aggregated and meaningful;
- package has reachable outcome/recovery;
- package does not directly mutate professional state;
- project has no more required fields than active profile;
- base qualities valid;
- uncertainty outcome bounded/deterministic;
- release/delay/recovery reachable;
- anti-repeat key present;
- no duplicate Product/Company state.

## 10. Casual-complexity lint

Blocks or warns:

- too many visible skills;
- more than 2–5 packages in ordinary project without review;
- package that is effectively a daily ticket;
- project represented only by progress;
- ordinary package with multiple unrelated blocking decisions;
- more than three baseline quality dimensions;
- situational quality without relevant decision;
- debt/bug record that does not affect player choice;
- exact forecast despite uncertainty;
- normal copy using internal evidence/engineering jargon;
- feature requiring unimplemented future system;
- content set too large for first phase.

## 11. Balance/reachability lint

- all outcomes reachable;
- failure has recovery unless true ending;
- low-income background has access path;
- repeated easy/package content cannot farm progression;
- hidden result does not reroll;
- one decision has distinguishable trade-offs;
- monthly report can explain outcome;
- no unavoidable blocking chain.

## 12. Runtime registry

MVP runtime receives only:

- active skill/technology/activity definitions;
- project/package/quality/outcome definitions;
- event definitions;
- era/access data;
- fingerprints.

No empty registries/policies for Extended systems.

## 13. Modding

Data-only mods may add content supported by current content API.

A mod cannot require unimplemented Extended schema while declaring MVP compatibility.

Forbidden:

- executable scripts/raw HTML/network fetch;
- raw state patches;
- direct skill/grade/project mutations;
- RNG hooks outside Core;
- ticket-level unbounded content;
- missing migration/tombstone policy for active definitions.

## 14. Content Studio

After Vertical Slice, Content Studio first previews:

- project card;
- package objective/outcomes;
- simple uncertainty;
- three qualities;
- decision text;
- professional explanation;
- localization/accessibility;
- deterministic fixtures.

Advanced scope/debt/defect/release editors are added with those features.

## 15. Forbidden drifts

- schema completeness before gameplay;
- executable content;
- direct state/evidence effects;
- one quality score;
- every library as progression;
- content IDs from names;
- project/ticket explosion;
- full future content API in MVP;
- canonical historical dates without provenance.
