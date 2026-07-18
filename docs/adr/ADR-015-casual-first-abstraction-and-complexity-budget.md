---
title: "ADR-015 — Casual-first abstraction и бюджет сложности"
type: adr
status: accepted
canon: true
depends_on: [ADR-005, ADR-009, ADR-012, ADR-013, ADR-014]
updated: 2026-07-18
---

# ADR-015 — Casual-first abstraction и бюджет сложности

- **Статус:** Accepted
- **Дата:** 2026-07-17
- **Решение владельца:** Runtime Human должен оставаться казуальным симулятором программиста; глубокая внутренняя модель не должна становиться обязательной сложностью игрока или первой реализации
- **Связанные ADR:** ADR-009, ADR-012, ADR-013, ADR-014
- **Связанные спецификации:** `docs/game-design/CASUAL-SIMULATION-DESIGN.md`, `docs/ui/UI-ARCHITECTURE.md`, `docs/plans/VERTICAL-SLICE-PLAN.md`

## Контекст

ADR-013 и ADR-014 закрепили правильные архитектурные границы:

- профессиональный результат отделён от XP, title и стажа;
- проекты используют агрегированные Work Packages вместо ежедневных тикетов;
- provider outcome, progression и persistence остаются детерминированными и атомарными;
- Project, Product, Company, Career и Progression не дублируют authoritative state.

Однако нормативные спецификации начали описывать максимальную многолетнюю модель раньше, чем подтверждён базовый игровой цикл. В baseline одновременно появились многочисленные skills, evidence claims, readiness gates, quality dimensions, debt records, defect states, contribution dimensions, release policies и детальные forecast profiles.

Даже скрытая от игрока модель имеет стоимость:

- её нужно реализовать;
- балансировать;
- сериализовать и мигрировать;
- наполнять контентом;
- покрывать тестами;
- объяснять через UI и события.

Для казуального симулятора правдоподобие должно создаваться небольшим числом понятных решений и долгосрочными последствиями, а не максимальной детализацией всех процессов реальной разработки.

## Решение

### 1. Casual-first является обязательным продуктовым ограничением

Runtime Human строится по правилу:

> Простая игровая модель должна создавать правдоподобные последствия. Максимально подробная модель не является целью сама по себе.

Игрок должен за несколько секунд понимать:

- что происходит;
- почему это важно;
- какие есть варианты;
- какую цену имеет выбор;
- что изменилось после месяца.

Если feature требует изучения внутренней модели до принятия обычного решения, он упрощается, скрывается за progressive disclosure либо откладывается.

### 2. Ввести три профиля реализации

#### MVP Casual

Единственный обязательный профиль для Foundation и Vertical Slice.

Он использует минимальное authoritative state, необходимое для:

- одного понятного выбора;
- причинного месячного результата;
- сохранения истории;
- детерминированного replay;
- будущего безопасного расширения.

#### Recommended

Добавляется только после подтверждения playtest, что MVP Casual:

- понятен без внешнего руководства;
- интересен несколько игровых лет;
- не сводится к одной оптимальной стратегии;
- нуждается в конкретной дополнительной глубине.

#### Extended Simulation

Опциональная дальняя модель для поздних карьер, команд, компаний, долгоживущих продуктов и advanced mode.

Она не является обязательством roadmap и не реализуется «на будущее» без наблюдаемой продуктовой потребности.

### 3. Архитектурная возможность не равна обязательной реализации

ADR-013 и ADR-014 определяют:

- ownership;
- determinism;
- compatibility;
- запрещённые shortcut-модели;
- направление расширения.

Они не требуют, чтобы Vertical Slice или первая публичная версия реализовали все перечисленные dimensions, histories, profiles и state machines.

Каждое расширенное поле должно появляться только вместе с gameplay, которое его использует.

### 4. Бюджет скрытой сложности

Authoritative или derived сущность допускается в baseline, только если она выполняет минимум одну функцию:

1. создаёт понятное meaningful decision;
2. объясняет видимое последствие;
3. предотвращает подтверждённый exploit или soft lock;
4. необходима для crash-safe consistency/compatibility;
5. поддерживает уже реализованный content path.

«Может понадобиться в будущем» не является достаточным основанием.

### 5. Бюджет пользовательской сложности

В основном режиме:

- один экран показывает не более 3–5 первичных объектов внимания;
- один обычный месяц создаёт 0–1 blocking decision;
- один проект имеет обычно 2–5 значимых Work Packages;
- одновременно игрок непосредственно контролирует обычно 1–3 активных professional commitments;
- обычный проект показывает три базовых качества: работоспособность, удобство и поддерживаемость;
- performance, security, reliability и operations появляются только ситуационно;
- technical debt по умолчанию показывается одним human-readable band;
- defects по умолчанию разделяются на скрытый риск, известную проблему и серьёзный incident;
- grade readiness в normal mode показывает 3–4 понятных области и статус, а не evidence matrix;
- routine progress группируется в одну строку/итог.

Числа являются starting UX budgets и требуют playtest, но превышение должно быть обосновано.

### 6. Casual progression baseline

В normal mode профессиональное развитие показывает:

- понятную capability-фразу;
- 3–5 наиболее релевантных skills текущего этапа;
- текущую technology familiarity;
- один следующий полезный шаг;
- общий статус готовности к следующему грейду.

Внутреннее разделение mastery, fluency, familiarity и evidence сохраняется, но:

- evidence timeline не является обязательным экраном MVP;
- numeric gates скрыты;
- мелкие claims агрегируются;
- advanced mode может быть добавлен позднее;
- Grade Readiness не превращается в performance-review интерфейс.

### 7. Casual project baseline

MVP ProjectState поддерживает:

- короткую цель;
- стадию проекта;
- 2–5 Work Packages;
- progress/uncertainty bands;
- три базовых quality bands;
- один debt band;
- один risk band;
- компактный release state;
- один понятный contribution summary.

Baseline не требует:

- component graph;
- requirement graph;
- полноценного debt ledger;
- defect inventory;
- granular contribution percentages;
- rollout/support/rollback policies;
- нескольких quality confidence/trend полей для каждой dimension;
- portfolio dashboard;
- daily employee/task simulation.

Расширенные записи создаются только для player-relevant exception или поздней системы.

### 8. Progressive disclosure

UI имеет уровни:

1. **Normal** — человеческие формулировки, следующий выбор, последствия.
2. **Details** — причины, несколько contributing factors, история важных решений.
3. **Advanced/Diagnostics** — внутренние dimensions, claims, trace и numeric data; не обязателен для MVP.

Normal mode является продуктом, а не урезанным debug view.

### 9. Playtest gate перед усложнением

Feature переводится из Recommended/Extended в обязательный baseline только при наличии evidence:

- игроки не понимают причину результата без него;
- существующие решения слишком однообразны;
- возникает подтверждённый dominant strategy или exploit;
- поздняя система требует отдельного состояния;
- упрощённая модель создаёт заметно неправдоподобные outcomes;
- feature повышает желание продолжить прохождение и не ухудшает comprehension.

Не допускается обоснование только архитектурной полнотой или реализмом.

### 10. Vertical Slice проверяет удовольствие, а не полноту модели

Vertical Slice считается успешным, если игрок:

- понимает цель маленького проекта;
- принимает один технический trade-off;
- видит правдоподобный результат;
- понимает, чему научился;
- хочет перейти к следующему месяцу.

Slice не обязан доказывать полный grade engine, debt system, release governance, long-term evidence history или team delegation.

## Последствия

### Положительные

- снижается стоимость первого playable;
- уменьшается риск построить симулятор Jira/performance review;
- документация различает архитектурную границу и текущий implementation scope;
- UI получает явный complexity budget;
- новые системы добавляются по наблюдаемой потребности;
- programmer-first fantasy проверяется раньше long-term infrastructure.

### Стоимость

- некоторые типы и поля придётся добавлять поздними migrations;
- расширенные симуляции не будут доступны в первой версии;
- content authors должны проектировать понятные агрегированные outcomes;
- потребуется дисциплина не реализовывать уже описанные Extended-возможности заранее.

### Риски

- чрезмерное упрощение может превратить проекты в progress bars;
- скрытые consequences могут казаться случайными;
- advanced игрокам может не хватить прозрачности;
- позднее расширение потребует migration work.

Риски ограничиваются meaningful choices, causal reports, stable extension seams, semantic snapshots и playtest-driven expansion.

## Отклонённые альтернативы

### Реализовать полную архитектуру сразу, скрыв её в UI

Отклонено: скрытая система сохраняет полную стоимость реализации и балансировки.

### Удалить ADR-013/014 и вернуться к одному XP/progress bar

Отклонено: теряются правдоподобие, границы, recovery и профессиональная причинность.

### Два независимых режима симуляции с разными authoritative rules

Отклонено для baseline: усложняет баланс, save compatibility и тестирование. Normal/Advanced различаются представлением, а не профессиональной истиной.

### Максимальный реализм как критерий качества

Отклонено: реализм полезен только когда создаёт понятный игровой выбор или consequence.

## Инварианты

- default UI не требует знания internal terms;
- hidden state не существует без текущей gameplay/consistency функции;
- architecture seam не обязывает раннюю implementation;
- advanced detail не меняет outcome;
- один проект не становится ticket dashboard;
- evidence не становится основным интерфейсом;
- normal mode объясняет causality;
- обычный месяц не перегружен blocking decisions;
- расширение проходит playtest/complexity gate;
- deterministic, atomic and compatibility guarantees ADR-005/007/010/013/014 сохраняются.

## Verification requirements

Casual-first изменение проверяет:

- first-time comprehension;
- time-to-first-meaningful-choice;
- number of visible concepts per screen;
- blocking decision frequency;
- monthly report causality;
- player ability to predict trade-off direction;
- desire to continue after first month/year;
- no dominant simple exploit;
- no hidden-model inconsistency after restart;
- accessibility and long Russian text.
