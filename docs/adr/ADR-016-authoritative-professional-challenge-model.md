---
title: "ADR-016-authoritative-professional-challenge-model"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-016 — Авторитетная модель профессиональных ситуаций и подходов

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** профессиональная глубина Runtime Human строится вокруг содержательных технических ситуаций, выбора подхода и причинного результата, а не вокруг кнопок прокачки, скрытых оптимальных комбинаций или ручного написания кода
- **Связанные ADR:** ADR-005, ADR-007, ADR-009, ADR-013, ADR-014, ADR-015
- **Связанные спецификации:** `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`, `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`, `docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md`, `docs/ui/PROFESSIONAL-CHALLENGE-UI.md`

## Контекст

ADR-013 закрепил корректную оценку профессионального развития через `ExperienceEpisode`, mastery, fluency, familiarity, evidence и grade readiness. ADR-014 закрепил техническую правду проекта и агрегированные Work Packages. ADR-015 ограничил видимую и скрытую сложность casual-first бюджетом.

Эти решения отвечают на вопросы:

- где хранится проектный результат;
- как результат превращается в профессиональный прогресс;
- почему грейд не равен XP, стажу или должности;
- как сохранить детерминизм, recovery и idempotency.

Они не определяют достаточно строго главный игровой вопрос:

> Что именно выбирает игрок, когда персонаж программирует, отлаживает, проектирует, выпускает, восстанавливает или объясняет техническое решение?

Без отдельной модели профессиональных ситуаций глубокая progression-архитектура может выродиться в повторение абстрактных действий `учиться`, `кодить`, `исправить ошибку` с приростом показателей. Альтернативный риск — встроить IDE, coding puzzles или детальный task manager, нарушив casual-first продуктовый канон.

## Решение

### 1. Ввести Professional Challenge Engine

Центральная игровая цепочка:

```text
Technical Situation
→ Player Approach
→ deterministic challenge resolution
→ ProfessionalChallengeOutcome
→ provider/domain application
→ ExperienceEpisode
→ progression/evidence
→ capability explanation and next challenge
```

Professional Challenge Engine отвечает за разрешение выбранного подхода в конкретной профессиональной ситуации.

Он не владеет:

- жизненным циклом проекта, вакансии, курса, компании или open-source сообщества;
- authoritative `ProjectState`;
- навыками, технологиями, evidence, readiness или grade;
- выбором Narrative Director;
- долгосрочной историей NPC.

### 2. Разделить ownership

#### Experience Provider

Education, Project, Career, Open Source, Company или Event:

- владеет доменным контекстом;
- создаёт доступную `TechnicalSituation`;
- определяет допустимые подходы и ограничения;
- передаёт immutable runtime snapshot в Challenge Engine;
- применяет подтверждённый outcome к своему authoritative state;
- создаёт нормализованный `ExperienceEpisode`.

#### Professional Challenge Engine

- валидирует выбранный подход;
- использует versioned deterministic rules;
- реализует заранее зафиксированную uncertainty/randomness;
- вычисляет outcome, complication и reason codes;
- не изменяет provider/progression state напрямую;
- гарантирует одинаковый результат после resume/retry.

#### Professional Progression Core

- получает `ExperienceEpisode`;
- оценивает learning, fluency, familiarity и evidence;
- создаёт capability explanation/readiness projection;
- не пересчитывает технический outcome.

#### Project Engine

- применяет project-relevant outcome к Work Package, quality, debt, issue или release;
- не начисляет навыки и грейд.

### 3. Использовать шесть общих архетипов

Baseline taxonomy:

1. `build` — создать или расширить работающий результат;
2. `diagnose` — понять причину ошибки или неизвестного поведения;
3. `improve` — повысить качество, изменить структуру или устранить долг;
4. `integrate` — соединить технологии, данные или части системы;
5. `operate` — выпустить, восстановить или поддержать работу;
6. `explain-and-lead` — review, mentoring, согласование и техническое направление.

Архетипы являются общим языком контента и баланса, а не шестью отдельными мини-играми.

### 4. Подход важнее правильного ответа

Обычная ситуация предлагает 2–4 осмысленных подхода. Примеры:

- исследовать сначала;
- реализовать быстро;
- сделать prototype;
- попросить помощь;
- уменьшить scope;
- укрепить качество;
- отложить и сохранить capacity.

Подход описывает trade-off. Ни один подход не может быть глобально лучшим для всех ситуаций.

Skills и technology familiarity могут:

- улучшать прогноз;
- снижать риск;
- открывать новый подход;
- менять цену подхода;
- улучшать recovery;
- повышать качество результата.

Они не должны превращать выбор в автоматический «нажать вариант с самым высоким skill».

### 5. Outcome не является бинарным успехом

MVP outcome classes:

- `clean-success`;
- `success-with-compromise`;
- `partial-progress`;
- `failed-with-learning`;
- `recovered` — только когда ситуация включает recovery stage.

Outcome обязан содержать human-readable causality:

- что помогло;
- что помешало;
- какую цену создал подход;
- что изменилось в provider state;
- какой следующий шаг доступен.

### 6. Capability milestone не выдаётся Challenge Engine

Challenge Engine может создать `capabilityMilestoneCandidate`, но подтверждение capability принадлежит Progression Core и требует актуального professional state/history.

Это предотвращает:

- выдачу capability за один случайный успех;
- обход evidence через content script;
- прямое изменение grade provider-ом;
- дублирование progression rules в событиях.

### 7. Casual-first baseline

Vertical Slice реализует только:

- один `diagnose`-сценарий в маленьком проекте;
- одну проблему неправильного ввода;
- четыре подхода;
- одну заранее зафиксированную complication/uncertainty realization;
- четыре outcome variants;
- один provider application;
- один `ExperienceEpisode`;
- одну capability explanation;
- suspend/resume без reroll.

Первый playable не требует полного каталога архетипов, dynamic scenario composition, LLM judge, coding puzzle или advanced challenge matrix.

### 8. Прогрессивное изменение масштаба решений

Рост программиста меняет не только шанс успеха, но и уровень профессиональных ситуаций:

```text
выполнить небольшую задачу
→ владеть feature/Work Package
→ улучшать подсистему
→ принимать системный trade-off
→ усиливать других через review/mentoring
→ задавать техническое направление
```

Middle/Senior gameplay не должен быть той же beginner-задачей с большим числом сложности.

### 9. Determinism и suspended MonthRun

До показа blocking decision MonthRun сохраняет:

- situation snapshot/fingerprint;
- доступные approach IDs и wording/content versions;
- realized uncertainty/complication;
- rules fingerprint;
- RNG state/trace;
- provider revision/input fingerprint.

После выбора сохраняются:

- selected approach;
- provisional outcome;
- reason codes;
- provider application draft;
- provisional `ExperienceEpisode`.

Reload, duplicate answer и resume не меняют outcome и не применяют его повторно.

### 10. Контент является декларативным, resolution — кодовым

Content определяет:

- ситуацию и её смысл;
- архетип/facets;
- доступные подходы;
- player-facing forecasts/trade-offs;
- локализованные объяснения;
- допустимые outcomes/complications;
- provider mapping.

Content не содержит произвольный код, не изменяет save напрямую и не обходит Challenge/Provider/Progression boundaries.

## Последствия

### Положительные

- профессиональная прогрессия получает реальный игровой источник, а не абстрактную кнопку;
- один challenge language работает для обучения, проектов, работы, open source и компании;
- навыки открывают способы решения, а не только повышают проценты;
- casual UI остаётся коротким;
- проекты не превращаются в progress bar;
- поздняя карьера может менять масштаб решений без новой базовой архитектуры;
- deterministic reports объясняют причинность.

### Стоимость

- требуется каталог качественных situation/approach templates;
- нужны reason-code taxonomy и localization discipline;
- баланс должен проверять dominant approaches и repetition;
- provider adapters должны корректно применять outcomes;
- Storybook/fixtures должны покрывать несколько outcome classes.

### Риски

- слишком абстрактные ситуации будут ощущаться одинаково;
- слишком подробные ситуации превратятся в экзамен по программированию;
- скрытые коэффициенты могут создать guide-driven meta;
- один подход может стать доминирующим;
- authored content может случайно присваивать full success при partial/assisted outcome.

Риски ограничиваются causal forecast, bounded archetypes, anti-dominance simulation, content validation, provider boundaries и playtest-driven expansion.

## Отклонённые альтернативы

### Реальное написание кода или встроенная IDE

Отклонено для baseline: сужает аудиторию, усложняет localization/accessibility, создаёт отдельную puzzle-game и плохо масштабируется на десятилетия карьеры.

### Универсальная кнопка `Работать над проектом`

Отклонено: не создаёт профессионального решения и превращает развитие в накопление прогресса.

### Скрытая таблица правильных комбинаций

Отклонено: игрок оптимизирует по wiki, а не рассуждает о trade-off.

### LLM judge результата

Отклонено: нарушает offline-first, determinism, testability и content control.

### Challenge Engine напрямую меняет skills/project/grade

Отклонено: создаёт god-module и дублирует ADR-013/014 ownership.

### Отдельная уникальная механика для каждого вида работы

Отклонено: высокая content/implementation стоимость и слабая системная переносимость.

## Проверка

Решение считается подтверждённым для Vertical Slice, когда:

- игрок понимает ситуацию и варианты за 10–20 секунд;
- может предсказать направление trade-off;
- варианты ощущаются как разные подходы, а не correct/wrong answer;
- результат после MonthRun объясним;
- assisted/independent/partial/failure semantics сохраняются;
- reload не меняет complication/outcome;
- duplicate input не создаёт второй provider/progression result;
- нет очевидного глобально лучшего подхода;
- игрок хочет перейти к следующей профессиональной ситуации.
