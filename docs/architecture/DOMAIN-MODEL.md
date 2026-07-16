# Доменная модель Runtime Human

## Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. Это не один гигантский класс: состояние нормализовано по модулям, но месячный commit проверяет межмодульные invariants целиком.

```ts
type SaveGameState = Readonly<{
  metadata: SaveMetadata;
  character: CharacterState;
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

## Персонаж

Содержит identity, дату рождения, жизненный этап, базовые характеристики, жизненные показатели, XP навыков, технологии, специализации, грейд, текущие статусы и историю ключевых достижений.

Грейд и должность разделены. `Senior` — грейд; `Team Lead`, `Tech Lead`, `CTO` — должности. `Top Programmer` — редкий пост-Senior статус.

## Person и Relationship

NPC имеют стабильные ID и делятся на `active`, `background`, `archived`. Активные NPC хранят профессию, организацию, traits, связи и narrative memory. Relationship хранит тип, близость, доверие, конфликт, историю и текущие обязательства.

## Activity

Длительное занятие хранит цель, состояние, приоритет, work units, prerequisites, дату начала, дедлайн и назначенных участников. Количество активностей не ограничено искусственным числом, но они конкурируют за время и внимание.

## Employment

Хранит работодателя, должность, грейд, договор, зарплату, график, текущий рабочий проект, отношения с командой и карьерные риски.

## Project

Единый базовый тип проекта специализируется через kind:

- work;
- freelance;
- personal;
- open-source;
- product;
- research.

Project содержит scope, quality dimensions, progress, debt, release history, contributors, audience и economic model.

## Company

Содержит ownership, сотрудников, продукты, cash, expenses, strategy, reputation, operating capacity и delegation policies. Компания не моделируется через ручную расстановку мебели и сотрудников по комнатам.

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
- закрытый проект не прогрессирует;
- уволенный персонаж не получает зарплату;
- один предмет не может одновременно находиться в инвентаре и быть проданным;
- pending MonthRun соответствует revision базового сейва;
- content references разрешаются либо имеют tombstone;
- все NPC-ссылки указывают на существующего или archived персонажа.
