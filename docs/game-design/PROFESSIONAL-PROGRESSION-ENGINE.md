# Professional Progression & Evidence Engine

## Статус

Нормативная межсистемная спецификация. Решения об authoritative state, evidence и grade ownership зафиксированы в [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

Спецификация детализирует [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md) и не передаёт Progression Core владение проектами, работой, курсами или событиями.

## 1. Назначение

Подсистема отвечает на четыре вопроса:

1. Что персонаж понял и освоил как программист?
2. Насколько уверенно он применяет skills и technologies сейчас?
3. Что конкретный результат доказал о его профессиональных capabilities?
4. Какие грейды и профессиональные возможности готовы или близки?

Центральная цепочка:

```text
Experience Provider outcome
→ ExperienceEpisode
→ mastery / fluency / familiarity assessment
→ ProfessionalEvidence or MonthlyPracticeAggregate
→ GradeReadiness projections
→ explainable progression delta
```

## 2. Boundary map

```text
Education ───────┐
Projects ────────┤
Career ──────────┤
Open Source ─────┼──> ExperienceEpisode ──> Professional Progression Core
Company ─────────┤                              │
Events ──────────┘                              ├─ professional state delta
                                               ├─ evidence candidates
                                               ├─ readiness projections
                                               └─ explanations

MonthRunner: orchestration/checkpoints/RNG/commit
Rust Persistence: authoritative atomic write
UI: read models only
```

### Progression Core владеет

- `CharacterProfessionalState`;
- aptitude profile;
- skill mastery/fluency;
- technology familiarity;
- professional focus;
- monthly practice accumulators;
- experience assessment;
- evidence materialization rules;
- grade profile/projection rules;
- progression trace и explanations.

### Progression Core не владеет

- project scope, debt, bugs и release lifecycle;
- vacancy, salary, employer и promotion decisions;
- course schedule и education institution;
- event eligibility и narrative pacing;
- health/fatigue authoritative state;
- SQLite transaction;
- UI navigation.

## 3. Терминология

| Понятие | Определение | Authoritative |
|---|---|---:|
| Aptitude | Медленно меняющаяся предрасположенность к reasoning/learning | Да |
| Skill | Переносимая способность выполнять класс профессиональных действий | Да |
| Facet | Детализация задачи для matching/explanation; не отдельная шкала | Обычно нет |
| Capability | Понятное игроку утверждение о доказанной способности | Derived |
| Technology | Язык/framework/platform/tool с gameplay-значимым lifecycle | Tier A/B |
| Technology family | Группа transfer и общих mechanics | Definition |
| Version band | Крупная compatibility/era-линия технологии | При необходимости |
| Specialization | Derived профиль устойчивого опыта в домене | Derived |
| Professional focus | Выбранный игроком приоритет развития | Да |
| Mastery | Устойчивое переносимое понимание | Да |
| Fluency | Текущая скорость и уверенность применения skill | Да |
| Familiarity | Актуальная практическая близость к technology/version band | Да |
| ExperienceEpisode | Нормализованный результат от provider | Draft/input |
| Evidence | Неизменяемое доказательство capability в контексте | Append-only |
| Grade award | Зафиксированный достигнутый professional grade | Да |
| Grade readiness | Перестраиваемая оценка готовности | Derived |
| Current market readiness | Оценка актуальности для рынка/роли | Derived |
| Position/role/title | Организационная позиция; не professional grade | В Career domain |

## 4. Aptitudes

Baseline использует две aptitude-характеристики:

- `reasoningAptitude`;
- `learningAdaptability`.

Они:

- хранятся как integer score 0–1000;
- обычно модифицируют learning в узком диапазоне около 9000–11000 bps;
- не определяют grade;
- не создают необратимо слабого персонажа;
- изменяются редко через жизненные события/traits, а не обычный XP grind.

`Self-Organization` моделируется skill/facetами planning/delivery и текущими statuses. `Communication` моделируется `technical-communication`. Focus, fatigue и motivation принадлежат current capacity, а не aptitude.

## 5. Baseline skill graph

### Tier 1 — всегда видимы

| ID | Skill | Что моделирует |
|---|---|---|
| `skill.problem-solving` | Problem Solving | Декомпозиция, алгоритмический подход, technical research |
| `skill.programming` | Programming | Реализация понятого решения |
| `skill.debugging` | Debugging | Чтение кода, поиск причины, проверка исправления |
| `skill.data-modelling` | Data Modelling | Представление сущностей, данных и состояния |
| `skill.testing-quality` | Testing & Quality | Проверка результата и предотвращение regressions |
| `skill.codebase-evolution` | Codebase Evolution | Refactoring, legacy и безопасные изменения |

### Tier 2 — открываются по мере роста

| ID | Skill | Что моделирует |
|---|---|---|
| `skill.requirements-design` | Requirements & Design | Уточнение проблемы и проектирование решения |
| `skill.architecture` | Architecture | Системные границы и trade-offs |
| `skill.delivery-operations` | Delivery & Operations | VCS, build, release, deployment, observability |
| `skill.non-functional` | Non-functional Engineering | Performance, reliability и security |
| `skill.technical-communication` | Technical Communication | Документация, объяснение решений и согласование |
| `skill.review-leadership` | Review, Mentoring & Leadership | Review, mentoring, technical direction |
| `skill.community-stewardship` | Community Stewardship | Governance и здоровье open-source сообщества |

Version control, incident handling, security и performance могут быть task facets; отдельная authoritative шкала добавляется только новым review, если facet регулярно создаёт самостоятельные решения и progression.

## 6. Professional state

```ts
type CharacterProfessionalState = Readonly<{
  schemaVersion: ProfessionalStateSchemaVersion;
  aptitudes: ProfessionalAptitudeState;
  skills: Readonly<Record<SkillId, SkillState>>;
  technologies: Readonly<Record<TechnologyId, TechnologyProficiencyState>>;
  professionalFocus: ProfessionalFocus;
  awardedGrades: readonly ProfessionalGradeAward[];
  monthlyPractice: Readonly<Record<PracticeAggregateKey, PracticeAccumulator>>;
}>;

type SkillState = Readonly<{
  skillId: SkillId;
  mastery: MasteryPoint;       // integer 0..100000
  fluency: FluencyPoint;       // integer 0..100000
  lastPracticedMonth: MonthIndex;
  strongestDemonstratedBand: CapabilityBand;
}>;

type TechnologyProficiencyState = Readonly<{
  technologyId: TechnologyId;
  familyId: TechnologyFamilyId;
  conceptualFamiliarity: FamiliarityPoint;
  operationalFamiliarity: FamiliarityPoint;
  versionBand?: TechnologyVersionBandId;
  versionRecency: RecencyPoint;
  lastPracticedMonth: MonthIndex;
}>;
```

Values 0–100000 являются internal fixed-point progress и не показываются как обязательные UI percentages.

## 7. Experience Provider contract

```ts
type ExperienceEpisode = Readonly<{
  id: ExperienceEpisodeId;
  provider: ExperienceProviderKind;
  source: ExperienceSourceRef;
  period: GameDateRange;
  challenge: ChallengeProfile;
  participation: ParticipationProfile;
  practice: PracticeProfile;
  outcome: OutcomeProfile;
  feedback: FeedbackProfile;
  skillApplications: readonly SkillApplication[];
  technologyApplications: readonly TechnologyApplication[];
  contextFingerprint: ContextFingerprint;
}>;
```

Provider гарантирует:

- source существовал и был eligible;
- outcome соответствует состоянию provider domain;
- вклад персонажа отделён от общего командного результата;
- assistance/mentorship отражены;
- episode ID стабилен в текущем MonthRun.

Progression гарантирует:

- deterministic assessment;
- integer/fixed-point calculations;
- anti-repeat/dedup;
- evidence claims только для доказанных dimensions;
- explainable delta.

## 8. Challenge model

`ChallengeProfile` хранит несколько dimensions 0–7:

- conceptual complexity;
- implementation complexity;
- ambiguity;
- system scope;
- integration surface;
- quality criticality;
- operational risk;
- coordination requirement;
- novelty.

Не все dimensions обязаны быть ненулевыми.

Human-readable summary использует основной band:

```text
Observed → Guided → Routine → Independent → Complex → Systemic → Strategic → Frontier
```

Общий band не является простым средним. Content/provider объявляет principal band, а semantic validator проверяет его согласованность с dimension profile.

## 9. Activity и task ownership

- `ProfessionalActivityState` принадлежит provider, создающему commitment.
- `ProfessionalTaskState`/`WorkPackageState` принадлежит Project/Career/Education provider.
- Progression не хранит полный task lifecycle.
- Для suspend/resume MonthRun provider checkpoint хранит промежуточное состояние, а progression checkpoint — уже созданные episode/delta/evidence candidates.

Задача может давать:

- completed outcome;
- partial progress;
- diagnosis without fix;
- failed attempt;
- recovered outcome;
- technical debt;
- discovered uncertainty;
- blocked/deferred state.

Partial outcome не подтверждает full delivery.

## 10. Три независимых расчёта

### 10.1. Mastery gain

```text
masteryGain = roundHalfEven(
  basePractice
  × challengeMatchBps
  × noveltyBps
  × feedbackBps
  × reflectionBps
  × capacityBps
  × diminishingBps
  / 10000^6
)
```

Autonomy не входит как прямой штраф к learning. Assisted task может дать сильное mastery при хорошем feedback.

Стартовые ranges:

- challenge match: 2500–12500 bps;
- novelty: 1000–12000 bps;
- feedback: 4000–13000 bps;
- reflection: 5000–12000 bps;
- capacity: 3000–11000 bps;
- diminishing: 500–10000 bps.

### 10.2. Fluency/familiarity

Fluency растёт от применённой практики и outcome stability. Familiarity дополнительно зависит от technology/version use.

```text
fluencyGain = baseFluency × practiceBps × outcomeBps × recencyRecoveryBps
familiarityGain = baseFamiliarity × useBps × ecosystemFeedbackBps × versionMatchBps
```

### 10.3. Evidence assessment

Evidence не является суммой mastery gain.

```text
claimStrength =
  challengeBandBase
  × completionBps
  × qualityBps
  × autonomyBps
  × confidenceBps
  × contextNoveltyBps
  × antiRepeatBps
```

Провал может дать Debugging/Recovery claim, но Delivery/Quality остаются отсутствующими.

Все multiplications используют checked integer intermediate и explicit rounding.

## 11. Optimal challenge zone

| Состояние | Learning | Evidence | Failure risk | Fatigue |
|---|---|---|---|---|
| Слишком просто | Низкий mastery; поддерживает fluency | Routine/reliability aggregate | Низкий | Низкий |
| Оптимально | Высокий mastery | Сильные claims текущего/следующего band | Умеренный | Умеренный |
| Сложно с поддержкой | Высокий mastery | Низкая autonomy, хороший quality/learning | Средний | Средний–высокий |
| Чрезмерно сложно | Ограниченный mastery | Diagnosis/recovery only | Высокий | Высокий |
| Невозможно | Нет normal completion | Evidence не создаётся | Почти гарантирован | Blocking/refusal |

Повторение простой работы может поддерживать доход, reliability reputation, mentoring и speed, но anti-repeat/diminishing запрещают грейдовый фарм.

## 12. Mastery, fluency, familiarity и recency

### Mastery

- почти не снижается;
- хранит устойчивое понимание;
- определяет transfer floor;
- не понижается обычным перерывом.

### Fluency

- имеет grace period;
- после длительного неиспользования медленно стремится к floor, зависящему от mastery;
- быстро восстанавливается через reacquisition bonus.

### Familiarity

- отражает operational use technology/version band;
- может снижаться при ecosystem/version change;
- conceptual familiarity снижается медленнее operational.

### Evidence recency

Не мутируется каждый месяц. Вычисляется projection:

```text
recencyWeight = halfLifeMonths × 10000 / (halfLifeMonths + ageMonths)
```

Recency влияет на current market readiness, но не стирает grade award.

## 13. Technology model

### Tier A

Самостоятельная progression/lifecycle/choices.

### Tier B

Имеет identity и limited state; большая часть transfer/progression наследуется от family.

### Tier C

Requirement/tag/flavour; отдельного state/progress bar нет.

`TechnologyVersionBand` создаётся только если существенно меняются минимум два фактора: paradigm/API, tooling/ecosystem, compatibility, market demand, project risk или learning burden.

## 14. Transfer

Runtime использует directed sparse edges:

```ts
type TransferEdge = Readonly<{
  from: TechnologyFamilyId;
  to: TechnologyFamilyId;
  conceptualBps: BasisPoints;
  initialLearningBps: BasisPoints;
  fluencyReacquisitionBps: BasisPoints;
  reasonTags: readonly TransferReasonTag[];
}>;
```

Несколько transfer sources объединяются diminishing fold. Transfer не создаёт evidence и не повышает grade напрямую.

## 15. Specialization

- `ProfessionalFocus` — authoritative выбор/приоритет игрока;
- `SpecializationProfile` — derived projection skills/evidence/technologies/contexts;
- primary/secondary показываются только при достаточной confidence;
- generalist определяется устойчивым evidence в нескольких domains, а не отсутствием specialization;
- смена пути сохраняет mastery/transfer, но требует новых production contexts.

## 16. Evidence

```ts
type ProfessionalEvidenceEvent = Readonly<{
  id: ProfessionalEvidenceId;
  schemaVersion: EvidenceSchemaVersion;
  rulesVersion: RulesVersion;
  period: GameDateRange;
  source: EvidenceSourceSnapshot;
  context: EvidenceContextSnapshot;
  outcome: EvidenceOutcome;
  claims: readonly EvidenceClaim[];
  assistance: AssistanceProfile;
  antiRepeatKey: EvidenceAntiRepeatKey;
  contentFingerprint: ContentFingerprint;
  traceHash: TraceHash;
}>;

type EvidenceClaim = Readonly<{
  dimension: EvidenceDimension;
  skillId?: SkillId;
  technologyId?: TechnologyId;
  demonstratedBand: CapabilityBand;
  strength: EvidenceScore;   // 0..1000
  confidence: EvidenceScore; // 0..1000
  autonomy: EvidenceScore;   // 0..1000
  reasonCodes: readonly EvidenceReasonCode[];
}>;
```

### Evidence dimensions

Core:

- craft;
- complexity;
- autonomy;
- quality;
- delivery-ownership.

Profile:

- depth;
- breadth-transfer;
- leverage-collaboration;
- impact.

### Materialization

```text
candidate in MonthRun draft
→ validate source/context
→ anti-farming/dedup
→ materialize immutable event
→ atomic commit
→ projection update
```

Evidence ID:

```text
hash(saveId, monthRunId, episodeId, outcomeOrdinal, rulesVersion)
```

Routine practice создаёт `MonthlyPracticeAggregate`, а не full evidence event.

## 17. Grade model

### Capability bands

```text
Observed, Guided, Routine, Independent, Complex, Systemic, Strategic, Frontier
```

### Gate policy

Грейд требует:

1. floors по core dimensions;
2. минимальное число qualifying claims;
3. несколько distinct contexts;
4. устойчивость в заданном периоде;
5. подходящий profile gate;
6. отсутствие critical deficit.

Среднее значение девяти dimensions не используется как grade rule.

### Grade state

```ts
type ProfessionalGradeAward = Readonly<{
  grade: ProfessionalGrade;
  awardedAt: GameDate;
  rulesVersion: RulesVersion;
  evidenceSetHash: EvidenceSetHash;
  profile: GradeProfileId;
}>;
```

`DemonstratedGradeReadiness` использует all-time evidence. `CurrentMarketReadiness` дополнительно учитывает recency, technology relevance и current fluency.

Grade не понижается автоматически. Рынок может считать Senior rusty/outdated, не переписывая достигнутый milestone.

## 18. Grade capability outline

- **Beginner:** Guided/Routine learning tasks; понимает простые программы и меняет их с помощью.
- **Intern:** supervised contribution; feedback обязателен; production ownership отсутствует.
- **Junior:** Independent bounded task; debugging/testing/delivery в понятном scope.
- **Middle:** feature/subsystem ownership end-to-end; ambiguity/design/collaboration.
- **Senior:** Systemic ambiguity, risk, architecture, sustained delivery, mentoring/technical direction.
- **Top Programmer:** отдельный редкий endgame status; требует длительного frontier/strategic impact и achievements, а не только readiness score.

Title, role, salary, reputation и fame не заменяют эти gates.

## 19. Provider evidence rules

| Источник | Mastery | Fluency | Production evidence | Impact |
|---|---:|---:|---:|---:|
| Книга/лекция | Да | Нет | Нет | Нет |
| Курс | Да | Низко | Учебное | Нет |
| Упражнение | Да | Да | Нет/учебное | Нет |
| Pet project | Да | Да | Да | Низко–средне |
| Рабочая задача | Да | Да | Да | По scope |
| Bug fix | Да | Да | Да | По criticality |
| Code review | Да | Средне | Collaboration/review | По downstream result |
| Incident | Да | Да | Reliability/recovery | Высоко |
| Release | Низко | Да | Delivery | По вкладу |
| OSS contribution | Да | Да | Да | По adoption |
| Maintenance | Низко | Высоко | Aggregate | Низко–средне |
| Mentoring | Да | Низко | Leverage | По learner outcome |
| Architecture decision | Да | Средне | Architecture | Только при sustained result |
| Talk/article | Consolidation | Нет | Communication | По качеству/reach |
| Technical direction | Да | Низко | Leadership | По organisational result |

Narrative choice не создаёт mastery/evidence без provider outcome.

## 20. MonthRun integration

Versioned phases:

```text
world/calendar
→ life capacity
→ commitments/work allocation
→ provider task advancement
→ uncertainty/blocking checkpoint
→ provider outcomes
→ ExperienceEpisode materialization
→ progression assessment
→ draft evidence/practice aggregates
→ skill/technology updates
→ grade/market projections
→ cross-system invariants
→ atomic commit
```

Checkpoint хранит:

- episode candidates;
- progression phase/step;
- pending evidence IDs;
- skill/technology draft deltas;
- anti-repeat state;
- progression trace hash.

Duplicate resume не потребляет RNG и не создаёт новый evidence ID.

## 21. Persistence logical model

Authoritative snapshot:

- `character_professional_state`;
- `professional_skill_state`;
- `technology_proficiency_state`;
- `professional_focus_state`;
- `professional_grade_awards`.

Append-only:

- `professional_evidence_events`;
- `professional_evidence_claims`;
- `monthly_practice_aggregates`;
- `professional_progression_migrations`.

Rebuildable:

- readiness cache;
- specialization profile;
- evidence search/index;
- capability cards;
- monthly professional report.

Evidence semantic snapshot сохраняется даже при missing mod/content. Compaction не входит в vertical slice.

## 22. UI read models

- `ProfessionalSummaryReadModel`;
- `SkillCapabilityReadModel`;
- `TechnologyProficiencyReadModel`;
- `GradeReadinessReadModel`;
- `EvidenceTimelineReadModel`;
- `LearningOptionReadModel`;
- `TaskChallengeReadModel`;
- `ProgressionDeltaReadModel`;
- `MonthlyProfessionalReportReadModel`.

Normal mode показывает capabilities и причины. Advanced mode показывает dimensions, evidence, transfer и lifecycle. Exact hidden weights не являются обязательным UI.

## 23. Anti-exploit policy

- easy-task repeats: diminishing + routine aggregate;
- parallel activity spam: work-unit/context-switching/capacity constraints;
- evidence without completion: claims ограничены partial outcome;
- intentional failure: anti-repeat и no delivery/quality claims;
- mentor abuse: learning растёт, autonomy claim снижается;
- technology hopping: transfer не создаёт evidence;
- shallow breadth: distinct meaningful contexts и minimum strength;
- title/salary/fame shortcuts: не входят в grade gates;
- management shortcut: leadership evidence не заменяет craft/core floors;
- save-scumming: deterministic draft RNG/state;
- event farming: event не создаёт evidence без outcome.

## 24. Vertical slice scope

Январь 1990 реализует только:

- 2 aptitudes;
- 5 skills: Problem Solving, Programming, Debugging, Data Modelling, Testing & Quality;
- 1 technology family;
- 1 technology;
- 1 hands-on activity;
- 1 technical challenge;
- bands Guided/Routine/Independent/Complex;
- independent/assisted/partial/failure outcomes;
- mastery и fluency;
- 1 ExperienceEpisode;
- evidence claims;
- простой readiness summary;
- deterministic restart fixture.

Не входят: Senior gates, endgame, full transfer matrix, evidence compaction, Founder/CTO evidence.

## 25. Public Core API

```ts
evaluateExperienceEpisode(
  state: CharacterProfessionalState,
  episode: ExperienceEpisode,
  rules: ProgressionRules,
): ProfessionalAssessment;

applyProfessionalAssessment(
  state: CharacterProfessionalState,
  assessment: ProfessionalAssessment,
): ProfessionalProgressionDelta;

materializeProfessionalEvidence(
  context: EvidenceMaterializationContext,
  assessment: ProfessionalAssessment,
): readonly ProfessionalEvidenceEvent[];

calculateDemonstratedGradeReadiness(
  state: CharacterProfessionalState,
  evidence: EvidenceProjectionInput,
  profiles: GradeProfileRegistry,
): DemonstratedGradeReadiness;

calculateCurrentMarketReadiness(
  demonstrated: DemonstratedGradeReadiness,
  state: CharacterProfessionalState,
  market: MarketReadinessContext,
): CurrentMarketReadiness;

buildProfessionalReport(
  delta: ProfessionalProgressionDelta,
  evidence: readonly ProfessionalEvidenceEvent[],
  readiness: GradeReadinessProjection,
): MonthlyProfessionalReportReadModel;
```

MonthRunner вызывает эти pure functions. Content lookup выполняется до вызова либо через immutable compiled registries. Persistence и UI не входят в Core API.

## 26. Invariants

- provider outcome является источником episode truth;
- evidence всегда имеет source/context snapshot;
- grade не создаётся XP threshold или weighted average;
- transfer не создаёт production evidence;
- partial outcome не становится full delivery;
- помощь снижает autonomy evidence, но не learning автоматически;
- short break не стирает mastery/grade;
- technology unavailable in era не используется provider;
- Tier C не имеет proficiency state;
- duplicate run/resume не дублирует evidence;
- awarded grade не понижается автоматически;
- readiness projection rebuildable;
- all calculations integer/fixed-point;
- progression trace bounded и deterministic.

## 27. Testing

### Unit

- challenge matching;
- mastery/fluency/familiarity;
- recency projection;
- transfer fold;
- evidence claims;
- grade gates.

### Property

- no overflow;
- deterministic ordering;
- no duplicate evidence;
- monotonic learning under equal/better feedback;
- transfer never creates evidence;
- reacquisition faster than initial acquisition;
- grade award stability.

### Golden

- first programming result;
- easy-task diminishing;
- difficult task with mentor;
- failed task with debugging evidence;
- specialization switch;
- career break/return;
- Beginner→Intern→Junior→Middle→Senior fixtures later.

### Mass simulation

- time-to-grade;
- course grinding;
- easy-task farming;
- newest-tech chasing;
- breadth/depth;
- career interruption;
- founder/management shortcut;
- soft locks.

## 28. Deferred

- Top Programmer formula;
- full leadership evidence;
- large technology version graph;
- evidence compaction;
- Bayesian/IRT scoring;
- LLM judge;
- dynamic transfer calculation during MonthRun.
