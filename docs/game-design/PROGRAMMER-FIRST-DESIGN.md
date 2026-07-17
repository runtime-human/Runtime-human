# Programmer-First Design

## Статус

Нормативная межсистемная спецификация product hierarchy. Она уточняет `GAMEPLAY-CANON.md` и применяется ко всем игровым подсистемам, контенту, UI, balance simulation и планам реализации.

Профессиональная progression/evidence модель вынесена в:

- [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md);
- [Professional Progression & Evidence Engine](PROFESSIONAL-PROGRESSION-ENGINE.md).

Эти документы имеют приоритет в вопросах aptitudes, skills, mastery/fluency/familiarity, evidence и grades.

## 1. Product statement

Runtime Human — симулятор становления, работы и наследия программиста, в котором человеческая жизнь создаёт цену, ограничения, контекст и смысл профессионального пути.

Программирование не является одной из равноправных профессий внутри универсального life simulator. Оно является центральной игровой идентичностью персонажа и главным источником долгосрочной прогрессии.

## 2. Иерархия систем

При конфликте объёма, экранного пространства, контентного бюджета или blocking events действует следующий приоритет:

1. **Programmer Mastery Core** — skills, technologies, реальные задачи, качество, инженерная зрелость и evidence.
2. **Professional Expression** — работа, проекты, продукты, open source, публичная экспертиза, лидерство и компания.
3. **Human Constraints and Values** — здоровье, отношения, семья, деньги, жильё, возраст и обязательства.
4. **Narrative, Era and Philosophy** — исторический контекст, личные арки, delayed consequences, наследие и итоговая интерпретация жизни.

Нижний слой может изменить смысл или цену решений верхнего слоя, но не должен вытеснять его из основного игрового цикла.

## 3. Programmer Mastery Core

Обязательные области:

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

Точный skill graph и visibility tiers определены в `PROFESSIONAL-PROGRESSION-ENGINE.md`.

## 4. Aptitudes и профессиональное состояние

Baseline aptitudes:

- Reasoning Aptitude;
- Learning Adaptability.

Они являются узкими медленно меняющимися modifiers, а не RPG-судьбой и не главным scoreboard.

Self-Organization, Communication, Focus, Creativity и Persistence моделируются skills, traits и current statuses согласно профильным спецификациям.

Authoritative professional state разделяет:

- mastery;
- fluency;
- technology familiarity;
- professional focus;
- awarded grade milestones;
- evidence/practice history.

Grade readiness и specialization являются projections.

## 5. Significant decision budget

`MeaningfulDecision` — решение, изменяющее долгосрочное состояние, commitment, риск, проект, карьеру, relationship, technology или professional evidence.

Для rolling window в 12 месяцев до выхода из активной профессиональной жизни:

- минимум 60% meaningful decisions затрагивают Programmer Mastery Core или Professional Expression;
- минимум 40% имеют прямой technical component;
- life-only decisions не превышают 35% без активного crisis arc;
- philosophy/legacy-only decisions до late career не превышают 10%;
- минимум 8 из 12 месяцев дают видимый professional outcome либо объяснимую профессиональную паузу;
- серия без нового technical evidence обычно не превышает 3 месяцев, кроме болезни, ухода за близким, отпуска, безработицы или выбранного sabbatical.

Показатели являются balance targets. Они не требуют отдельного modal decision каждый месяц.

## 6. Experience providers и progression

Education, Projects, Career, Open Source, Company и Events владеют своими activities/tasks/outcomes и передают `ExperienceEpisode`.

Professional Progression Core:

- не владеет project/job/course lifecycle;
- отдельно рассчитывает mastery, fluency/familiarity и evidence;
- не создаёт grade из общего XP;
- материализует evidence только из traceable outcome;
- строит explainable readiness projections.

## 7. Professional Evidence и grades

Meaningful professional outcome создаёт append-only evidence claims. Routine practice агрегируется помесячно.

Professional grade:

- является achieved milestone;
- не равен стажу, XP, salary, title, role, reputation или fame;
- требует capability gates, устойчивости и нескольких contexts;
- не понижается автоматически после временного перерыва.

Разделяются:

- Demonstrated Grade Readiness;
- Current Market Readiness.

Top Programmer — редкий endgame status с длительным impact, а не обычный числовой следующий grade.

## 8. Technology policy

Каждая technology имеет Tier A/B/C.

- Tier A — самостоятельный gameplay/lifecycle/proficiency;
- Tier B — identity с общей family mechanics;
- Tier C — tag/context без отдельной progression bar.

Technology lifecycle:

```text
announced
→ available
→ learnable locally
→ early adoption
→ growing demand
→ mainstream
→ mature
→ declining
→ legacy
→ end-of-support
```

Directed transfer ускоряет learning/reacquisition, но не создаёт production evidence и не повышает grade.

## 9. Project as mastery engine

Проект является главным местом, где знания превращаются в evidence.

Игрок принимает решения о:

- scope;
- quality priorities;
- technology;
- сроки/качество/debt;
- research/implementation/testing/refactor/release;
- bugs/incidents/feedback;
- завершение, support, transfer, sale или archive.

Игрок не распределяет ежедневные coding tasks вручную. Project Engine формирует aggregate work packages и передаёт contribution/outcome в Progression Core.

Progress bar не может быть единственной моделью проекта.

## 10. Career as expression of mastery

Работа создаёт task contexts, feedback, team contribution, зарплату и professional opportunities.

Работа не начисляет mastery только за прошедший стаж.

Promotion, company title и professional grade различаются. Founder/CTO не являются обязательным лучшим endgame и не преобразуют management XP в programmer mastery.

После перехода к управлению programmer identity выражается через architecture, technical direction, review, mentoring, incident leadership и delegation with outcomes.

## 11. Life systems

Life systems имеют самостоятельную ценность и не обязаны быть только карьерными buffs. Однако они не требуют рутинного ежемесячного обслуживания.

Они влияют на:

- calendar capacity;
- attention/context switching;
- recovery;
- risk tolerance;
- financial runway;
- доступ к equipment/education;
- project/career choices;
- narrative consequences.

Ни один lifestyle choice не объявляется единственно правильным.

## 12. Narrative policy

Для rolling window в 24 месяца активной профессиональной жизни:

- technical/project/career/open-source meaningful events: 55–70%;
- relationships/health/finance/housing: 15–30%;
- era/world/community: 10–20%;
- philosophy/legacy-only до late career: 0–10%.

Quiet month допустим, если отчёт показывает professional progress, maintenance, recovery или осознанную паузу.

## 13. Monthly loop

До MonthRun игрок видит:

- professional focus;
- active learning/projects/work commitments;
- load/work-unit forecast;
- likely skill/technology outcomes;
- grade evidence gaps;
- life constraints.

Blocking разрешён только для значимого решения, которое нельзя разумно выполнить автоматически.

Monthly Report начинается с:

1. что изменилось в персонаже как в программисте;
2. работа, задачи и проекты;
3. evidence и readiness;
4. technologies/opportunities;
5. нагрузка, здоровье и отношения;
6. деньги;
7. история/delayed consequences.

## 14. UI hierarchy

Основная навигация:

1. Today/Life Screen с programmer focus;
2. Skills & Technologies;
3. Projects;
4. Career;
5. Open Source/Public Work;
6. Company;
7. Life;
8. Journal/History.

Normal UI показывает capabilities и причины. Advanced UI может показывать dimensions, evidence, transfer и lifecycle. Exact hidden weights не являются обязательным UI.

## 15. Balance gates

Обязательные метрики:

- programmer-core/direct technical decision share;
- months with professional outcome;
- evidence diversity;
- time-to-grade;
- course/easy-task/mentor farming;
- technology breadth/depth;
- specialization switch/reentry;
- current market readiness recovery;
- path parity;
- Founder/CTO technical identity;
- Top Programmer rarity.

## 16. Vertical slice

Первый январь 1990 включает:

- одну historically available beginner technology;
- hands-on activity;
- problem-solving/debugging choice;
- partial/assisted/independent/failure outcome;
- mastery/fluency delta;
- one `ExperienceEpisode`;
- evidence claims;
- capability/readiness explanation;
- новый следующий шаг;
- deterministic restart.

Infrastructure-only MonthRun без programmer fantasy не считается достаточным vertical slice.

## 17. Feature acceptance test

Любая gameplay feature документирует:

1. primary fantasy;
2. professional connection;
3. provider ownership;
4. generated `ExperienceEpisode`/evidence либо отсутствие progression;
5. commitments/opportunity cost;
6. UI surface;
7. automation boundary;
8. failure/recovery;
9. balance/content cost;
10. почему feature не превращает игру в IDE, CRM, medical sim или generic life sim.

## 18. Запрещённые дрейфы

- generic life simulator;
- grade как XP/weighted average;
- provider direct skill mutation;
- narrative mastery без outcome;
- сотни технологий/skills с одинаковым gameplay;
- permanent mastery loss после короткого перерыва;
- Founder как обязательный лучший путь;
- project только как progress bar;
- performance-review spreadsheet UI;
- LLM judge в authoritative progression.
