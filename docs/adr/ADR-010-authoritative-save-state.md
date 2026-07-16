# ADR-010: Авторитетное состояние сейва

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

MonthRun атомарно изменяет персонажа, работу, проекты, финансы, отношения и мир. Представление каждого объекта независимым aggregate root создаёт неясные межагрегатные transaction rules.

## Предлагаемое решение

`SaveGameState` является consistency boundary завершённого месяца. Внутри него данные нормализованы по доменным модулям. Persistence хранит current snapshot + append-only history + pending draft + backups.

Полное event sourcing не используется.

## Последствия

- inter-module invariants проверяются централизованно;
- один atomic month commit;
- history остаётся доступна без replay всей жизни;
- read models можно перестраивать;
- требуется контролировать размер загружаемого state и использовать repositories/read projections.

## Альтернативы

- full event sourcing — отклонено из-за rules evolution и replay complexity;
- независимые commits каждого aggregate — риск half-applied month;
- один JSON blob без нормализации — плохо для migrations/query/recovery.