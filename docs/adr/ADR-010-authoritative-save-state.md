---
title: "ADR-010: Авторитетное состояние сейва"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-010: Авторитетное состояние сейва

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и atomic month consistency requirements

## Контекст

MonthRun атомарно изменяет персонажа, работу, проекты, финансы, отношения и мир. Представление каждого объекта независимым aggregate root создаёт неясные межагрегатные transaction rules.

## Решение

`SaveGameState` является consistency boundary завершённого месяца. Внутри него данные нормализованы по доменным модулям.

Persistence хранит:

```text
current normalized snapshot
+ append-only histories and ledgers
+ pending MonthRun draft
+ rolling backups
+ rebuildable read projections
```

Полное event sourcing не используется. Read models, search indexes, generated summaries и caches неавторитетны и могут быть перестроены.

Authoritative state меняется только через application use case и Rust persistence transaction с optimistic revision check.

## Последствия

- inter-module invariants проверяются централизованно;
- один atomic month commit;
- history остаётся доступна без replay всей жизни;
- read models можно перестраивать;
- проще отделить pending run от committed life;
- требуется контролировать размер загружаемого state и использовать repositories/read projections;
- schema migrations обязаны обновлять snapshot и histories согласованно.

## Альтернативы

- full event sourcing — отклонено из-за rules evolution и replay complexity;
- независимые commits каждого aggregate — риск half-applied month;
- один JSON blob без нормализации — плохо для migrations/query/recovery.

## Verification

- failed commit не меняет ни один authoritative module;
- read projection может быть удалена и восстановлена;
- save revision увеличивается один раз на committed month;
- duplicate commit с тем же run ID является idempotent либо отклоняется как already committed;
- histories согласованы с current snapshot invariants.