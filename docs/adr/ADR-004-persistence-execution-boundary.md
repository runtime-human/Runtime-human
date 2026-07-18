---
title: "ADR-004: Граница выполнения persistence"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-004: Граница выполнения persistence

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и синхронизация архитектурного канона

## Контекст

Прямой SQL из WebView через общий plugin API оставляет архитектурную границу только соглашением и увеличивает последствия XSS, ошибки permissions или нарушения package boundaries.

## Решение

Авторитетные операции записи, migrations, backup, restore, import/export и mod ingest выполняются Rust adapter через узкие typed Tauri commands. Renderer не получает raw SQL execute capability.

Game Core остаётся на TypeScript и передаёт рассчитанный результат application слою. Rust не содержит баланс, события и исторические правила.

`tauri-plugin-sql` не используется production main window для authoritative writes. Read-only debug surface допускается только отдельным development capability и не входит в release profile без отдельного review.

## Последствия

Плюсы:

- технически обеспеченная граница;
- единая transaction policy;
- безопасная работа с `i64`;
- централизованный recovery;
- меньшая поверхность permissions;
- проще синхронизировать migrations, backup и future mod/import flows.

Минусы:

- больше Rust DTO/contract tests;
- два языка в persistence flow;
- требуется аккуратная IPC schema;
- prototype должен подтвердить приемлемый developer workflow.

## Альтернативы

1. `tauri-plugin-sql` только в отдельном TS package и architecture lint — отклонено как недостаточно сильная trust boundary.
2. Полностью Rust game core — отклонено как лишняя сложность.

## Implementation gate

До vertical slice должны существовать:

- typed save/load/month commands;
- Rust repository tests;
- IPC schema validation;
- capability test, подтверждающий отсутствие SQL execute у main window;
- migration/backup integration fixture.