# SQLite architecture

## Version gate

Минимальная допустимая версия SQLite:

```text
3.51.3+
```

Более старая версия допускается только при документированном подтверждении backport исправления WAL-reset defect. Версия встроенного SQLite проверяется при startup, записывается в diagnostics и входит в release verification.

## Baseline pragmas

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Pragmas применяются и проверяются при открытии базы. Несовпадение критического pragma считается ошибкой открытия, а не тихо игнорируется.

## Connections

- один управляемый writer в Rust persistence service;
- короткоживущие reads либо контролируемый read pool;
- никаких long-running UI transactions;
- Month commit, migration, backup, restore и mod/import activation взаимно исключаются;
- renderer не получает authoritative SQL execute capability.

## Transaction policy

Авторитетная запись использует явную transaction boundary и optimistic save revision. Запрещены частичные writes из UI callbacks.

Month commit атомарно:

1. проверяет base revision/run ID;
2. записывает normalized snapshot;
3. записывает histories/ledger;
4. увеличивает revision;
5. помечает MonthRun committed;
6. очищает pending draft безопасно и idempotent.

## Schema

- primary keys — stable typed IDs;
- foreign keys включены;
- индексы создаются под доказанные query paths;
- JSON используется только для bounded/versioned payloads, а не вместо всей схемы;
- large immutable traces могут храниться compressed blob после определения limits;
- schema version, rules version и content fingerprint не смешиваются в одно поле.

## Query policy

SQL хранится внутри Rust persistence adapter. Все statements параметризованы. Dynamic identifiers строятся только из allowlist.

Read projections могут иметь отдельные queries, но не становятся authoritative state.

## Backup

Согласованный backup создаётся через:

1. SQLite Online Backup API — предпочтительный путь;
2. `VACUUM INTO` — допустимый controlled export/compact path.

Запрещено считать обычное копирование активного `.db` достаточным backup protocol.

Backup workflow:

1. запретить competing migration/restore/month commit;
2. создать destination temp file;
3. выполнить Online Backup API/`VACUUM INTO`;
4. закрыть destination connection;
5. выполнить checksum;
6. открыть backup read-only;
7. запустить `quick_check` и при необходимости `foreign_key_check`;
8. атомарно переименовать;
9. применить retention policy.

Backup никогда не пишется поверх единственной предыдущей рабочей копии.

## Migration runbook

1. проверить SQLite version и save envelope;
2. создать pre-migration backup;
3. выполнить migration одной controlled transaction либо явно staged protocol;
4. выполнить `foreign_key_check`;
5. выполнить `quick_check`;
6. проверить application invariants;
7. записать migration history;
8. только после успеха открыть save writable.

При ошибке база не продолжает работу в неопределённом состоянии; запускается recovery/Safe Mode.

## Maintenance

- `PRAGMA optimize` после migrations и по контролируемой close/maintenance policy;
- `foreign_key_check` после migration/restore;
- `quick_check` для backup verification и recovery diagnostics;
- WAL checkpoint управляется приложением при backup/shutdown, но не блокирует обычный UI без причины;
- `integrity_check` используется только для recovery/diagnostics из-за стоимости.

## Corruption diagnostics

Diagnostic bundle содержит без пользовательских секретов:

- SQLite version;
- schema/migration version;
- selected pragmas;
- last successful backup metadata;
- quick/foreign-key check result;
- WAL/SHM presence metadata;
- last transaction/run ID;
- redacted error chain.

## Performance tests

Тестируются:

- save/load после 1000+ месяцев;
- large event history;
- migration corpus;
- concurrent read during write;
- interruption before commit;
- duplicate/idempotent commit;
- WAL recovery;
- backup/restore на крупном save;
- indexes через query plan snapshots для критических запросов.