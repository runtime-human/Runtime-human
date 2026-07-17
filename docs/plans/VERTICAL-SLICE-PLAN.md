# Vertical Slice Plan

Нормативные источники:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Casual Simulation Design](../game-design/CASUAL-SIMULATION-DESIGN.md);
- [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md);
- [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](../game-design/PROJECT-WORK-PACKAGE-ENGINE.md).

## 1. Цель

Создать минимальный интересный январь 1990 года:

```text
маленький программный проект
→ один понятный technical trade-off
→ автоматический MonthRun
→ правдоподобный project outcome
→ понятное learning explanation
→ безопасный restart
→ желание перейти к февралю
```

Slice проверяет удовольствие и comprehension, а не полноту долгосрочной архитектуры.

## 2. Главная продуктовая гипотеза

> Игрок без опыта программирования понимает цель и решение за несколько секунд, видит причинное последствие и хочет продолжить следующий месяц.

Если игрок помнит только интерфейс, покупку, progress bar или технически корректное сохранение, slice не прошёл.

## 3. Player flow

1. Создать 12-летнего персонажа.
2. Начать в комнате родителей с одним background доступа к технике.
3. Получить или увидеть путь к исторически допустимой beginner environment.
4. Выбрать простое обучение/focus.
5. Начать маленький текстовый project.
6. Увидеть цель и два крупных этапа.
7. Увидеть простой forecast: вероятно в этом или следующем месяце.
8. Нажать `Следующий месяц`.
9. Автоматически пройти школу и домашние обязательства.
10. Продвинуть основной Work Package.
11. Обнаружить проблему неправильного ввода.
12. Принять один choice:
    - исправить самостоятельно;
    - попросить помощь;
    - упростить первую версию;
    - перенести исправление на февраль.
13. При blocking choice закрыть приложение и восстановить тот же outcome.
14. Получить independent/assisted/partial/failure result.
15. Увидеть, как изменился project.
16. Увидеть, чему персонаж научился.
17. Получить один понятный next step.
18. Перезапустить приложение и загрузить идентичный committed result.

Release decision может быть частью этого choice, но отдельная сложная release flow не обязательна.

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

Одновременно normal UI показывает максимум три relevant skills.

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

## 5. MVP project model

### Project

Small personal text program.

Player-facing stages used:

```text
idea → development → released / continue-next-month
```

### Work Packages

1. `core-program`;
2. `input-errors`.

Only one active package shown at a time.

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

Possible states:

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

## 6. Meaningful decision

Decision card:

```text
Программа работает с обычными данными, но неправильный ввод даёт непонятный результат.

Исправить самостоятельно
— выпуск позже
— больше самостоятельного опыта

Попросить помощь
— выше шанс закончить сейчас
— меньше подтверждения самостоятельности

Упростить первую версию
— выпустить раньше
— небольшой технический долг

Перенести на февраль
— сохранить качество
— проект останется незавершённым
```

Options and wording may be shortened after usability tests.

## 7. Monthly report

Maximum 5–7 primary rows:

1. what character learned;
2. project outcome;
3. important quality/debt/issue consequence;
4. one life constraint/result;
5. noticeable money change if any;
6. important event if any;
7. February next step.

Example:

```text
Вы лучше понимаете, как находить ошибки во вводе.

Основная программа готова. Обработку неправильного ввода вы перенесли на февраль.
Поддерживаемость остаётся хорошей, но первая версия ещё не выпущена.

Следующий шаг: закончить обработку ошибок без подсказки.
```

## 8. Required technical elements

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
- deterministic project/episode IDs;
- atomic commit;
- Russian localization;
- focused tests.

Not required:

- full skill graph;
- full evidence claims;
- full ProjectState from Extended profile;
- full debt/defect/release models;
- Career/Product/Company/Open Source;
- complex balance simulator.

## 9. Storybook minimum

- Today screen;
- professional summary;
- three skill states;
- project card;
- active Work Package;
- simple forecast;
- three quality bands;
- minor debt/known issue;
- blocking decision;
- monthly report;
- suspended/recovery;
- loading/empty/error;
- long RU/keyboard/200%/contrast/reduced motion.

## 10. Content minimum

- one HomeCityProfile/era 1990–1994;
- 2–3 access backgrounds without permanent bad start;
- one full beginner technology;
- five internal skills;
- one project archetype;
- two package templates;
- one uncertainty rule;
- one known-issue/debt branch;
- four outcome variants;
- one aggregated professional explanation template;
- maximum 3 learning options;
- 4–6 events, mainly access/learning/project context;
- minimal equipment/housing context.

## 11. Decision budget

- 1–3 meaningful decisions in first month;
- only one project blocking decision;
- maximum one life-only blocking decision, preferably zero;
- ordinary routine auto-resolves;
- no jargon requirement;
- Details not required to decide.

## 12. Deterministic fixtures

- independent success;
- assisted success;
- simplified release/minor debt;
- partial/failure with February recovery;
- low-income/no-home-computer access path;
- close/restart at decision;
- duplicate answer/resume;
- quiet result variant.

## 13. Acceptance criteria

### Comprehension

- player states project goal correctly;
- identifies current problem;
- chooses within 10–20 seconds;
- predicts direction of trade-off;
- understands result after MonthRun;
- finds February next step;
- does not describe UI as Jira/CRM.

### Programmer fantasy

- player explains one learned capability;
- distinguishes assisted and independent outcome;
- project is more than a progress bar;
- no coding puzzle/IDE needed.

### Technical

- same seed/manifest gives same outcome;
- close/restart does not reroll;
- duplicate commands do not duplicate project/progression result;
- atomic commit;
- save reload works;
- no raw SQL renderer capability.

### Product

- majority of playtesters want to continue to February;
- normal mode sufficient;
- visible concepts fit casual complexity budget.

## 14. Deferred

- full Career/Junior progression;
- full evidence browser;
- detailed grade gates;
- multiple projects/portfolio;
- full debt/defect ledger;
- incidents/rollback;
- team/delegation;
- Product users/revenue;
- Company/Open Source;
- Content Studio/modding;
- long-term compaction.
