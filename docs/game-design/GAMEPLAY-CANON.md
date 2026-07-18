---
title: "GAMEPLAY-CANON"
type: engine
status: draft
canon: true
updated: 2026-07-18
---

# Игровой канон

Нормативные спецификации:

- [Programmer-First Design](PROGRAMMER-FIRST-DESIGN.md);
- [Casual Simulation Design](CASUAL-SIMULATION-DESIGN.md).

## Фантазия игрока

Игрок проживает жизнь программиста с подросткового возраста, наблюдает развитие индустрии с 1990 года и строит собственный путь: специалист, лидер, open-source maintainer, предприниматель или публичный эксперт.

Главная фантазия:

- научиться программировать;
- становиться сильнее в решении технических задач;
- осваивать технологии разных эпох;
- создавать проекты и профессиональные результаты;
- выбирать между глубиной, свободой, богатством, влиянием и личной жизнью;
- оставить техническое или человеческое наследие.

## Жанровая формула

Runtime Human — казуальный текстовый симулятор.

```text
понятная ситуация
→ один содержательный выбор
→ автоматический месяц
→ правдоподобное последствие
→ короткое объяснение
→ следующий интересный вариант
```

Глубина создаётся накоплением решений и последствий, а не количеством одновременно видимых шкал.

## Иерархия

1. Programmer Mastery Core.
2. Professional Expression.
3. Human Constraints and Values.
4. Narrative, Era and Philosophy.

При конфликте понятный meaningful choice важнее максимальной детализации процесса.

## Основной цикл

```text
просмотр текущей ситуации
→ выбор обучения, проекта или приоритета
→ простой прогноз
→ «Следующий месяц»
→ автоматическая симуляция commitments
→ редкое важное решение
→ outcome
→ короткий отчёт
→ новый вариант
```

## Нормативные правила

- Один ход — один месяц.
- Нет universal action points и обязательных percentage sliders.
- Работа, учёба, проекты и life commitments продолжаются автоматически.
- Routine не требует повторяющихся monthly clicks.
- Обычный месяц содержит 0–1 blocking decision.
- Один экран показывает небольшое число primary objects.
- Normal mode использует human language и не требует internal terminology.
- Details/Advanced раскрываются по запросу и не меняют outcome.
- Скрытая модель существует только ради choice, consequence, exploit protection или consistency.
- Architecture seam не является automatic roadmap scope.
- Programmer/professional choices остаются основным содержанием игры.
- Quiet month допустим и группирует routine progress/recovery.

## Профессиональная прогрессия

```text
Beginner → Intern → Junior → Middle → Senior
```

Top Programmer — редкий late-game status.

Грейд не равен XP, стажу, зарплате или title. В normal mode игрок видит capability phrase, несколько relevant skills, technology familiarity, readiness status и next step. Evidence matrix и numeric gates не являются основным интерфейсом.

## Проекты

Проект имеет понятную цель, несколько крупных Work Packages и минимум один trade-off. Он не является одним progress bar или ticket simulator.

MVP показывает current package, simple forecast, работоспособность, удобство, поддерживаемость, один debt/risk/known issue и next decision.

## Исторический мир

- Реальные технологии открываются по подтверждённой истории.
- Город, работодатели, NPC и локальная экономика вымышлены.
- После 2026-07 будущее альтернативное.
- Новая technology не всегда лучший выбор; legacy сохраняет ценность.

## Что не является целью

- generic life simulator;
- IDE/coding puzzle;
- task-manager simulator;
- performance-review spreadsheet;
- бухгалтерская CRM;
- полная симуляция всех процессов разработки;
- обязательные quality/debt/bug dashboards;
- управление каждым сотрудником и часом;
- максимальный реализм как самоцель;
- мобильные таймеры и FOMO;
- абстрактная философия вместо прожитой истории.
