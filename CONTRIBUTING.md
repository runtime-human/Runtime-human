# Contributing

Проект приватный и разрабатывается через небольшие проверяемые изменения.

## Перед работой

1. Прочитать `AGENTS.md`.
2. Найти relevant ADR и профильную спецификацию через `docs/INDEX.md`.
3. Создать отдельную branch/worktree.

## Pull request

PR должен содержать scope, affected contracts, verification evidence, migration/content impact и risks.

## Обязательный ADR

Новый ADR требуется для изменения календаря, географии, backend/distribution model, persistence boundary, deterministic primitives, save consistency, content API и других системных решений.

## Sensitive changes

Human review обязателен для workflows, capabilities, migrations, updater/signing, canonical historical dates, licenses и destructive content ID changes.

## Завершение

Не заявлять completion без фактически выполненных checks. Документация, schemas, tests и implementation обновляются синхронно.