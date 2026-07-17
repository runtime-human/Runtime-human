# Модель сохранения

Нормативные решения: [ADR-005](../adr/ADR-005-suspended-month-run.md), [ADR-010](../adr/ADR-010-authoritative-save-state.md) и [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md).

## Consistency boundary

`SaveGameState` является consistency boundary завершённого месяца. Данные внутри хранятся нормализованно по доменным модулям, но commit месяца изменяет их атомарно.

Professional provider outcome, professional state delta и evidence history всегда commit/rollback вместе.

## Авторитетная структура

```text
current normalized snapshot
+ append-only histories / finance ledger / professional evidence ledger
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
- professional state/evidence schema versions;
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

- character identity/life state;
- `CharacterProfessionalState`;
- skill mastery/fluency;
- technology familiarity/version recency;
- professional focus;
- awarded grades;
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

## Append-only history

Append-only records:

- life months;
- event/decision history;
- career history;
- project/product releases;
- achievements;
- relationship milestones;
- finance ledger;
- `ProfessionalEvidenceEvent`;
- `EvidenceClaim`;
- `MonthlyPracticeAggregate`;
- `ProfessionalGradeAward` history;
- committed MonthRun summary/trace reference;
- migration history.

История используется для журнала, auditability, diagnostics, readiness projections и balance analysis, но не является единственным источником текущего professional state.

Append-only означает отсутствие обычного редактирования gameplay history. Corruption repair/compaction/migration выполняется только versioned operation с записью причины и source hashes.

## Professional evidence storage

Evidence event хранит semantic snapshot:

- source/provider kind и stable source ID;
- context category/project/role snapshot;
- period;
- outcome;
- claims;
- assistance;
- anti-repeat key;
- content/rules/trace identifiers.

Удаление или обновление mod/content definition не удаляет evidence. Display использует актуальную локализацию, tombstone либо сохранённый fallback label.

Routine practice сворачивается помесячно и не создаёт запись на каждый день или commit.

## Authoritative и derived professional data

Authoritative:

- aptitude values;
- skill mastery/fluency;
- technology familiarity;
- professional focus;
- awarded grades;
- evidence/practice history.

Derived/rebuildable:

- demonstrated grade readiness;
- current market readiness;
- specialization profile;
- capability cards;
- evidence indexes/summaries;
- UI charts/reports.

Derived data не используется как единственный вход MonthRun. При отсутствии cache projection перестраивается из authoritative professional state/evidence.

## Pending MonthRun

Pending draft отделён от committed snapshot и содержит exact deterministic/compatibility context. Он не считается текущим месяцем жизни до commit.

Professional draft дополнительно содержит:

- provider outcome/episode checkpoints;
- professional delta;
- pending evidence IDs/claims;
- monthly practice accumulators;
- anti-repeat state;
- progression trace hash.

На один save допускается один active draft. Active draft может быть resumed, migrated поддерживаемым способом, abandoned либо открыт в recovery flow.

## Revision и idempotency

- Committed save revision увеличивается один раз на успешный authoritative transaction/Month commit.
- MonthRun draft имеет отдельную `runRevision`.
- Mutating commands передают expected revision и request/idempotency ID.
- Conflict не перезаписывается молча.
- Повтор committed MonthRun ID не применяет месяц повторно.
- Deterministic evidence ID предотвращает duplicate evidence после retry/restart.
- Crash после commit до draft cleanup восстанавливается через committed marker.

Не каждое внутреннее обновление readiness/search cache увеличивает authoritative save revision.

## Save slots и backups

Поддерживаются несколько независимых сейвов. Autosave является защищённой committed revision/slot policy, а не единственной незащищённой копией.

Рекомендуется:

- manual slots;
- current autosave;
- несколько rolling previous revisions/backups;
- pre-migration/pre-update backup;
- read-only import preview до замены/создания slot.

Backup всегда включает professional snapshot, evidence ledger и progression schema metadata.

## Integrity при открытии

Проверяются:

1. file/envelope readability;
2. SQLite version и required pragmas;
3. save/professional/evidence schema versions;
4. foreign keys;
5. rules/content/mod compatibility;
6. Determinism Manifest support;
7. active pending draft/committed marker consistency;
8. evidence source snapshot/claim validity;
9. duplicate evidence IDs;
10. awarded-grade history order/hash references;
11. critical application invariants;
12. health/recovery flags.

Readiness/specialization caches могут быть удалены и перестроены при несовпадении projection version.

`quick_check` применяется по recovery/backup/open policy, а полный `integrity_check` — только в diagnostics/recovery из-за стоимости.

## Write protocol

Authoritative write выполняется только Rust persistence service:

- typed DTO validation;
- expected revision/idempotency check;
- explicit SQLite transaction;
- snapshot/history/evidence consistency;
- checked integer conversions;
- unique evidence/run constraints;
- projection cache invalidation/update;
- commit/rollback;
- durable result/error mapping.

Renderer не получает raw SQL execute capability.

## Compatibility

Старый сейв открывается только через поддерживаемую migration chain. Новая версия не должна молча:

- удалять неизвестные IDs;
- продолжать несовместимый MonthRun;
- менять numeric scale/RNG/effect/progression order;
- пересчитывать awarded grade новой формулой без migration policy;
- превращать transfer в evidence;
- сбрасывать отсутствующий mod content;
- переписывать evidence/history без migration record.

При невозможности writable migration предлагаются recovery, exact compatible version либо read-only export.
