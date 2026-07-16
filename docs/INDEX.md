# Runtime Human — индекс документации

Этот каталог является навигационной точкой по архитектуре, игровому дизайну, симуляции, контенту и инженерным правилам проекта.

## Иерархия источников истины

1. Принятые ADR в `docs/adr/`.
2. Специализированная спецификация подсистемы.
3. `docs/architecture/MASTER-ARCHITECTURE.md`.
4. `docs/architecture/FULL-ARCHITECTURE-PLAN.md`.
5. Планы реализации и issue/PR.
6. Комментарии в коде.

При конфликте применяется источник с более высоким приоритетом. Документ нижнего уровня обязан быть обновлён после принятия решения верхнего уровня.

## Архитектура

- [Master Architecture](architecture/MASTER-ARCHITECTURE.md)
- [Полный архитектурный план](architecture/FULL-ARCHITECTURE-PLAN.md)
- [System Context](architecture/SYSTEM-CONTEXT.md)
- [Границы модулей](architecture/MODULE-BOUNDARIES.md)
- [Доменная модель](architecture/DOMAIN-MODEL.md)
- [Структура репозитория](architecture/REPOSITORY-STRUCTURE.md)
- [Правила зависимостей](architecture/DEPENDENCY-RULES.md)
- [Потоки данных](architecture/DATA-FLOW.md)

## Игровой дизайн

- [Игровой канон](game-design/GAMEPLAY-CANON.md)
- [Месячный игровой цикл](game-design/MONTHLY-GAME-LOOP.md)
- [Мягкие ограничения](game-design/SOFT-LIMITS.md)
- [Прогрессия персонажа](game-design/CHARACTER-PROGRESSION.md)
- [Навыки и технологии](game-design/SKILLS-AND-TECHNOLOGIES.md)
- [Карьера](game-design/CAREER-SYSTEM.md)
- [Проекты и продукты](game-design/PROJECTS-AND-PRODUCTS.md)
- [Open source](game-design/OPEN-SOURCE-SYSTEM.md)
- [Компания](game-design/COMPANY-SYSTEM.md)
- [Жильё и техника](game-design/HOUSING-AND-EQUIPMENT.md)
- [Отношения и здоровье](game-design/RELATIONSHIPS-AND-HEALTH.md)
- [Жизненный цикл и наследие](game-design/LIFE-CYCLE-AND-LEGACY.md)
- [Город и исторические эпохи](game-design/CITY-AND-ERA-EVOLUTION.md)

## Симуляция

- [Симуляция месяца](simulation/MONTH-SIMULATION.md)
- [Приостановленный месяц](simulation/SUSPENDED-MONTH-RUN.md)
- [Календарь](simulation/CALENDAR.md)
- [Детерминированность](simulation/DETERMINISM.md)
- [Числовая политика](simulation/NUMERIC-POLICY.md)
- [Случайность](simulation/RANDOMNESS.md)
- [Баланс и массовые прогоны](simulation/BALANCE-SIMULATION.md)

## События и NPC

- [Event Engine](events/EVENT-ENGINE.md)
- [Narrative Director](events/NARRATIVE-DIRECTOR.md)
- [Схема событий](events/EVENT-CONTENT-SCHEMA.md)
- [Цепочки событий](events/EVENT-CHAINS.md)
- [NPC и narrative memory](events/NPC-AND-NARRATIVE-MEMORY.md)

## Сохранения

- [Модель сейва](persistence/SAVE-MODEL.md)
- [SQLite](persistence/SQLITE-ARCHITECTURE.md)
- [Граница persistence](persistence/PERSISTENCE-BOUNDARY.md)
- [Миграции](persistence/MIGRATIONS.md)
- [Backup и restore](persistence/BACKUP-AND-RESTORE.md)
- [Safe Mode](persistence/SAFE-MODE.md)
- [Совместимость сейвов](persistence/SAVE-COMPATIBILITY.md)

## Контент

- [Архитектура контента](content/CONTENT-ARCHITECTURE.md)
- [Исторический каталог](content/HISTORICAL-CATALOG.md)
- [Жизненный цикл контента](content/CONTENT-LIFECYCLE.md)
- [Tombstones и deprecation](content/TOMBSTONES-AND-DEPRECATION.md)
- [Локализация](content/LOCALIZATION.md)
- [Ассеты](content/ASSET-PIPELINE.md)
- [Моды](content/MODDING.md)

## UI

- [UI Architecture](ui/UI-ARCHITECTURE.md)
- [Design System](ui/DESIGN-SYSTEM.md)
- [Навигация](ui/NAVIGATION.md)
- [Доступность](ui/ACCESSIBILITY.md)
- [Motion и audio](ui/MOTION-AND-AUDIO.md)
- [Performance budgets](ui/PERFORMANCE-BUDGETS.md)

## Инженерия

- [Технологический стек](engineering/TECH-STACK.md)
- [TypeScript policy](engineering/TYPESCRIPT-POLICY.md)
- [Rust boundary](engineering/RUST-BOUNDARY.md)
- [Тестовая стратегия](engineering/TESTING-STRATEGY.md)
- [CI/CD](engineering/CI-CD.md)
- [Политика зависимостей](engineering/DEPENDENCY-POLICY.md)
- [Release и updater](engineering/RELEASE-AND-UPDATER.md)
- [Security](engineering/SECURITY.md)

## ИИ-агенты

- [Общий workflow](agents/AGENT-WORKFLOW.md)
- [Architect Agent](agents/ARCHITECT-AGENT.md)
- [Core Agent](agents/CORE-AGENT.md)
- [Content Agent](agents/CONTENT-AGENT.md)
- [UI Agent](agents/UI-AGENT.md)
- [QA Agent](agents/QA-AGENT.md)
- [Red Team Agent](agents/RED-TEAM-AGENT.md)

## Планы

- [Vertical Slice](plans/VERTICAL-SLICE-PLAN.md)
- [Roadmap](plans/ROADMAP.md)
- [Release Milestones](plans/RELEASE-MILESTONES.md)

## Правило обновления

Изменение архитектурного решения начинается с ADR. После принятия ADR одновременно обновляются master-документ, профильные спецификации, схемы, тесты и планы реализации.