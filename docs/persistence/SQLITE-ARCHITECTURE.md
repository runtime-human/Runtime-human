# SQLite architecture

## Baseline pragmas

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Pragmas применяются и проверяются при открытии базы. Версия встроенного SQLite фиксируется и диагностируется.

## Connections

- один управляемый writer;
- короткоживущие reads либо контролируемый read pool;
- никаких long-running UI transactions;
- Month commit, migration, backup и restore взаимно исключаются.

## Transaction policy

Авторитетная запись использует явную transaction boundary. Запрещены частичные writes из UI callbacks.

## Schema

- primary keys — stable typed IDs;
- foreign keys включены;
- индексы создаются под доказанные query paths;
- JSON используется только для bounded/versioned payloads, а не вместо всей схемы;
- large immutable traces могут храниться compressed blob после определения limits.

## Query policy

SQL хранится внутри persistence adapter. Все statements параметризованы. Dynamic identifiers строятся только из allowlist.

## Maintenance

- `PRAGMA optimize` после migrations и периодически по безопасной policy;
- `foreign_key_check` после migration/restore;
- `quick_check` для backup verification;
- WAL checkpoint управляется приложением при backup/shutdown, но не блокирует обычный UI без причины.

## Performance tests

Тестируются:

- save/load после 1000+ месяцев;
- large event history;
- migration corpus;
- concurrent read during write;
- interruption before commit;
- WAL recovery;
- indexes через query plan snapshots для критических запросов.