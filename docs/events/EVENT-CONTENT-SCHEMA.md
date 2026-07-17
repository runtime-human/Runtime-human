# Схема контента событий

Связанные спецификации: [Narrative Director](NARRATIVE-DIRECTOR.md) и [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md).

## Формат

Исходники событий хранятся в JSONC. TypeBox определяет TypeScript type и JSON Schema; Ajv выполняет runtime validation.

## Минимальная форма

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

Choice содержит:

- localization key;
- дополнительные requirements;
- immediate effects;
- delayed effects;
- chain transition;
- optional preview policy;
- optional provider decision modifier;
- optional feedback/assistance modifier;
- optional failure/recovery transition.

Choice не начисляет mastery, fluency, grade или production evidence напрямую.

## Event и progression

Событие может:

- открыть/изменить provider task/activity;
- изменить assistance/feedback/context;
- создать technical decision для существующего work package;
- материализовать provider outcome, если event domain действительно владеет этим outcome;
- создать `ExperienceEpisode` через typed provider mapping;
- добавить delayed professional consequence/hook.

Событие не может:

- вызвать `addSkillXp`/`setGrade` raw effect;
- выдать Senior evidence за narrative answer;
- превратить fame/reputation в mastery;
- считать чтение текста production delivery;
- обойти technology era/eligibility.

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

Селектор разрешается до event selection. Неразрешимый обязательный context делает событие ineligible.

## Technical decision types

Примеры:

- problem-decomposition;
- research-vs-implementation;
- ask-for-help;
- debug-hypothesis;
- test-strategy;
- scope-quality-deadline;
- refactor-vs-patch;
- release-vs-delay;
- incident-response;
- review/mentoring;
- architecture-tradeoff.

Decision type используется для content diversity, UI и balance metrics, но не является formula script.

## Condition/effect registry

Каждая операция имеет:

- discriminator;
- schema;
- pure evaluator/handler;
- version;
- semantic checks;
- tests.

Неизвестный discriminator блокирует загрузку pack.

Professional effects ограничены typed operations, например:

- modify provider constraint;
- set task priority/approach;
- add assistance/feedback;
- create/defer provider task;
- record decision input;
- create narrative hook;
- change relationship/trust;
- change health/finance capacity.

Raw skill/evidence/grade mutation запрещена.

## Delayed professional consequences

Событие может создавать versioned typed hook:

```ts
type DelayedProfessionalConsequence = Readonly<{
  id: ConsequenceId;
  triggerWindow: GameDateWindow;
  relatedContext: ProfessionalContextRef;
  providerModifier: ProviderModifier;
  requirements: readonly Condition[];
  expirationPolicy: ExpirationPolicy;
}>;
```

Delayed consequence должен быть traceable к выбору и не выдаёт hidden evidence без будущего outcome.

## Metadata

- author;
- review status;
- content version;
- created/last reviewed dates;
- sensitivity tags;
- narrative arc;
- product layer;
- target life/professional stage;
- target frequency;
- technical decision type;
- sourceRefs для historical claims.

## Validation levels

1. JSONC parse with source locations.
2. Schema validation.
3. Stable ID/namespace validation.
4. Reference resolution.
5. Chronology/technology availability validation.
6. Reachability and chain validation.
7. Professional context/provider mapping validation.
8. Progression safety lint.
9. Localization completeness.
10. Balance/pacing lint.

## Progression safety lint

Validator блокирует:

- direct mastery/grade/evidence effects;
- technical tag без professional context;
- evidence potential без provider outcome mapping;
- full delivery evidence из partial/failure branch;
- autonomy claim при forced/full assistance;
- technology недоступной эпохи;
- life-only event, ошибочно помеченный technical только из-за косвенного modifier;
- event farming без cooldown/anti-repeat key;
- philosophy choice с authoritative professional reward без результата.

## Error UX

Validator показывает файл, line/column, JSON path, rule ID и безопасное исправление, если оно однозначно. Ошибка одного мода помещает pack в quarantine, а не повреждает core content.
