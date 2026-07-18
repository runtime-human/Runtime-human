---
title: "SD-004-PROGRAMMER-LEARNING-PRACTICE-MENTORSHIP-ACCESS-ENGINE-2026-07-18"
type: research
status: draft
canon: true
updated: 2026-07-18
---

# SD-004 — Programmer Learning, Practice, Mentorship & Access Engine

- **Дата:** 2026-07-18
- **Статус:** системный анализ, нормализованный в ADR-017 и профильных спецификациях
- **Область:** early game, learning sources, practice, feedback, mentorship, access, historical eras, AI assistance, UI, balance и persistence
- **Канон:** Programmer-First + Casual-First + ADR-013/015/016

## Executive verdict

Runtime Human не нужен отдельный «Education XP Engine». Нужна система, которая моделирует путь:

```text
доступ к источнику
→ способ учиться
→ наблюдаемая практика
→ feedback/reflection
→ самостоятельное применение
→ перенос в новый контекст
```

Главная архитектурная граница:

```text
Access owners
→ Learning Provider
→ Programmer Learning Engine
→ optional Professional Challenge
→ ExperienceEpisode
→ Progression Core
```

Learning Engine нормализует учебную попытку. Он не владеет устройствами, деньгами, отношениями, проектами, mastery, evidence или грейдом.

## 1. Проблема текущего канона

В документации уже правильно указано:

- Education является Experience Provider;
- mastery, fluency, familiarity и evidence разделены;
- курс может дать learning, но не production evidence;
- mentor не создаёт mastery/grade напрямую;
- доступ к технике не должен создавать permanent bad start.

Но не определены достаточно строго:

- различия между книгой, курсом, документацией, примером, mentor и проектом;
- что считается learning attempt;
- как игрок выбирает способ учиться;
- как формируется самостоятельность;
- как access barriers становятся gameplay, а не soft lock;
- как меняется обучение между 1990-ми и AI-era;
- где заканчивается learning и начинается Professional Challenge.

Без решения ранняя игра рискует стать либо stat grind, либо schedule optimizer.

## 2. Сравнение с играми

Аналоги используются только как источник design patterns и failure modes.

### Chinese Parents

Официальное описание строит игру вокруг полного детства, scheduling, роста stats, открытия skills и множества career endings.

Полезно:

- ранний период является самостоятельной игрой;
- занятия постепенно открываются;
- семья и стресс меняют learning choices;
- долгосрочные последствия видны к взрослой жизни.

Не использовать:

- stat fragments как универсальное развитие;
- детальное планирование каждого периода;
- карьеру как ending за нужные числовые thresholds;
- mini-games, слабо связанные с профессией.

Источник: https://store.steampowered.com/app/736190/Chinese_Parents/

### Growing Up

Игра связывает skills, activities, schedule, город, отношения и будущие careers; официальный Steam-текст заявляет более 200 skills и 42 careers.

Полезно:

- визуально понятное постепенное открытие активностей;
- childhood choices влияют на будущую доступность;
- эпоха и семейный цикл создают атмосферу.

Не использовать:

- сотни visible skills;
- aptitude mini-game как основной progression;
- career reveal как финальную награду вместо профессионального gameplay;
- daily schedule micromanagement.

Источник: https://store.steampowered.com/app/1191120/Growing_Up/

### Academagia

Игра предлагает сотни skills/actions, classes, libraries, teachers, friends, events и adventures.

Полезно:

- источник обучения может открывать новые действия и связи;
- учебная среда должна быть социальным пространством;
- specialization возникает из истории выбора.

Не использовать:

- огромный skill/action catalogue в baseline;
- UI, требующий оптимизации сложного расписания;
- breadth как самоцель;
- hidden combinations и requirement chains.

Источник: https://store.steampowered.com/app/533480/Academagia_The_Making_of_Mages/

### Scratch

Scratch Foundation описывает обучение через создание проектов, декомпозицию, debugging и итерацию.

Полезно:

- project-first motivation;
- remix/modify как мост между примером и самостоятельностью;
- learning-by-making;
- reflection через видимый результат.

Не использовать напрямую:

- block editor или coding environment как обязательную механику Runtime Human;
- реальные programming exercises как gate для casual player.

Источник: https://www.scratchfoundation.org/learn/learning-library/scratch-creative-learning-philosophy

### Long Live the Queen / stat-check design

Полезно:

- подготовка открывает новые варианты;
- skill может менять способ решения, а не только success chance.

Не использовать:

- скрытые build traps;
- необходимость wiki;
- необратимый провал из-за неизвестного threshold.

### Melvor Idle / idle skill design

Полезно:

- routine practice можно агрегировать;
- возвращение игрока сопровождается компактным отчётом;
- общий skill и specific mastery могут быть разделены.

Не использовать:

- real-time waiting;
- grind одного действия;
- десятки одинаковых mastery bars.

## 3. Исследовательские выводы по обучению программированию

### Worked examples

Исследования programming education показывают, что worked examples особенно полезны новичкам, поскольку уменьшают стартовую cognitive load. Но пассивное чтение примера не гарантирует transfer.

Проектный вывод:

- worked example является source affordance;
- strongest follow-up: self-explanation, modification, debugging или incomplete example;
- копирование без понимания может дать working artifact с fragile learning.

Источники:

- Vieira, Yan, Magana — Exploring Design Characteristics of Worked Examples: https://doi.org/10.22369/issn.2153-4136/6/1/1
- Muldner, Jennings, Chiarelli — A Review of Worked Examples in Programming Activities: https://eric.ed.gov/?id=EJ1381113
- Renkl et al. — variability and self-explanation: https://pubmed.ncbi.nlm.nih.gov/9514690/

### Self-explanation and articulation

Правильный результат не гарантирует понимание. Исследования обнаруживали, что часть студентов затрудняется объяснить собственную программу, а ability to explain может быть сильнее связана с дальнейшим успехом, чем сам факт correct submission.

Проектный вывод:

- `self-explain` является отдельным approach;
- explanation не создаёт delivery evidence, но может повысить mastery/confidence of understanding;
- capability должен различать «повторил» и «может объяснить/перенести».

Источники:

- Students Struggle to Explain Their Own Program Code: https://arxiv.org/abs/2104.06710
- Alhassan — self-explanation with worked examples: https://eric.ed.gov/?id=EJ1133008

### Scaffolding and calibrated difficulty

Meta-analysis K-12 programming education reports a positive average effect of scaffolding, но качество и контекст важны.

Проектный вывод:

- assistance должна иметь levels;
- hint, explanation, walkthrough, pair work и takeover различаются;
- помощь может повысить learning и снизить autonomy claim одновременно;
- too-hard challenge без recovery не является хорошим learning design.

Источник: https://doi.org/10.1109/EITT61659.2023.00016

### Pair programming and collaboration

Исследования introductory programming часто показывают более высокий completion, качество assignments и confidence при pair programming, но также указывают на роль compatibility, skill level и организации процесса.

Проектный вывод:

- pair work является самостоятельным assistance/practice mode;
- результат пары не автоматически подтверждает solo capability;
- partner compatibility и contribution должны быть bounded context, а не новая огромная team simulation;
- collaboration полезна как learning/recovery route.

Источники:

- McDowell et al.: https://doi.org/10.1145/563517.563353
- Umapathy & Ritzhaupt meta-analysis: https://doi.org/10.1145/2996201

### Spacing and retrieval

Обзор Nature отмечает устойчивую общую поддержку spacing/retrieval в исследованиях learning, а ICER study показало применимость spaced/interleaved retrieval tool в introductory Python. При этом отдельное исследование девяти STEM courses показало неодинаковые эффекты между дисциплинами.

Проектный вывод:

- не превращать игру в spaced-repetition scheduler;
- использовать mild modifiers и automatic routine aggregation;
- показывать next-step revisit после паузы;
- transfer и variation важнее бесконечного повторения одной задачи;
- числа остаются playtest hypotheses.

Источники:

- Carpenter, Pan, Butler: https://www.nature.com/articles/s44159-022-00089-1
- YeckehZaare, Resnick, Ericson: https://doi.org/10.1145/3291279.3339411
- STEM replication limits: https://doi.org/10.1186/s40594-024-00468-5

### Automated feedback

Systematic review автоматизированного grading отмечает распространённость быстрого feedback, но также ограниченность многих инструментов: они часто оценивают correctness и дают expected/actual output, хуже охватывая maintainability и explanation.

Проектный вывод:

- feedback quality отдельна от скорости;
- instant test result не равен conceptual feedback;
- source/provider может давать self-check, test feedback, mentor explanation или delayed review;
- один pass/fail не должен определять mastery.

Источник: https://arxiv.org/abs/2306.11722

### AI coding assistants

Современные исследования указывают одновременно на помощь, confidence и скорость, а также на overreliance, слабый transfer и снижение comprehension при полном делегировании. Результаты зависят от способа взаимодействия: active explanation/verification отличается от получения готового решения.

Проектный вывод:

- AI mode описывается действием: explain, hint, example, diagnose, solve, review;
- full solution может ускорить provider outcome и дать слабое learning;
- modification, verification и unaided transfer необходимы для stronger capability;
- отдельный global AI-dependence score не нужен;
- AI не входит в early implementation, но extension seam фиксируется.

Источники:

- Students' Reliance on AI: https://arxiv.org/abs/2506.13845
- Tool or Trouble?: https://arxiv.org/abs/2507.22900
- Adoption of AI Coding Assistants in Programming Education: https://doi.org/10.1007/s40692-025-00375-w

## 4. Три рассмотренных архитектурных подхода

### A. Education system owns progression

```text
course/book
→ direct skill gain
```

Плюсы: простота.

Минусы: дублирует Progression Core, создаёт XP shortcuts, плохо работает для mentor/project/AI.

Вердикт: отклонено.

### B. Universal Learning Engine owns access, education and progression

Плюсы: все правила в одном месте.

Минусы: god-module, дублирование Equipment/NPC/Economy/Project/Progression, тяжёлые migrations.

Вердикт: отклонено.

### C. Provider + normalized learning attempt + Progression

```text
access projection
→ provider opportunity
→ Learning Engine outcome
→ optional Challenge Engine
→ ExperienceEpisode
→ Progression
```

Плюсы:

- ownership соответствует существующей архитектуре;
- source types можно расширять;
- early game остаётся casual;
- mentorship и AI используют ту же модель;
- access barriers не становятся инвентарём Learning Engine.

Минусы:

- нужен typed contract между несколькими systems;
- требуется дисциплина не дублировать Challenge Engine.

Вердикт: принят.

## 5. Собственная игровая модель

### Player fantasy

Игрок не «покупает XP», а проходит состояния:

```text
увидел идею
→ понял
→ повторил
→ изменил
→ применил с помощью
→ применил самостоятельно
→ перенёс
→ объяснил другому
```

### Source design

Источник определяется affordances:

- explanation;
- example;
- practice;
- retrieval;
- transfer;
- feedback;
- collaboration;
- authenticity;
- recency;
- access cost.

### Learning choice

Blocking learning decision используется только при meaningful trade-off:

- быстрее понять через пример;
- попытаться воспроизвести без подсказки;
- изменить пример;
- попросить hint;
- начать маленький проект;
- отложить из-за capacity/access.

Routine learning продолжает выполняться автоматически.

### Outcome design

LearningOutcome разделяет:

- comprehension;
- practice;
- transfer;
- assistance;
- feedback;
- observable artifact;
- optional challenge result;
- next step.

Эти dimensions внутренние; normal UI использует human-readable result.

## 6. Историческая модель

Не требуется моделировать каждый реальный курс или сайт. Нужны source families и era profiles.

### 1990-е

Основные gameplay differences:

- scarcity of devices/materials;
- print/manual/listing culture;
- local school/club/mentor significance;
- delayed feedback;
- offline experimentation;
- BBS/early network where locally plausible.

### 2000-е

- wider home PC/internet access;
- tutorials/forums/IRC;
- downloadable docs and open-source code;
- faster community feedback.

### 2010-е

- videos, Q&A, Git hosting, interactive courses;
- more paths and framework churn;
- source overload begins.

### 2020-е

- low search cost and AI assistance;
- high delivery speed;
- verification, transfer and comprehension become explicit challenges.

Global existence and local availability remain separate.

## 7. MVP and first-year scope

### Vertical Slice bridge

- one beginner source;
- one access snapshot/fallback;
- one short learning choice or auto-resolved attempt;
- one modification/reproduction result;
- one episode preparing the invalid-input challenge;
- no separate planner screen.

### First playable year

Target corpus:

- 3–5 source profiles;
- 2–3 access routes;
- 6–10 learning opportunities;
- 3 practice modes used repeatedly in changing contexts;
- one mentor/peer route;
- two technologies maximum before evidence demands more;
- one transfer milestone;
- one interruption/recovery arc;
- projects begin early rather than after long course grind.

Numbers are content-budget hypotheses, not mandatory permanent limits.

## 8. Failure modes and gates

Reject design when:

- most months are schedule optimization;
- expensive course always wins;
- mentor is permanent multiplier;
- passive reading grants independent capability;
- source rarity equals quality;
- no-home-computer start falls permanently behind;
- learning lasts years before first project;
- player chooses by exact gain;
- AI solution grants mastery without verification;
- identical practice is fastest path to grade;
- UI resembles LMS/course marketplace.

## 9. Canon integration

- ADR-017 fixes ownership and rejected shortcuts;
- `PROGRAMMER-LEARNING-ENGINE.md` is normative;
- `PROGRAMMER-LEARNING-UI.md` defines Normal/Details presentation;
- `PROGRAMMER-LEARNING-BALANCE.md` defines fixtures and gates;
- content/history/NPC/progression docs reference the new contracts;
- implementation remains stacked on ADR-016 because practical learning may invoke Professional Challenge Engine.

## 10. Final verdict

Runtime Human should not simulate education as a school timetable. It should simulate **formation of capability under historically changing access and feedback conditions**.

The distinctive loop is:

```text
найти доступный путь к знанию
→ выбрать, как с ним работать
→ получить observable practice result
→ понять цену помощи и самостоятельности
→ применить идею в проекте
→ открыть следующий профессиональный шаг
```

Это делает возраст 12–18 полноценной частью programmer fantasy, а не ожиданием Career Engine.