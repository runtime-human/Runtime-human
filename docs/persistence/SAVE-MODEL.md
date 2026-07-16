# Модель сохранения

## Авторитетная структура

```text
current normalized snapshot
+ append-only histories
+ finance ledger
+ pending month draft
+ rolling backups
```

Полное event sourcing не используется: текущий state не восстанавливается воспроизведением всей жизни.

## Save metadata

- save ID;
- display name;
- created/updated timestamps инфраструктуры;
- game date и MonthIndex;
- save schema version;
- rules version;
- content fingerprint;
- determinism manifest;
- revision;
- checksum/health state.

System timestamps не влияют на игровой outcome.

## Normalized snapshot

Таблицы хранят character, people, relationships, employment, activities, projects, products, company, inventory, housing, finance, world и narrative state.

## История

Append-only records:

- life months;
- event history;
- career history;
- releases;
- achievements;
- relationship milestones;
- finance ledger.

История используется для журнала и аналитики, но не является единственным источником текущего state.

## Derived data

Read models, search indexes, cached summaries и thumbnails неавторитетны и могут быть перестроены.

## Revision

Каждый успешный write transaction увеличивает revision. Commands передают expected revision; конфликт не перезаписывается молча.

## Save slots

Поддерживаются несколько независимых сейвов. Autosave является обычным slot revision, а не отдельной незащищённой копией.

## Integrity

При открытии проверяются schema/version, foreign keys, content compatibility и pending draft. Глубокий integrity check запускается в recovery/diagnostics, а не на каждом старте.