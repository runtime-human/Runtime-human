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

## Документация и участие

- [Индекс документации](docs/INDEX.md)
- [Machine-readable execution status](docs/EXECUTION-STATUS.jsonc)
- [Правила для агентов](AGENTS.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Архитектурные решения](docs/adr/)
- [Casual Simulation Design](docs/game-design/CASUAL-SIMULATION-DESIGN.md)
- [Programmer-First Design](docs/game-design/PROGRAMMER-FIRST-DESIGN.md)
- [Roadmap](docs/plans/ROADMAP.md)

## Источник истины

Этот публичный репозиторий является источником истины проекта. Порядок authority и правила разрешения конфликтов определены в [`AGENTS.md`](AGENTS.md); curated-навигация по канону начинается с [`docs/INDEX.md`](docs/INDEX.md).

## Текущее состояние

README намеренно не дублирует быстро меняющийся список завершённых PR, активную фазу или следующий implementation constraint. Актуальное machine-readable состояние находится в [`docs/EXECUTION-STATUS.jsonc`](docs/EXECUTION-STATUS.jsonc).

Обычный PR verification выполняется на GitHub-hosted runners. Канонический полный merge gate проекта — `pnpm verify` (V3); специализированные физические/evidence runners, если они понадобятся, используются только как отдельный opt-in контур и не являются обычным target для недоверенного PR-кода.
