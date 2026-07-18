---
title: "DC-001-CASUAL-FIRST-COMPLEXITY-CORRECTION-2026-07-17"
type: research
status: draft
canon: true
updated: 2026-07-18
---

# DC-001 — Casual-first correction после SD-001 и SD-002

- **Дата:** 2026-07-17
- **Статус:** design correction; нормативные выводы отражены в ADR-015 и профильных спецификациях
- **Область:** professional progression, project simulation, UI, vertical slice, roadmap и balance scope

## 1. Причина коррекции

SD-001 и SD-002 решили реальные архитектурные проблемы:

- отделили professional grade от XP, стажа и title;
- отделили Experience Providers от Progression Core;
- отделили technical ProjectState от Product, Career, Company и Open Source;
- ввели агрегированные Work Packages вместо daily tickets;
- закрепили deterministic suspend/resume и atomic commit.

Однако документы начали описывать максимальную долгосрочную модель как ранний baseline. В результате первая реализация рисковала включить:

- 13 одновременно значимых skills;
- detailed evidence claims и readiness gates;
- несколько состояний familiarity/recency;
- complex challenge profiles;
- 7 quality dimensions;
- confidence/trend/source для quality;
- debt aggregates и отдельные debt records;
- несколько типов defects/incidents;
- granular contribution;
- release/rollout/support/rollback policies;
- migration и compaction многолетней истории.

Это архитектурно правдоподобно, но продуктово не соответствует казуальному симулятору и стоимости небольшой команды.

## 2. Главный вывод

Проблема находится не в границах ADR-013/014, а в смешении трёх вещей:

1. архитектурной возможности;
2. долгосрочной recommended model;
3. обязательного scope первой реализации.

Архитектурная возможность не должна автоматически становиться backlog item.

## 3. Что сохраняется

Сохраняются:

- programmer-first fantasy;
- один месяц как ход;
- отсутствие action points и percentage sliders;
- mastery/fluency/familiarity как внутренняя семантика;
- evidence-based grade;
- `ExperienceEpisode` boundary;
- агрегированный `WorkPackage`;
- uncertainty;
- quality trade-offs;
- debt как future cost;
- team result vs character contribution;
- deterministic MonthRun;
- atomic persistence;
- Project/Product/Career/Company/Progression boundaries.

Эти решения защищают игру от грубых shortcuts, но не требуют полного публичного или внутреннего detail сразу.

## 4. Что упрощается

### Professional progression

- normal UI показывает 3–5 relevant skills, а не полный graph;
- evidence группируется в human-readable outcome;
- readiness показывает четыре понятные области;
- raw claims и numeric gates остаются diagnostics/late advanced mode;
- отдельная Evidence Timeline не входит в MVP;
- Top Programmer и leadership evidence откладываются.

### Project model

- пять player-facing project stages;
- 2–5 Work Packages;
- три базовых quality dimensions;
- situational reliability/performance/security/operations;
- один debt band;
- risk/known issue/incident вместо полного defect ledger;
- compact contribution summary;
- compact release state;
- forecast band вместо обязательных трёх точек и confidence detail.

### UI

- главный экран содержит один professional focus, одну главную активность, milestone, warning и next month;
- monthly report ограничен несколькими primary rows;
- advanced details не являются частью основного gameplay;
- normal mode не использует внутренний инженерный жаргон.

## 5. Что откладывается

До подтверждения playtest не реализуются:

- component/requirement graph;
- full debt ledger;
- defect inventory;
- detailed contribution percentages;
- full quality confidence/trend model;
- rollout/support/rollback policies;
- portfolio dashboard;
- employee/hour allocation;
- full evidence browser;
- complex GradeReadiness profiles;
- technology version graph;
- long-term compaction;
- Senior/CTO/Founder/Top Programmer mechanics.

## 6. Новая модель планирования

### MVP Casual

Проверяет:

- понятен ли первый месяц;
- интересен ли один технический trade-off;
- понятны ли project outcome и learning;
- хочется ли продолжить.

### Recommended

Добавляет конкретную глубину после evidence playtest.

### Extended Simulation

Сохраняется как разрешённое направление поздней игры, но не Definition of Done ранних phases.

## 7. Product risks после коррекции

### Риск чрезмерного упрощения

Проект может снова стать progress bar. Защита:

- минимум один реальный trade-off;
- uncertainty;
- отдельные quality bands;
- delayed debt/risk consequence;
- causal report.

### Риск ложной случайности

Скрытая модель может казаться рандомом. Защита:

- reason codes переводятся в human text;
- forecast direction видим;
- reload не reroll;
- important consequences traceable.

### Риск недостатка глубины для эксперта

Защита:

- Details mode;
- semantic consistency;
- realistic trade-offs;
- позднее расширение по запросу playtest;
- отсутствие fake precise numbers.

## 8. Проверяемая продуктовая гипотеза

> Игрок должен понять решение за 10–20 секунд, увидеть причинное последствие после месяца и захотеть продолжить, не изучая внутреннюю модель.

Эта гипотеза важнее доказательства архитектурной полноты.

## 9. Синхронизация

Нормативные выводы должны быть отражены в:

- ADR-013/014/015;
- `CASUAL-SIMULATION-DESIGN.md`;
- `PROGRAMMER-FIRST-DESIGN.md`;
- progression/project specs;
- progression/project UI specs;
- UI architecture;
- balance simulation;
- vertical slice;
- roadmap;
- AGENTS/README/indexes.

## 10. Вердикт

Runtime Human должен иметь умеренно глубокую внутреннюю модель и простой пользовательский язык. Решения игрока редкие и понятные, routine автоматизирована, а подробности открываются только по запросу.

Правильная цель:

> не симулировать всё, что существует в реальной разработке, а выбрать минимальный набор процессов, создающих правдоподобный путь программиста.
