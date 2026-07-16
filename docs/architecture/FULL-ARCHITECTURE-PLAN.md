# Runtime Human — полный архитектурный план

> **Статус:** целевая архитектура проекта
> **Редакция:** 1.2
> **Дата:** 2026-07-16
> **Источник истины:** приватный репозиторий `MrFr3di/Runtime-human`

## 1. Назначение

Runtime Human — бесплатный PC-first offline-first симулятор жизни и карьеры программиста. Документ задаёт продуктовый канон, архитектурные границы, доменную модель, форматы контента, правила сохранений, тестирования, безопасности и агентной разработки.

Специализированные документы в соседних каталогах уточняют отдельные подсистемы. Принятые ADR имеют приоритет над этим планом.

## 2. Зафиксированный продуктовый канон

- Канонический старт: январь 1990 года, персонажу 12 лет.
- Календарь: реальный григорианский.
- Один пользовательский тик: один месяц.
- Внутри месяца симуляция проходит по дням и целочисленным work units.
- Универсальных очков действий нет.
- Покупки и управленческие операции не расходуют месячный ход.
- Ограничения являются предметными: деньги, календарь, здоровье, внимание, длительность, оборудование и сотрудники.
- Основное место действия — один фиксированный вымышленный международный мегаполис в неназванной стране.
- Постоянных переездов между городами и странами нет; поездки существуют как ограниченные события.
- Реальными остаются языки, фреймворки, runtimes, стандарты и подтверждённые технологические вехи.
- Работодатели, университеты, конференции, магазины, NPC, локальная экономика и бизнес-события вымышлены.
- После июля 2026 года начинается явно обозначенная альтернативная будущая эпоха.
- Игра бесплатная, без Steam, магазинов, платежей, рекламы и обязательного backend.

## 3. Игровая формула

```text
постоянно продолжающаяся жизнь
+ свободные мгновенные решения
+ длительные занятия и проекты
+ мягкие естественные ограничения
+ события и последствия
+ переход к следующему месяцу
```

Постоянные обязательства — работа, учёба, жильё, семья, продукт, open source, кредит, компания — исполняются автоматически. Игрок вмешивается через решения, приоритеты, запуск занятий и реакцию на события.

## 4. Основные игровые направления

Архитектура должна поддерживать:

- детство, школу, образование и взросление;
- навыки, технологии и специализации;
- грейды Beginner, Intern, Junior, Middle, Senior, Top Programmer;
- должности Developer, Team Lead, Tech Lead, Architect, CTO, Founder;
- работу, вакансии, собеседования и карьерные кризисы;
- фриланс;
- личные проекты, SaaS и программные продукты;
- open source, contributors, governance, sponsorship и community;
- статьи, конференции, славу и профессиональную репутацию;
- жильё внутри одного города, аренду, ипотеку и домашний офис;
- компьютеры, периферию, home lab и локальный AI;
- отношения, семью, здоровье, настроение, fatigue и burnout risk;
- компанию, сотрудников, делегирование и продуктовый портфель;
- позднюю карьеру, пенсию, наследие и завершение жизни.

## 5. Архитектурный стиль

```text
React UI
  ↓
Application Facade / Use Cases
  ↓
Pure TypeScript Game Core
  ↓ ports
Persistence and Platform Adapters
  ↓
Tauri / Rust / SQLite / filesystem
```

### 5.1. Жёсткие границы

- `game-core` не импортирует React, Zustand, Tauri, DOM, SQLite, filesystem, network и системное время.
- React-компоненты не содержат игровых формул и не выполняют SQL.
- Rust не содержит баланс, события, карьерные правила и content IDs.
- Контент не исполняет JavaScript или Rust.
- Системное время не используется в симуляции.
- Случайность проходит только через versioned seeded `RandomSource`.
- Полный `SaveGameState` является consistency boundary завершённого месяца.
- Приостановленный месяц хранится отдельным draft и не изменяет основной сейв.

## 6. Целевая структура monorepo

```text
apps/
  desktop/
  content-studio/            # после вертикальной версии
packages/
  shared-kernel/
  game-schema/
  game-core/
  game-application/
  game-content/
  game-persistence-contracts/
  game-platform-contracts/
  game-ui/
content/
  events/
  technologies/
  products/
  companies/
  equipment/
  housing/
  conferences/
  localization/
  history/
tools/
  content-validator/
  content-compiler/
  balance-simulator/
  save-inspector/
  screenshot-runner/
docs/
```

## 7. Доменная модель

`SaveGameState` включает:

- `CharacterState`;
- `PersonState` и отношения;
- `EmploymentState`;
- `ActivityState`;
- `ProjectState`;
- `ProductState`;
- `OpenSourceState`;
- `CompanyState`;
- `InventoryState`;
- `HousingState`;
- `FinanceState`;
- `HomeCityState`;
- `WorldTimelineState`;
- `NarrativeState`;
- `AchievementState`.

Состояние хранится нормализованно, но переход месяца проверяет межмодульные invariants на уровне полного GameState.

## 8. Модель времени

Движок хранит:

```ts
type GameDate = Readonly<{ year: number; month: number; day: number }>;
type MonthIndex = number; // 0 = январь 1990
```

Календарь реализуется собственным чистым сервисом Gregorian Calendar. Он поддерживает длину месяца, високосные годы и дни недели, но не зависит от timezone и DST.

## 9. Месячная симуляция

Состояния запуска:

```text
ready → running → suspended-for-decision → running → completed → committed
```

Дополнительные состояния: `failed`, `incompatible-after-update`, `recovery-required`.

Основные use cases:

```ts
beginMonth(command): MonthRunResult;
resumeMonth(command): MonthRunResult;
abandonMonthDraft(command): Result;
recoverMonthRun(command): MonthRunResult;
```

Pipeline:

1. загрузить и проверить сейв;
2. создать deterministic context;
3. применить постоянные обязательства;
4. распределить доступное время по активностям;
5. обновить работу, проекты, продукты и отношения;
6. обновить рынок и городскую эпоху;
7. сформировать event candidates;
8. применить Narrative Director;
9. остановиться на blocking decision либо завершить месяц;
10. проверить invariants;
11. записать итог одной транзакцией.

## 10. Event Engine и Narrative Director

Event Engine отвечает за условия, веса, cooldown, выбор, варианты решений, эффекты, delayed effects и цепочки.

Narrative Director отвечает за pacing:

- бюджет blocking events;
- anti-repeat и anti-streak;
- разнообразие категорий и NPC;
- эмоциональную интенсивность;
- тихие месяцы;
- приоритет незавершённых сюжетных арок;
- milestone events.

События data-driven, хранятся в JSONC и проходят schema validation, semantic validation и chronology validation.

## 11. Исторический каталог

Для технологии различаются:

- announcement;
- first public release;
- local availability;
- professional demand;
- mainstream adoption;
- peak;
- decline;
- end of support.

Каждая каноническая дата имеет `sourceRefs` и confidence level. Исторический факт не берётся из памяти агента без проверки.

## 12. Один вымышленный мегаполис

Город развивается по эпохам:

1. 1990–1994 — домашние компьютеры, кружки, клубы, журналы;
2. 1995–2001 — Web, ISP, web-студии и dot-com рост;
3. 2002–2006 — профессионализация и сообщества;
4. 2007–2012 — mobile, SaaS, cloud и стартапы;
5. 2013–2019 — DevOps, containers, mature open source;
6. 2020–2026 — remote work, generative AI и coding agents;
7. после 2026-07 — альтернативная будущая история.

Не создаются CountrySimulation, VisaSystem, ImmigrationSystem, RelocationSystem и RegionalTaxEngine.

## 13. Числовая модель

- Деньги в TypeScript: `bigint` minor units.
- Деньги в Rust/SQLite: signed `i64`.
- IPC передаёт деньги десятичной строкой.
- Проценты: basis points.
- Вероятности: целые parts per million.
- Прогресс: целые work units и XP.
- Авторитетные формулы не используют floating point.
- Любая операция с деньгами проверяет overflow.

## 14. Детерминированность

В сейве хранится `DeterminismManifest`:

```ts
type DeterminismManifest = Readonly<{
  rulesVersion: string;
  rngAlgorithm: string;
  hashAlgorithm: 'sha256-v1';
  numericModel: 'fixed-point-v1';
  calendarModel: 'gregorian-v1';
  candidateSort: 'stable-id-ascending-v1';
}>;
```

Кандидаты событий сортируются по stable ID до случайного выбора. Запрещены `Math.random`, системный `Date`, порядок файловой системы и locale-dependent сортировка в домене.

## 15. Persistence

Авторитетная модель:

```text
current normalized snapshot
+ append-only history
+ pending month draft
+ rolling backups
```

Полное event sourcing не применяется.

SQLite использует WAL, foreign keys, busy timeout и атомарные транзакции. Backup создаётся через SQLite Backup API или другой согласованный snapshot, а не копированием активной базы вместе с WAL.

Предпочтительная граница: авторитетные операции SQLite выполняются Rust adapter. TypeScript передаёт typed commands и DTO, но не raw SQL.

## 16. Контент

- Формат: JSONC.
- Схемы: TypeBox.
- Runtime validation: Ajv.
- Semantic validation: собственные валидаторы.
- ID стабильны и namespaced.
- Удалённые ID получают tombstone или replacement mapping.
- Моды не исполняют код и не могут по умолчанию заменять `core.*`.
- Любой исторический объект содержит provenance.

## 17. UI

Интерфейс PC-first и не должен выглядеть как CRM. Используются игровые карточки, журнал жизни, timeline, контекстные панели и месячный отчёт.

Стек:

- React 19;
- Tailwind CSS 4;
- Radix UI primitives;
- Motion;
- TanStack Router;
- Zustand только для transient UI state;
- Lucide для временных иконок.

Design System использует semantic tokens. Поддерживаются клавиатура, Narrator, 200% масштаб, reduced motion, high contrast и отсутствие drag-only действий.

## 18. Технологический стек

- Tauri 2;
- React 19;
- TypeScript 6 stable;
- Vite 8 / Rolldown / Oxc minifier;
- Node.js 24 LTS;
- pnpm workspace;
- SQLite;
- Oxlint без type-aware как blocking lint;
- Oxfmt;
- Knip;
- Lefthook;
- Vitest;
- Testing Library;
- fast-check;
- Playwright для browser renderer;
- WebdriverIO + Tauri service для настоящего desktop E2E;
- rustfmt, Clippy, cargo-deny, cargo-nextest и sccache.

Type-aware Oxlint/TypeScript-Go остаётся неблокирующей compatibility-проверкой до отдельного ADR о стабильном TypeScript 7.

## 19. Backend и сеть

В baseline отсутствуют backend, auth, cloud saves, remote config и обязательная сеть. Сетевой слой может появиться только за port interface и не должен менять чистое ядро.

## 20. Тестирование

Обязательны:

- unit tests игровых формул;
- property-based tests invariants;
- golden tests deterministic transitions;
- chronology tests;
- content schema и semantic tests;
- SQLite migration/backup/recovery tests;
- React component tests;
- Playwright visual/accessibility tests;
- WebdriverIO desktop integration tests;
- architecture dependency tests;
- массовые симуляции баланса.

## 21. CI/CD

Fast checks:

```text
Oxfmt → Oxlint → tsc -b → content validation
```

Отдельные jobs:

- core tests и fast-check;
- UI и visual tests;
- Rust checks;
- dependency/security checks;
- release build только по tag или release workflow.

## 22. Дистрибуция

Игра бесплатная. Alpha распространяется через private GitHub Releases. Публичные сборки — подписанный NSIS per-user installer. Updater использует подписанные артефакты. Steam и магазины отсутствуют.

Обновление запрещено во время MonthRun, migration, backup, restore и импорта контента. Перед обновлением создаётся согласованный backup.

## 23. Работа ИИ-агентов

- `main` содержит согласованный канон.
- Существенные изменения выполняются через branch и PR.
- Изменение решения требует ADR.
- Агент не имеет доступа к release keys.
- Workflow, migrations, updater, signing и capabilities требуют human review.
- Агент обязан показать verification commands и результаты.
- Файлы должны быть небольшими и иметь одну ответственность.

## 24. Этапы реализации

### Phase 0 — Foundation

Monorepo, Tauri shell, schemas, deterministic core, SQLite adapter, CI и базовый UI kit.

### Phase 1 — Vertical Slice

Создание персонажа, январь 1990, обучение, первая техника, простой MonthRun, событие, отчёт и save/load.

### Phase 2 — Career

Вакансии, работа, навыки, проекты, зарплата, увольнение и повышение.

### Phase 3 — Products and Open Source

Личные проекты, релизы, community, contributors, статьи и конференции.

### Phase 4 — Life and Property

Жильё внутри города, техника, отношения, здоровье и семья.

### Phase 5 — Company

Сотрудники, делегирование, портфель продуктов, расходы и tycoon progression.

### Phase 6 — Endgame and Modding

Top Programmer, поздняя карьера, наследие, альтернативное будущее, Content Studio и безопасные моды.

## 25. Основные риски

- разрастание контента;
- UI как административная панель;
- нарушение чистых границ агентами;
- повреждение сейва;
- недетерминированные формулы;
- исторические ошибки;
- слишком раннее добавление зависимостей;
- отсутствие pacing у событий.

Риски контролируются ограничением географии, Narrative Director, schema-driven content, architecture tests, migration corpus и массовыми симуляциями.

## 26. Definition of Done архитектурной задачи

Задача завершена только когда:

- реализация соответствует ADR;
- границы зависимостей не нарушены;
- новые данные имеют schemas и provenance;
- тесты покрывают happy path и критические edge cases;
- миграции проверены на старых fixtures;
- документация синхронизирована;
- выполнена актуальная команда проверки;
- PR содержит доказательства проверки.
