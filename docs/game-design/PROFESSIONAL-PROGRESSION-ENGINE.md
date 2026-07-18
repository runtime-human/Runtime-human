---
title: "PROFESSIONAL-PROGRESSION-ENGINE"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Professional Progression & Evidence Engine

## Статус

Нормативная межсистемная спецификация.

Решения ownership и persistence:

- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md).

Product/UX scope:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Casual Simulation Design](CASUAL-SIMULATION-DESIGN.md).

## 1. Назначение

Подсистема отвечает на простые для игрока вопросы:

1. Чему персонаж научился?
2. Что он теперь может делать самостоятельно?
3. Какая технология стала знакомее?
4. Насколько он приблизился к следующему профессиональному уровню?
5. Какой следующий опыт будет полезен?

Цепочка:

```text
provider outcome
→ ExperienceEpisode
→ professional progression result
→ capability explanation
→ awarded grade/readiness projection
```

## 2. Boundary map

```text
Education / Projects / Career / Open Source / Company / Events
                              │
                              ▼
                      ExperienceEpisode
                              │
                              ▼
               Professional Progression Core
                    ├─ mastery/fluency
                    ├─ technology familiarity
                    ├─ aggregated evidence
                    ├─ grade readiness
                    └─ explanations
```

Progression Core не владеет task/project/job/course lifecycle.

## 3. Реализационные профили

## 3.1. MVP Casual

Обязательно:

- 2 aptitude modifiers;
- 3–5 visible skills;
- 1 active technology proficiency;
- mastery/fluency/familiarity semantics;
- 1 aggregated professional result за meaningful outcome;
- simple readiness status;
- human-readable report;
- deterministic IDs/restart.

Не обязательно:

- full 13-skill graph;
- evidence timeline;
- detailed claims UI;
- context-diversity dashboard;
- complex grade profiles;
- transfer matrix;
- Senior/leadership progression.

## 3.2. Recommended

После успешного playtest:

- больше skills по мере progression;
- multiple technology families;
- Intern/Junior grade gates;
- basic context diversity;
- Details mode;
- specialization projection.

## 3.3. Extended

Поздние системы:

- full evidence browser;
- Senior/leadership/Top Programmer profiles;
- complex market readiness;
- long-term compaction;
- advanced transfer/version models.

## 4. Терминология

| Понятие | Значение | Player-facing в MVP |
|---|---|---:|
| Aptitude | Узкая предрасположенность к reasoning/learning | Нет/редко |
| Skill | Переносимая профессиональная способность | Да |
| Technology | Конкретная среда применения skills | Да |
| Mastery | Устойчивое понимание | Через capability text |
| Fluency | Текущая лёгкость применения | Через простой status |
| Familiarity | Практическое знание технологии | Да |
| ExperienceEpisode | Нормализованный provider outcome | Нет |
| Evidence | Причинная запись о meaningful result | Как одна explanation |
| Awarded grade | Подтверждённый достигнутый грейд | Да |
| Grade readiness | Перестраиваемая готовность | Как простой status |
| Current market readiness | Актуальность для рынка | Позднее/Details |
| Specialization | Derived профиль пути | Позднее |

## 5. Aptitudes

Baseline:

- `reasoningAptitude`;
- `learningAdaptability`.

Правила:

- integer 0–1000;
- узкий modifier learning, примерно 9000–11000 bps;
- не определяют grade;
- не создают permanent bad start;
- обычно скрыты от игрока;
- меняются редко.

Focus, fatigue, motivation и self-organization принадлежат current capacity/statuses, а communication — skill/context.

## 6. Skill graph

## 6.1. MVP skills

- Problem Solving;
- Programming;
- Debugging;
- Data Modelling;
- Testing & Quality.

В конкретном первом экране можно показывать только 3 наиболее релевантных.

## 6.2. Recommended skills

По мере открытия:

- Codebase Evolution;
- Requirements & Design;
- Architecture;
- Delivery & Operations;
- Non-functional Engineering;
- Technical Communication;
- Review, Mentoring & Leadership;
- Community Stewardship.

## 6.3. Facets вместо новых bars

Version control, research, performance, security, incident handling и documentation могут быть task facets.

Отдельный skill добавляется только если он:

- регулярно создаёт самостоятельные choices;
- применяется в нескольких systems;
- имеет собственную progression fantasy;
- не дублирует существующий skill.

## 7. Authoritative state

MVP state:

```ts
type CharacterProfessionalState = Readonly<{
  schemaVersion: ProfessionalStateSchemaVersion;
  aptitudes: ProfessionalAptitudeState;
  skills: Readonly<Record<SkillId, SkillState>>;
  technologies: Readonly<Record<TechnologyId, TechnologyProficiencyState>>;
  professionalFocus: ProfessionalFocus;
  awardedGrades: readonly ProfessionalGradeAward[];
}>;

type SkillState = Readonly<{
  skillId: SkillId;
  mastery: MasteryPoint;
  fluency: FluencyPoint;
  lastPracticedMonth: MonthIndex;
}>;

type TechnologyProficiencyState = Readonly<{
  technologyId: TechnologyId;
  familyId: TechnologyFamilyId;
  familiarity: FamiliarityPoint;
  lastPracticedMonth: MonthIndex;
}>;
```

Detailed conceptual/operational/version fields добавляются только вместе с gameplay, которому они нужны.

Internal points не показываются как обязательные percentages.

## 8. Experience Provider contract

MVP contract:

```ts
type ExperienceEpisode = Readonly<{
  id: ExperienceEpisodeId;
  provider: ExperienceProviderKind;
  source: ExperienceSourceRef;
  period: GameDateRange;
  challenge: CasualChallengeBand;
  participation: ParticipationKind;
  outcome: ProfessionalOutcomeKind;
  feedback: FeedbackBand;
  skills: readonly SkillId[];
  technologyId?: TechnologyId;
  contextFingerprint: ContextFingerprint;
}>;
```

Participation:

- independent;
- assisted;
- team;
- review-or-leadership.

Outcome:

- completed;
- partial;
- failed-with-learning;
- recovered.

Provider гарантирует domain truth. Progression гарантирует deterministic assessment и explanation.

Recommended/Extended могут добавлять multidimensional challenge/practice/outcome profiles без изменения ownership.

## 9. Learning model

Learning и evidence/readiness не являются одной величиной.

### Mastery

Растёт от:

- meaningful practice;
- подходящей сложности;
- novelty;
- feedback;
- reflection;
- available capacity;
- diminishing returns.

### Fluency

Растёт от регулярного применения и успешного повторения. После длительного перерыва может медленно снижаться, но не ниже floor, связанного с mastery.

### Familiarity

Растёт при использовании technology. Краткий перерыв не обнуляет familiarity; reacquisition быстрее первоначального обучения.

### Evidence/readiness

Meaningful outcome подтверждает capability с учётом:

- challenge;
- completion;
- самостоятельности;
- качества результата;
- context repetition.

Помощь улучшает learning, но не завышает самостоятельность. Partial/failure не подтверждают full delivery.

## 10. MVP deterministic formulas

Формулы являются стартовыми rules, а не player-facing knowledge.

```text
masteryGain = roundHalfEven(
  basePractice
  × challengeBps
  × noveltyBps
  × feedbackBps
  × capacityBps
  × diminishingBps
  / 10000^5
)
```

```text
fluencyGain = roundHalfEven(
  baseFluency
  × practiceBps
  × outcomeBps
  / 10000^2
)
```

```text
readinessEffect =
  challengeBandBase
  × completionBps
  × autonomyBps
  × qualityBps
  × antiRepeatBps
```

Точные ranges versioned и калибруются fixtures/playtest. MVP не нуждается в отдельном visible evidence score.

## 11. Challenge bands

Normal mode:

```text
под руководством
→ знакомая задача
→ самостоятельная задача
→ сложная задача
```

Recommended/Extended:

```text
Observed → Guided → Routine → Independent → Complex → Systemic → Strategic → Frontier
```

MVP не хранит/показывает девять challenge dimensions. Дополнительные facets могут быть content tags/reason codes.

## 12. Optimal challenge

| Ситуация | Learning | Readiness effect | Failure risk |
|---|---|---|---|
| Слишком просто | Низкий, поддерживает fluency | Почти нет | Низкий |
| Подходяще сложно | Высокий | Хороший | Умеренный |
| Сложно с помощью | Высокий learning | Низкая autonomy | Умеренный |
| Слишком сложно | Ограниченный | Нет full delivery | Высокий |

Простая routine work сохраняет ценность для дохода, reliability и fluency, но не является быстрым путём к grade.

## 13. Evidence and history

MVP `ProfessionalEvidenceEvent` может быть компактным:

```ts
type ProfessionalEvidenceEvent = Readonly<{
  id: ProfessionalEvidenceId;
  period: GameDateRange;
  sourceSnapshot: EvidenceSourceSnapshot;
  outcome: ProfessionalOutcomeKind;
  summary: EvidenceSummary;
  skills: readonly SkillId[];
  participation: ParticipationKind;
  rulesVersion: RulesVersion;
  traceHash: TraceHash;
}>;
```

Один meaningful outcome — одна aggregated entry.

Routine practice хранится monthly aggregate и не показывается карточками.

Detailed claims добавляются только в Recommended/Extended. Missing content не уничтожает semantic snapshot.

## 14. Grade model

Grade:

```text
Beginner → Intern → Junior → Middle → Senior
```

Top Programmer — отдельный late-game status.

MVP не реализует promotion/award, но проектирует совместимый `ProfessionalGradeAward`.

Normal readiness areas:

- техническая база;
- самостоятельность;
- сложность задач;
- надёжность результата.

Statuses:

- недостаточно опыта;
- развивается;
- почти готов;
- готов.

Grade award требует gates и history, а не average score.

Intern/Junior gates реализуются в Recommended phase; Middle/Senior — позже после corpus/playtest.

## 15. Technology policy

MVP:

- one technology family;
- one historically available technology;
- one familiarity state;
- no version graph;
- no full transfer matrix.

Recommended:

- Tier A/B/C;
- directed family transfer;
- lifecycle stage;
- legacy/mainstream context.

Transfer ускоряет learning, но не создаёт production evidence.

## 16. MonthRun

```text
provider outcome
→ episode
→ mastery/fluency/familiarity delta
→ aggregated professional result
→ readiness projection
→ invariants
→ atomic commit
```

Draft содержит episode ID, provisional delta и explanation. Duplicate resume не применяет их дважды.

## 17. Player-facing explanation

После месяца normal mode показывает:

```text
Отладка улучшилась

Вы с небольшой помощью нашли причину ошибки.
Вы лучше понимаете, как проверять ввод, но пока не всегда решаете такие проблемы самостоятельно.

Следующий шаг: похожая задача без подсказки.
```

Не обязательны слова mastery, fluency, evidence, claim или gate.

## 18. UI read model для MVP

```ts
type CasualProfessionalSummary = Readonly<{
  awardedGrade: ProfessionalGrade;
  capabilityText: LocalizationKey;
  relevantSkills: readonly CasualSkillSummary[];
  activeTechnology?: CasualTechnologySummary;
  readinessStatus: CasualReadinessStatus;
  nextStep: LocalizationKey;
  monthlyExplanation?: LocalizationKey;
}>;
```

Details mode может показывать причины и важные history entries. Advanced numeric view не входит в MVP.

## 19. Anti-exploit

- repeated easy practice получает diminishing returns;
- passive reading не создаёт delivery readiness;
- failure не выдаёт full success;
- assisted work не выдаёт independent capability;
- project/team success не приписывается персонажу автоматически;
- technology switching не создаёт evidence без target practice;
- title/salary/fame не повышают grade.

## 20. Balance and playtest

MVP измеряет:

- time to first visible learning;
- понимание player explanation;
- число visible skills;
- repeated-easy-task dominance;
- independent vs assisted outcomes;
- months without professional result;
- desire to continue;
- no duplicate delta/evidence after restart.

Полный time-to-Senior и path parity не являются MVP gates.

## 21. Vertical Slice scope

- 2 aptitudes без отдельного экрана;
- 5 internal skills, максимум 3 visible одновременно;
- 1 technology;
- 1 project provider;
- 1 meaningful ExperienceEpisode;
- 1 aggregated evidence/result;
- simple readiness status;
- causal report;
- deterministic restart.

## 22. Deferred

- full evidence browser;
- full challenge profile;
- full transfer matrix;
- context-diversity dashboard;
- complex specialization;
- Senior/leadership/Top Programmer;
- evidence compaction;
- advanced market readiness;
- detailed numeric player UI.

## 23. Invariants

- provider owns outcome;
- progression does not mutate provider state;
- learning and readiness effect are separate;
- grade not XP/time/title;
- short break preserves mastery/grade;
- repeated routine is aggregated;
- normal UI uses human language;
- future state not added without gameplay;
- deterministic/idempotent/atomic guarantees remain.

## 24. Definition of Done

MVP progression готова, когда:

- игрок объясняет, чему научился;
- видит не более 3–5 relevant skills;
- понимает assisted vs independent outcome;
- получает один полезный next step;
- не видит evidence bureaucracy;
- reload не меняет результат;
- duplicate run не дублирует progression;
- Storybook и usability fixtures подтверждают casual comprehension.
