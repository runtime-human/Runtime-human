# Narrative Director

## Разделение ответственности

Event Engine отвечает за допустимость и эффекты. Narrative Director отвечает за то, какие допустимые события стоит показать сейчас для интересного ритма.

## Вход

- eligible event candidates;
- recent event history;
- active narrative arcs;
- current life stage;
- current era;
- NPC recency;
- intensity history;
- blocking event budget.

## Правила pacing

- ограничивать число blocking events в месяц;
- penalize недавно показанные категории и participants;
- избегать нескольких кризисов подряд без recovery window;
- приоритизировать незавершённые цепочки;
- гарантировать важные milestone events;
- создавать тихие месяцы;
- чередовать career, personal, project и world context;
- не выдавать flavour event вместо обязательного последующего этапа chain.

## Scoring

Director рассчитывает integer score modifiers. Он не меняет условия и эффекты события. Финальный выбор остаётся deterministic.

## Narrative arcs

Arc хранит stage, participants, unresolved hooks, deadline, cooldown и completion state. Arc не обязан быть полностью линейным; transitions задаются данными.

## Ограничения

Director не должен:

- гарантировать только положительные события;
- скрыто корректировать деньги или навыки;
- создавать события, не прошедшие Event Engine;
- раскрывать игроку точные weights;
- зависеть от UI state.

## Метрики

Balance simulator измеряет:

- repeat rate;
- category distribution;
- blocking frequency;
- crisis streaks;
- abandoned arcs;
- participant diversity;
- quiet month frequency.

Изменение pacing rules требует snapshot comparison.