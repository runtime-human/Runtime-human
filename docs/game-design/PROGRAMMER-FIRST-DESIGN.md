---
title: "Programmer-First Design"
type: engine
status: draft
canon: true
depends_on: [ADR-015]
updated: 2026-07-18
---

# Programmer-First Design

## Статус

Нормативная межсистемная specification product hierarchy.

Связанные документы:

- [Casual Simulation Design](CASUAL-SIMULATION-DESIGN.md);
- [ADR-015](../adr/ADR-015-casual-first-abstraction-and-complexity-budget.md);
- [Professional Progression Engine](PROFESSIONAL-PROGRESSION-ENGINE.md);
- [Project & Work Package Engine](PROJECT-WORK-PACKAGE-ENGINE.md).

`CASUAL-SIMULATION-DESIGN.md` имеет приоритет в вопросах visible complexity, MVP scope и progressive disclosure.

## 1. Product statement

Runtime Human — казуальный текстовый симулятор становления, работы и наследия программиста.

Человеческая жизнь создаёт цену, ограничения и смысл профессионального пути. Внутренняя симуляция может быть глубже пользовательского представления, но глубина не измеряется количеством шкал, таблиц и сущностей.

Основная формула:

```text
понятная ситуация
→ редкий содержательный выбор
→ автоматический месяц
→ правдоподобное последствие
→ короткое объяснение
→ следующий интересный вариант
```

## 2. Иерархия систем

При конфликте scope:

1. **Programmer Mastery Core** — обучение, skills, technologies, реальные задачи и профессиональный рост.
2. **Professional Expression** — работа, проекты, продукты, open source, лидерство и компания.
3. **Human Constraints and Values** — здоровье, отношения, семья, деньги, жильё и обязательства.
4. **Narrative, Era and Philosophy** — история, личные арки, delayed consequences и legacy.

При конфликте внутри каждого слоя действует дополнительное правило:

> Понятный meaningful choice важнее полной симуляционной детализации.

## 3. Casual-first constraints

- normal mode не требует знания внутренних терминов;
- обычный месяц содержит 0–1 blocking decision;
- routine выполняется автоматически;
- один экран показывает 3–5 primary objects;
- одна system concept не дублируется несколькими visible bars;
- скрытое состояние существует только ради текущего decision/consequence/consistency;
- advanced details не являются обязательной частью MVP;
- architecture seam не создаёт automatic roadmap task;
- расширение требует playtest evidence.

## 4. Programmer Mastery Core

Полный semantic graph может включать:

- problem solving;
- programming;
- debugging;
- data modelling;
- testing/quality;
- codebase evolution;
- requirements/design;
- architecture;
- delivery/operations;
- non-functional engineering;
- technical communication;
- review/mentoring/leadership;
- community stewardship.

Но visible scope раскрывается по этапам:

- MVP: 3–5 relevant skills;
- Recommended: дополнительные skills по мере career;
- Extended: полный graph и advanced detail.

Отдельный progress bar не создаётся для каждого facet, tool или библиотеки.

## 5. Aptitudes и professional state

Baseline aptitudes:

- Reasoning Aptitude;
- Learning Adaptability.

Они являются узкими hidden/secondary modifiers, не RPG-судьбой.

Internal professional state может разделять mastery, fluency, technology familiarity и evidence, но normal UI показывает:

- capability phrase;
- relevant skills;
- technology familiarity;
- readiness status;
- next useful step.

## 6. Significant decision budget

Для active professional life:

- programmer/professional choices остаются majority;
- life-only events не вытесняют technical path;
- обычный месяц — 0–1 blocking decision;
- насыщенный milestone/crisis month — до 2 связанных decisions;
- quiet month допустим и группирует routine progress;
- серия однотипных choices должна менять контекст или consequence.

Точные rolling percentages остаются balance diagnostics, а не генератором модальных окон.

## 7. Experience providers и progression

Education, Projects, Career, Open Source, Company и Events владеют своими outcomes и передают `ExperienceEpisode`.

Progression Core:

- оценивает learning;
- обновляет skill/technology state;
- создаёт aggregated professional result;
- строит readiness projection;
- объясняет change.

Provider не меняет skills напрямую, Progression не переписывает provider truth.

## 8. Evidence и grades

Evidence нужен для причинности и защиты грейда от XP shortcut.

В MVP:

- один meaningful outcome создаёт один human-readable summary;
- routine practice агрегируется;
- evidence matrix/timeline не показывается;
- readiness status состоит из понятных областей;
- no grade award required in first month.

Professional grade:

- achieved milestone;
- не равен XP, стажу, title, salary или fame;
- не понижается автоматически после перерыва;
- требует нескольких meaningful contexts.

Top Programmer — late-game status, а не обязательный ранний formula target.

## 9. Technology policy

Technology tiers/lifecycle существуют для historical and gameplay meaning.

MVP:

- одна technology family;
- одна technology;
- одна familiarity state;
- no full version graph/transfer UI.

Recommended/Extended добавляют lifecycle, transfer и legacy context только при появлении соответствующего выбора.

## 10. Projects

Проект является главным местом применения навыков, но не становится Jira simulator.

MVP project:

- одна цель;
- 2 Work Packages;
- 3 quality bands;
- uncertainty;
- debt/risk band;
- one release choice;
- one professional outcome.

Игрок не управляет daily tasks, requirement checklist, debt ledger или bug inventory.

Проект не может быть только progress bar: минимум один trade-off меняет scope, quality, risk, release или future cost.

## 11. Career

Работа создаёт автоматические task contexts, income, feedback и professional opportunities.

Игрок принимает решения о:

- направлении;
- важных задачах;
- качестве/сроке;
- смене работодателя;
- promotion/path;
- mentoring/leadership.

Не требуется вручную обслуживать обычную рабочую неделю.

## 12. Life systems

Life systems:

- изменяют capacity, risk и opportunity cost;
- создают самостоятельные ценности;
- не требуют одинакового monthly maintenance clicking;
- не превращают отдых/отношения в mandatory buttons;
- не уничтожают programmer path после одного кризиса.

## 13. Narrative and philosophy

Narrative Director поддерживает professional journey и human history, но не заполняет каждый месяц событиями.

Philosophy появляется как интерпретация уже прожитой истории:

- передача проекта;
- legacy technology;
- mentoring;
- выбор между ещё одним большим проектом и спокойной жизнью.

Абстрактные моральные диалоги без связи с simulation не являются core gameplay.

## 14. UI hierarchy

Normal UI:

1. professional focus;
2. main activity/project;
3. next milestone;
4. critical constraint;
5. next month/action.

Progression показывает capability и next step. Project показывает goal, current package, forecast, three qualities и one important risk.

Details/Advanced не должны быть нужны для обычного решения.

## 15. Feature acceptance test

Feature входит в MVP только если:

1. создаёт понятный choice или visible consequence;
2. игрок понимает его без internal jargon;
3. routine можно автоматизировать;
4. state необходим прямо сейчас;
5. content/testing cost оправдан;
6. feature проверяет programmer fantasy;
7. он не требует future systems для базовой работы.

Feature откладывается, если обоснование — реализм, архитектурная полнота или гипотетическая поздняя игра.

## 16. Vertical Slice

Vertical Slice доказывает:

- понятен ли первый маленький проект;
- интересен ли один technical trade-off;
- понятны ли outcome и learning;
- безопасен ли restart;
- хочется ли перейти к февралю.

Он не доказывает полную Senior/Company/Product simulation.

## 17. Запрещённые дрейфы

- generic life simulator;
- coding puzzle/IDE;
- grade as XP;
- project as one progress bar;
- project as ticket dashboard;
- evidence as performance-review UI;
- full hidden simulation before gameplay need;
- seven mandatory quality panels;
- debt/bug maintenance clicking;
- architecture completeness as release criterion;
- Founder as universal best ending.

## 18. Definition of Done

Gameplay system готова для текущей phase, когда:

- normal mode понятен;
- visible concepts bounded;
- one meaningful trade-off exists;
- monthly causality explained;
- deterministic/recovery guarantees pass;
- deferred features are not implemented accidentally;
- playtest hypothesis and success criterion documented.
