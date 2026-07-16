# Event Engine

## Ответственность

Event Engine определяет, какие события допустимы, как выбираются варианты, какие эффекты применяются и как продолжаются цепочки.

## Типы событий

- random;
- scheduled;
- chained;
- reactive;
- repeatable;
- unique;
- rare;
- crisis;
- background/log-only;
- world/era;
- professional;
- personal;
- hidden-cause.

## EventDefinition

Содержит:

- stable ID и version;
- category/tags;
- availability window;
- requirements;
- incompatibilities;
- weight;
- cooldown;
- blocking policy;
- participants selector;
- choices;
- immediate/delayed effects;
- chain transitions;
- journal template;
- source/provenance для исторического контента.

## Selection

1. Собрать definitions активной эпохи.
2. Проверить requirements.
3. Исключить cooldown/unique/incompatible.
4. Разрешить participants.
5. Рассчитать integer weights.
6. Передать candidates Narrative Director.
7. Выполнить deterministic weighted choice.

## Effects

Effects являются декларативными operations из allowlist. Они применяются к immutable draft state через versioned effect handlers.

## Blocking policy

Blocking событие создаёт PendingDecision и завершает текущий шаг MonthRun. Log-only событие записывается без остановки.

## Trace

Для каждого события сохраняются definition version, candidate reasons, weight, participants, choice, effects и resulting hashes. Trace предназначен для диагностики и golden tests.

## Запреты

- arbitrary JS в контенте;
- доступ события к SQLite/UI;
- скрытый `Math.random`;
- ссылки на несуществующего NPC;
- изменение state вне effect registry;
- создание реального исторического факта без sourceRefs.