---
title: "SD-003-PROFESSIONAL-CHALLENGE-CAPABILITY-ENGINE-2026-07-17"
type: research
status: draft
canon: true
updated: 2026-07-18
---

# SD-003 — Professional Challenge, Capability Milestone & Technical Situation Engine

- **Дата:** 2026-07-17
- **Статус:** системный анализ, нормализованный в ADR-016 и профильных спецификациях
- **Область:** technical situations, player approaches, deterministic outcomes, capability milestones, provider/progression integration, UI, content и balance
- **Источники канона:** `PROGRAMMER-FIRST-DESIGN.md`, `CASUAL-SIMULATION-DESIGN.md`, ADR-013–016

## Executive verdict

Professional Progression & Evidence Engine уже корректно отвечает, как результат превращается в mastery, fluency, familiarity, evidence и grade readiness. Project & Work Package Engine хранит техническую правду проекта.

Главный оставшийся пробел находится между ними:

```text
что происходит в профессиональной ситуации
→ что выбирает игрок
→ почему получился такой технический результат
```

Без этого слоя Runtime Human рискует стать либо life sim с кнопками `учиться/кодить/работать`, либо инженерным dashboard. Рекомендуемая собственная модель:

```text
Technical Situation
→ Player Approach
→ deterministic resolution
→ provider/domain outcome
→ ExperienceEpisode
→ progression/evidence
→ capability explanation
→ next challenge
```

Аналоги используются только как источник паттернов и ошибок. Ни одна игра не принимается как шаблон.

## Диагноз текущего канона

Сильные стороны:

- Provider владеет доменной истиной.
- Progression не создаёт project/job/course outcome.
- Learning и evidence разделены.
- Grade является milestone, не XP threshold.
- Work Package агрегирован и не равен Jira ticket.
- Routine practice агрегируется.
- Normal UI использует capability phrases.
- MonthRun deterministic/idempotent/crash-safe.

Недостающий слой: `ExperienceEpisode` нормализует уже произошедший опыт, но не определяет интересный выбор внутри ситуации. Разные ошибки, требования, codebase и integration risks не должны отображаться одной кнопкой `Исправить`.

## Сравнительный анализ

| Игра | Полезный паттерн | Что не переносить | Собственный вывод Runtime Human |
|---|---|---|---|
| Game Dev Tycoon | небольшие проекты, technologies/unlocks и reports после результата | hidden optimal combinations и slider meta | после результата открывать причинное знание, а не correct recipe |
| Software Inc. | skills, specializations, teams и delegation | office/employee-hour micromanagement | с ростом персонажа менять масштаб ситуаций и ответственности |
| BitLife | быстрый текстовый темп и один понятный выбор | поверхностные одинаковые careers | взять темп, но сохранить профессиональную причинность |
| Chinese Parents | ранние решения влияют на долгий жизненный путь | stat grind и длинный пролог | programmer fantasy начинается в первом году, а не после детства |
| Sir Brante | память всей жизни и цена решений | authored binary traps и wiki-builds | прошлое меняет варианты, но recovery остаётся доступным |
| Melvor Idle | skill/action mastery split и aggregation рутины | real-time XP grind | автоматизировать практику, evidence давать только за meaningful challenge |

## Собственная модель

### Six challenge archetypes

1. `build` — создать или расширить результат;
2. `diagnose` — понять причину проблемы;
3. `improve` — повысить качество или изменить структуру;
4. `integrate` — соединить технологии, данные или части;
5. `operate` — выпустить, восстановить или поддержать;
6. `explain-and-lead` — review, mentoring и техническое направление.

Это общий язык контента, не шесть отдельных мини-игр.

### Common approaches

- investigate-first;
- implement-fast;
- prototype;
- ask-for-help;
- reduce-scope;
- strengthen-quality;
- defer/recover-capacity.

Одна ситуация показывает только релевантные 2–4 подхода. Ни один подход не может быть глобально лучшим.

### Challenge causes

Normal UI показывает максимум две причины сложности:

- незнакомая технология;
- неясные требования;
- legacy code;
- weak documentation;
- deadline pressure;
- integration risk;
- high consequence;
- limited observability;
- coordination;
- insufficient capacity.

### Outcome spectrum

- clean success;
- success with compromise;
- partial progress;
- failed with learning;
- recovered.

Failure может подтвердить diagnosis/recovery learning, но не full delivery.

### Capability milestones

Игрок видит не постоянные XP-уведомления, а изменения возможностей:

- может изменить готовый пример;
- может самостоятельно найти простую ошибку;
- может завершить ограниченную задачу под review;
- может владеть feature end-to-end;
- может выбрать системный trade-off;
- может улучшать результат других.

Milestone подтверждает Progression Core, а не content template.

## Boundary model

```text
Provider owns context and authoritative domain application
Challenge Engine owns deterministic approach resolution
Progression owns learning/evidence/readiness
Narrative Director owns pacing/selection, not truth
UI consumes causal read models
```

Challenge Engine возвращает outcome proposal и reason codes. Provider применяет только принадлежащие ему effects и создаёт `ExperienceEpisode`. Project не начисляет skills; Progression не пересчитывает project outcome.

## MVP Casual

Январь 1990:

- archetype: `diagnose`;
- маленькая текстовая программа;
- неправильный ввод создаёт непонятный результат;
- четыре подхода: разобраться самостоятельно, попросить помощь, упростить выпуск, перенести;
- одна заранее realized complication;
- четыре outcome fixtures;
- один project application;
- один `ExperienceEpisode`;
- одна capability explanation;
- suspend/resume без reroll.

Не нужны dynamic composition, LLM generation, code editor, evidence browser или full challenge matrix.

## Recommended и Extended

После first-year playtest можно добавить все шесть архетипов, skills-unlocked approaches, несколько technology families, Intern/Junior milestones и лёгкую сборку ситуаций из валидированных частей.

Systemic/strategic situations, incidents, team roles, delegation, company context и advanced composition относятся к поздним профилям.

## Red-team risks

### Hidden correct answer

- no global approach bonus;
- context-dependent trade-offs;
- multiple acceptable outcomes;
- forecast показывает направление, не score;
- массовая симуляция проверяет dominance.

### Content repetition

- archetype/context/cause/outcome diversity;
- repetition fingerprints;
- quiet months;
- progressive scale change;
- blocking challenge не каждый месяц.

### Jargon exam

- plain language в normal mode;
- choice проверяет trade-off, не синтаксис/API;
- coding knowledge может улучшать понимание, но не требуется для управления.

### Progression farming

- repeated contexts получают diminishing evidence;
- assistance не создаёт autonomy;
- passive learning не создаёт delivery;
- routine поддерживает fluency, но не grade.

### Overengineering

- один сценарий в slice;
- bands вместо полной матрицы;
- no speculative fields;
- новый facet требует player-facing choice и playtest evidence.

## Balance requirements

Измерять:

- approach selection distribution;
- dominant approach win rate;
- outcome distribution;
- repeated situation frequency;
- capability milestone cadence;
- time to understand situation/choice;
- correct prediction of trade-off direction;
- causal report comprehension;
- recovery availability;
- desire to continue.

Критический провал:

- один approach доминирует в разных contexts;
- игрок выбирает по максимальной награде;
- challenge отличается только числом difficulty;
- failure не даёт next step;
- Details требуется для ordinary choice;
- система воспринимается как quiz, Jira или progress bar.

## Implementation recommendation

1. immutable contracts и reason codes;
2. один hand-authored `diagnose` template;
3. deterministic fixture table;
4. Project provider adapter;
5. Progression episode mapping;
6. suspended MonthRun persistence;
7. normal/result UI stories;
8. usability и anti-dominance tests;
9. first-year content только после slice gate.

Не начинать с generic DSL или dynamic generator.

## Normative result

- ADR-016 фиксирует ownership и rejected alternatives.
- `PROFESSIONAL-CHALLENGE-ENGINE.md` определяет gameplay/contracts.
- `PROFESSIONAL-CHALLENGE-UI.md` определяет presentation.
- Vertical Slice использует один `diagnose` scenario.
- Balance Simulation проверяет approach dominance и repetition.
- Roadmap расширяет challenge corpus только после first-month/year playtest.

## Comparative sources

- Game Dev Tycoon — Steam product description.
- Software Inc. — Steam product description.
- BitLife — official product site.
- Chinese Parents — Steam product description.
- The Life and Suffering of Sir Brante — Steam product description.
- Melvor Idle — official wiki beginner guide.
