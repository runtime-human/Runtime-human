# Прогрессия персонажа

Нормативная межсистемная модель: [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md).

## Принцип

Основная долгосрочная прогрессия Runtime Human — становление программиста. Жизненные статусы, деньги, отношения, имущество, должности и публичность меняют возможности и последствия, но не заменяют развитие профессионального мастерства.

## Слои прогрессии

1. Базовые характеристики — медленно меняющиеся потенциалы.
2. Fundamentals — переносимые основы решения технических задач.
3. Core craft — programming, code reading, debugging, testing, refactoring и tools.
4. Engineering skills — requirements, design, architecture, performance, reliability, security, delivery и legacy work.
5. Технологии — конкретные языки, frameworks, tools и platforms.
6. Специализации — Backend, Frontend, Desktop, DevOps/Platform, GameDev, AI, Security и другие.
7. Professional Evidence — подтверждённая история задач и результатов.
8. Грейд — вывод о профессиональной зрелости.
9. Должность — текущая организационная роль.
10. Репутация и слава — профессиональная и публичная позиции.
11. Traits и жизненные статусы — результаты истории персонажа.

## Базовые характеристики

Рекомендуемый минимальный набор:

- Analytical Reasoning;
- Learning Adaptability;
- Self-Organization;
- Communication.

Они не заменяют skills и не определяют grade напрямую.

`Coding`, `Engineering` и `Quality` не должны одновременно существовать как широкие базовые характеристики и отдельные профессиональные навыки. Их authoritative progression находится в skill/evidence model.

Базовые характеристики:

- модифицируют скорость обучения и устойчивость результата;
- могут компенсироваться практикой, наставничеством, инструментами и выбранной специализацией;
- не создают необратимо плохой старт;
- не показываются как главный scoreboard игры.

## Professional Evidence

Значимое профессиональное действие создаёт `ProfessionalEvidence` с:

- источником и project/role context;
- skill/technology families;
- complexity и novelty;
- autonomy и assistance;
- outcome quality;
- delivery reliability;
- scope/impact;
- collaboration/mentoring;
- duration/date;
- confidence;
- failure/recovery markers.

Неудача может дать learning/debugging evidence, но не подтверждает delivery, quality или autonomy автоматически.

## Рост навыков

- Курсы дают теорию и особенно эффективны в начале или при закрытии пробелов.
- Работа и реальные проекты дают практику и grade evidence.
- Менторство повышает feedback quality, но не заменяет самостоятельный результат.
- Сложная задача может одновременно развивать skill, technology proficiency и specialization.
- Повторение слишком простых задач имеет diminishing returns.
- Чрезмерно сложная задача без поддержки повышает риск провала и даёт меньше usable mastery.
- Оптимальная зона находится немного выше текущей подтверждённой способности.

Авторитетный gain вычисляется только integer/fixed-point modifiers:

```text
base gain
× difficulty match
× novelty
× feedback quality
× reflection
× transfer
× current capacity
```

## Mastery, fluency и familiarity

Разделяются:

- mastery — переносимое понимание;
- fluency — скорость и уверенность текущей практики;
- technology familiarity — знание конкретного инструмента и версии;
- evidence recency — актуальность подтверждения для рынка труда.

Mastery почти не деградирует. Fluency и familiarity могут снижаться после длительного неиспользования. Возвращение использует reacquisition bonus и не начинает progression с нуля.

Смена специализации сохраняет общие skills и transfer, но требует evidence в новом project context.

## Grade Readiness

Грейд не является простой проверкой общего XP. Read model агрегирует evidence по dimension scores 0–1000:

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
| Senior | 700 | 680 | 700 | 650 | 650 | impact 580+, collaboration/architecture 450+, 36+ месяцев |

Promotion работодателя, title и professional grade различаются.

Target time-to-grade:

- Beginner → Intern: 12–36 месяцев;
- Intern → Junior: 6–18 месяцев supervised work;
- Junior → Middle: 24–48 месяцев;
- Middle → Senior: 36–72 месяцев.

Диапазоны versioned и проверяются balance simulator по разным backgrounds и путям.

## Защита от snowballing и плохого старта

- высокий стартовый доступ к технике ускоряет первые шаги, но не даёт прямой grade;
- сильные характеристики не заменяют evidence;
- слабый старт компенсируется community, mentors, school resources, used equipment и более длинным временем обучения;
- неудачные ранние решения не блокируют смену технологии или специализации;
- успех в одной технологии ускоряет transfer, но не открывает все технологии автоматически;
- накопленное богатство не покупает mastery напрямую;
- reputation/fame не могут повысить grade без capabilities.

## Top Programmer

Top Programmer — редкий endgame-статус, а не обычный следующий уровень после Senior. Numeric readiness является только prerequisite.

Возможные условия:

- выдающиеся продукты или open source;
- устойчивое индустриальное влияние;
- высокий технический уровень;
- профессиональная репутация;
- публичные достижения, если путь их предполагает;
- несколько лет подтверждённого результата;
- влияние на других программистов, практики или технологии.

## Отрицательные состояния

Burnout, болезнь, конфликт и потеря мотивации являются статусами/рисками, а не «высокими отрицательными характеристиками».

Они могут временно снижать capacity, fluency или evidence recency, но не стирают mastery и не понижают professional grade автоматически.

## UI раскрытие

Игрок сначала видит понятные capabilities:

- «может самостоятельно исправлять небольшие ошибки»;
- «уверенно завершает понятные задачи»;
- «готов владеть небольшой feature end-to-end».

Детальные skill families, evidence и technology proficiency раскрываются по запросу. Точные readiness scores не обязаны показываться в обычном режиме.
