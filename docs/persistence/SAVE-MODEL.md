# Модель сохранения

Нормативные решения: [ADR-005](../adr/ADR-005-suspended-month-run.md) и [ADR-010](../adr/ADR-010-authoritative-save-state.md).

## Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. Данные внутри хранятся нормализованно по доменным модулям, но commit месяца изменяет их атомарно.

## Авторитетная структура

```text
current normalized snapshot
+ append-only histories and finance ledger
+ persisted pending MonthRun draft
+ committed MonthRun markers/traces
+ rolling backups
+ rebuildable read projections
```

Полное event sourcing не используется: текущий state не восстанавливается воспроизведением всей жизни и старых версий правил.

## Save metadata

- save ID;
- display name;
- created/updated timestamps инфраструктуры;
- game date и MonthIndex;
- save schema version;
- rules version;
- content/mod fingerprints;
- Determinism Manifest;
- committed revision;
- last committed MonthRun ID;
- health/recovery state;
- checksum/canonical envelope hash;
- last successful backup metadata.

System timestamps не влияют на игровой outcome и не входят в authoritative simulation hash, если это не указано явно в envelope policy.

## Normalized snapshot

Таблицы/authoritative records хранят:

- character;
- people и relationships;
- employment/activities;
- projects/products/open source;
- company;
- inventory/equipment;
- housing;
- finance;
- world/city/timeline;
- narrative/arcs;
- achievements/life-cycle state.

Разбиение на таблицы не означает независимые транзакции каждого доменного объекта.

## История

Append-only records:

- life months;
- event/decision history;
- career history;
- project/product releases;
- achievements;
- relationship milestones;
- finance ledger;
- committed MonthRun summary/trace reference;
- migration history.

История используется для журнала, аналитики, diagnostics и auditability, но не является единственным источником текущего state.

Append-only означает отсутствие обычного редактирования gameplay history. Corruption repair/migration выполняется только versioned recovery operation с записью причины.

## Pending MonthRun

Pending draft отделён от committed snapshot и содержит exact deterministic/compatibility context. Он не считается текущим месяцем жизни до commit.

На один save допускается один active draft. Active draft может быть resumed, migrated поддерживаемым способом, abandoned либо открыт в recovery flow.

## Derived data

Неавторитетны и могут быть перестроены:

- UI read models;
- search indexes;
- cached summaries;
- chart points;
- thumbnails;
- local content preview caches;
- Storybook/test fixtures, даже если они построены из save schema.

Derived data не используется как единственный вход MonthRun.

## Revision и idempotency

- Committed save revision увеличивается один раз на успешный authoritative transaction/Month commit согласно operation policy.
- MonthRun draft имеет отдельную `runRevision`.
- Mutating commands передают expected revision и request/idempotency ID.
- Conflict не перезаписывается молча.
- Повтор committed MonthRun ID не применяет месяц повторно.
- Crash после commit до draft cleanup восстанавливается через committed marker.

Не каждое внутреннее техническое обновление read cache обязано увеличивать authoritative save revision.

## Save slots

Поддерживаются несколько независимых сейвов. Autosave является защищённой committed revision/slot policy, а не единственной незащищённой копией.

Рекомендуется:

- manual slots;
- current autosave;
- несколько rolling previous revisions/backups;
- pre-migration/pre-update backup;
- read-only import preview до замены/создания slot.

## Integrity при открытии

Проверяются:

1. file/envelope readability;
2. SQLite version и required pragmas;
3. save schema/migration version;
4. foreign keys;
5. rules/content/mod compatibility;
6. Determinism Manifest support;
7. active pending draft/committed marker consistency;
8. critical application invariants;
9. health/recovery flags.

`quick_check` применяется по recovery/backup/open policy, а полный `integrity_check` — только в diagnostics/recovery из-за стоимости.

## Write protocol

Authoritative write выполняется только Rust persistence service:

- typed DTO validation;
- expected revision/idempotency check;
- explicit SQLite transaction;
- snapshot/history consistency;
- checked integer conversions;
- commit/rollback;
- durable result/error mapping.

Renderer не получает raw SQL execute capability.

## Compatibility

Старый сейв открывается только через поддерживаемую migration chain. Новая версия не должна молча:

- удалять неизвестные IDs;
- продолжать несовместимый MonthRun;
- менять numeric scale/RNG/effect order;
- сбрасывать отсутствующий mod content;
- переписывать history без migration record.

При невозможности writable migration предлагаются recovery, exact compatible version либо read-only export.