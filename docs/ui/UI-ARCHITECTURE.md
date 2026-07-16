# UI Architecture

Нормативное решение по UI workshop: [ADR-012](../adr/ADR-012-storybook-ui-content-workshop.md).

Нормативная продуктовая иерархия: [Programmer-First Design](../game-design/PROGRAMMER-FIRST-DESIGN.md).

## Принцип

React UI отображает read models и отправляет typed commands. Он не является источником истины, не содержит authoritative игровые формулы и не обращается к raw SQL/platform implementation.

Информационная архитектура должна сразу сообщать, что Runtime Human — симулятор развития программиста. Финансы, здоровье, отношения и события показываются как значимые ограничения и самостоятельные ценности, но не получают визуальный приоритет над skills, technologies, projects, grade readiness и professional focus.

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

## Главная информационная иерархия

1. текущий professional focus;
2. активное обучение и technology proficiency;
3. текущие задачи/проекты и качество результата;
4. grade readiness и следующий полезный тип evidence;
5. commitments/load forecast;
6. критические health/finance/relationship constraints;
7. история, era context и philosophy по запросу.

Главный экран не является KPI-dashboard. Он показывает небольшое число приоритетных объектов с progressive disclosure.

## Screens и порядок навигации

1. **Today/Life Screen** — текущий месяц, professional focus, commitments, ближайший technical milestone, warnings и `Следующий месяц`.
2. **Skills & Technologies** — capabilities, skill graph, technology lifecycle, transfer и learning options.
3. **Projects** — текущие задачи, quality/debt/bugs, milestones, releases и portfolio.
4. **Career** — grade readiness, job, vacancies, interviews, promotion и path choices.
5. **Open Source/Public Work** — после открытия соответствующих систем.
6. **Company** — после открытия founder/CTO path.
7. **Life** — health, relationships, housing, equipment и finance.
8. **Journal/History** — события, evidence, decisions, delayed consequences и legacy.
9. **Settings/Saves/Diagnostics/Recovery**.

Экран `Life` не является стартовым generic dashboard с равноправными плитками всех систем. Он композиционно подчинён текущему professional journey.

## Today/Life Screen

Всегда видны:

- дата, возраст и жизненный этап;
- professional focus;
- active learning;
- active work/project commitments;
- ближайший technical milestone;
- compact grade-readiness statement;
- load forecast;
- critical warnings;
- unresolved blocking decision;
- `Следующий месяц`.

По запросу раскрываются:

- work-unit forecast;
- context switching;
- detailed evidence gaps;
- finance breakdown;
- relationship/health detail;
- exact change history.

## Skills & Technologies

Базовый режим использует capability language:

- «может находить причину простых ошибок»;
- «самостоятельно завершает небольшие задачи»;
- «готов владеть feature end-to-end».

Advanced detail показывает:

- skill families;
- mastery/fluency/familiarity;
- technology families;
- transfer;
- lifecycle stage;
- evidence sources;
- grade-readiness contribution.

UI не показывает Tier C technology tags как отдельные collectible bars.

## Grade Readiness

Обычный режим не раскрывает точные 0–1000 scores. Он показывает:

- текущую подтверждённую способность;
- сильные dimensions;
- недостающий тип evidence;
- примеры подходящих задач;
- причины, почему promotion и grade могут различаться.

Advanced/debug режим может показывать numeric breakdown и source trace.

## Professional forecast

Перед MonthRun forecast показывает:

- mandatory commitments;
- ожидаемый диапазон доступных work units;
- active learning/project allocations, сформированные policy;
- conflicts;
- context-switching risk;
- вероятный skill/technology progress;
- milestone/deadline risk;
- fatigue/burnout warning;
- какие активности будут частичными, замороженными или вытесненными.

Forecast не является percentage slider и не требует ручного распределения каждого дня.

## Commands

UI отправляет typed commands и обрабатывает pending/success/error. Double submit блокируется request ID/idempotency policy.

Компонент не вызывает Tauri command напрямую, если операция может быть выражена application facade. Platform-specific dialog/window operation инкапсулируется отдельным typed adapter.

## Month transition

При MonthRun UI показывает фазовый прогресс только если операция заметна. Внутреннее число шагов не является стабильным gameplay/API contract.

Blocking event получает focused scene/dialog с:

- корректным focus trap;
- доступным названием/описанием;
- category/product-layer context без технических внутренних IDs;
- keyboard choices;
- disabled reason;
- forecast consequences;
- безопасным закрытием приложения после durable checkpoint;
- recovery state при несовместимом/повреждённом draft.

После resume UI использует новую run revision и не повторяет уже применённый answer.

## Monthly Report

Порядок разделов:

1. **Что изменилось в вас как в программисте**;
2. **Работа и проекты**;
3. **Professional Evidence и grade readiness**;
4. **Новые технологии и возможности**;
5. **Нагрузка, здоровье и отношения**;
6. **Деньги**;
7. **События, история и delayed consequences**.

Каждое значимое изменение содержит:

- что изменилось;
- почему;
- какой source/task/event это вызвал;
- временно ли изменение;
- что игрок может сделать дальше.

`Before/after` используется для крупных изменений. Мелкие изменения группируются и не создают визуальный шум.

## Warning severity

- **Info:** новая возможность или некритичное изменение.
- **Notice:** заметный trade-off или approaching threshold.
- **Warning:** высока вероятность неполного результата, deadline miss, debt или fatigue.
- **Critical:** MonthRun может создать тяжёлое последствие, soft-lock risk или требует blocking decision.

Severity не передаётся только цветом. Текст формулирует cause и recovery path.

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

## Storybook story groups

### Foundation

- Typography/Russian Long Text;
- Color/High Contrast;
- Spacing/Layout/200% Scale;
- Focus/Keyboard;
- Reduced Motion;
- Icons and Semantic Status.

### Programmer Core

- Professional Focus Card;
- Skill Capability Summary;
- Skill Detail/Mastery-Fluency;
- Technology Lifecycle Card;
- Transfer Preview;
- Grade Readiness Summary;
- Evidence Timeline;
- Learning Activity Card;
- Technical Task/Trade-off Card.

### Projects and Career

- Project Overview;
- Quality/Debt/Bugs;
- Milestone/Release;
- Vacancy Comparison;
- Interview Outcome Explanation;
- Promotion Review;
- Career Path Matrix.

### Month Loop

- Pre-Month Forecast;
- Commitment Conflict;
- Context Switching Warning;
- Blocking Decision;
- Suspended Month Recovery;
- Monthly Report Programmer-First;
- Quiet Month;
- Professional Stagnation Explanation.

### Life Layer

- Health/Fatigue Warning;
- Relationship Commitment;
- Finance Constraint;
- Housing/Equipment Access;
- Crisis and Recovery.

### Edge and Accessibility

- Empty/Loading/Error;
- Very Long Russian Text;
- 200% Text Scale;
- High Contrast;
- Reduced Motion;
- Keyboard-Only;
- Narrator Labels;
- Large Evidence History;
- Conflicting Warnings;
- Save/Recovery/Safe Mode.

## Usability tests

### Novice comprehension

Пользователь без опыта программирования должен за 10 минут:

- понять текущую цель;
- выбрать обучение;
- объяснить, почему навык вырос;
- отличить skill от technology;
- понять, что grade не равен должности;
- найти следующий разумный шаг.

### Expert credibility

Разработчик должен:

- признать различие mastery, fluency, technology familiarity и evidence;
- увидеть реальные engineering trade-offs;
- не воспринимать систему как набор бессмысленных XP bars;
- понять, почему новая технология не всегда оптимальна;
- найти advanced details без перегрузки основного экрана.

### Month-loop clarity

Пользователь должен до подтверждения месяца:

- назвать главные commitments;
- увидеть conflict/load risk;
- предсказать, какие активности будут частичными;
- понять, когда система действует автоматически;
- понять причину blocking event и последствия выбора.

### Report causality

После месяца пользователь должен правильно ответить:

- что изменилось в профессиональном развитии;
- почему;
- что является временным;
- какой следующий тип evidence полезен;
- какое life constraint повлияло на результат.

## Component contract

Reusable component:

- принимает минимальный immutable props/read model;
- сообщает intent через callback/typed command descriptor;
- не знает persistence/entity repositories;
- имеет stable accessible names;
- имеет canonical и edge stories;
- не скрывает critical error только в toast;
- не кодирует смысл только цветом;
- не требует drag-only interaction;
- не показывает authoritative formula, если read model может дать explanation.

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
- virtualization длинных журналов/evidence history;
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
- programmer-first hierarchy не нарушена;
- canonical/edge stories существуют;
- keyboard/focus behavior проверено;
- interaction/a11y tests проходят;
- layout-critical visual baseline reviewed;
- long RU text и 200% scale проверены;
- novice causality и advanced detail paths не конфликтуют;
- нет прямого platform/persistence access;
- relevant browser/desktop flow обновлён при изменении интеграции.
