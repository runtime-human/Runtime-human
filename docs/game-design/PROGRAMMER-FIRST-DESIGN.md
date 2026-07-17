# Programmer-First Design

## Статус

Нормативная межсистемная спецификация игрового дизайна. Она уточняет `GAMEPLAY-CANON.md` и применяется ко всем игровым подсистемам, контенту, UI, balance simulation и планам реализации.

Основание: `docs/research/DR-003-PROGRAMMER-FIRST-DESIGN-SYNTHESIS-2026-07-17.md`.

## 1. Product statement

Runtime Human — симулятор становления, работы и наследия программиста, в котором человеческая жизнь создаёт цену, ограничения, контекст и смысл профессионального пути.

Программирование не является одной из равноправных профессий внутри универсального life simulator. Оно является центральной игровой идентичностью персонажа и главным источником долгосрочной прогрессии.

## 2. Иерархия систем

При конфликте объёма, экранного пространства, контентного бюджета или blocking events действует следующий приоритет:

1. **Programmer Mastery Core** — навыки, технологии, реальные задачи, качество, инженерная зрелость и grade evidence.
2. **Professional Expression** — работа, проекты, продукты, open source, публичная экспертиза, лидерство и компания.
3. **Human Constraints and Values** — здоровье, отношения, семья, деньги, жильё, возраст и обязательства.
4. **Narrative, Era and Philosophy** — исторический контекст, личные арки, delayed consequences, наследие и итоговая интерпретация жизни.

Нижний слой может изменить смысл или цену решений верхнего слоя, но не должен вытеснять его из основного игрового цикла.

## 3. Programmer Mastery Core

### 3.1. Fundamentals

- problem decomposition;
- algorithmic reasoning;
- data modelling;
- systems thinking;
- computational constraints;
- technical reading and research.

### 3.2. Core craft

- programming fluency;
- code reading;
- debugging;
- testing;
- refactoring;
- version control;
- documentation;
- development tools.

### 3.3. Engineering

- requirements clarification;
- design;
- architecture;
- performance;
- reliability;
- security;
- delivery;
- incident handling;
- legacy modernization.

### 3.4. Collaboration and leverage

- code review;
- technical communication;
- mentoring;
- technical leadership;
- delegation;
- community maintenance.

### 3.5. Specializations

Специализация задаёт тип задач и профиль evidence, но не создаёт отдельную несовместимую progression system. Backend, Frontend, Desktop, Mobile, GameDev, DevOps/Platform, Data, AI, Security, Embedded и другие направления используют общий skill graph и собственные technology families.

## 4. Базовые характеристики

Базовые характеристики являются медленно меняющимися потенциалами, а не заменой профессиональных навыков.

Рекомендуемый минимальный набор:

- Analytical Reasoning;
- Learning Adaptability;
- Self-Organization;
- Communication.

`Coding`, `Engineering` и `Quality` не должны существовать одновременно как базовые характеристики и профессиональные skills. Их authoritative progression хранится в skill/evidence model.

Базовые характеристики:

- не определяют grade напрямую;
- не дают мгновенный автоматический успех;
- модифицируют скорость обучения, устойчивость результата и доступные варианты;
- могут компенсироваться практикой, наставничеством, инструментами и выбранной специализацией.

## 5. Significant decision budget

`MeaningfulDecision` — решение, изменяющее долгосрочное состояние, commitment, риск, проект, карьеру, relationship, technology или professional evidence.

Для rolling window в 12 месяцев до выхода из активной профессиональной жизни:

- минимум 60% meaningful decisions затрагивают Programmer Mastery Core или Professional Expression;
- минимум 40% имеют прямой technical component;
- life-only decisions не превышают 35% без активного crisis arc;
- philosophy/legacy-only decisions до late career не превышают 10%;
- минимум 8 из 12 месяцев дают видимый professional outcome либо объяснимую профессиональную паузу;
- серия без нового technical evidence не превышает 3 месяцев, кроме болезни, ухода за близким, отпуска, безработицы или выбранного sabbatical.

Показатели являются balance targets. Они не требуют отдельного modal decision каждый месяц.

## 6. Professional activity model

Каждая профессиональная активность определяет:

- skill families;
- technology families;
- difficulty;
- novelty;
- expected work units;
- minimum calendar span;
- feedback quality;
- available mentorship;
- project context;
- failure modes;
- possible evidence output.

Активность может выполняться частично. Частичный результат может дать обучение, выявленный риск, technical debt, incomplete feature или новый вопрос, но не обязан давать полноценное grade evidence.

## 7. Professional Evidence

Значимое профессиональное действие создаёт неизменяемую запись `ProfessionalEvidence`.

Обязательные поля:

- evidence ID/version;
- date range;
- source type and source ID;
- skill and technology families;
- task complexity;
- novelty;
- autonomy;
- assistance received;
- outcome quality;
- delivery reliability;
- scope and impact;
- collaboration/mentoring contribution;
- project/role context;
- evidence confidence;
- failure/recovery markers.

Evidence может быть положительным, смешанным или отрицательным. Неудачная сложная задача может подтвердить learning, debugging и recovery, но не подтверждает delivery или quality автоматически.

## 8. Grade Readiness

Grade не является суммой XP и не повышается автоматически.

Read model агрегирует evidence по шкалам 0–1000:

- craft;
- complexity;
- autonomy;
- quality;
- delivery;
- breadth;
- depth;
- collaboration;
- impact.

Предварительные target floors:

| Grade | Craft | Complexity | Autonomy | Quality | Delivery | Дополнительные условия |
|---|---:|---:|---:|---:|---:|---|
| Beginner | 80 | 20 | 20 | 40 | 20 | завершённые учебные задачи |
| Intern | 180 | 100 | 100 | 140 | 100 | 6+ supervised evidence |
| Junior | 320 | 220 | 260 | 280 | 240 | 12+ evidence, 2 project contexts |
| Middle | 520 | 460 | 500 | 480 | 460 | устойчивый результат 18+ месяцев |
| Senior | 700 | 680 | 700 | 650 | 650 | impact 580+, collaboration или architecture 450+, 36+ месяцев |

Target time-to-grade:

- Beginner → Intern: 12–36 месяцев обучения и практики;
- Intern → Junior: 6–18 месяцев реальной supervised work;
- Junior → Middle: 24–48 месяцев;
- Middle → Senior: 36–72 месяцев;
- Top Programmer: не имеет обычного time target и остаётся редким endgame-status.

Promotion, title и professional grade моделируются отдельно.

## 9. Skill growth

Авторитетный skill XP остаётся целочисленным, но gain зависит от evidence context.

Базовая модель:

```text
base gain
× difficulty match
× novelty
× feedback quality
× successful reflection
× transfer
× current capacity
```

Все modifiers — integer basis points/fixed-point.

Правила:

- слишком простая повторяемая задача быстро получает diminishing returns;
- чрезмерно сложная задача без поддержки даёт мало usable mastery и повышает риск провала;
- оптимальная зона сложности находится немного выше текущей подтверждённой способности;
- реальный проект даёт больше evidence, чем пассивный курс;
- курс эффективнее для первоначального понимания и закрытия пробелов;
- mentoring повышает feedback quality, но не заменяет самостоятельное evidence;
- deliberate practice может быстро улучшать узкий skill, но почти не даёт impact evidence.

## 10. Mastery, fluency and familiarity

Для предотвращения раздражающего skill decay разделяются:

- **mastery** — переносимое понимание;
- **fluency** — текущая скорость и уверенность;
- **technology familiarity** — знание конкретного инструмента и версии;
- **evidence recency** — актуальность подтверждения для рынка.

Mastery почти не снижается. Fluency и familiarity могут ослабевать после длительного неиспользования. Повторное освоение всегда быстрее первого и использует reacquisition bonus.

Смена специализации не обнуляет персонажа. Общие skills, transfer groups и накопленное evidence создают ускоренный переход, но новая специализация требует собственных project contexts.

## 11. Technology lifecycle

Каждая Tier A/B технология имеет стадии:

1. announced;
2. available;
3. learnable locally;
4. early adoption;
5. growing demand;
6. mainstream;
7. mature;
8. declining;
9. legacy;
10. end-of-support.

Стадии влияют на:

- доступность обучения и оборудования;
- вакансии;
- зарплатный premium;
- community size;
- documentation quality;
- project suitability;
- support burden;
- security and compatibility risks;
- transfer value.

Новейшая технология не обязана быть лучшим выбором. Early adoption даёт upside и novelty, но повышает learning cost, instability и market uncertainty. Legacy даёт устойчивый спрос в отдельных компаниях и повышенную стоимость поддержки.

## 12. Technology content tiers

- **Tier A:** уникальная самостоятельная технология с собственным lifecycle, trade-offs и событиями.
- **Tier B:** член семейства с общей механикой и ограниченным уникальным контентом.
- **Tier C:** tag/context без отдельной шкалы proficiency.

UI не показывает Tier C как самостоятельный collectible progression item.

## 13. Project as mastery engine

Проект является основным местом, где знания превращаются в evidence.

Обязательные project decisions:

- выбрать scope;
- определить quality priorities;
- выбрать technology family;
- принять trade-off между сроком, качеством и debt;
- решить, когда исследовать, реализовывать, тестировать, refactor или выпускать;
- реагировать на bugs/incidents/feedback;
- завершить, поддерживать, передать, продать или архивировать.

Игрок не распределяет ежедневные coding tasks вручную. Симуляция создаёт агрегированные work packages и поднимает только решения с реальным trade-off.

Повторяющийся progress bar запрещён как единственная модель проекта. Каждый значимый этап должен менять минимум одно из:

- техническую неопределённость;
- качество;
- debt;
- пользовательскую ценность;
- evidence;
- support burden;
- market/reputation outcome.

## 14. Career as expression of mastery

Работа автоматически создаёт задачи в рамках company archetype, role, grade range, project domain и technology stack.

Игрок принимает решения о:

- подготовке и выборе вакансий;
- специализации;
- сложных задачах;
- качестве и сроках;
- code review/mentoring;
- смене команды или работодателя;
- promotion review;
- отказе от management track;
- переходе в open source, freelance, public expert или founder path.

Высокая зарплата не является единственным доказательством успеха. Path outcomes сравниваются по mastery, autonomy, income, reputation, fame, freedom, impact, workload и legacy.

## 15. Founder, CTO and late career

После перехода к управлению programmer identity меняет форму:

- direct coding уменьшается;
- technical direction, architecture, review, hiring bar, mentoring и delegation растут;
- стратегические решения создают evidence высокого уровня;
- полный отказ от технической практики постепенно снижает fluency и evidence recency, но не стирает mastery или grade;
- возвращение к individual contributor path возможно через recovery period.

Founder и CTO не являются автоматическим «лучшим endgame». Они получают больше влияния и финансового upside, но выше риск, нагрузка и дистанция от craft.

## 16. Life systems

Life systems имеют самостоятельную ценность и не обязаны быть только карьерными buffs. Однако они не должны требовать рутинного ежемесячного обслуживания.

Они влияют на:

- available calendar time;
- attention and context switching;
- recovery;
- risk tolerance;
- financial runway;
- access to equipment/education;
- willingness to relocate внутри города;
- project and career choices;
- narrative consequences.

Ни один lifestyle choice не объявляется единственно правильным. Семья, спокойная карьера, рискованный startup, public career и глубокая техническая специализация должны иметь собственные преимущества и цену.

## 17. Narrative policy

Для rolling window в 24 месяца активной профессиональной жизни:

- technical/project/career/open-source meaningful events: 55–70%;
- relationships/health/finance/housing: 15–30%;
- era/world/community context: 10–20%;
- philosophy/legacy-only до late career: 0–10%.

Narrative Director не обязан заполнять budget. Quiet month допустим, если отчёт показывает естественный профессиональный прогресс, maintenance, recovery или осознанную паузу.

Life-only blocking streak более двух событий подряд требует explicit crisis arc и recovery window.

## 18. Monthly loop requirements

### До MonthRun

Игрок видит:

- текущий professional focus;
- активное обучение;
- проекты и рабочие обязательства;
- прогноз work units и calendar load;
- ожидаемые skill/technology outcomes;
- риски context switching;
- grade evidence gaps;
- life constraints.

### Во время MonthRun

Blocking разрешён только для решения, которое нельзя разумно выполнить автоматически и которое существенно меняет outcome, commitment, ethics, relationship, project или career.

### После MonthRun

Monthly Report имеет порядок:

1. что изменилось в персонаже как в программисте;
2. работа, задачи и проекты;
3. evidence и grade readiness;
4. новые технологии и возможности;
5. нагрузка, здоровье и отношения;
6. деньги;
7. история и delayed consequences.

## 19. UI hierarchy

Основная навигация:

1. Today/Life Screen с programmer focus;
2. Skills & Technologies;
3. Projects;
4. Career;
5. Open Source/Public Work;
6. Company, когда открыта;
7. Life: health, relationships, housing and finance;
8. Journal/History.

На главном экране постоянно видны:

- текущая дата и жизненный этап;
- professional focus;
- активные commitments;
- ближайший technical milestone;
- load forecast;
- критические health/finance warnings;
- кнопка следующего месяца.

Grade readiness показывается человеческим языком. Точные scores доступны только в advanced detail/debug views.

## 20. Onboarding

Первые пять минут:

- комната и семейный контекст января 1990;
- доступный компьютер/среда либо путь к нему;
- понятный выбор: изучить, попробовать, попросить помощь, накопить на доступ;
- первая маленькая проблема, которую можно разложить и исправить;
- мгновенная причинная обратная связь без профессионального жаргона.

Первый месяц открывает:

- fundamentals;
- одну technology proficiency;
- activity forecast;
- первый ProfessionalEvidence;
- понятие «сложность задачи»;
- monthly report.

Профессиональные термины раскрываются через контекст и tooltip/glossary. Опытный игрок может включить compact/advanced explanation mode.

## 21. Balance simulator gates

Обязательные метрики:

- programmer-core decision share;
- technical decision share;
- professional outcome months;
- professional stagnation streak;
- skill gain by source/difficulty;
- evidence diversity;
- grade readiness and time-to-grade distributions;
- breadth/depth distribution;
- specialization switch recovery;
- technology lifecycle adoption;
- life-only blocking share;
- professional arc starvation;
- path parity;
- Founder/CTO technical identity retention;
- Top Programmer rarity.

Release balance gate fails, если:

- медианный run проводит меньше половины meaningful decisions вне programmer/professional core;
- один путь доминирует одновременно по income, freedom, influence и risk;
- Senior достигается без varied evidence;
- длительная болезнь, увольнение или семейный кризис создают необратимый soft lock;
- quiet months регулярно не дают ни professional outcome, ни осмысленную recovery/history.

## 22. Feature acceptance test

Любая новая gameplay feature должна документировать:

1. primary player fantasy;
2. professional connection;
3. generated/consumed evidence;
4. commitments and opportunity cost;
5. UI surface;
6. automation boundary;
7. failure/recovery;
8. balance metrics;
9. content cost;
10. почему feature не превращает игру в IDE, CRM, medical sim или generic life sim.

## 23. Vertical slice minimum

Vertical slice считается gameplay-valid только если первый январь 1990 включает:

- исторически доступную beginner technology;
- hands-on programming activity;
- problem decomposition или debugging choice;
- частичный или завершённый технический результат;
- рост core skill и technology proficiency;
- ProfessionalEvidence;
- новый вариант обучения/проекта на февраль;
- отчёт с причинностью;
- deterministic replay.

Infrastructure-only MonthRun без programmer fantasy не считается достаточным vertical slice.

## 24. Запрещённые дрейфы

- универсальный life simulator, где программирование — одна профессия из многих;
- grade как XP threshold;
- сотни технологий с одинаковым gameplay;
- постоянная потеря hard-earned mastery из-за короткого перерыва;
- Founder как обязательный лучший endgame;
- life/health bars, требующие одинаковой кнопки каждый месяц;
- philosophical choices без связи с прожитой историей;
- проект как один progress bar;
- UI, где финансы и бытовые KPI визуально важнее профессионального роста;
- tutorial, объясняющий профессию длинным справочником вместо игровых ситуаций.
