# Runtime Human

PC-first бесплатный offline-first казуальный симулятор становления, работы и наследия программиста.

Игра сочетает понятные решения, месячную автоматическую симуляцию и долгосрочные последствия. Внутренняя модель может быть глубокой, но основной интерфейс не превращается в Jira, CRM, IDE или performance-review dashboard.

## Канон

- Канонический старт: январь 1990 года, персонажу 12 лет.
- Один пользовательский ход: один месяц.
- Нет universal action points и обязательного percentage распределения времени.
- Routine commitments продолжаются автоматически.
- Обычный месяц содержит 0–1 важное blocking decision.
- Programmer Mastery Core имеет приоритет над life-sim и narrative слоями.
- Грейд не равен XP, стажу, зарплате или title.
- Проекты используют несколько крупных Work Packages, а не ежедневные тикеты.
- Normal UI показывает небольшое число понятных объектов и human-readable statuses.
- Details/Advanced раскрываются по запросу и не меняют outcome.
- Architecture seam не является обязательством реализовать future complexity.
- Основное место действия — один фиксированный вымышленный мегаполис.
- Реальные технологии открываются по подтверждённой временной шкале.
- Работодатели, NPC и локальная экономика вымышлены.
- Игра бесплатная, без Steam, платежей и обязательного backend.

## Реализационные профили

- **MVP Casual** — единственный обязательный профиль для Foundation и Vertical Slice.
- **Recommended** — добавляется после успешного playtest первого месяца и года.
- **Extended Simulation** — поздние опциональные системы, не ранний roadmap requirement.

## Инженерный baseline

- Tauri 2 + React 19;
- TypeScript 7 + Vite/Oxc;
- Storybook 10;
- pure TypeScript Game Core;
- Rust persistence/platform boundary;
- SQLite 3.51.3+;
- deterministic persisted MonthRun;
- integer/fixed-point authoritative numerics;
- focused Vitest/fast-check/Storybook/Playwright/WebdriverIO matrix.

## Документация

- [Индекс документации](docs/INDEX.md)
- [Casual Simulation Design](docs/game-design/CASUAL-SIMULATION-DESIGN.md)
- [Programmer-First Design](docs/game-design/PROGRAMMER-FIRST-DESIGN.md)
- [Professional Progression Engine](docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md)
- [Project & Work Package Engine](docs/game-design/PROJECT-WORK-PACKAGE-ENGINE.md)
- [Архитектурные решения](docs/adr/)
- [Исследования и design corrections](docs/research/)
- [Vertical Slice](docs/plans/VERTICAL-SLICE-PLAN.md)
- [Roadmap](docs/plans/ROADMAP.md)
- [Machine-readable execution status](docs/EXECUTION-STATUS.jsonc)

## Источник истины

Этот приватный репозиторий является единственным источником истины. При конфликте действует порядок из [`AGENTS.md`](AGENTS.md).

## Актуальный статус

По состоянию на 23 июля 2026 года завершены и объединены в `main`:

- Repository Foundation — PR #15;
- Determinism Kernel — PR #16;
- crash-safe MonthRun Protocol — PR #17;
- SQLite Durable MonthRun Store — PR #18.

Активная работа: **persisted MonthRun application orchestration** в draft PR #20. Она соединяет pure MonthRun kernel с durable SQLite commands и закрывает restart/acknowledgement-loss сценарии.

Первый играбельный январь 1990 года ещё не готов: production content compiler, January content и игровой desktop UI остаются следующими продуктовыми этапами. Self-hosted Windows workflow является обязательным merge gate; изменение не объединяется без зелёного прогона на неизменённом head.
