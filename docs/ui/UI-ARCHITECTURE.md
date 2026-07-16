# UI Architecture

## Принцип

React UI отображает read models и отправляет commands. Он не является источником истины и не содержит авторитетные игровые формулы.

## Слои UI

```text
routes/screens
→ feature compositions
→ game components
→ primitives/design tokens
```

## State

- Server-like/local durable state: application facade/read models.
- Transient UI state: Zustand.
- Form state: локально в feature либо специализированный form helper при доказанной необходимости.
- Domain state не дублируется целиком в Zustand.

## Screens

- life/dashboard;
- career;
- skills/technologies;
- projects;
- open source;
- products/company;
- housing/equipment;
- relationships/health;
- journal/history;
- settings/saves/diagnostics.

## Commands

UI отправляет typed commands и обрабатывает pending/success/error. Double submit блокируется request ID/idempotency policy.

## Month transition

При MonthRun UI показывает прогресс только если операция заметна. Blocking event получает modal/focused scene с корректным focus management. Закрытие приложения допускается после сохранения draft.

## Error boundaries

Route/feature boundaries изолируют сбой графика или вторичной панели. Ошибка authoritative command выводит recovery action и не маскируется toast.

## Performance

- route-level lazy loading;
- virtualization длинных журналов;
- memoization только после профилирования;
- тяжёлые balance tools вне production renderer;
- отсутствие неограниченных re-renders полного GameState.

## Testing

Компоненты тестируются через роли/имена, а не CSS selectors. Screens используют platform mocks; настоящий Tauri flow проверяется отдельно WebdriverIO.