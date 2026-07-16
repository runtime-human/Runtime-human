# Миграции

## Версии

Отдельно versioned:

- database schema;
- save envelope;
- game rules;
- content API;
- content pack revisions.

Одна версия приложения может поддерживать несколько старых save schema через последовательные migrations.

## Правила migration

- migration immutable после публичного релиза;
- каждая migration имеет forward test;
- destructive step требует предварительного backup;
- migration выполняется в transaction, если SQLite позволяет;
- after-check включает foreign keys и semantic invariants;
- rollback приложения не обязан уметь читать новый schema; это явно показывается пользователю.

## Corpus

В репозитории хранятся anonymized/synthetic fixtures всех поддерживаемых save versions. CI мигрирует каждый fixture до current schema и сравнивает ожидаемые invariants.

## Content migrations

Stable content IDs не переиспользуются. Renames используют alias/replacement mapping. Активные event chains и projects проходят отдельную migration.

## Failure

При ошибке:

1. основной файл не заменяется;
2. сохраняется pre-migration backup;
3. приложение входит в Safe Mode;
4. пользователь может экспортировать диагностику;
5. автоматический повтор не выполняется бесконечно.

## Human review

Любые изменения `migrations/**`, save compatibility matrix и destructive transforms требуют human review и отдельного раздела в PR.