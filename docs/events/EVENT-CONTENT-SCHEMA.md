---
title: "Схема контента событий"
type: events
status: draft
canon: true
depends_on: [ADR-015]
updated: 2026-07-18
---

# Схема контента событий

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Narrative Director](NARRATIVE-DIRECTOR.md).

## 1. Format

Events are JSONC, TypeBox defines schemas, Ajv validates runtime payload.

Content describes situations and options. Core owns all state transitions.

## 2. MVP EventDefinition

```ts
type EventDefinition = Readonly<{
  id: EventId;
  version: number;
  category: EventCategory;
  productLayer: ProductLayer;
  tags: readonly string[];
  availability: AvailabilityRule;
  requirements: readonly Condition[];
  weight: WeightInt;
  cooldownMonths?: number;
  blocking: boolean;
  participants?: readonly ParticipantSelector[];
  relatedContext?: CasualEventContextSelector;
  choices: readonly EventChoice[];
  journal: LocalizationKey;
  metadata: ContentMetadata;
}>;
```

`ProductLayer`:

```text
programmer-mastery
professional-expression
human-constraints
era-narrative
philosophy-legacy
```

MVP event does not require full technical tags, milestone profiles or multiple domain selectors unless current content uses them.

## 3. Casual event context

```ts
type CasualEventContextSelector = Readonly<{
  activityId?: ActivityId;
  projectId?: ProjectId;
  packageId?: WorkPackageId;
  employmentId?: EmploymentId;
  technologyId?: TechnologyId;
}>;
```

Expected revisions are added to the runtime-resolved command context, not necessarily repeated in author-facing content.

Missing/stale context makes event ineligible or returns typed conflict. It never silently retargets another entity.

## 4. Choice

Choice may include:

- text/localization;
- requirements;
- preview direction;
- chain transition;
- typed provider decision request;
- assistance choice;
- delayed hook;
- failure/recovery transition.

Choice cannot directly:

- add mastery/grade/evidence;
- add project progress;
- set quality/debt/risk/release truth;
- complete/cancel a package without provider transition;
- reroll hidden state.

## 5. MVP technical decision types

Only types needed by current content:

- try independently / ask for help;
- investigate / continue;
- simplify / keep scope;
- improve quality / move faster;
- release / delay;
- accept known limitation / fix;
- life commitment conflict.

Recommended/Extended may add architecture, migration, incident, delegation and governance types with corresponding systems.

Decision type is metadata for UI/diversity/balance, not executable formula.

## 6. Event → Project integration

MVP event may:

- present a Project Engine-generated decision;
- send typed answer/approach request;
- provide assistance or external constraint;
- create a future hook.

It may not:

- declare package completed;
- mutate hidden work;
- set quality to a chosen value;
- erase debt/issue;
- ship a release directly;
- create professional progression without provider outcome.

## 7. Typed operations

MVP operations:

- `project.select-approach`;
- `project.request-scope-change`;
- `project.accept-known-limitation`;
- `project.select-release-action`;
- `project.record-decision-input`;
- `professional.request-assistance`;
- `activity.set-priority`.

Each operation has schema/version, pure handler, owning module, revision/idempotency policy and tests.

Unknown operation blocks content pack.

Additional discriminators are introduced with implemented systems.

## 8. Delayed consequences

MVP delayed hook:

```ts
type DelayedConsequence = Readonly<{
  id: ConsequenceId;
  triggerWindow: GameDateWindow;
  context: CasualEventContextRef;
  signal: DelayedSignal;
  requirements: readonly Condition[];
  expirationPolicy: ExpirationPolicy;
}>;
```

A delayed hook changes future eligibility/context. It cannot secretly mint progression, release or defect truth.

## 9. Metadata

Required:

- author/review/content version;
- category/product layer;
- target era/life stage;
- frequency/cooldown;
- localization;
- sourceRefs where historical.

Do not require advanced technical metadata for simple life/flavour events.

## 10. Validation

1. parse/schema/stable ID;
2. references and context ownership;
3. chronology/technology availability;
4. chain/reachability;
5. typed operation ownership;
6. casual-complexity lint;
7. localization/accessibility;
8. balance/pacing lint.

## 11. Casual-complexity lint

Warns/blocks:

- ordinary event with more than four options;
- options without distinguishable trade-off;
- internal jargon in normal copy;
- repeated event requiring routine monthly click;
- multiple unrelated blocking decisions in one event;
- event depending on unimplemented system;
- life event falsely tagged technical;
- philosophy reward that directly changes professional/project truth.

## 12. Safety lint

Blocks:

- direct mastery/grade/project mutation;
- package completion from narrative text;
- hidden-state reroll;
- assisted branch inflating independence;
- partial/failure mapped to full delivery;
- unavailable-era technology;
- farming without cooldown/anti-repeat;
- raw patch/eval/executable content.

## 13. Error UX

Validator reports file, location, JSON path, rule ID and safe fix when unambiguous.

Invalid mod pack is quarantined without damaging save/core content.
