---
title: "Narrative Director"
type: events
status: draft
canon: true
depends_on: [ADR-009]
updated: 2026-07-18
---

# Narrative Director

Нормативное решение: [ADR-009](../adr/ADR-009-narrative-director.md).

Продуктовая иерархия: [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md).

## Разделение ответственности

Event Engine отвечает за eligibility, requirements, participants, choices и effects. Narrative Director отвечает за то, какие уже допустимые события стоит показать сейчас для интересного, разнообразного и объяснимого ритма.

Director не создаёт недопустимое событие, не меняет authoritative effects и не исправляет баланс скрытой выдачей денег/навыков.

Director поддерживает programmer-first hierarchy. Он не должен превращать Runtime Human в generic life drama, где technical/project/career arcs регулярно вытесняются бытовыми или философскими событиями.

## Вход

- eligible event candidates в stable order;
- recent event/category history;
- active narrative arcs/hooks;
- current life stage;
- current professional stage/grade readiness;
- active skills, technologies, projects и career commitments;
- current era/city state;
- active/background NPC recency;
- intensity/recovery history;
- blocking/flavour event budgets;
- programmer-core/professional decision shares;
- required milestone/deadline candidates;
- Determinism Manifest/RNG scope;
- content/rules version.

UI state, system locale, wall clock и display order не входят в selection context.

## Output

Director возвращает:

- ranked/scored candidate IDs;
- selected blocking/non-blocking events;
- integer score breakdown/explanation trace;
- updated pacing state;
- updated product-category distribution state;
- RNG scope/state transition;
- warnings о невозможности выполнить обязательный milestone/budget;
- warning о starvation professional arc.

Effects по-прежнему применяет Event Engine/MonthRunner после выбора.

## Категории product hierarchy

Каждое meaningful event объявляет `productLayer`:

- `programmer-mastery`;
- `professional-expression`;
- `human-constraints`;
- `era-narrative`;
- `philosophy-legacy`.

Дополнительно объявляются technical tags: skill, technology, project, quality, career, open-source, company, relationship, health, finance, world, legacy.

Событие может принадлежать нескольким темам, но имеет один primary product layer для бюджета и аналитики.

## Целевое распределение

Для rolling 24-month window активной профессиональной жизни:

- technical/project/career/open-source meaningful events: 55–70%;
- relationships/health/finance/housing: 15–30%;
- era/world/community context: 10–20%;
- philosophy/legacy-only до late career: 0–10%.

Для rolling 12-month window:

- минимум 60% meaningful decisions затрагивают Programmer Mastery Core или Professional Expression;
- минимум 40% имеют direct technical component;
- life-only blocking events не превышают 35% без active crisis arc;
- минимум 8 месяцев дают professional outcome или явно объяснённую паузу.

Эти диапазоны являются soft target budgets, а не гарантией заполнить каждый месяц событием.

## Правила pacing

- ограничивать число blocking events в месяц;
- penalize недавно показанные события, категории и participants;
- избегать нескольких кризисов подряд без recovery window;
- избегать серии однотипных modal decisions;
- приоритизировать незавершённые chains/arcs;
- гарантировать обязательные milestone events, когда выполнены условия и наступил window;
- создавать тихие месяцы;
- чередовать technical, project, career, personal, relationships и world context внутри programmer-first budgets;
- не выдавать flavour event вместо обязательного следующего этапа chain;
- повышать novelty без нарушения логики персонажа/эпохи;
- учитывать unresolved hooks и narrative deadlines;
- ограничивать повтор одного NPC, не разрушая долгую сюжетную линию;
- не заполнять каждый доступный budget только потому, что candidates существуют;
- предотвращать starvation professional arc;
- не превращать философское событие в абстрактный выбор без связи с прожитой историей;
- не сводить каждое личное событие к карьерному buff: relationships имеют самостоятельную ценность, но не должны систематически вытеснять programmer core.

## Scoring

Director рассчитывает только integer/fixed-point score modifiers.

Пример порядка:

```text
base event weight
+ mandatory milestone/arc priority
+ programmer-first deficit correction
+ novelty/category diversity
+ participant diversity
+ era/life-stage relevance
+ professional-stage relevance
+ unresolved hook/deadline priority
- recency/repetition penalty
- intensity/crisis penalty
- budget conflict penalty
- product-layer overrepresentation penalty
```

`programmer-first deficit correction` повышает уже eligible professional candidates, если rolling window опускается ниже target. Он не создаёт skills/effects и не делает ineligible event допустимым.

Candidates сортируются по:

```text
final score descending
→ declared priority
→ stable event ID
```

Если после scoring нужен случайный выбор, он использует отдельный `month/narrative` RNG fork и integer weights.

Weights/coefficients являются versioned rules data и входят в deterministic trace/fingerprint.

## Budgets

Минимальные budgets:

- maximum blocking events per month;
- preferred non-blocking/flavour count range;
- crisis intensity budget;
- participant repetition budget;
- category repetition budget;
- product-layer distribution budget;
- programmer-core decision floor;
- technical decision floor;
- life-only blocking ceiling.

Budget — pacing mechanism, а не универсальные очки действий игрока.

Milestone/mandatory event может превысить обычный soft budget только по явному versioned rule и попадает в trace.

## Blocking targets

Baseline targets для balance tuning:

- обычный месяц: 0–1 blocking events;
- редкий кризисный месяц: максимум 2, если события связаны одним arc;
- rolling year: ориентир 4–10 blocking events в зависимости от life stage;
- life-only blocking streak: максимум 2 без explicit crisis arc;
- после двух high-intensity crisis months требуется recovery window, если нет mandatory catastrophe chain;
- philosophy/legacy blocking до поздней карьеры — редкое milestone event, а не регулярный контент.

## Narrative arcs

Arc хранит:

- stable arc ID/version;
- stage/state;
- participants;
- primary product layer;
- technical/professional tags;
- unresolved hooks;
- earliest/latest windows/deadline;
- cooldown;
- intensity;
- category;
- completion/failure/abandonment state;
- replacement/tombstone policy.

Arc не обязан быть линейным; transitions задаются data-driven graph. Недостижимые stages и broken references блокируются content validation.

Director не выбирает произвольный новый participant, если arc требует конкретного persistent NPC.

Одновременно активные major arcs должны быть ограничены. Baseline target:

- 1–2 primary professional arcs;
- 0–2 personal/relationship arcs;
- 0–1 crisis arc;
- дополнительные minor hooks могут храниться, но не требуют регулярного blocking.

## Delayed consequences

Target:

- 30–60% meaningful events создают delayed consequence, hook или stateful follow-up;
- не менее 40% selected meaningful events должны быть связаны с предыдущим решением, существующим project/NPC или unresolved hook;
- chain stage обычно наступает через 1–12 месяцев;
- длинные career/relationship arcs могут продолжаться годы с редкими этапами.

Delayed consequence не должен означать скрытое наказание без warning или traceable cause.

## Quiet months

Тихий месяц является осознанным pacing outcome, а не ошибкой отсутствия контента. Он может включать только журнал, естественный прогресс и небольшие non-blocking observations.

Quiet state учитывает:

- предыдущую интенсивность;
- количество unresolved decisions;
- жизненный и professional stage;
- milestone deadlines;
- длительность серии тихих месяцев;
- наличие professional outcome.

Тихий месяц допустим, если показывает:

- естественный skill/technology progress;
- project maintenance;
- накопление evidence;
- recovery;
- осознанную профессиональную паузу.

Игра не должна выдавать бесконечную тишину из-за чрезмерных penalties; simulator проверяет starvation events/arcs и professional stagnation.

## Ограничения

Director не должен:

- гарантировать только положительные события;
- скрыто корректировать деньги, здоровье или навыки;
- создавать события, не прошедшие Event Engine;
- обходить chronology/content requirements;
- раскрывать игроку точные weights;
- зависеть от React/Zustand/UI navigation;
- использовать floating-point score;
- зависеть от iteration/filesystem/locale order;
- ломать required chain ради diversity;
- подавлять critical consequence только потому, что месяц уже насыщен;
- поддерживать target distribution путём фальшивых событий без meaningful choice/consequence;
- считать finance/relationship event техническим только из-за косвенного modifier;
- вытеснять professional arcs серией unrelated life-only events.

## Explainability/trace

Для каждого выбранного и важного отклонённого candidate debug trace содержит:

- base weight;
- product layer;
- applied modifier IDs/values;
- rolling distribution state;
- budget state;
- final score/weight;
- deterministic tie-break/order;
- selected RNG scope/result;
- reason code.

Production UI не показывает точные формулы, но diagnostics/balance simulator использует trace.

## Метрики

Balance simulator измеряет:

- repeat rate по event/category/NPC;
- category distribution;
- product-layer distribution;
- programmer-core decision share;
- direct technical decision share;
- life-only blocking share;
- professional outcome months;
- professional stagnation streak;
- blocking frequency;
- decision type streaks;
- crisis streaks/recovery windows;
- abandoned/stalled/starved arcs;
- participant diversity;
- quiet month frequency/maximum streak;
- milestone delivery rate;
- delayed consequence rate;
- prior-decision linkage rate;
- content exposure и never-selected candidates;
- intensity distribution по life stage/era.

Метрики сравниваются по deterministic seed corpus и сегментам прохождения, а не только по среднему всей игры.

## Тесты

- одинаковые inputs/manifest/seed дают одинаковый selection trace;
- Director никогда не выбирает ineligible event;
- blocking budget соблюдается, кроме explicit mandatory override;
- required chain stage не вытесняется flavour candidate;
- anti-repeat работает без starvation;
- crisis streak получает recovery;
- quiet month возможен и не зацикливается;
- stable ID tie-break не зависит от input insertion order;
- all-zero/negative-after-modifier candidates обрабатываются явно;
- programmer-first deficit correction не нарушает eligibility;
- rolling professional share не падает ниже floor в обычных сценариях;
- life-only crisis arc может временно превысить budget и затем получает recovery;
- philosophy/legacy events не доминируют до late career;
- rules update меняет golden snapshot только после review.

Изменение pacing rules требует новой rules version либо подтверждённого non-breaking classification, snapshot comparison и mass simulation report.
