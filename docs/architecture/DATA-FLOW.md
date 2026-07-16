# Потоки данных

## Новый сейв

```text
UI form
→ CreateCharacterCommand
→ application validation
→ core factory
→ initial content resolution
→ Rust persistence transaction
→ SaveSummary read model
→ UI
```

## Начало месяца

```text
UI month plan
→ BeginMonthCommand
→ load SaveGameState + content fingerprint
→ validate revision and compatibility
→ deterministic MonthRunner
→ completed result OR pending decision
```

При pending decision создаётся `pending_month_run`; основной сейв не изменяется.

## Продолжение месяца

```text
Choice in UI
→ ResumeMonthCommand
→ load draft
→ verify draft revision/content/rules
→ apply decision
→ continue deterministic pipeline
```

## Commit месяца

```text
completed MonthRun
→ invariant validation
→ BEGIN IMMEDIATE
→ compare save revision
→ write normalized snapshot
→ append histories and ledger
→ delete pending draft
→ increment revision
→ COMMIT
```

## Контент

```text
JSONC source
→ parse with locations
→ TypeBox/Ajv schema validation
→ semantic validation
→ chronology and reference validation
→ immutable compiled registry
→ content fingerprint
```

## Backup

```text
application request
→ block conflicting operations
→ SQLite consistent backup
→ integrity check
→ checksum
→ atomic rename
→ retention cleanup
```

## UI data

UI получает read models, а не доменные mutable entities и не SQL rows. View model может агрегировать данные, но не вычислять авторитетные игровые эффекты.

## Ошибки

Ошибки проходят через typed taxonomy:

- validation;
- compatibility;
- conflict;
- persistence;
- content;
- platform;
- unexpected.

Пользователь получает безопасное сообщение и recovery action; диагностические детали остаются в redacted logs.