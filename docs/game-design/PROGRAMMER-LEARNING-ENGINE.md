---
title: "PROGRAMMER-LEARNING-ENGINE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Programmer Learning, Practice, Mentorship & Access Engine

## Статус

Нормативная межсистемная спецификация.

Основание:

- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Professional Challenge Engine](PROFESSIONAL-CHALLENGE-ENGINE.md).

## 1. Назначение

Подсистема делает период от первого интереса к программированию до первой профессиональной работы полноценной игрой.

```text
learning goal
→ available opportunity
→ learning approach
→ attempt / practice / feedback
→ learning outcome
→ ExperienceEpisode
→ capability and next step
```

Она отвечает игроку:

1. Что персонаж пытается понять или научиться делать?
2. Какие источники и маршруты доступны в эту эпоху и при этом старте?
3. Чем отличаются способы учиться?
4. Что получилось: понимание, повторение, самостоятельное применение или перенос?
5. Как feedback и помощь повлияли на результат?
6. Что теперь можно попробовать без подсказки?

## 2. Boundary map

```text
Equipment / Housing / City-Era / School / Economy / NPC
                         │
                         ▼
                LearningAccessSnapshot
                         │
                         ▼
Self-study / School / Course / Mentor / Community / Project / Career
                         │
                         ▼
                 LearningOpportunity
                         │
                         ▼
               Programmer Learning Engine
              ├─ access validation
              ├─ approach resolution
              ├─ practice/feedback/reflection
              └─ learning reason codes
                         │
                         ▼
                   LearningOutcome
                  ├──────────────┐
                  ▼              ▼
          provider application  ExperienceEpisode
                                      │
                                      ▼
                              Progression Core
```

Learning Engine не владеет устройствами, покупками, отношениями, проектами, технологиями, mastery, evidence или grade.

## 3. Implementation profiles

### 3.1. MVP Casual

Обязательно:

- one beginner learning goal;
- one historically valid source;
- one access snapshot;
- one fallback route for no-home-computer start;
- 2–3 approaches;
- one feedback mode;
- one practice artifact;
- one `LearningOutcome`;
- one `ExperienceEpisode`;
- one capability/next-step explanation;
- deterministic resume/idempotency.

Не обязательно:

- daily schedule;
- full course lifecycle;
- university/certificates;
- adaptive tutoring;
- all source types;
- AI assistance;
- detailed spaced repetition state;
- learning history dashboard.

### 3.2. Recommended

После first-year playtest:

- multiple source affordance profiles;
- books/manuals/classes/mentors/communities/projects;
- routine review and retrieval patterns;
- pair/mentor feedback;
- several beginner technologies;
- first-year learning arcs;
- access evolution by era;
- transfer checks;
- Details mode.

### 3.3. Extended

Позднее:

- formal education and credentials;
- advanced community/network opportunities;
- teaching and mentoring others;
- AI assistance modes;
- long-term technology relearning;
- adaptive tutoring;
- multi-decade source ecosystems.

## 4. Терминология

| Понятие | Значение | Player-facing MVP |
|---|---|---:|
| Learning Goal | конкретная способность или понимание, к которому стремится персонаж | Да |
| Learning Source | материал, человек, среда или опыт | Да |
| Source Affordance | какой тип обучения источник реально поддерживает | Через описание |
| Learning Opportunity | доступное занятие в конкретном контексте | Да |
| Learning Approach | способ работать с возможностью | Да |
| Learning Attempt | зафиксированная попытка в MonthRun | Нет |
| Practice Artifact | пример, упражнение, программа, explanation или modification | Через результат |
| Feedback Mode | форма помощи и проверки | Да, простыми словами |
| Learning Outcome | причинный учебный результат | Да |
| Transfer Check | применение идеи в новом контексте | Через capability |
| Access Route | способ получить устройство, материал, время или помощь | Да при барьере |

## 5. Source affordances

Источник не является числовым бонусом. Он описывается возможностями:

```ts
type LearningSourceAffordances = Readonly<{
  conceptualExplanation: AffordanceBand;
  workedExamples: AffordanceBand;
  guidedPractice: AffordanceBand;
  independentPractice: AffordanceBand;
  retrievalPractice: AffordanceBand;
  transferPractice: AffordanceBand;
  feedback: FeedbackAvailability;
  collaboration: CollaborationAvailability;
  authenticContext: AuthenticityBand;
  informationQuality: InformationQualityBand;
  historicalRecency: SourceRecencyBand;
}>;
```

MVP может хранить упрощённый subset и не показывает матрицу игроку.

### Baseline source families

#### Book / printed manual

Сильные стороны: structured explanation, worked examples, durable reference.

Ограничения: delayed/no feedback, possible obsolescence, material/access cost.

#### Guided class / club / course

Сильные стороны: sequence, scaffolding, feedback, peer context.

Ограничения: schedule, availability, fixed pace, quality variation.

#### Documentation / reference

Сильные стороны: точность для конкретной технологии и задачи.

Ограничения: требует базы, может быть трудна новичку, version-specific.

#### Worked example / listing

Сильные стороны: снижает стартовую когнитивную нагрузку, показывает структуру решения.

Ограничения: копирование без explanation создаёт fragile understanding.

#### Practice set

Сильные стороны: repetition, retrieval, fluency.

Ограничения: слабый transfer и evidence при однообразии.

#### Personal project

Сильные стороны: autonomy, integration, motivation, authentic challenge.

Ограничения: uncertainty, risk of getting stuck, weak feedback.

#### Mentor / pair / community

Сильные стороны: hints, explanation, review, calibrated challenge, recovery.

Ограничения: availability, compatibility, dependence, reduced autonomy when assistance is strong.

#### Reverse engineering / existing code

Сильные стороны: code reading, diagnosis, patterns, systems thinking.

Ограничения: high prerequisite, unclear quality, risk of copying bad practice.

## 6. Learning opportunity

```ts
type LearningOpportunity = Readonly<{
  id: LearningOpportunityId;
  provider: LearningProviderKind;
  sourceRef: LearningSourceRef;
  goalId: LearningGoalId;
  title: LocalizationKey;
  summary: LocalizationKey;
  access: LearningAccessRequirement;
  approaches: readonly LearningApproachOption[];
  relevantSkills: readonly SkillId[];
  technologyId?: TechnologyId;
  challengeBand: CasualChallengeBand;
  feedbackAvailability: FeedbackAvailability;
  contextFingerprint: ContextFingerprint;
  providerRevision: ProviderRevision;
  contentVersion: ContentVersion;
}>;
```

Обычная opportunity показывает один ясный goal и 2–4 approaches. Она не выводит педагогические термины или exact multipliers.

## 7. Learning access

```ts
type LearningAccessSnapshot = Readonly<{
  deviceAccess: DeviceAccessBand;
  sourceAccess: SourceAccessBand;
  timeAccess: TimeAccessBand;
  languageAccess: LanguageAccessBand;
  feedbackAccess: FeedbackAccessBand;
  connectivityAccess: ConnectivityAccessBand;
  costBand: CostBand;
  routeRefs: readonly AccessRouteId[];
  fingerprint: AccessFingerprint;
}>;
```

Это projection из других доменов, а не новый authoritative inventory.

### Access barriers

- no personal device;
- limited/shared device time;
- unavailable local source;
- unaffordable material/equipment;
- language barrier;
- no feedback/community;
- obsolete or incompatible equipment;
- weak connectivity;
- family/school time constraint.

### Recovery routes

Content обязан предоставить минимум один достижимый route, если барьер блокирует весь professional path:

- school lab;
- club/library/community center;
- borrowed/shared device;
- mentor/friend access;
- used or older equipment;
- part-time saving route;
- printed/offline materials;
- later retry with visible condition.

Access route меняет историю и цену, но не выдаёт skill или grade.

## 8. Learning approaches

Baseline vocabulary:

- `study-worked-example`;
- `self-explain`;
- `modify-example`;
- `retrieve-without-notes`;
- `guided-practice`;
- `independent-practice`;
- `ask-for-hint`;
- `pair-or-mentor`;
- `apply-in-project`;
- `compare-and-reflect`.

```ts
type LearningApproachOption = Readonly<{
  id: LearningApproachId;
  label: LocalizationKey;
  forecast: LocalizationKey;
  tradeOffs: readonly LocalizationKey[];
  assistanceMode: AssistanceMode;
  practiceMode: PracticeMode;
  availability: ApproachAvailability;
}>;
```

### Правила

- source limits which approaches are possible;
- no approach is universally optimal;
- passive reading may build understanding but not independent delivery;
- worked example is strongest when followed by explanation/modification;
- retrieval and transfer are useful only when difficulty remains reachable;
- independent practice may fail with learning and a recovery path;
- help may improve understanding while reducing autonomy claim;
- routine review is auto-resolved and aggregated.

## 9. Assistance and feedback

### Assistance modes

```text
none
→ hint
→ conceptual-explanation
→ guided-walkthrough
→ pair-work
→ takeover
```

### Feedback timing

- immediate;
- end-of-attempt;
- delayed;
- self-check only;
- unavailable.

### Feedback quality

- misleading/obsolete;
- weak;
- adequate;
- strong;
- calibrated.

Mentor/provider owns the availability and quality fact. Learning Engine interprets its effect on attempt and episode facts.

### Mentorship rules

- mentor cannot directly mint mastery/evidence/grade;
- `hint` preserves more autonomy than `guided-walkthrough`;
- pair work can create strong learning but not solo capability automatically;
- takeover may complete provider goal with minimal learning;
- repeated trivial help aggregates;
- mentor relationship can open opportunities, not guaranteed success;
- teaching/mentoring evidence for the mentor requires learner downstream outcome.

## 10. Practice modes

### Observe

Посмотреть demonstration или разобранный пример.

### Explain

Сформулировать, почему решение работает и какие шаги важны.

### Reproduce

Повторить знакомое решение с ограниченной подсказкой.

### Modify

Изменить пример или применить идею к близкой задаче.

### Retrieve

Воспроизвести ключевой шаг без исходного решения.

### Transfer

Использовать идею в новом контексте.

### Integrate

Применить несколько идей в проекте или technical challenge.

Player-facing UI не показывает эти категории как семь progress bars.

## 11. Learning attempt and outcome

```ts
type LearningAttempt = Readonly<{
  id: LearningAttemptId;
  opportunityId: LearningOpportunityId;
  selectedApproachId: LearningApproachId;
  accessFingerprint: AccessFingerprint;
  capabilitySnapshot: CapabilitySnapshot;
  sourceSnapshot: LearningSourceSnapshot;
  capacitySnapshot: CapacitySnapshot;
  feedbackSnapshot: FeedbackSnapshot;
  repetitionFingerprint: ContextFingerprint;
  rulesVersion: RulesVersion;
}>;
```

```ts
type LearningOutcome = Readonly<{
  id: LearningOutcomeId;
  attemptId: LearningAttemptId;
  outcomeClass: LearningOutcomeClass;
  comprehensionBand: LearningProgressBand;
  practiceBand: LearningProgressBand;
  transferBand: LearningProgressBand;
  assistanceMode: AssistanceMode;
  feedbackBand: FeedbackBand;
  practiceArtifact?: LearningArtifactSnapshot;
  challengeOutcomeRef?: ProfessionalChallengeOutcomeId;
  episodeFacts: ExperienceEpisodeFacts;
  reasonCodes: readonly LearningReasonCode[];
  nextStepIds: readonly LearningNextStepId[];
  milestoneCandidate?: CapabilityMilestoneId;
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

### Outcome classes

- `understood-concept`;
- `reproduced-with-guidance`;
- `modified-with-support`;
- `applied-independently`;
- `transferred-to-new-context`;
- `partial-with-learning`;
- `blocked-with-recovery`.

MVP может использовать меньший subset. Internal bands не выводятся как exact percentages.

## 12. Resolution pipeline

```text
validate provider/access revision
→ load source/opportunity snapshot
→ validate selected approach
→ evaluate prior capability and challenge match
→ resolve practice + feedback + reflection
→ optionally resolve Professional Challenge
→ create LearningOutcome and reason codes
→ provider applies costs/domain facts
→ create ExperienceEpisode
→ Progression calculates professional delta
```

### Primary inputs

- source affordances;
- access snapshot;
- selected approach;
- prior mastery/fluency/familiarity projection;
- current capacity;
- novelty/repetition;
- feedback availability/quality;
- assistance mode;
- challenge outcome when present;
- versioned deterministic rules.

### Anti-shortcut rules

- reading alone does not create independent delivery;
- copying a correct solution without explanation/transfer is fragile;
- repeated easy practice has diminishing value;
- failure can improve diagnosis/reflection but not full completion;
- strong assistance can improve learning and still reduce autonomy;
- source prestige/price does not directly create competence;
- credential does not equal grade;
- latest source is not always accessible or appropriate;
- successful project outcome does not guarantee understanding if work was delegated.

## 13. Spacing, retrieval, interleaving and reflection

These are implementation factors, not player chores.

### Baseline behavior

- routine review becomes `MonthlyPracticeAggregate`;
- next-step suggestions may return to a skill after a gap;
- retrieval succeeds only within reachable difficulty;
- variation and transfer matter more than repeating identical examples;
- reflection can upgrade a confusing outcome into clearer learning;
- short-term fluency may feel easier after massed practice, while long-term mastery needs varied revisits.

Exact scheduling algorithms are deferred. The game must not become a flashcard planner.

## 14. Historical source ecosystem

### 1990s

- printed manuals/books/magazines;
- school labs and clubs;
- copied listings and disks;
- local peers/teachers;
- documentation bundled with tools;
- BBS and early network communities where locally available.

### 2000s

- web tutorials and forums;
- IRC/community help;
- downloadable documentation;
- growing open-source code;
- wider home PC/internet access.

### 2010s

- video courses;
- Q&A platforms;
- Git hosting and public repositories;
- bootcamps and interactive platforms;
- broad framework ecosystems.

### 2020s

- AI explanations and coding assistants;
- interactive sandboxes;
- abundant but uneven content;
- higher speed and lower search cost;
- increased verification and shallow-understanding risks.

These are era profiles. Exact global/local dates belong to Historical Catalog and source registry.

## 15. AI-era learning

### AI assistance modes

- explain concept;
- give hint;
- generate example;
- diagnose error;
- generate full solution;
- review/compare solution.

### Learning interpretation

- explanation + learner self-explanation can support mastery;
- hint preserves more agency than full generation;
- generated example followed by modification/verification can create practice;
- full delegation can improve delivery with weak comprehension/transfer;
- incorrect output tests programming literacy and verification;
- AI availability never creates evidence by itself.

Context flags may include:

- `fragile-understanding`;
- `unverified-generated-solution`;
- `verified-ai-assisted-solution`;
- `ai-supported-transfer`.

No universal AI dependence meter in baseline.

## 16. Player-facing report

Normal mode answers:

```text
Что изучалось?
Как персонаж работал с материалом?
Что он понял или смог сделать?
Как повлияла помощь?
Что попробовать дальше?
```

Example:

```text
Вы разобрались с проверкой ввода

Сначала вы изменили готовый пример, а затем повторили решение без подсказки.
Помогло: в руководстве был понятный рабочий пример.
Пока не доказано: самостоятельная отладка в незнакомой программе.

Следующий шаг: применить проверку ввода в собственном проекте.
```

Не используются слова `affordance`, `retrieval coefficient`, `evidence claim` или exact percentages.

## 17. First-year content spine

Recommended first-year sequence:

1. получить beginner access;
2. запустить или увидеть первый пример;
3. изменить пример;
4. объяснить ключевой шаг;
5. воспроизвести небольшую часть;
6. применить в первой собственной программе;
7. столкнуться с ошибкой;
8. получить hint/review или решить самостоятельно;
9. повторно применить идею в другом контексте;
10. выбрать следующий learning/project direction.

Это не жёсткая линейная кампания. Access routes, source quality и mentor availability создают несколько траекторий.

## 18. Content authoring

Learning content обязано содержать:

- clear goal;
- source family and affordances;
- era/local availability;
- access requirements and fallback/retry;
- 2–4 relevant approaches when blocking;
- feedback/assistance possibilities;
- practice artifact or observable result;
- valid outcomes;
- reason-code mappings;
- ExperienceEpisode facts;
- next steps;
- anti-repeat fingerprint;
- localization and source refs where historical.

Validation rejects content when:

- source directly changes skills/grade;
- expensive source always dominates;
- no-home-computer start has no route;
- passive reading creates independent capability;
- assistance is mislabeled as autonomy;
- failure has no recovery;
- historical source appears before availability;
- player must understand syntax to choose;
- daily schedule or dozens of activities are required for ordinary month.

## 19. Persistence and MonthRun

Before decision persist:

- opportunity/source/access snapshots;
- available approach IDs/content versions;
- provider revision;
- feedback/mentor availability;
- rules/RNG fingerprints.

After decision persist:

- selected approach;
- attempt snapshot;
- provisional learning outcome;
- challenge outcome ref when present;
- provider application draft;
- episode facts and explanation.

Duplicate answer/resume does not duplicate costs, learning outcome, challenge outcome or progression.

## 20. Balance targets

MVP:

- learning goal understood without guide;
- approach selected in 10–20 seconds when blocking;
- player distinguishes understanding from independent ability;
- no source/mentor strategy dominates all contexts;
- no access background is permanently blocked;
- report explains at least two causes;
- reload does not reroll;
- majority wants the next learning/project step.

First-year:

- multiple viable routes;
- time to first modification, independent practice and transfer;
- source/approach diversity;
- mentor/help use without autonomy inflation;
- routine practice not perceived as grind;
- repeated source/content fatigue controlled;
- projects emerge before learning becomes a long prologue.

## 21. Vertical Slice integration

January 1990 uses only a small bridge:

- one historically valid beginner source;
- one simple access route;
- one non-blocking or short learning choice;
- one modification/reproduction outcome;
- one learning episode that prepares the invalid-input project challenge;
- no separate education screen required.

The slice still has only one project blocking decision. Learning cannot steal focus from the first technical challenge.

## 22. Deferred

- daily/weekly schedule;
- complete education institution simulation;
- hundreds of courses;
- certificates and exams as core loop;
- exact spaced repetition algorithm;
- adaptive Bayesian learner model;
- LLM tutoring/judging in baseline;
- global knowledge XP;
- every tutorial/platform as unique state;
- AI dependence score;
- multi-region education market.

## 23. Invariants

- learning is not a generic XP button;
- source differs by affordances, access and context;
- understanding, practice, transfer and evidence remain distinct;
- Learning Engine does not own access or professional state;
- meaningful technical problems use Challenge Engine;
- Progression confirms capability/grade;
- assistance improves learning without false autonomy;
- no permanent bad start from equipment/income;
- routine practice aggregates;
- historical availability has provenance;
- no daily schedule in baseline;
- visible result remains deterministic after reload.

## 24. Definition of Done

MVP learning flow готов, когда:

- player states the learning goal;
- understands why available sources differ;
- chooses a learning approach without pedagogical jargon;
- sees an observable artifact/result;
- distinguishes guided result from independent capability;
- receives one useful next step;
- low-access fixture reaches meaningful practice;
- provider/Challenge/Progression ownership is preserved;
- reload/duplicate answer is deterministic/idempotent;
- normal UI does not resemble school planner or course marketplace.