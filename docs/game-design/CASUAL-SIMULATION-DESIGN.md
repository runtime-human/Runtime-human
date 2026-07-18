---
title: "CASUAL-SIMULATION-DESIGN"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Casual Simulation Design

## Статус

Нормативная межсистемная спецификация пользовательской и реализационной сложности.

Основание:

- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [ADR-014](../adr/ADR-014-authoritative-project-work-package-model.md).

Эта спецификация определяет, какая часть глубокой архитектуры действительно входит в playable baseline.

## 1. Игровая формула

Runtime Human должен ощущаться как казуальный текстовый симулятор жизни и карьеры программиста:

```text
понятная текущая ситуация
→ один содержательный выбор
→ месяц автоматической жизни и работы
→ правдоподобное последствие
→ короткое объяснение
→ новый интересный вариант
```

Глубина возникает из:

- накопления последствий;
- разных профессиональных путей;
- исторического изменения технологий;
- пересечения работы, проектов и жизни;
- выбора между скоростью, качеством, риском и личными ценностями.

Глубина не должна зависеть от количества одновременно видимых шкал, таблиц или сущностей.

## 2. Основные принципы

### 2.1. Решение важнее модели

Внутренний параметр существует, только если помогает создать:

- meaningful choice;
- прогноз;
- объяснимое последствие;
- recovery path;
- защиту от exploit/soft lock;
- consistency boundary.

### 2.2. Один смысл — один пользовательский объект

Несколько внутренних dimensions могут агрегироваться в одну понятную карточку или фразу.

Игрок не должен одновременно видеть:

- mastery, fluency, familiarity, recency и evidence confidence;
- семь quality dimensions;
- десятки debt/defect records;
- полный contribution ledger.

### 2.3. Автоматизировать рутину, поднимать trade-offs

Игра автоматически выполняет:

- routine learning;
- обычную работу;
- предсказуемое продвижение проекта;
- мелкие fixes;
- regular maintenance;
- стандартное восстановление;
- бытовые обязательства.

Игрок вмешивается при:

- выборе нового направления;
- существенном scope change;
- выборе скорости против качества;
- важном bug/risk;
- release;
- смене работы;
- конфликте commitments;
- кризисе или необратимом milestone.

### 2.4. Причинность важнее точности

Лучше показать:

> Проект задержится: вы обнаружили дополнительную обработку ошибок.

чем:

> Прогноз изменился с 68,4 до 72,9 work units.

### 2.5. Внутренняя глубина раскрывается постепенно

Normal mode является основным дизайном.

Details и Advanced добавляются только для:

- любопытных игроков;
- объяснения спорного результата;
- поздних систем;
- diagnostics/playtesting.

## 3. Профили реализации

## 3.1. MVP Casual

Обязателен для Vertical Slice.

Включает:

- 3–5 player-facing skills текущего этапа;
- одну активную technology proficiency;
- capability phrases вместо numeric evidence matrix;
- один маленький project;
- 2 Work Packages;
- 3 quality bands;
- один debt band;
- один risk/known-issue state;
- один release decision;
- один aggregated professional outcome;
- 0–1 blocking decision за обычный месяц;
- короткий monthly report.

Не включает:

- full 13-skill UI;
- evidence timeline;
- detailed GradeReadiness gates;
- transfer matrix UI;
- component/requirement graph;
- debt/defect ledgers;
- team contribution dimensions;
- rollout/support policies;
- portfolio management;
- Senior/CTO/Founder simulation.

## 3.2. Recommended

Добавляется после успешного Vertical Slice и первых игровых лет.

Может включать:

- больше skills через progressive disclosure;
- несколько technologies/families;
- Intern/Junior readiness;
- 2–5 packages на проект;
- ситуационные quality dimensions;
- значимые debt/defect records;
- простые team contribution categories;
- release history;
- более длинные project arcs;
- Details mode.

## 3.3. Extended Simulation

Отложено до подтверждённой поздней игры.

Может включать:

- полный skill graph;
- advanced evidence browser;
- complex grade profiles;
- technology version graph;
- long-lived project maintenance;
- granular team contribution;
- delegation policies;
- production incidents/rollback;
- company portfolio;
- Senior/CTO/Founder/Top Programmer mechanics.

Extended не является Definition of Done ранних фаз.

## 4. Бюджет решений

### Обычный месяц

- 0–1 blocking decision;
- 1–3 заметных результата;
- 1 основной следующий шаг;
- routine changes grouped.

### Насыщенный месяц

- до 2 связанных blocking decisions;
- используется для кризиса, release или крупного milestone;
- после серии насыщенных месяцев Narrative Director создаёт recovery/quiet window.

### Проект

- 2–5 значимых Work Packages;
- package обычно имеет не более одного player-facing trade-off;
- project не показывает больше 1–3 активных packages одновременно;
- долгий проект создаёт новые packages этапами, а не показывает весь backlog.

## 5. Casual professional progression

## 5.1. Что видит игрок

Normal mode показывает:

- текущий подтверждённый грейд;
- capability phrase;
- 3–5 наиболее релевантных skills;
- активную technology;
- один следующий полезный тип задачи;
- статус готовности:
  - недостаточно опыта;
  - развивается;
  - почти готов;
  - готов.

Пример:

```text
Отладка — уверенный начинающий

Вы уже самостоятельно находите простые ошибки.
Следующий шаг: проблема, затрагивающая несколько частей программы.
```

## 5.2. Что остаётся внутри

Core может хранить:

- mastery;
- fluency;
- technology familiarity;
- evidence claims;
- awarded grade;
- readiness projection.

Но MVP UI не обязан показывать каждое понятие отдельно.

## 5.3. Evidence

Evidence используется для причинности и защиты грейда от XP shortcut.

В MVP:

- один meaningful outcome создаёт один aggregated evidence summary;
- routine practice не создаёт карточек;
- игрок видит человеческое объяснение;
- raw claims доступны только diagnostics/test fixtures;
- отдельный Evidence Timeline откладывается.

## 5.4. Grade readiness

Normal mode сводит readiness к областям:

- техническая база;
- самостоятельность;
- сложность решённых задач;
- надёжность результата.

Внутренние gate profiles могут быть детальнее, но не должны определять структуру основного экрана.

## 6. Casual project model

## 6.1. Project state для MVP

```ts
type CasualProjectState = Readonly<{
  id: ProjectId;
  stage: CasualProjectStage;
  goal: ProjectGoalSummary;
  packages: readonly CasualWorkPackageState[];
  quality: CasualQualityProfile;
  debt: DebtBand;
  risk: ProjectRiskBand;
  releaseState: CasualReleaseState;
  revision: ProjectRevision;
}>;
```

Это player-facing baseline. Persistence/Core могут использовать совместимые internal snapshots, но не обязаны заранее реализовывать Extended fields.

## 6.2. Стадии

```text
idea
→ development
→ release-preparation
→ released
→ maintenance / finished
```

Архив, transfer, sale и abandonment добавляются при появлении соответствующего gameplay.

## 6.3. Work Package

```ts
type CasualWorkPackageState = Readonly<{
  id: WorkPackageId;
  kind: CasualWorkPackageKind;
  state: 'planned' | 'active' | 'blocked' | 'completed';
  progress: ProgressBand;
  challenge: CasualChallengeBand;
  uncertainty: UncertaintyBand;
  forecast: ForecastBand;
}>;
```

Work Package является этапом:

- сделать основной прототип;
- обработать ошибки;
- подготовить выпуск;
- переработать проблемную часть;
- исправить серьёзную проблему.

Он не является тикетом, методом, файлом или ежедневным заданием.

## 6.4. Progress

Normal mode использует bands:

```text
не начато
→ начато
→ продвигается
→ почти готово
→ готово
→ требует пересмотра
```

Exact percentage показывается только когда он действительно достоверен и полезен.

## 6.5. Uncertainty

Normal mode:

- низкая;
- средняя;
- высокая.

Forecast:

- вероятно в этом месяце;
- вероятно в следующем;
- срок пока неясен.

Optimistic/likely/cautious три точки не обязательны для MVP. Они добавляются, если playtest показывает пользу.

## 6.6. Quality

Базовые качества:

- **Работоспособность** — выполняет ли проект основную цель;
- **Удобство** — насколько результат понятен и приятен пользователю;
- **Поддерживаемость** — насколько легко продолжать разработку.

Bands:

```text
не проверено
→ слабое
→ приемлемое
→ хорошее
→ отличное
```

Situational qualities появляются только при relevant project:

- надёжность;
- производительность;
- безопасность;
- эксплуатация.

Confidence и trend могут существовать в Core, но normal mode показывает их только когда они меняют решение.

## 6.7. Technical debt

Normal mode:

```text
нет
→ незначительный
→ заметный
→ тяжёлый
```

Debt влияет на будущие сроки, риск и maintenance.

Отдельная карточка создаётся только для значимого тематического долга:

- временная архитектура;
- отсутствие проверок;
- устаревшая зависимость;
- плохо понятная критическая часть.

Полный ledger откладывается.

## 6.8. Bugs and risk

MVP различает:

- скрытый риск ошибок;
- известную проблему;
- серьёзный incident.

Мелкие ошибки агрегируются и не требуют отдельного управления.

## 6.9. Release

Release states:

- не готов;
- готов;
- готов с известным ограничением;
- отложен;
- выпущен;
- провален с recovery path.

MVP release decision показывает:

- что войдёт;
- известную проблему;
- общий quality/risk;
- варианты release/delay/simplify/fix.

Rollout, rollback и support policies добавляются только для поздних production projects.

## 6.10. Contribution

MVP summary:

- самостоятельно;
- с помощью;
- совместно с командой;
- через review/руководство.

Granular percentages и полный ledger не нужны.

## 7. Default UI

## 7.1. Главный экран

Одновременно показывает:

1. текущий professional focus;
2. одну главную активность/проект;
3. ближайший milestone;
4. критическое ограничение, если оно есть;
5. кнопку следующего месяца.

## 7.2. Project card

Пример:

```text
Текстовый органайзер

Стадия: разработка
Текущий этап: обработка неправильного ввода
Прогноз: вероятно готов в феврале
Неопределённость: средняя

Работоспособность: хорошая
Удобство: базовое
Поддерживаемость: средняя
Долг: незначительный

Решение:
исправить обработку ошибок сейчас
или выпустить первую версию раньше
```

## 7.3. Monthly report

Не более 5–7 primary rows:

1. чему научился персонаж;
2. что произошло с главным проектом/работой;
3. одно важное evidence/capability explanation;
4. важное life consequence;
5. деньги только при заметном изменении;
6. новый вариант следующего месяца.

Мелкие изменения раскрываются по кнопке `Подробнее`.

## 8. Feature complexity test

Перед добавлением feature ответить:

1. Какой конкретный выбор он создаёт?
2. Как игрок поймёт его за несколько секунд?
3. Какое видимое последствие он меняет?
4. Можно ли выразить его существующим band/status?
5. Нужен ли отдельный authoritative state прямо сейчас?
6. Какой экран/контент/test burden он добавляет?
7. Есть ли playtest evidence, что текущая модель недостаточна?

Feature откладывается, если ответы сводятся к реализму, архитектурной полноте или гипотетическому будущему.

## 9. Playtest gates

Перед переходом из MVP Casual в Recommended:

- не менее 80% тестовых игроков понимают главную цель первого месяца без объяснения;
- игрок за 10–20 секунд понимает обычный decision card;
- после месяца игрок правильно объясняет минимум две причины результата;
- большинство игроков хотят перейти к следующему месяцу;
- default screen не воспринимается как dashboard/CRM;
- игрок различает skill, technology и project без терминологического теста;
- минимум две стратегии кажутся жизнеспособными;
- advanced detail не требуется для обычного решения.

Точные thresholds являются стартовыми гипотезами и уточняются playtest.

## 10. Definition of Done

Gameplay feature готова, когда:

- normal mode понятен без advanced view;
- visible concepts находятся в complexity budget;
- routine автоматизирована;
- решение имеет реальный trade-off;
- monthly report объясняет consequence;
- hidden state оправдан текущей функцией;
- feature не требует будущей системы для базовой работоспособности;
- Storybook содержит normal/edge/long-RU/accessibility fixtures;
- playtest question и success criterion задокументированы.
