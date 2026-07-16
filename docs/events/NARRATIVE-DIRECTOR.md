# Narrative Director

Нормативное решение: [ADR-009](../adr/ADR-009-narrative-director.md).

## Разделение ответственности

Event Engine отвечает за eligibility, requirements, participants, choices и effects. Narrative Director отвечает за то, какие уже допустимые события стоит показать сейчас для интересного, разнообразного и объяснимого ритма.

Director не создаёт недопустимое событие, не меняет authoritative effects и не исправляет баланс скрытой выдачей денег/навыков.

## Вход

- eligible event candidates в stable order;
- recent event/category history;
- active narrative arcs/hooks;
- current life stage;
- current era/city state;
- active/background NPC recency;
- intensity/recovery history;
- blocking/flavour event budgets;
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
- RNG scope/state transition;
- warnings о невозможности выполнить обязательный milestone/budget.

Effects по-прежнему применяет Event Engine/MonthRunner после выбора.

## Правила pacing

- ограничивать число blocking events в месяц;
- penalize недавно показанные события, категории и participants;
- избегать нескольких кризисов подряд без recovery window;
- избегать серии однотипных modal decisions;
- приоритизировать незавершённые chains/arcs;
- гарантировать обязательные milestone events, когда выполнены условия и наступил window;
- создавать тихие месяцы;
- чередовать career, personal, project, relationships и world context;
- не выдавать flavour event вместо обязательного следующего этапа chain;
- повышать novelty без нарушения логики персонажа/эпохи;
- учитывать unresolved hooks и narrative deadlines;
- ограничивать повтор одного NPC, не разрушая долгую сюжетную линию;
- не заполнять каждый доступный budget только потому, что candidates существуют.

## Scoring

Director рассчитывает только integer/fixed-point score modifiers.

Пример порядка:

```text
base event weight
+ milestone/arc priority
+ novelty/category diversity
+ participant diversity
+ era/life-stage relevance
- recency/repetition penalty
- intensity/crisis penalty
- budget conflict penalty
```

Затем candidates сортируются по:

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
- category repetition budget.

Budget — pacing mechanism, а не универсальные очки действий игрока.

Milestone/mandatory event может превысить обычный soft budget только по явному versioned rule и попадает в trace.

## Narrative arcs

Arc хранит:

- stable arc ID/version;
- stage/state;
- participants;
- unresolved hooks;
- earliest/latest windows/deadline;
- cooldown;
- intensity;
- category;
- completion/failure/abandonment state;
- replacement/tombstone policy.

Arc не обязан быть линейным; transitions задаются data-driven graph. Недостижимые stages и broken references блокируются content validation.

Director не выбирает произвольный новый participant, если arc требует конкретного persistent NPC.

## Quiet months

Тихий месяц является осознанным pacing outcome, а не ошибкой отсутствия контента. Он может включать только журнал, естественный прогресс и небольшие non-blocking observations.

Quiet state учитывает:

- предыдущую интенсивность;
- количество unresolved decisions;
- жизненный этап;
- milestone deadlines;
- длительность серии тихих месяцев.

Игра не должна выдавать бесконечную тишину из-за чрезмерных penalties; simulator проверяет starvation events/arcs.

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
- подавлять critical consequence только потому, что месяц уже насыщен.

## Explainability/trace

Для каждого выбранного и важного отклонённого candidate debug trace содержит:

- base weight;
- applied modifier IDs/values;
- budget state;
- final score/weight;
- deterministic tie-break/order;
- selected RNG scope/result;
- reason code.

Production UI не показывает точные формулы, но diagnostics/balance simulator может использовать trace.

## Метрики

Balance simulator измеряет:

- repeat rate по event/category/NPC;
- category distribution;
- blocking frequency;
- decision type streaks;
- crisis streaks/recovery windows;
- abandoned/stalled/starved arcs;
- participant diversity;
- quiet month frequency/maximum streak;
- milestone delivery rate;
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
- rules update меняет golden snapshot только после review.

Изменение pacing rules требует новой rules version либо подтверждённого non-breaking classification, snapshot comparison и mass simulation report.