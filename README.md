# Runtime Human

PC-first бесплатный offline-first симулятор жизни и карьеры программиста.

## Канон

- Канонический старт: январь 1990 года, персонажу 12 лет.
- Календарь: реальный григорианский.
- Один пользовательский ход: один месяц.
- Игрок свободно принимает решения; очков действий и обязательного процентного распределения времени нет.
- Ограничения создаются деньгами, временем, здоровьем, календарём, вниманием, оборудованием и сотрудниками.
- Основное место действия — один фиксированный вымышленный международный мегаполис в неназванной вымышленной стране.
- Постоянных переездов, виз, разных национальных рынков и карты мира нет.
- Исторические технологии и продукты открываются по подтверждённой временной шкале.
- Работодатели, университеты, конференции, магазины, NPC и локальная экономика вымышлены.
- Игра бесплатная, без Steam, магазинов, платёжного backend и целевого выпуска на рынки ЕС.

## Инженерный baseline

- Tauri 2 + React 19;
- TypeScript 7 + Vite 8/Rolldown/Oxc;
- Storybook 10 как UI/content workshop с Foundation;
- pure TypeScript Game Core;
- Rust authoritative persistence/platform boundary;
- SQLite 3.51.3+;
- deterministic persisted MonthRun;
- integer/fixed-point domain numerics;
- Vitest/fast-check/Storybook/Playwright/WebdriverIO test matrix.

## Документация

- [Индекс документации](docs/INDEX.md)
- [Master Architecture](docs/architecture/MASTER-ARCHITECTURE.md)
- [Полный архитектурный план](docs/architecture/FULL-ARCHITECTURE-PLAN.md)
- [Архитектурные решения](docs/adr/)
- [Deep Research и synthesis](docs/research/)
- [TypeScript policy](docs/engineering/TYPESCRIPT-POLICY.md)
- [Storybook workflow](docs/engineering/STORYBOOK-WORKFLOW.md)
- [Vertical Slice](docs/plans/VERTICAL-SLICE-PLAN.md)
- [Roadmap](docs/plans/ROADMAP.md)

## Источник истины

Этот приватный репозиторий является единственным источником истины. При конфликте действует порядок из [`AGENTS.md`](AGENTS.md): accepted ADR → профильная спецификация → master architecture → full plan → implementation plan/issue → research/external sources → комментарии в коде.

## Статус

Проект находится на стадии архитектурного проектирования и подготовки первой вертикальной играбельной версии. Архитектурный канон редакции 1.3 учитывает два Deep Research от 16 июля 2026 года и принятые ADR-001–012.