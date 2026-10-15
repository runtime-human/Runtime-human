---
title: "REF-02 January Decision Model Implementation Plan"
type: plan
status: draft
canon: true
depends_on: [ADR-015, ADR-016, ADR-020, ADR-021]
updated: 2026-10-15
---

# REF-02 January Decision Model Implementation Plan

Нормативный источник: [ADR-021](../adr/ADR-021-january-onboarding-decision-model-and-approach-cards.md). Этот план подчинён ADR и спецификациям; при расхождении приоритет у ADR (`docs/INDEX.md`, «Источник истины»).

План описывает порядок слайсов, а не расписание. Каждый слайс — отдельный PR, независимо проверяемый, с собственным rollback.

## 1. Цель

Перестроить январь 1990 до канонической структуры (ADR-021 §2):

```text
имя → стартовый background → inline learning mode → «Начать январь»
→ одно блокирующее решение (4 approach cards в ряд, select → «Подтвердить»)
→ результат с причинами
```

с маркерами последствий из контента, проверяемым отсутствием доминирования и без NPC/state bars, **не ломая воспроизведение January v1**.

## 2. Не входит в REF-02

Полный список — ADR-021 «Вне scope». Кратко: новый situation kernel по мотивам референса, NPC foundation и третий learning mode, общий `DecisionSurface` и MonthRun v2 как платформа, переименование существующего сейва, снятие v1, мульти-locale runtime.

## 3. Сквозные правила

1. **Legacy-guard.** Каждый слайс доказывает, что v1 не сдвинулся: golden-тесты v1 (`rulesFingerprint`, `accessCheckpointHash`, `learningCheckpointHash`, `defectCheckpointHash`, `completedCheckpointHash` из `docs/EXECUTION-STATUS.jsonc`), `fixtures/repro/january-1990-first-program.repro.json`, `fixtures/persistence/*`, `fixtures/balance/january-1990-bounded-trace-v1.json` остаются неизменными. Перегенерация v1 фикстур запрещена; если слайс «требует» её, это сигнал остановиться и пересмотреть решение (`AGENTS.md`: никогда не ослаблять guard).
2. **v1 balance и v1 content bytes не правятся на месте.** v2 добавляется рядом (ADR-021 §6, «Совместимость»).
3. **Texts and markers only from compiled content.** После REF-02B ни один player-facing текст решения не добавляется в React.
4. **Без NPC и state bars** (ADR-021 §7) в любом слайсе: компилятор отклоняет, UI не рисует.
5. **Скрытое состояние и «будущие поля» не добавляются** (`AGENTS.md`, hard boundaries): каждое новое authoritative поле слайс обосновывает текущим decision/consequence/consistency purpose.
6. **Docs и code меняются вместе**: слайс обновляет затронутые спецификации и `docs/EXECUTION-STATUS.jsonc` (ledger) в своём PR, а не в отдельном.
7. **Verification:** V0/V1 в цикле, V2 перед PR, V3 (`pnpm verify`) для authoritative merge evidence (`docs/engineering/VERIFICATION-TIERS.md`). Маршрутизация моделей/ревью — `pnpm studio:route`.
8. **Human review required:** REF-02C (save schema fingerprint, scenario artifact) и REF-02E (persistence/migration).

## 4. Порядок и зависимости

```text
REF-02A  v2 balance + validators ──► REF-02B  compiled approach content ──► REF-02C  scenario v2 + answers v2
                                                                                  │
                                                                                  ▼
                                                                     REF-02D  UI approach-card row

M1 = PROG-01B2C2 (ProfessionalState v2 / MonthRun v2 / v2 save schema; внешняя зависимость) ─┐
                                                                  REF-02D ─────┴─► REF-02E  имя персонажа
```

- A → B → C → D — строгая цепочка: каждая стадия потребляет типы и данные предыдущей.
- E зависит от D (экран новой игры) и от [M1](PROG-01B2C2-WRITABLE-PROFESSIONAL-MONTHRUN-V2-PLAN.md): **M1 определён в каноне** как PROG-01B2C2 «authoritative professional persistence / writable MonthRun v2» (см. [ROADMAP](ROADMAP.md)); он вводит v2 save schema слайсом C2a. REF-02E стартует после C2d (новая игра создаёт v2 save) и не меняет набор полей схемы. Открытые вопросы M1 (aptitudes, хранилище истории, `displayName` и #202–#203) — в §11 плана M1.
- v2 save schema вводится слайсом C2a milestone M1 (включая `character.displayName`, `null` до REF-02E); REF-02C использует её и не bump-ает (ADR-021 «Совместимость»: schema вводится один раз). Если REF-02C по какой-либо причине идёт раньше C2a, он обязан сначала согласовать с планом M1 единственную точку введения.
- REF-02D может начать Storybook-фикстуры и компоненты после того, как REF-02B зафиксировал `DecisionReadModel`; интеграция — после REF-02C.

## REF-02A — v2 balance: de-dominance и реальный upside у помощи

**Скилл/зона:** `runtime-balance`, зона `balance` (+ чистые функции в `core`).

### Scope

- Новое закрытое семейство v2 balance (имя решается в слайсе, например `approach-balance-v1`; `quality-balance-v1` имеет фиксированные ключи 2/2/3 и не расширяется) отдельными файлами рядом с v1: таблицы для `startBackground` (2), `learningMode` (2), `approach` (4) и факты outcome `delivery`, `participation`, quality.
- Дизайн-инварианты, которые таблицы обязаны выразить (числа — в слайсе, симуляцией):
  - `investigate-first`: больше самостоятельного опыта, но выпуск может сдвинуться;
  - `ask-for-help`: реальный upside `finish-chance` и learning, цена — `participation = assisted`;
  - `reduce-scope`: выпуск в срок, цена — известное ограничение и minor debt;
  - `defer-or-recover`: качество сохраняется, цена — выпуск переносится на февраль;
  - background меняет только `release-timing`/контекст (нет capability ceiling); обе опции жизнеспособны;
  - learning mode: `edit-and-debug` получает реальный риск (можно не закончить), `read-and-run` — меньше самостоятельной практики.
- Чистая детерминированная проекция «контекст → факты outcome» (`delivery`, `participation`, quality band) без RNG-побочных эффектов; resolution остаётся кодом (`ADR-016 §10`).
- Валидаторы: Pareto-anti-dominance по показываемым осям для каждого declared context (background × learning mode × realized defect); обязательный cost/unknown у каждого подхода; отсутствие capability ceiling по background; reachability каждого подхода.
- Обновление `docs/engineering/BALANCE-LAYER.md` (новая семья, правило «v1 frozen»).

### Файлы (ориентировочно)

- `balance/<family>/january-1990-v2.jsonc` (новые), `docs/engineering/BALANCE-LAYER.md`;
- `packages/game-authoring-schema/` (схема семьи, TypeBox), `packages/game-content-compiler/` (balance load/validate), `packages/game-core/src/january-1990/` (новый v2 balance модуль, **не** `january-balance.ts` v1);
- `scripts/` balance-check wiring при необходимости.

### Тесты и фикстуры

- Unit: валидаторы отклоняют синтетические доминирующие наборы (по одному failing-fixture на правило: доминирующий approach, approach без cost, ceiling по background, unreachable approach);
- `pnpm balance:check` покрывает v1 и v2; тест «v1 balance fingerprint неизменен» (golden);
- Симуляция по seeds (`gamectl simulate run`, расширение на v2-таблицы допустимо только в рамках слайса) показывает распределение `delivery`/`participation` по подходам; результат фиксируется как v2 bounded-trace fixture (`fixtures/balance/january-1990-v2-bounded-trace-v1.json`);
- Property test (fast-check): для любых допустимых таблиц валидатор и проекция согласованы.

### Acceptance

- ни один подход, background или learning mode не доминирует другой в любом declared context;
- `ask-for-help` статистически повышает finish-chance относительно `investigate-first` и всегда даёт `participation = assisted`;
- максимум quality и множество достижимых outcome classes не зависят от background;
- v1 fingerprints/fixtures байт-в-байт неизменны.

### Non-goals

Правка v1 balance; runtime-интеграция; тексты и маркеры; UI.

## REF-02B — Approach content в compiled content + dominance/truthfulness-валидаторы

**Скилл/зона:** `runtime-content`, зона `content` (+ `application` для read model).

### Scope

0. **Compatibility spike (первая задача слайса).** Определить, двигает ли добавление v2 content `contentFingerprint` v1 (required chunks `1990s/ecosystem`, `1990s/programming`). Результат фиксируется в слайсе одним из двух способов: v2 content в новом chunk/ID без изменения байтов v1 chunk (предпочтительно) либо точный versioned transform v1 guard с golden-fixture. Без доказательства слайс не мержится.
1. Расширить компилируемый контент `ProfessionalApproachOption { id, label, forecast, tradeOffs: { marker, text }[], availability }` (уточнение ADR-021 §4) и ситуацию `{ title, goal, problem, causes ≤ 2, stakes }`.
2. Контент стартового экрана: `startBackground` (2) и `learningMode` (2) с `forecast`, ≤2 маркерами и `defaultOptionId`.
3. Русская строковая таблица со стабильными `LocalizationKey` (один locale, без мульти-locale runtime).
4. Листинг D-lite: read-only исторически корректный GW-BASIC/DOS листинг с provenance и подсвеченной строкой для каждого `eventType` (`logic-error`, `syntax-error`); source review.
5. Компиляторные валидаторы:
   - ≤4 approach, ≤2 маркера на карточку, ≥1 cost/unknown маркер, закрытый словарь `axis × polarity`;
   - запрет цифр/процентов в player-facing тексте, названий навыков (реестр из `core.skill.*`) и лексикона NPC-ролей (закрытый реестр, ADR-021 §7);
   - ограничения длины label/line (long RU);
   - **truthfulness**: каждый маркер подтверждается предикатом REF-02A-проекции по всем declared contexts;
   - **dominance**: делегирует валидатору REF-02A на показываемых осях.
6. `game-application`: типизированный `DecisionReadModel` и парсер (по образцу `parseJanuary1990ResultSummary`): ситуация, 4 approach, start-config options; текст разрешается из compiled content по ключам, renderer ничего не вычисляет.

### Файлы (ориентировочно)

- `content/1990s/programming/**` (новые файлы/chunk по итогам spike; существующие v1 файлы не редактируются без доказательства), `packages/game-content/`, `packages/game-content-compiler/`, `packages/game-schema/` (content schema), `packages/game-application/src/january-1990/` (read model);
- `docs/content/PROFESSIONAL-SITUATION-CONTENT.md` (если контракт payload меняется), `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md` §7 (уже обновлён ADR-PR; слайс сверяет).

### Тесты и фикстуры

- `pnpm content:check`, `pnpm gamectl content validate`, `pnpm gamectl catalog list|refs|impact` для новых ID;
- негативные fixtures компилятора: 5 маркеров, цифра в тексте, имя навыка, слово «наставник», маркер без предиката, доминирующий набор, unknown axis;
- golden: v1 `contentFingerprint` и v1 `rulesFingerprint` неизменны (доказательство spike);
- read model: парсер отвергает лишние/отсутствующие поля, >4 подходов, >2 маркеров; snapshot-тест RU-текстов только на структуру, не на формулировки;
- long-RU фикстура максимальной длины.

### Acceptance

- в `apps/desktop/src/january/` не остаётся player-facing текстов решений для v2-пути (legacy v1 экраны не трогаются);
- любой нарушающий ADR-021 §5/§7 контент не компилируется;
- stable IDs v1 не удалены и не переименованы; новые ID зарегистрированы и видны в `catalog`.

### Non-goals

Scenario runtime; UI; мульти-locale; общий DSL.

## REF-02C — `january-1990-v2` scenario, answer schema v2, legacy v1 replay

**Скилл/зона:** `runtime-scenario` + `runtime-implement` + `runtime-simulation`; зоны `scenario`, `core`, `application`, `persistence` (контракты). **Human review.**

### Scope

- Scenario program `january-1990-v2` (typed `scenario-v1` authoring → certified artifact): `start` → материализация access/learning из start configuration → ситуация/realization дефекта (RNG, домены v2) → **одно** `suspend-for-decision` `january-1990/approach` → outcome v2 → completion.
- `january-1990-month-plan-v2` (несёт `startBackground`, `learningMode`), `january-approach-prompt-v2` (approach IDs, `{axis, polarity}` маркеров, wording/content versions, realized event; без текстов), `january-approach-answer-v2 { schemaVersion, approach }` с closed-парсером, answer schema fingerprint, `january-1990-result-v2`, outcome v2 (`delivery`, `participation`).
- Selection: новые игры стартуют v2; активные v1 run дорабатываются под v1 (паттерн sticky-legacy drain); завершённые v1 читаются без пересчёта.
- Save: оценка и (при необходимости) минимальный bump snapshot/save-schema fingerprint по ADR-021 «Совместимость»; миграция только без активного MonthRun, backup, golden fixture. Если M1 уже вводит v2 save schema — использовать её.
- Второй production scenario artifact; `check-january-scenario-artifact` и drift gate покрывают оба; `gamectl scenario check|compile|inspect` работают для v2.
- `gamectl simulate`/`explain`/`replay` поддерживают v2 (новые closed policies допускаются: например «first approach», «help-first», «reduce-scope-first»).
- Обновить `docs/persistence/SAVE-COMPATIBILITY.md` (запись о January v1/v2) и `docs/EXECUTION-STATUS.jsonc`.

### Файлы (ориентировочно)

- `packages/game-core/src/january-1990/` (v2 модули рядом с v1), `packages/game-schema/src/` (plan/answer/result schemas, scenario artifact), `packages/game-content/src/january-1990-scenario-artifact*.ts`, `packages/game-application/src/january-1990/` (runtime selection, save snapshot, compatibility), `packages/game-devtools/src/scenario/`, `packages/game-simulation/`, `scripts/check-january-scenario-artifact.ts`, `scripts/gamectl-*.ts`;
- `apps/desktop/src-tauri` только если save-schema fingerprint/migration требует (Rust — граница хранения, не геймплей).

### Тесты и фикстуры

- детерминизм: тот же seed + start configuration + ответ → тот же результат; 4 approach × 2 background × 2 learning mode × 2 defect (bounded matrix);
- persistence/recovery: close/restart на единственной decision boundary, после provisional outcome, duplicate answer, request-payload conflict, ack-loss, save/run revision conflicts (повтор покрытия `january-1990-persisted-composition`);
- compatibility corpus: активный v1 run (границы 2/4/7) resume/drain; completed v1 readable; new game → v2; v2 checkpoint не принимается v1 runtime и наоборот;
- parser tests: `january-approach-answer-v2` отвергает неизвестные approach/лишние поля;
- v2 repro fixture `fixtures/repro/january-1990-v2-*.repro.json`; v2 persistence fixture; v1 fixtures неизменны;
- exactly-one-boundary assertion (счётчик blocking decisions = 1).

### Acceptance

- ровно одно блокирующее решение в v2; start configuration не создаёт `PendingDecision`;
- v1 golden-тесты и активный-v1 drain зелёные без перегенерации;
- save schema bump (если есть) введён один раз, с backup и golden migration fixture; human review пройден.

### Non-goals

UI; имя персонажа; NPC; изменение протокола `month-run-checkpoint-v1`.

## REF-02D — UI: ряд approach cards, select/confirm, маркеры, стартовый экран

**Скилл/зона:** `runtime-ui`, зона `ui`.

### Scope

- Стартовый экран января v2: background и learning mode как compact inline choices (видимый default, не «recommended»), кнопка `Начать январь`.
- Decision zone: `ApproachCardRow` (4 карточки в ряд), `ApproachCard`, `ConsequenceMarker`, `ConfirmBar`; selection — локальное эфемерное состояние, без предвыбора, единственный `Подтвердить`; `radiogroup`/keyboard по ADR-021 §3.8; reflow ряд → 2×2 → 1 колонка по container query; no-promotion (ни glow, ни размера, ни primary у карточек).
- Маркеры: глиф + слова + `aria` префикс, не только цвет, ≤2, нейтральные токены; никаких чисел/навыков/NPC (контент уже гарантирует, UI дополнительно не рендерит неизвестные axis).
- Листинг D-lite как read-only контекст ситуации (подсвеченная строка).
- Потребляет только `DecisionReadModel` из `game-application`; не вычисляет эффекты; не читает raw authoritative JSON.
- Изолированный legacy-путь UI для активных v1 run (текущие экраны не удаляются, не получают новых функций).
- Не показывает Energy/Stress/Confidence; панель `Потребности` Player Rail не заполняется выдуманными метриками.
- Обновить `apps/desktop/src/design/DESIGN.md` (decision zone: ряд карточек как подчинённая зона сцены; marker tokens) и `docs/ui/PROFESSIONAL-CHALLENGE-UI.md` (если реализация уточнила пороги).
- Если сцена из ветки `ui/ref-01a-january-scene` к моменту слайса смержена — использовать её frame; иначе слайс не зависит от неё и не копирует её декоративные эффекты (`DESIGN.md`: no decorative hero gradients).

### Файлы (ориентировочно)

- `apps/desktop/src/january/*` (новые компоненты, controller для двухшагового выбора), `packages/game-ui/`, `packages/game-ui-fixtures/`, `apps/desktop/.storybook/`, `apps/desktop/src/design/` (tokens);
- Playwright: `tests/` (browser).

### Тесты и фикстуры

- Storybook (`CHALLENGE-UI §12` + ADR-021): default row; one unavailable option; selected-not-confirmed; confirm disabled без выбора; pending/inert после confirm; long RU; 200 % zoom (reflow 4→2×2→1); keyboard focus sequence; high contrast/reduced motion; monochrome-маркеры; legacy v1 states сохраняются;
- unit/interaction: клик по карточке не вызывает commit; без selection `Подтвердить` не отправляет; повторный confirm → один вызов; reload → нет selection;
- Playwright: сценарий старт → выбор → confirm → результат, keyboard-only; axe-проверка;
- guard-тест: в v2-пути нет строк из статических массивов `january-screen-model.ts`;
- usability-скрипт playtest (ADR-021 «Проверка»).

### Acceptance

- ряд из четырёх карточек читаем и управляем клавиатурой при long RU и 200 % zoom без горизонтального чтения текста;
- нет предвыбора, нет per-card action, один `Подтвердить`;
- нет цветового-only различия selected/marker, нет Energy/Stress/Confidence;
- UI changes обновили stories/tests (`AGENTS.md`, change gates).

### Non-goals

Имя персонажа; новые авторитетные данные; анимации-декор; общий `DecisionSurface` для других ситуаций.

## REF-02E — Имя персонажа при старте новой игры

**Скилл/зона:** `runtime-implement` (+ `runtime-persistence`, когда активирован); зоны `application`, `persistence`, `ui`. **Human review** (persistence/migration). **Зависит от M1 и REF-02D.**

### Scope

- Shared pure validator имени (ADR-021 §8: NFC, trim, collapse spaces, 1–24 scalar values, charset, правило букв/границ) в schema-слое с исчерпывающими негативными кейсами;
- поле `character.displayName` в v2 save schema (`CharacterState`, `DOMAIN-MODEL §3`); parser, save-schema fingerprint (набор полей), миграция legacy → `displayName = null`; storage-guard в Rust (длина/управляющие символы), без gameplay-суждений;
- команда создания новой игры принимает имя; application отклоняет невалидное; имя не входит в RNG/rules/content/balance fingerprint;
- экран новой игры: поле без предзаполнения, inline ошибки, `Начать январь` недоступна при невалидном имени; перенос стартового выбора background/learning на единый экран создания персонажа (если ещё не там);
- Player Rail: верх — имя (одна строка, ellipsis, полный accessible name), fallback `Персонаж` для `null`;
- запрет попадания имени в логи/perf-telemetry/repro/fixtures/PR evidence (проверка `pnpm public:check`-стиля и тест на отсутствие в логах); фикстуры используют фиксированное вымышленное имя.

### Файлы (ориентировочно)

- `packages/game-schema/` (validator, save schema), `packages/game-application/`, `packages/game-persistence-contracts/`, `apps/desktop/src-tauri` (storage-guard), `apps/desktop/src/january/` и `apps/desktop/src/shell/`/`panels/` (Player Rail), `docs/architecture/DOMAIN-MODEL.md`, `docs/persistence/SAVE-COMPATIBILITY.md`.

### Тесты и фикстуры

- таблица валидации: пусто/пробелы, 1 символ, 24 / 25 символов, кириллица/латиница/смешанное, цифры, дефис/апостроф по краям, emoji, ZWJ/bidi, управляющие символы, combining mark отдельно, NFC/NFD эквивалентность, U+2019;
- save: round-trip, миграция legacy v1-save → `null`, активный v1 run не мигрируется до завершения, повторное применение миграции идемпотентно, backup создаётся;
- детерминизм: два прогона с разными именами и одинаковым seed дают идентичные outcome и rules fingerprint;
- UI: Storybook (empty/invalid/valid/long name/ellipsis), keyboard, 200 %, long RU; Playwright создание игры;
- отсутствие имени в логах/телеметрии.

### Acceptance

- имя невозможно сохранить невалидным ни через UI, ни через команду, ни через прямой вызов Rust-границы за пределами лимита;
- legacy-сейвы открываются, показывают fallback и не теряют историю;
- имя не влияет ни на один fingerprint, кроме save schema.

### Non-goals

Переименование в существующем сейве; фамилия/пол/портрет/traits; использование имени в тексте решений.

## 5. Риски плана

| Риск | Митигация |
|---|---|
| v2 content/balance сдвигает v1 fingerprints | spike в REF-02B, golden-guard в каждом слайсе |
| Save schema bump дважды (REF-02C и M1) | единая точка введения — C2a плана M1; REF-02C использует схему |
| M1 не завершён к моменту REF-02E | REF-02E блокируется до C2d плана M1; A–D не зависят |
| Ряд карточек не переносит zoom/long RU | reflow-спецификация + Storybook/Playwright в REF-02D |
| Truthfulness-валидатор слишком строг и блокирует авторов | маркеры — закрытый словарь из 5 осей; расширение только спецификацией |
| Баланс не даёт жизнеспособных стратегий | REF-02A фиксирует симуляцией до контента; playtest-критерии ADR-021 |

## 6. Owner gate и открытые пункты

Решены ADR-021: раскладка, структура января, NPC, маркеры, state bars, имя. Остаются открытыми и **не блокируют A–D**:

1. решения по открытым вопросам M1 ([§11 плана M1](PROG-01B2C2-WRITABLE-PROFESSIONAL-MONTHRUN-V2-PLAN.md)) — блокируют E; само определение M1 закрыто;
2. переименование/получение имени у legacy-сейвов;
3. нужен ли `defaultOptionId` для неблокирующих выборов или явный выбор без default (решается playtest-критерием);
4. новый kernel по мотивам референса и размер планировочного шага перед месяцем — вне REF-02.

## 7. Definition of Done для REF-02

- все слайсы A–E смержены, каждый с V3 evidence на своём head;
- январь v2: один blocking `PendingDecision`, 4 карточки в ряд, select → `Подтвердить`, маркеры из контента, нет NPC/state bars;
- v1 воспроизводим: golden/fixtures/active-run drain зелёные;
- `docs/EXECUTION-STATUS.jsonc` и затронутые спецификации синхронизированы;
- playtest по критериям ADR-021 «Проверка» проведён или явно отложен с причиной.
