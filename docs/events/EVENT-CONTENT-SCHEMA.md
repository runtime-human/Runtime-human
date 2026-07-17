# Схема контента событий

Связанные спецификации:

- [Narrative Director](NARRATIVE-DIRECTOR.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

## Format

Events are JSONC, TypeBox defines TS/JSON Schema, Ajv validates runtime payload.

## Event definition

```ts
type EventDefinition = Readonly<{
  id: EventId;
  version: number;
  category: EventCategory;
  productLayer: ProductLayer;
  tags: readonly string[];
  technicalTags?: readonly TechnicalTag[];
  availability: AvailabilityRule;
  requirements: readonly Condition[];
  weight: WeightInt;
  cooldownMonths?: number;
  blocking: boolean;
  participants?: readonly ParticipantSelector[];
  relatedProfessionalContext?: ProfessionalContextSelector;
  relatedProjectContext?: ProjectContextSelector;
  professionalMilestone?: ProfessionalMilestoneTag;
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

## Choice

Choice may contain:

- localization/requirements;
- immediate/delayed effects;
- chain transition;
- preview policy;
- typed provider/project decision modifier;
- feedback/assistance modifier;
- failure/recovery transition.

Choice cannot directly:

- add mastery/fluency/evidence/grade;
- add arbitrary project progress;
- complete/cancel package without Project Engine transition;
- set quality/debt/defect/release truth;
- reroll hidden project state.

## Professional context

```ts
type ProfessionalContextSelector = Readonly<{
  activityId?: ActivityId;
  taskId?: ProfessionalTaskId;
  projectId?: ProjectId;
  employmentId?: EmploymentId;
  technologyIds?: readonly TechnologyId[];
  skillIds?: readonly SkillId[];
}>;
```

## Project context

```ts
type ProjectContextSelector = Readonly<{
  projectId: ProjectId;
  expectedProjectRevision?: ProjectRevision;
  packageId?: WorkPackageId;
  expectedPackageRevision?: WorkPackageRevision;
  scopeSliceIds?: readonly ScopeSliceId[];
  releaseCandidateId?: ReleaseCandidateId;
  defectId?: DefectId;
  debtId?: TechnicalDebtId;
}>;
```

Required context is resolved before selection. Missing/stale refs make event ineligible or return typed conflict, never silently retarget another project.

## Technical decision types

- problem decomposition;
- research vs implementation;
- ask for help;
- debug hypothesis;
- test/review strategy;
- scope/quality/deadline;
- refactor vs patch;
- debt accept/repay/contain;
- defect fix/workaround/defer;
- release/delay/cut/rollback;
- incident response;
- ownership/delegation;
- architecture/technology trade-off.

Decision type is metadata for diversity/UI/balance, not executable formula.

## Event → Project integration

Event may:

- request creation/defer/cancel of a package through typed Project command;
- modify package approach/priority/guardrails through valid transition;
- supply new constraint/signal/participant/assistance;
- present Project Engine-generated uncertainty/release/incident decision;
- create delayed typed project signal/hook;
- materialize provider outcome only if the event domain owns that outcome.

Event may not:

- declare package completed because narrative choice says so;
- mutate `knownRemainingWork`/latent work directly;
- set quality to excellent;
- delete debt/defect;
- ship a release without release gate/outcome;
- attribute team result to player;
- create evidence without `ExperienceEpisode`.

## Typed project operations

Allowed discriminators include:

- `project.request-package`;
- `project.set-approach`;
- `project.change-scope-request`;
- `project.set-quality-priority`;
- `project.accept-risk`;
- `project.select-defect-response`;
- `project.select-debt-response`;
- `project.select-release-action`;
- `project.set-owner-guardrails`;
- `project.add-external-signal`;
- `project.record-decision-input`.

Handlers call Project Engine public API with expected revisions.

Raw state patch/eval script is forbidden.

## Delayed consequences

```ts
type DelayedProjectConsequence = Readonly<{
  id: ConsequenceId;
  triggerWindow: GameDateWindow;
  context: ProjectContextRef;
  signal: ProjectExternalSignal;
  requirements: readonly Condition[];
  expirationPolicy: ExpirationPolicy;
}>;
```

It can influence future eligibility/constraints but cannot secretly materialize release/defect/evidence without future provider processing.

## Condition/effect registry

Each operation has:

- discriminator/schema/version;
- pure evaluator/handler;
- semantic checks;
- tests;
- allowed owning module;
- revision/idempotency policy.

Unknown discriminator blocks pack.

## Metadata

- author/review/content version;
- creation/review dates;
- sensitivity tags;
- arc/product layer;
- target life/professional/project stage;
- target frequency;
- technical decision type;
- sourceRefs.

## Validation

1. parse/source locations;
2. schema/stable namespace;
3. reference/revision policy;
4. chronology/technology/project eligibility;
5. chain/reachability;
6. provider/project mapping;
7. progression/project safety lint;
8. localization;
9. balance/pacing lint.

## Safety lint

Blocks:

- direct mastery/grade/evidence effects;
- direct project progress/quality/debt/defect/release mutation;
- project decision without project context/revision policy;
- package completion from narrative-only branch;
- release action without gate/accepted-risk path;
- defect/debt removal without Project transition;
- hidden-state reroll;
- partial/failure mapped to full delivery;
- assisted branch inflating autonomy;
- unavailable-era technology/tool/distribution;
- life-only event falsely tagged technical;
- event farming without cooldown/anti-repeat;
- philosophy answer with authoritative project/professional reward.

## Error UX

Validator reports file, line/column, JSON path, rule ID and safe fix when unambiguous. Invalid mod pack is quarantined without damaging save/core content.
