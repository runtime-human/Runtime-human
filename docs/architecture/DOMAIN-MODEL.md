# Доменная модель Runtime Human

Нормативные решения: [ADR-010](../adr/ADR-010-authoritative-save-state.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. Это не один гигантский класс: состояние нормализовано по модулям, но месячный commit проверяет межмодульные invariants целиком.

```ts
type SaveGameState = Readonly<{
  metadata: SaveMetadata;
  character: CharacterState;
  professional: CharacterProfessionalState;
  people: Readonly<Record<PersonId, PersonState>>;
  relationships: Readonly<Record<RelationshipId, RelationshipState>>;
  employment: EmploymentState;
  activities: Readonly<Record<ActivityId, ActivityState>>;
  projects: Readonly<Record<ProjectId, ProjectState>>;
  products: Readonly<Record<ProductId, ProductState>>;
  companies: Readonly<Record<CompanyId, CompanyState>>;
  inventory: InventoryState;
  housing: HousingState;
  finance: FinanceState;
  world: WorldState;
  narrative: NarrativeState;
  achievements: AchievementState;
}>;
```

## CharacterState

Содержит identity, дату рождения, жизненный этап, traits, health/capacity statuses и историю ключевых жизненных достижений.

Профессиональная прогрессия не хранится как набор полей внутри общего `CharacterState`; она выделена в `CharacterProfessionalState`, чтобы skills, technology familiarity, evidence и grades имели отдельные invariants и migration policy.

## CharacterProfessionalState

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
```

Authoritative:

- reasoning/learning aptitude;
- skill mastery и fluency;
- technology conceptual/operational familiarity;
- technology version recency;
- выбранный professional focus;
- awarded grades;
- current-month practice accumulators внутри draft.

Неавторитетны и перестраиваются:

- demonstrated grade readiness;
- current market readiness;
- specialization profile;
- capability cards;
- evidence summaries/indexes;
- monthly professional report.

## Professional Evidence

`ProfessionalEvidenceEvent` является append-only профессиональной историей. Он хранится отдельно от snapshot и содержит semantic source/context snapshot, outcome и набор `EvidenceClaim`.

Routine practice не создаёт event на каждый день или микрозадачу; она сворачивается в `MonthlyPracticeAggregate`.

Grade award является authoritative milestone. Grade readiness — projection.

## Experience Providers

Education, Project, Career, Open Source, Company и Event domains владеют своим task/outcome lifecycle и создают нормализованный `ExperienceEpisode`.

Progression Core не владеет:

- project scope/debt/bugs/releases;
- vacancy/salary/promotion;
- course schedule;
- event eligibility;
- health/fatigue;
- provider-specific task state.

Он оценивает episode и возвращает professional delta/evidence/readiness projection.

## Грейд, должность и путь

- `ProfessionalGradeAward` — достигнутый grade milestone;
- `Position` — должность в организации;
- `Role` — выполняемая функция;
- `Title` — отображаемое название;
- `CompanyLevel` — внутренняя лестница работодателя;
- `SpecializationProfile` — derived professional profile;
- `Top Programmer` — редкий endgame-status/achievement, а не обычный следующий numeric grade.

Senior может занимать Junior-position, иметь outdated market readiness или перейти в management без автоматической потери grade.

## Person и Relationship

NPC имеют стабильные ID и делятся на `active`, `background`, `archived`. Активные NPC хранят профессию, организацию, traits, связи и narrative memory. Relationship хранит тип, близость, доверие, конфликт, историю и текущие обязательства.

Professional memory может ссылаться на mentoring, review, shared project и technical trust, но canonical evidence остаётся в progression ledger.

## Activity

Длительное занятие хранит цель, состояние, приоритет, work units, prerequisites, дату начала, дедлайн и назначенных участников. Количество активностей не ограничено искусственным числом, но они конкурируют за время и внимание.

Activity/provider может создать один или несколько `ExperienceEpisode`, но не изменяет skill state напрямую.

## Employment

Хранит работодателя, position/title/company level, договор, зарплату, график, текущий рабочий проект, отношения с командой и карьерные риски.

Employment не хранит professional grade как источник истины и не начисляет skill XP только за стаж. Рабочие outcomes передаются progression через episodes.

## Project

Единый базовый тип проекта специализируется через kind:

- work;
- freelance;
- personal;
- open-source;
- product;
- research.

Project содержит scope, quality dimensions, progress, debt, release history, contributors, audience и economic model.

Project владеет work packages/outcomes. Progression владеет тем, что вклад персонажа доказал и чему научил.

## Company

Содержит ownership, сотрудников, продукты, cash, expenses, strategy, reputation, operating capacity и delegation policies. Компания не моделируется через ручную расстановку мебели и сотрудников по комнатам.

Company/Leadership provider может создавать architecture, mentoring, delegation и technical-direction episodes, но management result не превращается автоматически в programming mastery.

## World

```ts
type WorldState = Readonly<{
  city: HomeCityState;
  timeline: WorldTimelineState;
  currentEra: EraId;
  localMarket: LocalMarketState;
  technologyCatalogRevision: string;
}>;
```

Стран, виз, постоянной миграции и отдельных региональных рынков в core нет.

## Invariants

- дата не уменьшается;
- money operations не переполняют `i64`;
- закрытый project/task/activity не прогрессирует;
- уволенный персонаж не получает зарплату;
- один предмет не может одновременно находиться в инвентаре и быть проданным;
- pending MonthRun соответствует revision базового сейва;
- content references разрешаются либо имеют tombstone/semantic snapshot;
- все NPC-ссылки указывают на существующего или archived персонажа;
- evidence всегда имеет source/context snapshot;
- duplicate MonthRun/resume не создаёт evidence дважды;
- transfer не создаёт production evidence;
- partial outcome не подтверждает full delivery;
- awarded grade не понижается автоматически;
- salary/title/fame не создают mastery;
- Tier C technology не имеет proficiency state;
- readiness/specialization projections воспроизводимы из authoritative state/history;
- progression arithmetic integer/fixed-point и traceable.
