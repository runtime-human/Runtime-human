---
title: "ADR-017-authoritative-programmer-learning-access-model"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-017 — Авторитетная модель обучения программированию и доступа

- **Статус:** Accepted
- **Дата:** 2026-07-18
- **Решение владельца:** обучение программированию моделируется через доступную учебную возможность, выбранный способ учиться, практику, feedback и перенос в новый контекст; оно не является кнопкой XP, ежедневным расписанием или отдельным источником грейда
- **Связанные ADR:** ADR-005, ADR-007, ADR-009, ADR-013, ADR-015, ADR-016
- **Связанные спецификации:** `docs/game-design/PROGRAMMER-LEARNING-ENGINE.md`, `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md`, `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`, `docs/ui/PROGRAMMER-LEARNING-UI.md`

## Контекст

Runtime Human начинается в январе 1990 года, когда персонажу 12 лет. До первой профессиональной работы игрок должен пройти полноценный путь становления: получить доступ к технике и знаниям, понять основы, повторить и изменить пример, столкнуться с ошибкой, получить feedback, выполнить самостоятельную практику и начать первый проект.

Текущий канон уже разделяет:

- профессиональный outcome и Progression Core;
- mastery, fluency, technology familiarity и evidence;
- техническую ситуацию и выбор подхода;
- проектную правду и развитие персонажа;
- casual UI и глубокую внутреннюю модель.

Но без отдельной модели обучения ранняя игра может выродиться в:

```text
читать книгу
→ Programming +N
→ пройти курс
→ Programming +N
→ открыть следующую technology
```

Альтернативный риск — построить ежедневное расписание, сотни учебных предметов, мини-игры и скрытые оптимальные маршруты, превратив игру в stat-planner вместо симулятора программиста.

## Решение

### 1. Ввести Programmer Learning Engine

Центральная цепочка:

```text
learning goal
→ available Learning Opportunity
→ player Learning Approach
→ Learning Attempt
→ practice / feedback / reflection
→ Learning Outcome
→ ExperienceEpisode
→ Progression Core
→ capability explanation and next step
```

Programmer Learning Engine отвечает за нормализацию учебной попытки и её причинного результата. Он не владеет оборудованием, деньгами, отношениями, проектами, навыками, evidence или грейдом.

### 2. Разделить ownership

#### Access owners

Equipment, Housing, City/Era, School, Family, NPC и Economy владеют фактами:

- есть ли устройство и где оно доступно;
- сколько времени и денег требуется;
- доступен ли материал локально;
- существует ли подходящий mentor, кружок или community;
- доступны ли сеть, BBS, интернет или AI-assistant;
- на каком языке и в каком состоянии находится источник.

Learning Engine получает immutable `LearningAccessSnapshot`, но не покупает устройство, не меняет отношения и не создаёт историческую доступность.

#### Learning Provider

Self-study, School, Course, Mentor, Community, Project, Career или Event:

- создаёт `LearningOpportunity`;
- владеет lifecycle занятия и его затратами;
- определяет доступные learning approaches;
- при практической технической проблеме может запросить Professional Challenge Engine;
- применяет свой domain outcome;
- создаёт `ExperienceEpisode`.

#### Programmer Learning Engine

- валидирует доступ и выбранный подход;
- различает объяснение, пример, извлечение из памяти, guided practice, independent practice, collaboration и reflection;
- учитывает feedback, prior capability, capacity, source quality и repetition;
- возвращает `LearningOutcome`, reason codes и episode facts;
- не меняет professional state напрямую;
- гарантирует deterministic resume/retry.

#### Professional Challenge Engine

- разрешает конкретную техническую ситуацию, если learning attempt включает meaningful build/diagnose/improve/integrate/operate challenge;
- не дублируется учебной системой.

#### Professional Progression Core

- получает `ExperienceEpisode`;
- вычисляет mastery, fluency, familiarity, evidence и capability;
- не пересчитывает факт прохождения курса, доступ к устройству или технический outcome.

### 3. Не вводить отдельную шкалу «знаний»

Player-facing путь способности:

```text
слышал
→ изучает
→ понимает основы
→ применяет с помощью
→ применяет самостоятельно
→ переносит в новый контекст
→ объясняет и усиливает других
```

Эти статусы являются capability/read-model поверх существующих mastery, fluency, familiarity и evidence. Новый универсальный XP или knowledge score не создаётся.

### 4. Источник обучения определяется affordances, а не бонусом

Книга, курс, mentor, документация, пример, проект и community различаются тем, что они могут предоставить:

- conceptual explanation;
- worked example;
- guided practice;
- independent practice;
- retrieval opportunity;
- transfer opportunity;
- immediate or delayed feedback;
- collaboration;
- authentic project context;
- credential/access opportunity;
- current or obsolete information.

Источник не получает фиксированное правило вроде «книга +20% theory» для всех контекстов.

### 5. Learning approach является осмысленным выбором

Baseline approaches:

- изучить разобранный пример;
- объяснить решение своими словами;
- изменить пример;
- воспроизвести решение без подсказки;
- выполнить guided practice;
- попробовать самостоятельно;
- попросить hint или review;
- работать в паре;
- применить знание в маленьком проекте;
- сравнить и отрефлексировать несколько решений.

Обычная blocking learning situation показывает 2–4 релевантных подхода. Routine practice выполняется автоматически и агрегируется.

### 6. Отделить learning, practice и evidence

- чтение и объяснение могут повысить mastery;
- повторение и применение поддерживают fluency;
- использование конкретной technology повышает familiarity;
- самостоятельная практика может подтвердить capability;
- production evidence требует подходящего project/work/open-source контекста;
- курс, книга или mentor не выдают грейд напрямую;
- assisted success не равен independent capability.

### 7. Mentorship моделируется уровнем помощи

Baseline assistance modes:

```text
hint
→ conceptual explanation
→ guided walkthrough
→ pair work
→ takeover
```

Чем больше помощь заменяет reasoning персонажа, тем меньше autonomy evidence. При этом качественный hint или feedback может дать больше learning, чем самостоятельная бесплодная попытка.

Mentor не является постоянным multiplier. Его влияние зависит от subject fit, feedback quality, availability, trust и фактического участия.

### 8. Доступ создаёт разные истории, но не permanent bad start

Отсутствие домашнего компьютера не блокирует профессию. Content обязан поддерживать альтернативные маршруты:

```text
домашняя техника
или школьный кабинет
или библиотека/кружок
или знакомый/mentor
или подработка и used equipment
или community/shared access
```

Маршруты могут отличаться временем, комфортом, social context и технологиями, но должны сохранять достижимый путь к первой meaningful practice.

### 9. Историческая доступность является отдельной правдой

Learning source имеет global existence и local availability. Для разных эпох меняются:

- носители и каналы распространения;
- стоимость и доступность feedback;
- скорость поиска ответа;
- качество и актуальность материалов;
- роль local community;
- вероятность устаревшей практики;
- возможность collaboration;
- AI assistance после исторически допустимой даты.

Исторические даты и свойства требуют source refs. Вымышленные локальные школы, кружки, mentors и курсы используют реальные era constraints, но не реальные персональные данные.

### 10. Spacing, retrieval и reflection являются мягкими правилами

Исследования поддерживают пользу worked examples, self-explanation, retrieval practice, scaffolding и collaboration, но эффекты зависят от контекста и качества реализации.

Поэтому baseline:

- не создаёт обязательную карточную mini-game;
- не требует ежедневного расписания повторений;
- использует мягкие deterministic modifiers и next-step suggestions;
- агрегирует routine review;
- ценит успешное извлечение, variation и transfer;
- не наказывает игрока за отсутствие оптимального алгоритма повторения.

### 11. AI assistance не равна компетентности

В AI-era Learning Provider различает:

- попросить объяснение;
- получить hint;
- сгенерировать пример;
- диагностировать ошибку;
- получить полное решение;
- проверить или сравнить решение.

Полное делегирование может ускорить domain outcome, но даёт слабое learning/autonomy подтверждение. Active explanation, modification, verification и transfer могут давать сильный learning outcome.

Отдельная глобальная шкала «AI dependence» не входит в MVP. При необходимости provider создаёт context-specific flags вроде `fragile-understanding` или `unverified-generated-solution`.

### 12. Casual-first baseline

Первый playable требует только:

- один доступный beginner source;
- один альтернативный access route для low-income/no-home-computer start;
- одну короткую learning opportunity;
- 2–3 learning approaches;
- один worked-example/modify/independent progression;
- один feedback source;
- один `LearningOutcome`;
- один `ExperienceEpisode`;
- один human-readable next step;
- deterministic suspend/resume.

Он не требует полного образовательного каталога, расписания занятий, университета, certificates, AI, hundreds of skills или adaptive tutoring model.

## Последствия

### Положительные

- период до первой работы становится самостоятельной игрой;
- learning отличается от XP grind;
- источники обучения имеют качественные различия;
- проекты и technical challenges становятся естественным продолжением обучения;
- mentorship полезен без автоматического завышения самостоятельности;
- исторические изменения каналов знаний создают gameplay;
- плохой финансовый старт меняет путь, но не блокирует профессию;
- AI-era можно добавить без переписывания Progression Core.

### Стоимость

- требуется learning content schema и source catalogue;
- нужны access/recovery fixtures;
- потребуются дополнительные localization и historical source refs;
- mentor/feedback interactions нуждаются в typed contracts;
- first-year corpus должен быть проверен на повторяемость и dominant strategy.

### Риски

- learning может превратиться в расписание;
- source affordances могут стать скрытыми процентами;
- mentor может стать универсально лучшей стратегией;
- access barriers могут создать snowball;
- AI может либо стать читом, либо искусственно бесполезным;
- слишком подробная педагогическая модель увеличит скрытую стоимость.

Риски ограничиваются casual budgets, recovery routes, provider ownership, агрегированной routine practice и playtest-driven expansion.

## Отклонённые альтернативы

### Одна кнопка обучения с XP

Отклонено: не создаёт профессиональной причинности и различий между пониманием, практикой и самостоятельностью.

### Полный ежедневный учебный календарь

Отклонено: превращает месяц в schedule optimizer и дублирует life commitments.

### Каждый источник имеет постоянный multiplier

Отклонено: игрок быстро найдёт универсально лучший источник, а content станет числовым reskin.

### Mentor напрямую повышает mastery или grade

Отклонено: помощь должна проходить через реальный learning/practice outcome.

### Встроенные coding puzzles как обязательное обучение

Отклонено: Runtime Human должен оставаться доступным человеку без знания синтаксиса.

### AI автоматически выполняет задачи и выдаёт proficiency

Отклонено: delivery и understanding разделяются.

## Implementation profiles

### MVP Casual

- one source;
- one access snapshot and fallback route;
- one learning opportunity;
- 2–3 approaches;
- one feedback mode;
- one outcome/episode flow;
- causal report;
- no reroll/duplicate.

### Recommended

- multiple source affordance profiles;
- mentor/pair/community;
- spaced/retrieval/interleaved routine practice;
- first-year learning corpus;
- several technologies;
- access changes by era;
- transferable capability checks;
- Details mode.

### Extended

- formal education and credentials;
- advanced mentorship/network effects;
- adaptive tutoring;
- AI assistance modes;
- long-term obsolescence/relearning;
- teaching/mentoring progression;
- multi-decade learning ecosystems.

## Review triggers

ADR пересматривается, если проект решит:

- заменить monthly focus ежедневным расписанием;
- ввести отдельный authoritative knowledge XP;
- позволить learning content напрямую изменять skills/grade;
- сделать coding puzzles обязательным core gameplay;
- объединить access, education, challenge и progression в один god-module;
- считать AI-generated delivery самостоятельным professional evidence без проверки understanding.