# Проекты и продукты

Связанная спецификация: [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md).

## Project base model

Общие поля проекта:

- kind;
- scope;
- requirements;
- technologies;
- progress work units;
- quality dimensions;
- technical debt;
- bugs;
- maintainability;
- deadline;
- participants;
- work packages;
- release history;
- audience;
- economic model.

## Виды

- рабочий проект;
- freelance contract;
- pet project;
- research project;
- open-source project;
- коммерческий продукт/SaaS.

Специализированные подсистемы расширяют базовую модель, а не копируют отдельные несовместимые Project-типы.

## Длительность

Проект не расходует единый action slot. Он получает work units от персонажа, команды, contributors или автоматизации. Несколько проектов разрешены, но context switching и обязательства уменьшают скорость.

Игрок не распределяет ежедневные coding tasks вручную. Project Engine формирует агрегированные `WorkPackage` и поднимает только решения с реальным trade-off.

## Work package

```ts
type WorkPackage = Readonly<{
  id: WorkPackageId;
  projectId: ProjectId;
  kind: WorkPackageKind;
  challenge: ChallengeProfile;
  requiredSkills: readonly SkillRequirement[];
  technologies: readonly TechnologyRequirement[];
  expectedWorkUnits: WorkUnit;
  minimumCalendarSpan: CalendarSpan;
  qualityTargets: QualityTargetProfile;
  riskProfile: ProjectRiskProfile;
  deadline?: GameDate;
  participantPlan: ParticipantPlan;
  outcomeSpace: readonly ProviderOutcomeDefinition[];
}>;
```

Project Engine владеет work-package state, progress, quality/debt/bugs и outcome truth.

## Project → Progression contract

После significant outcome Project Engine создаёт `ExperienceEpisode` с:

- work package/source;
- contribution персонажа;
- challenge profile;
- autonomy/assistance;
- practice/feedback;
- outcome/quality/reliability;
- applied skills/technologies;
- stable project/context fingerprint.

Progression Core:

- не изменяет project quality/debt/bugs;
- не решает повторно, завершён ли package;
- не приписывает персонажу результат всей команды;
- создаёт mastery/fluency/familiarity delta и evidence claims.

Project Engine не изменяет skill/grade напрямую.

## Вклад и командный результат

Разделяются:

- project outcome;
- team outcome;
- character contribution;
- assisted contribution;
- delegated contribution;
- leadership/review contribution.

Успешный релиз команды не даёт персонажу full delivery/impact evidence, если его вклад был мал или не подтверждён.

Delegation может создавать leverage/leadership evidence только если:

- решение/назначение было значимым;
- сотрудник/команда действительно достигли результата;
- вклад персонажа traceable;
- результат не является полностью внешним совпадением.

## Качество

Качество многомерно:

- functional correctness;
- UX;
- performance;
- reliability;
- security;
- documentation;
- maintainability.

Одна абстрактная шкала «качество 100» недостаточна для событий и последствий.

Quality dimensions принадлежат Project Engine. Progression получает нормализованный outcome/claim context, а не полный внутренний проектный state.

## Техническая неопределённость

Work package может открыть:

- неизвестные requirements;
- ошибочную гипотезу;
- integration conflict;
- legacy constraint;
- performance/reliability/security risk;
- недостающий skill/technology;
- необходимость research/mentor/review.

Uncertainty может создать blocking decision и checkpoint. После выбора Project Engine продолжает тот же deterministic package/outcome flow.

## Частичный результат

Partial outcome может:

- продвинуть scope;
- выявить bug/risk;
- создать debt;
- дать diagnosis;
- открыть recovery task;
- создать learning/debugging evidence.

Partial outcome не подтверждает full delivery или release quality.

## Релиз

Release является отдельной неизменяемой записью с version, scope, known issues, quality snapshot, marketing/support decisions и результатом запуска.

Release может создать:

- delivery evidence;
- reliability/incident evidence;
- impact evidence;
- community/product outcome;

только через `ExperienceEpisode` и с учётом вклада персонажа.

## Продукт

Коммерческий продукт дополнительно хранит:

- users и active users;
- pricing model;
- revenue и operating cost;
- support load;
- churn;
- market fit;
- brand/reputation;
- competitors;
- legal/operational risks в упрощённом виде.

Большой revenue не является technical evidence автоматически. Product/market success и programmer mastery связаны, но не тождественны.

## Failure states

Проект может быть заморожен, отменён, передан, продан, архивирован или закрыт.

Неудача сохраняется в истории и может создать:

- debugging/recovery learning;
- debt/support burden;
- reputation impact;
- financial consequence;
- новый project/narrative arc.

Провал не выдаёт большой mastery bonus только за сложность. Evidence соответствует реально продемонстрированным действиям.

## Anti-farming

- одинаковые routine packages агрегируются;
- повтор simple task получает diminishing learning/evidence;
- искусственное продление не повышает challenge;
- intentional failure не даёт delivery/quality claims;
- один release не закрывает все grade dimensions;
- множество поверхностных проектов не создаёт depth;
- project context weight ограничен при grade qualification.

## Историческая связь

Доступные project kinds, distribution channels, technologies, tooling и monetization patterns зависят от эпохи. SaaS не должен выглядеть одинаково в 1995 и 2015 году.

Technology availability проверяется provider/content registry до создания work package.

## Тесты

- work package deterministic outcome;
- partial/full/failure mapping;
- team result vs character contribution;
- delegation evidence;
- release/impact evidence;
- duplicate episode/evidence prevention;
- project close stops progression;
- easy-package diminishing;
- historical technology eligibility;
- atomic project outcome + evidence commit.
