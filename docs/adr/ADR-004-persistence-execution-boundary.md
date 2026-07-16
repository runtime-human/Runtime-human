# ADR-004: Граница выполнения persistence

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

Прямой SQL из WebView через общий plugin API оставляет архитектурную границу только соглашением и увеличивает последствия XSS/ошибки permissions.

## Предлагаемое решение

Авторитетные операции записи, migrations, backup, restore и import/export выполняются Rust adapter через узкие typed Tauri commands. Renderer не получает raw SQL capability.

Game Core остаётся на TypeScript и передаёт рассчитанный результат application слою. Rust не содержит баланс и события.

## Последствия

Плюсы:

- технически обеспеченная граница;
- единая transaction policy;
- безопасная работа с `i64`;
- централизованный recovery;
- меньшая поверхность permissions.

Минусы:

- больше Rust DTO/contract tests;
- два языка в persistence flow;
- требуется аккуратная IPC schema.

## Альтернативы

1. `tauri-plugin-sql` только в отдельном TS package и architecture lint — проще, но слабее trust boundary.
2. Полностью Rust game core — отклонено как лишняя сложность.

## Критерий принятия

Prototype должен подтвердить, что typed Rust repository не создаёт заметного торможения agent workflow и покрывается contract tests.