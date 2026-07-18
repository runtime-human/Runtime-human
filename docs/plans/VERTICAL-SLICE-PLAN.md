# Vertical Slice Plan

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [ADR-016](../adr/ADR-016-authoritative-professional-challenge-model.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Professional Challenge Engine](../game-design/PROFESSIONAL-CHALLENGE-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md);
- [Professional Challenge UI](../ui/PROFESSIONAL-CHALLENGE-UI.md).

## 1. Цель

Создать минимальный интересный январь 1990 года:

```text
маленький программный project
→ concrete Technical Situation
→ один понятный professional approach choice
→ automatic MonthRun
→ deterministic project outcome
→ causal learning/capability explanation
→ safe restart
→ желание перейти к февралю
```

Slice проверяет удовольствие и comprehension, а не полноту долгосрочной архитектуры.

## 2. Главная продуктовая гипотеза

> Игрок без опыта программирования понимает техническую проблему и различие подходов за несколько секунд, видит причинное последствие и хочет продолжить следующий месяц.

Если игрок помнит только интерфейс, покупку, progress bar, скрытую «правильную кнопку» или технически корректное сохранение, slice не прошёл.

## 3. Player flow

1. Создать 12-летнего персонажа.
2. Начать в комнате родителей с одним background доступа к технике.
3. Получить или увидеть путь к historically valid beginner environment.
4. Выбрать простое обучение/focus.
5. Начать маленький text project.
6. Увидеть цель и два крупных Work Packages.
7. Увидеть forecast: вероятно в этом или следующем месяце.
8. Нажать `Следующий месяц`.
9. Автоматически пройти школу и домашние обязательства.
10. Продвинуть `core-program`.
11. Получить `diagnose` Technical Situation: неправильный ввод даёт непонятный результат.
12. Понять две причины сложности: первый самостоятельный bug и planned release.
13. Выбрать один approach:
    - разобраться самостоятельно;
    - попросить помощь;
    - упростить первую версию;
    - перенести исправление на февраль.
14. При blocking choice закрыть приложение и восстановить те же situation/options/complication.
15. Получить clean/compromise/partial/failure result.
16. Project provider применяет outcome к `input-errors` Work Package.
17. Provider создаёт один `ExperienceEpisode`.
18. Progression показывает learning/capability без evidence bureaucracy.
19. Получить один concrete February next step.
20. Перезапустить приложение и загрузить идентичный committed result.

Release decision может быть частью approach, но отдельная сложная release flow не обязательна.

## 4. MVP professional model

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

- one `ExperienceEpisode`;
- one aggregated progression/evidence summary;
- one capability phrase;
- one readiness status;
- no evidence timeline;
- no grade award required.

Capability candidate: `debug-simple-input-independently`; подтверждение принадлежит Progression Core.

## 5. MVP project model

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

### Contribution

- independent;
- assisted.

No team contribution model in slice.

## 6. MVP Professional Challenge

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
— сначала воспроизвести ошибку и проверить входные данные
+ больше самостоятельного опыта
− выпуск может задержаться

Попросить помощь
— разобрать проблему вместе с более опытным человеком
+ выше шанс закончить сейчас
− меньше подтверждения самостоятельности

Упростить первую версию
— ограничить допустимый ввод и выпустить сейчас
+ быстрее получить работающий результат
− известное ограничение и minor debt

Перенести на февраль
— не выпускать, пока обработка ошибок не будет закончена
+ сохранить качество
− проект останется незавершённым
```

Options may be shortened after usability tests. Exact probabilities/points are not shown.

### Challenge ownership

- Project provider owns context and applies project effects.
- Challenge Engine owns deterministic approach resolution/reason codes.
- Progression owns learning, evidence and capability confirmation.
- Content cannot change project/skills/grade directly.

## 7. Outcome fixtures

### Independent clean success

- input bug diagnosed/fixed;
- release delayed or completed according to realized work;
- independent participation;
- Debugging capability candidate.

### Assisted success

- bug fixed;
- strong learning/feedback;
- autonomy remains assisted;
- mentor relation consequence optional.

### Simplified release

- project released;
- known limitation/minor debt;
- no false full debugging capability.

### Partial/failed with learning

- cause partially identified or hypothesis narrowed;
- no full delivery;
- February recovery path;
- learning explanation remains positive and accurate.

## 8. Monthly report

Maximum 5–7 primary rows:

1. what character learned;
2. challenge/project outcome;
3. important compromise/debt/issue;
4. one life constraint/result;
5. noticeable money change if any;
6. important event if any;
7. February next step.

Example:

```text
Отладка улучшилась
Вы самостоятельно нашли причину ошибки во вводе.

Основная программа готова, но выпуск перенесён на февраль.
Помогло: вы сначала воспроизвели проблему и проверили данные.

Следующий шаг: закончить обработку ошибок без подсказки.
```

## 9. Required technical elements

- pnpm monorepo/TypeScript 7/Vite/Oxc;
- Tauri/React/Storybook;
- shared IDs/GameDate/Money/WorkUnit/fixed-point;
- schemas/validation;
- seeded deterministic RNG/Manifest;
- Gregorian calendar;
- Begin/Resume/Recover MonthRun;
- Rust persistence/SQLite gate;
- minimal professional state;
- minimal project state;
- minimal `TechnicalSituation`/approach/outcome contracts;
- deterministic situation/outcome/episode IDs;
- provider revision/input fingerprint;
- persisted complication and selected approach;
- atomic project + progression commit;
- Russian localization;
- focused tests.

Not required:

- full skill graph;
- full evidence claims;
- all challenge archetypes;
- generic challenge DSL/dynamic generator;
- full ProjectState from Extended profile;
- full debt/defect/release models;
- Career/Product/Company/Open Source;
- complex balance simulator.

## 10. Storybook minimum

- Today screen;
- professional summary;
- three skill states;
- project card;
- active Work Package;
- simple forecast;
- Professional Challenge situation;
- four approach cards;
- unavailable option explanation;
- independent/assisted/compromise/partial/failure outcomes;
- monthly report;
- suspended/recovery;
- loading/empty/error;
- long RU/keyboard/200%/contrast/reduced motion.

## 11. Content minimum

- one HomeCityProfile/era 1990–1994;
- 2–3 access backgrounds without permanent bad start;
- one full beginner technology;
- five internal skills;
- one project archetype;
- two package templates;
- one `diagnose` situation template;
- four approach definitions;
- one realized complication;
- four outcome mappings;
- stable reason codes and repetition fingerprint;
- one known-issue/debt branch;
- one aggregated professional explanation template;
- maximum 3 learning options;
- 4–6 events, mainly access/learning/project context;
- minimal equipment/housing context.

## 12. Decision budget

- 1–3 meaningful decisions in first month;
- only one professional/project blocking decision;
- 2–4 approaches for that decision;
- maximum one life-only blocking decision, preferably zero;
- ordinary routine auto-resolves;
- no jargon requirement;
- Details not required to decide.

## 13. Deterministic fixtures

- independent clean success;
- assisted success;
- simplified release/minor debt;
- delayed release/good maintainability;
- partial diagnosis;
- failed attempt with February recovery;
- low-income/no-home-computer access path;
- close/restart before answer;
- close/restart after provisional outcome;
- duplicate answer/resume;
- provider revision conflict recovery;
- quiet result variant;
- declared fixture set has no universally best approach.

## 14. Acceptance criteria

### Comprehension

- player states project goal/problem correctly;
- distinguishes at least two approaches;
- chooses within 10–20 seconds;
- predicts direction of trade-off;
- understands result after MonthRun;
- identifies at least two causal factors;
- finds February next step;
- does not describe UI as quiz/Jira/CRM.

### Programmer fantasy

- player explains one learned capability;
- distinguishes assisted and independent outcome;
- project is more than a progress bar;
- situation feels technical without requiring syntax/API knowledge;
- no coding puzzle/IDE needed.

### Technical

- same seed/manifest gives same situation/complication/outcome;
- visible decision does not reroll;
- duplicate commands do not duplicate challenge/project/progression result;
- Challenge Engine does not mutate provider/progression state directly;
- provider revision mismatch recovers safely;
- atomic commit;
- save reload works;
- no raw SQL renderer capability.

### Product

- majority of playtesters want to continue to February;
- normal mode sufficient;
- visible concepts fit casual complexity budget;
- no approach is obviously globally optimal;
- result feels causal rather than random/stat-driven.

## 15. Deferred

- full Career/Junior progression;
- full evidence browser;
- detailed grade gates;
- all challenge archetypes;
- dynamic challenge composition;
- multiple projects/portfolio;
- full debt/defect ledger;
- incidents/rollback;
- team/delegation;
- Product users/revenue;
- Company/Open Source;
- Content Studio/modding;
- long-term compaction.
