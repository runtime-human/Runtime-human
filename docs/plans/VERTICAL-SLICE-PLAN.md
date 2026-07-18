---
title: "Vertical Slice Plan"
type: plan
status: draft
canon: true
depends_on: [ADR-015, ADR-016, ADR-017]
updated: 2026-07-18
---

# Vertical Slice Plan

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md);
- [ADR-017](../adr/ADR-017-authoritative-programmer-learning-access-model.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md);
- [Programmer Learning Engine](../game-design/PROGRAMMER-LEARNING-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md);
- [Professional Challenge UI](../ui/PROFESSIONAL-CHALLENGE-UI.md);
- [Programmer Learning UI](../ui/PROGRAMMER-LEARNING-UI.md).

## 1. Цель

Создать минимальный интересный январь 1990 года:

```text
historically valid beginner access/source
→ короткий learning bridge
→ маленький программный project
→ concrete Technical Situation
→ один professional approach choice
→ automatic MonthRun
→ deterministic project/professional outcome
→ causal capability explanation
→ safe restart
→ желание перейти к февралю
```

Slice проверяет удовольствие и comprehension, а не полноту долгосрочной архитектуры.

## 2. Главная продуктовая гипотеза

> Игрок без опыта программирования понимает, откуда персонаж получил первые знания, чем guided learning отличается от самостоятельной способности, затем понимает техническую проблему и выбирает подход за несколько секунд.

Slice провален, если игрок помнит только покупку, course button, progress bar, скрытую «правильную кнопку» или технически корректное сохранение.

## 3. Complexity decision

Learning bridge не создаёт второй обязательный professional modal decision.

В январе допускается:

- одна короткая non-blocking learning choice до запуска MonthRun;
- либо заранее выбранный focus с автоматическим resolution;
- один обязательный blocking choice — Professional Challenge внутри проекта.

Learning outcome и project challenge входят в один непрерывный месячный профессиональный контекст. Project/Learning provider формирует **один агрегированный `ExperienceEpisode`** с practice и challenge facts. Два конкурирующих evidence/result потока в Vertical Slice не создаются.

## 4. Player flow

1. Создать 12-летнего персонажа.
2. Начать в комнате родителей с одним background доступа к технике.
3. Увидеть historically valid beginner source и путь доступа.
4. При отсутствии домашнего компьютера увидеть school-lab fallback без permanent lock.
5. Выбрать короткий learning approach:
   - разобрать готовый пример;
   - изменить пример;
   - попросить объяснение, если feedback доступен.
6. Получить компактный `LearningOutcome`: понял пример, изменил с помощью или подготовился к самостоятельной практике.
7. Начать маленький text project на основе этого материала.
8. Увидеть цель и два крупных Work Packages.
9. Увидеть forecast: вероятно в этом или следующем месяце.
10. Нажать `Следующий месяц`.
11. Автоматически пройти школу, домашние обязательства и routine practice.
12. Продвинуть `core-program`.
13. Получить `diagnose` Technical Situation: неправильный ввод даёт непонятный результат.
14. Понять две причины сложности: первый самостоятельный bug и planned release.
15. Выбрать один approach:
    - разобраться самостоятельно;
    - попросить помощь;
    - упростить первую версию;
    - перенести исправление на февраль.
16. При blocking choice закрыть приложение и восстановить те же situation/options/complication.
17. Получить clean/compromise/partial/failure result.
18. Project provider применяет outcome к `input-errors` Work Package.
19. Provider агрегирует learning + challenge facts в один `ExperienceEpisode`.
20. Progression показывает learning/capability без evidence bureaucracy.
21. Получить один concrete February next step.
22. Перезапустить приложение и загрузить идентичный committed result.

Release decision может быть частью approach, но отдельная сложная release flow не обязательна.

## 5. MVP learning bridge

### Learning goal

```text
Понять, как программа принимает ввод и почему данные нужно проверять.
```

### Source

Один вымышленный beginner manual/listing, соответствующий эпохе и выбранной technology.

Player-facing summary:

```text
Руководство с коротким рабочим примером.
Оно показывает структуру программы, но не даёт быстрого feedback.
```

### Access

Baseline routes:

- домашний компьютер;
- shared family device;
- школьный кабинет как fallback.

Access меняет удобство/темп, но не capability ceiling.

### Learning approaches

```text
Разобрать пример
+ проще понять общий принцип
− мало самостоятельной практики

Изменить пример
+ мост к собственному проекту
− можно не закончить без подсказки

Попросить объяснение
+ сильнее понять причину шагов
− результат остаётся guided
```

Learning choice может быть compact inline choice и не блокирует MonthRun второй раз.

### Learning outcome variants

- understood concept;
- reproduced/modified with guidance;
- modified independently;
- partial with useful next step;
- blocked by access with fallback/retry.

### Aggregation rule

Learning bridge не создаёт отдельную player-facing evidence card. Его practice/source/assistance facts добавляются в тот же месячный `ExperienceEpisode`, который завершает project challenge.

## 6. MVP professional model

### Aptitudes

- Reasoning Aptitude;
- Learning Adaptability.

Они не получают отдельный player-facing экран.

### Internal skills

- Problem Solving;
- Programming;
- Debugging;
- Data Modelling;
- Testing & Quality.

Normal UI показывает максимум три relevant skills.

### Technology

- one technology family;
- one historically available technology;
- one familiarity status;
- no version graph;
- no transfer matrix UI.

### Professional result

- one aggregated `ExperienceEpisode`;
- one progression/evidence summary;
- one capability phrase;
- one readiness status;
- no evidence timeline;
- no grade award required.

Capability candidate: `debug-simple-input-independently`; подтверждение принадлежит Progression Core.

Learning bridge может подготовить capability facts вроде `understands-input-validation`, но не выдаёт отдельный grade/evidence award.

## 7. MVP project model

### Project

Small personal text program.

```text
idea → development → released / continue-next-month
```

### Work Packages

1. `core-program`;
2. `input-errors`.

Only one active package is shown at a time.

### Progress

- started;
- progressing;
- almost ready;
- completed;
- needs rework.

### Uncertainty

- low / medium / high;
- forecast: this month / next month / unclear.

One deterministic hidden realization is enough.

### Quality

Only:

- работоспособность;
- удобство;
- поддерживаемость.

No confidence/trend UI.

### Debt and issue

At most one visible consequence:

- no debt;
- minor debt;
- known input issue;
- February recovery path.

No debt/defect ledger.

### Release/outcome

- completed and released;
- released with known limitation;
- delayed to February;
- partial result with recovery;
- failed attempt with next step.

No rollout/support/rollback policy.

## 8. MVP Professional Challenge

### Situation

```text
Неправильный ввод

Основная программа работает, но если вместо числа ввести текст,
она показывает непонятный результат.

Почему сложно:
— вы ещё не исправляли такие ошибки самостоятельно;
— выпуск планировался в этом месяце.
```

### Approaches

```text
Разобраться самостоятельно
+ больше самостоятельного опыта
− выпуск может задержаться

Попросить помощь
+ выше шанс закончить сейчас
− меньше подтверждения самостоятельности

Упростить первую версию
+ быстрее получить работающий результат
− известное ограничение и minor debt

Перенести на февраль
+ сохранить качество
− проект останется незавершённым
```

Exact probabilities/points are not shown.

### Ownership

- Learning Provider owns source/opportunity/access-cost application.
- Project provider owns context and project effects.
- Learning Engine resolves learning attempt only.
- Challenge Engine resolves technical approach/reason codes only.
- Progression owns capability/evidence/grade.
- Content cannot mutate domain/professional state directly.

## 9. Outcome fixtures

### Learning bridge

- worked example understood;
- example modified with support;
- low-access school-lab route;
- mentor/teacher unavailable with alternative route;
- blocked source/environment with visible retry.

### Professional challenge

- independent clean success;
- assisted success;
- simplified release/minor debt;
- delayed release/good maintainability;
- partial diagnosis;
- failed attempt with February recovery.

### Persistence/recovery

- close/restart before learning approach;
- close/restart at project decision;
- close/restart after provisional outcome;
- duplicate answer/resume;
- provider/access revision conflict;
- one aggregate episode, no duplicate learning/project result.

## 10. Monthly report

Maximum 5–7 primary rows:

1. what character understood/learned;
2. challenge/project outcome;
3. important compromise/debt/issue;
4. one life constraint/result;
5. noticeable money change if any;
6. important event if any;
7. February next step.

Example:

```text
Вы разобрались с проверкой ввода
Готовый пример помог понять общий принцип, но самостоятельность ещё требовала практики.

Отладка улучшилась
Вы самостоятельно нашли причину ошибки во вводе.

Основная программа готова, но выпуск перенесён на февраль.
Следующий шаг: закончить обработку ошибок без подсказки.
```

## 11. Required technical elements

- pnpm monorepo/TypeScript 7/Vite/Oxc;
- Tauri/React/Storybook;
- shared learning/challenge/progression IDs;
- schemas/validation;
- seeded deterministic RNG/Manifest;
- Gregorian calendar;
- Begin/Resume/Recover MonthRun;
- Rust persistence/SQLite gate;
- minimal professional/project state;
- minimal learning source/opportunity/access snapshots;
- minimal `TechnicalSituation`/approach/outcome contracts;
- deterministic attempt/situation/outcome/episode IDs;
- provider/access revision fingerprints;
- persisted learning and challenge drafts;
- atomic provider + progression commit;
- Russian localization;
- focused tests.

Not required:

- full skill graph/evidence claims;
- all source families/challenge archetypes;
- generic learning/challenge DSL;
- daily schedule;
- university/certificates/AI/adaptive tutor;
- full ProjectState/debt/defect/release;
- Career/Product/Company/Open Source;
- complex balance simulator.

## 12. Storybook minimum

- Today screen;
- compact learning opportunity card;
- source/access available and limited states;
- school-lab fallback;
- three learning approaches;
- guided/independent/blocked learning result;
- learning → project transition;
- professional summary;
- project card/active Work Package/forecast;
- Professional Challenge situation;
- four approach cards;
- independent/assisted/compromise/partial/failure results;
- monthly report;
- suspended/recovery;
- loading/empty/error;
- long RU/keyboard/200%/contrast/reduced motion.

## 13. Content minimum

- one HomeCityProfile/era 1990–1994;
- 2–3 access backgrounds without permanent bad start;
- one learning source and opportunity;
- one school-lab fallback route;
- one feedback possibility;
- one learning artifact/result;
- one full beginner technology;
- five internal skills;
- one project archetype;
- two package templates;
- one `diagnose` situation;
- four professional approaches/outcome mappings;
- one realized complication;
- stable reason codes/repetition fingerprints;
- one known-issue/debt branch;
- one aggregated professional explanation;
- 4–6 access/learning/project events;
- minimal equipment/housing context.

## 14. Decision budget

- 1–3 meaningful decisions in first month;
- maximum one short non-blocking learning choice;
- exactly one required professional/project blocking decision;
- 2–4 approaches for the blocking decision;
- maximum one life-only blocking decision, preferably zero;
- routine learning/life auto-resolves;
- no jargon requirement;
- Details not required to decide.

## 15. Acceptance criteria

### Comprehension

- player states learning and project goals;
- identifies source strength/limitation;
- distinguishes guided understanding from independent ability;
- finds low-access fallback route;
- identifies at least two challenge approaches;
- chooses blocking approach within 10–20 seconds;
- predicts trade-off direction;
- understands result and two causal factors;
- finds February next step;
- does not describe UI as LMS/quiz/Jira/CRM.

### Programmer fantasy

- player explains one learned capability;
- learning leads quickly into making/debugging;
- distinguishes assisted and independent outcome;
- project is more than a progress bar;
- situation feels technical without syntax/API requirement;
- no coding puzzle/IDE needed.

### Technical

- same seed/manifest gives same learning/challenge outcomes;
- visible decisions do not reroll;
- duplicate commands do not duplicate access cost, outcome or episode;
- engines do not mutate foreign state directly;
- provider/access revision mismatch recovers safely;
- exactly one aggregate episode is committed;
- atomic commit/save reload works;
- no raw SQL renderer capability.

### Product

- majority wants to continue to February;
- normal mode sufficient;
- visible concepts fit casual budget;
- no learning source or challenge approach is obviously globally optimal;
- low-access start does not feel doomed;
- result feels causal rather than random/stat-driven.

## 16. Deferred

- full Career/Junior progression;
- full evidence browser/grade gates;
- all learning source families/challenge archetypes;
- dynamic composition;
- daily schedule/spaced repetition planner;
- university/certificates;
- AI/adaptive tutoring;
- multiple projects/portfolio;
- full debt/defect ledger;
- incidents/rollback;
- team/delegation;
- Product/Company/Open Source;
- full Content Studio/modding;
- long-term compaction.