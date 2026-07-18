# ADR-020 — Авторитетная модель композиции профессиональных ситуаций

- **Статус:** Accepted
- **Дата:** 2026-07-18
- **Решение владельца:** профессиональные ситуации создаются как ограниченные, предварительно скомпилированные комбинации авторских situation kernels, context frames, pressure packages, consequence bridges и presentation packs; runtime не генерирует свободный сценарий, не исполняет произвольные rules и не использует LLM как authority
- **Связанные ADR:** ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-014, ADR-015, ADR-016, ADR-017, ADR-018, ADR-019
- **Связанные спецификации:** `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`, `docs/events/EVENT-ENGINE.md`, `docs/events/NARRATIVE-DIRECTOR.md`, `docs/content/PROFESSIONAL-SITUATION-CONTENT.md`

## Контекст

Runtime Human требует сотни профессионально правдоподобных ситуаций на пути от первой программы до поздней карьеры. Полностью ручное написание каждого варианта обеспечивает качество, но плохо масштабируется и быстро создаёт текстовые reskin-сценарии. Свободная процедурная или LLM-генерация повышает объём, но создаёт риски:

- причинно неверных ситуаций;
- скрытого универсально правильного ответа;
- несовместимых provider effects;
- нарушенной исторической доступности;
- невалидных персонажей и участников;
- ложного production evidence;
- повторов под другой формулировкой;
- невозможности гарантировать deterministic replay;
- content drift после обновления модели или prompt;
- отсутствия воспроизводимого QA corpus.

Текущий канон уже разделяет:

- Provider, Professional Challenge Engine и Progression Core;
- Event Engine и Narrative Director;
- historical technology context и practical access;
- authored definitions и authoritative state;
- runtime eligibility, pacing и deterministic outcome.

Новая система должна увеличить authorial leverage, не создавая второго Challenge Engine, Event Engine или Narrative Director.

## Рассмотренные подходы

### 1. Полностью ручная библиотека ситуаций

Каждая ситуация целиком пишется и тестируется отдельно.

Преимущества:

- максимальная локальная связность;
- простой runtime;
- ясная ответственность автора.

Недостатки:

- высокая стоимость каждого нового контекста;
- быстрый рост почти одинаковых definitions;
- трудно измерять semantic coverage;
- исправление общей проблемы требует править много копий.

Решение: использовать для MVP и flagship situations, но не как единственную долгосрочную модель.

### 2. Свободная procedural grammar или runtime LLM

Runtime комбинирует произвольные части либо генерирует текст/ветви по текущему state.

Преимущества:

- высокий потенциальный объём;
- гибкая персонализация.

Недостатки:

- трудно доказать причинность и outcome correctness;
- невозможна полная pre-release валидация;
- unstable fingerprints;
- высокая сложность recovery, moderation и localization;
- генератор начинает конкурировать с domain owners;
- опасность «много текста, мало новых решений».

Решение: отклонить для baseline runtime.

### 3. Ограниченная offline-композиция авторских kernels

Авторы создают небольшие semantic units. Content compiler материализует только разрешённые комбинации, валидирует их и выпускает immutable runtime variants.

Преимущества:

- общая причинность остаётся authored;
- контексты и pressure можно переиспользовать;
- все runtime variants известны до релиза;
- deterministic snapshots и golden fixtures возможны;
- coverage и near-duplicate анализ автоматизируются;
- domain effects остаются typed.

Недостатки:

- нужен отдельный compiler и authoring discipline;
- плохие boundaries создают механические комбинации;
- не каждый kernel допускает широкое переиспользование.

**Выбран подход 3**, с полностью ручным MVP и постепенным расширением только после content/playtest evidence.

## Решение

### 1. Ввести Professional Situation Content Composition boundary

Цепочка:

```text
authored semantic components
→ composition sets and compatibility rules
→ compile-time materialization
→ semantic/chronology/provider validation
→ coverage and similarity analysis
→ immutable compiled situation registry
→ provider eligibility request
→ Event Engine / Narrative Director selection
→ Professional Challenge Engine resolution
→ provider application
→ ExperienceEpisode
```

Composition boundary работает при content build и в Content Studio preview. Runtime получает только compiled definitions и read-only lookup/projection API.

### 2. Situation Kernel владеет профессиональным ядром

`SituationKernelDefinition` определяет неизменную профессиональную проблему:

- challenge archetype;
- human-readable goal;
- invariant dilemma;
- допустимый professional stage;
- semantic approach intents;
- expected outcome pattern;
- required provider capabilities;
- semantic novelty axes;
- запрещённые combinations.

Kernel не содержит конкретного работодателя, project ID, NPC или историческую платформу. Он отвечает на вопрос:

> Какое профессиональное решение проверяет эта ситуация, даже если сменить эпоху, provider и presentation?

Примеры kernel:

- воспроизвести и локализовать ошибку вместо немедленного patch;
- выбрать между уменьшением scope и риском раннего выпуска;
- интегрировать внешний формат при слабой документации;
- улучшить поддерживаемость без остановки delivery;
- сообщить о риске до дедлайна или скрыть неопределённость;
- принять ownership за bounded feature или остаться в assisted scope.

### 3. Context Frame привязывает kernel к domain context

`SituationContextFrameDefinition` задаёт:

- provider kind;
- source/reference contract;
- era range;
- professional stage;
- technology/context selectors;
- project/career/learning/open-source context requirements;
- participant role slots;
- access and capacity assumptions;
- allowed stakes range;
- applicable presentation tone.

Context Frame не рассчитывает outcome и не меняет provider state.

### 4. Pressure Package объясняет, почему задача сложна сейчас

`SituationPressurePackageDefinition` содержит 1–2 gameplay-relevant causes:

- unfamiliar technology;
- unclear requirements;
- legacy constraints;
- weak documentation;
- deadline pressure;
- integration risk;
- limited observability;
- coordination;
- high consequence;
- insufficient capacity.

Pressure Package может:

- открыть или закрыть approach;
- изменить forecast direction;
- добавить compromise/recovery possibility;
- определить visible stakes;
- добавить provider constraint proposal.

Он не содержит точную chance table и не выдаёт прямые skill/evidence deltas.

### 5. Approach semantics остаются внутри kernel

Произвольная замена approach sets между kernels запрещена. Kernel объявляет semantic intents, например:

- investigate-first;
- implement-fast;
- prototype;
- ask-for-help;
- reduce-scope;
- strengthen-quality;
- defer-or-recover;
- clarify-requirement;
- disclose-risk;
- negotiate-scope.

Context/pressure могут менять availability и wording, но не превращают intent в другое действие. Это защищает выбор от механической комбинации несвязанных кнопок.

### 6. Consequence Bridge связывает outcome с provider

`SituationConsequenceBridgeDefinition` определяет typed mapping:

```text
kernel outcome pattern
+ context frame
+ pressure package
→ provider effect proposals
+ episode facts
+ follow-up hooks
+ recovery path
```

Bridge принадлежит content domain конкретного provider и валидируется против его public contract.

Он не может:

- напрямую менять save;
- выдавать mastery/evidence/grade;
- рассчитывать Project truth вне Project Engine;
- начислять salary;
- менять NPC relationship;
- создавать несуществующий historical fact.

### 7. Presentation Pack отвечает только за выражение

`SituationPresentationPackDefinition` содержит:

- title/summary/goal localization;
- cause/stake wording;
- approach labels and forecast copy;
- participant role lines;
- result explanation templates;
- accessibility/long-text variants;
- tone and era vocabulary constraints.

Presentation Pack не изменяет semantic signature, eligibility, approaches или outcome mapping. Две compositions, отличающиеся только presentation, считаются одной semantic situation для repetition metrics.

### 8. Composition Set ограничивает пространство вариантов

`SituationCompositionSetDefinition` объявляет:

- разрешённые kernels;
- разрешённые context frames;
- разрешённые pressure packages;
- consequence bridges;
- presentation packs;
- compatibility constraints;
- maximum materialized variants;
- explicit exclusions;
- coverage obligations;
- stable generated-ID namespace;
- author/reviewer ownership.

Compiler не строит полный Cartesian product. Он использует explicit allowlists/constraints и прекращает build, если число variants превышает установленный budget.

### 9. Runtime получает только materialized variants

```ts
type CompiledProfessionalSituationDefinition = Readonly<{
  id: CompiledSituationVariantId;
  compositionSetId: SituationCompositionSetId;
  kernelId: SituationKernelId;
  contextFrameId: SituationContextFrameId;
  pressurePackageId: SituationPressurePackageId;
  consequenceBridgeId: SituationConsequenceBridgeId;
  presentationPackId: SituationPresentationPackId;
  technicalSituationTemplate: TechnicalSituationTemplateSnapshot;
  eligibility: CompiledSituationEligibility;
  providerContract: CompiledProviderSituationContract;
  semanticSignature: ProfessionalSituationSemanticSignature;
  repetitionProfile: ProfessionalSituationRepetitionProfile;
  followUpProfile: ProfessionalSituationFollowUpProfile;
  sourceFingerprint: ContentFingerprint;
  contentVersion: ContentVersion;
}>;
```

Runtime не модифицирует definition и не создаёт новую комбинацию. После materialization `TechnicalSituation` сохраняет существующий ADR-016 contract.

### 10. Stable IDs и snapshots

Materialized variant ID выводится только из stable component IDs, composition-set namespace и compiler rules version — никогда из display text или iteration order.

История сохраняет:

- variant ID/version;
- semantic snapshot;
- provider/source snapshot;
- selected approach;
- pressure/cause snapshot;
- consequence/follow-up snapshot;
- content/rules fingerprint.

Удалённый component получает tombstone. Catalog update не переписывает уже committed situation history.

## Ownership

### Professional Situation Content Composition

Владеет:

- authoring schemas;
- component compatibility;
- compile-time materialization;
- semantic validation;
- coverage analysis;
- similarity/near-duplicate analysis;
- immutable compiled registry;
- authoring diagnostics and previews.

Не владеет:

- provider domain state;
- event eligibility/pacing;
- challenge outcome;
- professional progression;
- NPC relationship truth;
- technology history/access;
- persistence transaction;
- runtime free-form generation.

### Provider

Владеет domain context, source, eligibility input, application и `ExperienceEpisode` creation.

### Event Engine

Владеет event requirements, participants, choices/effects wrapper, chains and delayed consequences. Он может ссылаться на compiled professional situation, но не собирать её части.

### Narrative Director

Владеет pacing и selection среди уже eligible candidates. Он использует semantic/repetition metadata, но не меняет kernel, pressures, approaches или effects.

### Professional Challenge Engine

Владеет validation выбранного approach и deterministic outcome resolution по ADR-016.

### Progression Core

Владеет mastery, familiarity, evidence, capability and grade interpretation.

## Semantic signature и anti-repeat

Каждый materialized variant получает signature:

```ts
type ProfessionalSituationSemanticSignature = Readonly<{
  archetype: ProfessionalChallengeArchetype;
  dilemmaId: ProfessionalDilemmaId;
  goalClass: ProfessionalGoalClass;
  providerKind: ExperienceProviderKind;
  professionalStage: ProfessionalStageBand;
  causeIds: readonly ChallengeCauseId[];
  approachIntentIds: readonly ProfessionalApproachIntentId[];
  consequenceClassIds: readonly ProfessionalConsequenceClassId[];
  technologyFamilyIds: readonly TechnologyFamilyId[];
  participantRoleIds: readonly NarrativeParticipantRoleId[];
  followUpClassIds: readonly ProfessionalFollowUpClassId[];
}>;
```

Repetition оценивается не только по exact ID. Director/analytics получают:

- exact variant recency;
- kernel recency;
- dilemma recency;
- cause-set recency;
- approach-shape recency;
- consequence-class recency;
- participant-role recency;
- provider/archetype streak.

Presentation-only variants не сбрасывают semantic repetition.

## Coverage model

Coverage не означает заполнить полный Cartesian matrix.

Автор объявляет `ProfessionalSituationCoverageTarget` по важным gameplay dimensions:

- progression stage;
- provider;
- archetype;
- dilemma/goal class;
- cause;
- approach shape;
- technology context;
- outcome/recovery class;
- assistance/autonomy semantics;
- historical era.

Compiler создаёт:

- missing required coverage report;
- unreachable combination report;
- overrepresented signature report;
- pairwise interaction coverage report;
- near-duplicate cluster report;
- never-selectable/dead variant report;
- provider-effect mapping completeness report.

Pairwise/higher-order coverage является QA heuristic, а не требованием создать все combinations.

## Profiles

### MVP Casual

- one fully authored kernel;
- one context frame;
- one pressure package;
- one consequence bridge;
- one presentation pack;
- one compiled variant;
- existing January diagnose situation;
- exact snapshot and no-reroll;
- compiler/validator paths exist without generic DSL.

### First Playable Year

Starting hypothesis:

- 6–10 kernels;
- 3–4 archetypes;
- Learning and Project providers, Career bridge only where needed;
- 2–3 technology/context profiles;
- 12–24 materialized variants;
- no more than two presentation variants per semantic composition;
- explicit coverage targets;
- semantic repeat analysis;
- at least one recovery/follow-up per kernel.

Numbers remain playtest/content-cost hypotheses.

### Recommended

- more providers and professional stages;
- bounded pressure/context composition;
- multi-month professional arcs through Event Engine;
- Content Studio coverage heatmaps;
- author-assisted variant suggestions;
- curated transformation patterns.

### Extended

- leadership/systemic kernels;
- larger organization/open-source contexts;
- offline mixed-initiative authoring assistance;
- optional LLM suggestions producing draft data only;
- richer sequence coverage and arc analysis.

## LLM policy

Baseline runtime LLM generation or judging is forbidden.

An offline authoring assistant may later:

- suggest wording variants;
- propose missing coverage candidates;
- classify near-duplicates;
- draft localization or reason mappings.

Every output must:

- become ordinary data-only content;
- pass the same schemas and semantic validators;
- receive human review;
- receive stable IDs/version;
- have deterministic fixtures;
- never be fetched or regenerated during gameplay.

## Validation gates

Build rejects content when:

- kernel has no concrete professional dilemma;
- context cannot satisfy provider contract;
- pressure is semantically irrelevant;
- approaches are duplicates or one dominates every declared context;
- presentation changes semantics;
- consequence bridge lacks provider/recovery mapping;
- assisted outcome is presented as independent;
- failure/partial has no next step where recovery is required;
- history/technology chronology is invalid;
- composition count exceeds budget;
- stable ID/fingerprint is order-dependent;
- two variants are text-only reskins without declared reason;
- runtime generation is required;
- content directly mutates authoritative state.

## Consequences

Положительные:

- увеличивается reuse без потери domain ownership;
- все runtime ситуации заранее известны и тестируемы;
- repetition измеряется семантически;
- Content Studio может показывать coverage gaps;
- provider, Event, Director и Challenge boundaries остаются чистыми;
- future authoring assistance не становится gameplay authority.

Отрицательные:

- authoring schemas сложнее одной монолитной definition;
- нужны compiler diagnostics и coverage tooling;
- некоторые flagship situations останутся полностью ручными;
- плохой decomposition может давать механический текст;
- generated variant budgets требуют постоянного контроля.

## Источники и исследовательные опоры

- Shaker, Togelius, Nelson, *Procedural Content Generation in Games* — representations, mixed-initiative authoring and evaluation: https://www.pcgbook.com/
- Shoulson, Kapadia, Badler, *PAStE* — event-centric authored units selected/populated by a director: https://doi.org/10.1609/aiide.v9i4.12628
- Poulakos et al., *Towards an Accessible Interface for Story World Building* — trade-offs of event-centric authoring: https://doi.org/10.1609/aiide.v11i4.12833
- Tomai, *Exploring Abductive Event Binding for Opportunistic Storytelling* — binding authored events to ongoing player activity: https://doi.org/10.1609/aiide.v10i1.12731
- Failbetter Games, Quality-Based Narrative/storylets — state-gated authored content and content-debt risks: https://www.failbettergames.com/news/storynexus-developer-diary-2-fewer-spreadsheets-less-swearing
- ink official documentation — modular authored sections, state and deterministic runtime: https://www.inklestudios.com/ink/
- NIST combinatorial testing research — coverage of interactions without exhaustive Cartesian enumeration: https://www.nist.gov/publications/practical-combinatorial-testing-beyond-pairwise
- Kumaran et al., *NarrativeGenie* and *SceneCraft*; Buongiorno et al., *PANGeA* — recent generative approaches demonstrate authoring leverage but still require explicit goals, structure and validation: https://doi.org/10.1609/aiide.v20i1.31868, https://doi.org/10.1609/aiide.v19i1.27504, https://doi.org/10.1609/aiide.v20i1.31876
