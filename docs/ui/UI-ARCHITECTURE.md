# UI Architecture

Нормативное решение по UI workshop: [ADR-012](../adr/ADR-012-storybook-ui-content-workshop.md).

## Принцип

React UI отображает read models и отправляет typed commands. Он не является источником истины, не содержит authoritative игровые формулы и не обращается к raw SQL/platform implementation.

## Слои UI

```text
routes/screens
→ feature compositions
→ game components
→ primitives/design tokens
```

Application facade является внешней границей UI. Components не получают mutable full `GameState`.

## State

- Durable authoritative state: persistence + application use cases.
- UI read models/query cache: application facade.
- Transient UI state: Zustand.
- Form state: локально в feature либо специализированный helper при доказанной необходимости.
- Storybook state: deterministic fixtures и in-memory mocks.
- Domain state не дублируется целиком в Zustand или Storybook decorators.

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
- settings/saves/diagnostics/recovery.

## Commands

UI отправляет typed commands и обрабатывает pending/success/error. Double submit блокируется request ID/idempotency policy.

Компонент не вызывает Tauri command напрямую, если операция может быть выражена application facade. Platform-specific dialog/window operation инкапсулируется отдельным typed adapter.

## Month transition

При MonthRun UI показывает фазовый прогресс только если операция заметна. Внутреннее число шагов не является стабильным gameplay/API contract.

Blocking event получает focused scene/dialog с:

- корректным focus trap;
- доступным названием/описанием;
- keyboard choices;
- disabled reason;
- безопасным закрытием приложения после durable checkpoint;
- recovery state при несовместимом/повреждённом draft.

После resume UI использует новую run revision и не повторяет уже применённый answer.

## Storybook

Storybook 10 вводится с Foundation как:

- component workshop;
- design-system documentation;
- library редких UI states;
- event/decision/content preview;
- interaction/a11y test surface;
- visual baseline source;
- bug fixture registry;
- контролируемый контекст для UI-агентов.

Stories строятся на public component/read-model contracts и `game-ui-fixtures`.

Storybook запрещено:

- загружать production save;
- вызывать raw Tauri/SQL/filesystem/updater APIs;
- зависеть от wall clock/network;
- получать release secrets/capabilities.

Platform behavior заменяется typed mocks. Storybook MCP допускается только development-only после security review.

## Component contract

Reusable component:

- принимает минимальный immutable props/read model;
- сообщает intent через callback/typed command descriptor;
- не знает persistence/entity repositories;
- имеет stable accessible names;
- имеет canonical и edge stories;
- не скрывает critical error только в toast;
- не кодирует смысл только цветом;
- не требует drag-only interaction.

## Error boundaries

Route/feature boundaries изолируют сбой графика или вторичной панели. Ошибка authoritative command выводит recovery action и не маскируется toast.

Категории UI error:

- validation;
- conflict/stale revision;
- unavailable;
- incompatible;
- recovery required;
- cancelled;
- internal.

Internal details не показывают private path/secrets. Diagnostic export выполняется явно.

## Accessibility

Норматив: WCAG 2.2 AA насколько применимо к desktop WebView.

Обязательны:

- keyboard-only flow;
- visible/non-obscured focus;
- focus restore после dialog;
- Narrator labels/status announcements;
- 200% text scale/reflow;
- high contrast;
- reduced motion;
- target sizes;
- alternatives to drag;
- long Russian/localized text fixtures.

Storybook a11y automation дополняет, но не заменяет ручной Narrator review критических flows.

## Performance

- route-level lazy loading;
- virtualization длинных журналов;
- memoization только после профилирования;
- тяжёлые balance/content tools вне production renderer;
- отсутствие неограниченных re-renders полного GameState;
- Storybook fixtures bounded и не маскируют performance реальных больших списков;
- UI long task >50 мс исследуется; pure CPU MonthRun при необходимости переносится в Worker без изменения core API.

## Testing matrix

- Storybook + Vitest addon: isolated render/interactions/a11y;
- Testing Library: focused component/application behavior;
- Playwright: routes, compositions, visual regression, keyboard/accessibility с mocks;
- WebdriverIO Tauri: настоящий executable, IPC, SQLite, dialogs и lifecycle.

Компоненты ищутся в тестах через roles/names, а не CSS implementation selectors. Visual baselines создаются в фиксированной среде и не обновляются автоматически без review.

## Definition of Done

UI change готово, когда:

- read-model/command contract типизирован;
- canonical/edge stories существуют;
- keyboard/focus behavior проверено;
- interaction/a11y tests проходят;
- layout-critical visual baseline reviewed;
- long RU text и 200% scale проверены;
- нет прямого platform/persistence access;
- relevant browser/desktop flow обновлён при изменении интеграции.