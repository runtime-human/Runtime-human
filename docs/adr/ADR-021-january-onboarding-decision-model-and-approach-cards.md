---
title: "ADR-021 — Модель январского онбординга и подача approach cards"
type: adr
status: accepted
canon: true
depends_on: [ADR-005, ADR-007, ADR-010, ADR-013, ADR-015, ADR-016, ADR-017, ADR-020]
updated: 2026-10-15
---

# ADR-021 — Модель январского онбординга и подача approach cards

- **Статус:** Accepted (решения владельца 2026-10-15; вступает в силу при merge PR, который его вводит)
- **Дата:** 2026-10-15
- **Решение владельца:** январь 1990 перестраивается до канонической структуры «стартовый background → inline learning choice → одно блокирующее профессиональное решение»; блокирующее решение подаётся рядом из четырёх approach cards с явным выбором и подтверждением; последствия показываются только качественными маркерами; имя персонажа вводится при старте новой игры
- **Связанные ADR:** ADR-005, ADR-007, ADR-010, ADR-013, ADR-015, ADR-016, ADR-017, ADR-020
- **Связанные спецификации:** `docs/ui/PROFESSIONAL-CHALLENGE-UI.md`, `docs/game-design/PROFESSIONAL-CHALLENGE-ENGINE.md`, `docs/plans/VERTICAL-SLICE-PLAN.md`, `docs/persistence/SAVE-COMPATIBILITY.md`, `docs/architecture/DOMAIN-MODEL.md`
- **План реализации:** `docs/plans/REF-02-JANUARY-DECISION-MODEL-IMPLEMENTATION-PLAN.md`

## Контекст

Текущий январь на `main` (`january-1990`, completed milestones до `engine-02-*`) устроен иначе, чем требует канон:

| Аспект | Канон | Реализовано на `main` |
|---|---|---|
| Блокирующие решения | ровно одно профессиональное (`VERTICAL-SLICE-PLAN §14`) | три последовательных `suspend-for-decision`: `january-1990/access`, `/learning`, `/defect` (границы 2, 4, 7) |
| Доступ | стартовый background, не permanent bad start, не capability ceiling (`VERTICAL-SLICE-PLAN §4–5, §13`) | блокирующий шаг внутри месяца; `home-pc` даёт `+2 reliability`, `shared-school-pc` — `+1` |
| Learning | compact inline choice до MonthRun, не блокирует второй раз (`§3, §5`) | блокирующий шаг 2 |
| Подходы | 4: самостоятельно / помощь / упростить / перенести (`CHALLENGE-ENGINE §16`) | 3: `inspect-listing`, `change-input`, `ask-for-guidance` |
| Подача | глагольный label, ≤2 маркера, selected state, confirm (`CHALLENGE-UI §2, §4`) | клик по строке = commit, маркеров нет |
| Источник текстов | скомпилированный контент (`ADR-016 §10`, `ADR-020`) | статические массивы в `apps/desktop/src/january/january-screen-model.ts` |
| Anti-dominance | компилятор отклоняет доминирующую option (`CHALLENGE-ENGINE §13`, `ADR-016 §4`) | `edit-and-debug` строго доминирует `read-and-run`; `home-pc` строго доминирует `shared-school-pc`; `ask-for-guidance` — чистый штраф |

Исходный анализ (`decision-presentation-analysis`, 2026-10) сравнил четыре модели подачи: A — approach cards с качественными trade-off маркерами из контента; B — нарратив и подходы строками; C — plan/commitment на месяц для рутины и обучения; D — диегетический выбор в сцене. Рекомендация: A как смысловой контейнер, C для неблокирующих выборов, D только как read-only листинг (D-lite).

Канон не нормировал раскладку карточек, форму маркера, подтверждение выбора, упоминание NPC до NPC foundation и ввод имени персонажа. Эти вопросы были вынесены на Owner gate (`AGENTS.md`, «Owner gate»: product direction, authoritative state semantics, unresolved visual direction). Владелец принял решения, зафиксированные ниже.

## Решение

### 1. Решения владельца (2026-10-15)

1. **Раскладка.** Blocking-decision cards показываются **в ряд**: четыре approach cards рядом, без предвыбора. Выбор — это выделение карточки, затем один общий action `Подтвердить`.
2. **Структура января.** Январь **перестраивается к канону**: доступ к компьютеру становится стартовым background (не блокирующим шагом), режим обучения становится inline неблокирующим выбором, в январе **одно** блокирующее профессиональное решение с четырьмя подходами. Подача — «модель A в раскладке карточек + C для неблокирующих выборов + D-lite для листинга».
3. **Без NPC.** Упоминаний наставника/NPC нет ни в тексте решения, ни в consequence previews, пока не существует NPC foundation (`npc-foundation` в `EXECUTION-STATUS`).
4. **Маркеры.** Знаки `+` / `−`, стрелки и иконки **разрешены** как маркеры последствий. Они никогда не кодируются только цветом; максимум **два** качественных маркера на карточку; без чисел; без названий навыков.
5. **Без state bars.** Шкалы Energy / Stress / Confidence не показываются.
6. **Имя персонажа.** Имя выбирается при старте новой игры, хранится в v2 save schema, проходит валидацию длины и charset, отображается в левой панели (Player Rail).

Платформа января остаётся DOS PC / GW-BASIC, как в скомпилированном контенте (`core.platform.dos-pc`, `core.technology.gw-basic`).

### 2. Структура января v2

```text
Новая игра: имя (§8) → стартовый background (доступ) → режим обучения (inline)
→ «Начать январь»
→ автоматическая часть месяца (доступ и обучение материализуются из start configuration)
→ ОДНО блокирующее решение: professional approach (4 подхода)
→ автоматический результат → causal result report → следующий шаг (февраль)
```

Контракты:

- **Start configuration** — типизированный неизменяемый вход прогона: `startBackground` (`home-pc` | `shared-school-pc`) и `learningMode` (`read-and-run` | `edit-and-debug`). Она не является `PendingDecision`: `MonthRun` не приостанавливается, boundary-счётчик блокирующих решений равен 1. Она передаётся в существующем поле `plan` команды `BeginMonthCommandV1` (`january-1990-month-plan-v2`), валидируется closed-парсером и входит в checkpoint hash; протокол `month-run-checkpoint-v1` не меняется.
- **Background** (`startBackground`) — стартовый факт персонажа, а не карточка-подход. Он меняет удобство и темп, но не capability ceiling: множество достижимых outcome classes и максимум качества одинаковы для всех backgrounds (`VERTICAL-SLICE-PLAN §5`). Эффект background ограничен осью `release-timing` и контекстным текстом; бонус к `reliability` или иному потолку результата запрещён. Один background не доминирует другой (§5).
- **Learning mode** — compact inline choice (два режима: `read-and-run`, `edit-and-debug`), показывается на стартовом экране вместе с background. Это неблокирующий выбор до запуска MonthRun (`VERTICAL-SLICE-PLAN §3`). Третий режим «попросить объяснение» откладывается до появления feedback/NPC источника (решение 3). Оба режима несут ≤2 качественных маркера (решение 4) и реальный trade-off, а не «больше = лучше».
- **Defaults неблокирующих выборов.** Для background и learning mode content объявляет `defaultOptionId`; она показана выбранной и не маркируется как recommended. Предвыбор запрещён только для blocking approach cards (§3). Эта развилка вынесена в playtest-критерии (§Проверка).
- **Blocking decision.** Один `PendingDecision` `january-1990/approach`, архетип `diagnose`, kernel `core.situation-kernel.first-bug`, ровно четыре подхода из канонического словаря `investigate-first`, `ask-for-help`, `reduce-scope`, `defer-or-recover` (`CHALLENGE-ENGINE §7, §16`). Порядок карточек фиксирован content-порядком и не зависит от оценки «лучшего»; он одинаков после reload.
- **Ситуация не зависит от декорации.** Реально выпавший дефект (`logic-error` | `syntax-error`) определяет и заголовок/причины ситуации, и показываемый листинг; статический текст в React запрещён (§4).
- **Outcome v2** несёт факты, из которых выводятся маркеры: `delivery` (`released` | `released-with-limitation` | `delayed-to-february`; `VERTICAL-SLICE-PLAN §7`), `participation` (`independent` | `assisted`; `PROGRESSION-ENGINE §9, §19`) и существующие quality-факты. Помощь улучшает finish-chance и learning, но результат остаётся `assisted` и не подтверждает самостоятельность.

### 3. Подача blocking decision: approach cards в ряд

Карточка подхода — смысловой контейнер: глагольный label, 1–2 строки сути, ≤2 маркера, availability explanation (если недоступна), selected state (`CHALLENGE-UI §4`).

Правила раскладки и выбора:

1. Четыре карточки одинаковой ширины и высоты стоят **в одну строку**. Ни одна не выделена по умолчанию: нет glow, рамки, увеличенного размера, primary-стиля или бейджа «recommended» (`CHALLENGE-UI §4, §14`).
2. **Нет предвыбора.** После первого показа и после reload выбранной карточки нет. Selection — локальное эфемерное состояние renderer; оно не является authoritative и не восстанавливается из persistence.
3. Выбор — два шага: выделить карточку, затем нажать единственную кнопку `Подтвердить`. На карточках нет собственных action-кнопок. Пока ничего не выбрано, `Подтвердить` неактивна и объясняет причину (`Сначала выберите подход`). Выбор можно изменить до подтверждения.
4. Primary-стиль применяется только к `Подтвердить` и только при активном selection. Selected state карточки не кодируется только цветом (рамка другой толщины + галочка/индикатор + `aria-checked`).
5. После подтверждения карточки и кнопка inert, повторное нажатие не создаёт второй ответ (существующая идемпотентность request id; `CHALLENGE-UI §6`).
6. Раскладка «в ряд» — композиция decision zone внутри доминирующей narrative scene, а не главная композиция экрана. Это согласуется с `DESIGN.md` и принятым shell-spec 2026-07-30 («нет generic grid of identical cards как главной композиции»): сцена остаётся крупнейшей областью, ряд карточек — её подчинённая зона решения.
7. **Reflow — обязательная часть раскладки, а не отступление от неё.** Контейнерный (не viewport) breakpoint: пока у каждой карточки есть минимальная ширина текста (начальное значение ≈ `14rem`, уточняется Storybook long-RU story), показывается один ряд из четырёх; при меньшей ширине — 2×2, затем одна колонка. Порядок чтения и фокуса одинаков во всех раскладках. При 200 % zoom и long RU текст карточки не читается горизонтальным скроллом (`CHALLENGE-UI §11`).
8. Клавиатура: group — `radiogroup`, подписанный заголовком ситуации; стрелки перемещают selection, `Tab` переходит на `Подтвердить`, `Enter`/`Space` подтверждают/выбирают; видимый focus; без timer, drag и precision.

### 4. Источник текстов и маркеров

- Тексты (`label`, `forecast`, `tradeOffs`, ситуация, background, learning mode, листинг) принадлежат **скомпилированному контенту**, а не React и не `game-application` (`ADR-016 §10`, `ADR-020`). Renderer получает типизированный read model из `game-application` и ничего не вычисляет.
- `ProfessionalApproachOption` из `PROFESSIONAL-CHALLENGE-ENGINE §7` уточняется: элемент `tradeOffs` — не голый `LocalizationKey`, а `{ marker: ApproachMarkerId, text: LocalizationKey }`, где `marker` — элемент закрытого словаря `axis × polarity`. Семантика (`axis`, `polarity`) авторитетна и входит в prompt checkpoint вместе с wording/content version (`ADR-016 §9`); текст — локализация.
- Локализация в этом ADR — один locale (`ru`) в скомпилированной строковой таблице с стабильными `LocalizationKey`. Мульти-locale runtime не вводится (ADR-015). Косметическое изменение текста не ломает semantic fingerprint; изменение, меняющее смысл option, требует content review/versioning (`SAVE-COMPATIBILITY`, «Semantic fingerprints»).
- Листинг (D-lite) — read-only контент с provenance, исторически корректный GW-BASIC на DOS PC, подсвеченная проблемная строка как контекст. Он не является устройством ввода и не требует знания синтаксиса для выбора (`CHALLENGE-ENGINE §13`).

### 5. Маркеры последствий

Грамматика маркера:

- глиф: `+` (gain), `−` (cost) или `?` (unknown); стрелка/иконка допустимы как дополнение к глифу и словам, но **не вместо** слов;
- обязательный текст рядом с глифом; для screen reader — префикс `Плюс:` / `Минус:` / `Неизвестно:`;
- цвет, если используется, дополнительный и не evaluative: не красный/зелёный как «хорошо/плохо» (`PROGRAMMER-LEARNING-UI §7`); информация не теряется в монохроме и high contrast;
- **максимум два маркера на карточку** (включая `?`); у каждой карточки есть минимум один cost или unknown маркер;
- запрещены числа, проценты, названия навыков и внутренних метрик (`Programming`, `Debugging`, `readiness`, mastery, evidence), упоминания NPC (решение 3), слова «лучший/рекомендуем/оптимально».

Закрытый словарь осей v1 и привязка к измеримому предикату outcome-модели:

| Axis | Gain / cost текст по смыслу | Предикат |
|---|---|---|
| `release-timing` | выпуск быстрее / может задержаться | `delivery` смещается к `released` / к `delayed-to-february` |
| `independent-experience` | больше самостоятельного опыта / меньше подтверждения самостоятельности | `participation = independent` / `assisted` |
| `finish-chance` | выше шанс закончить сейчас / может не получиться закончить | доля прогонов с `delivery ≠ delayed-to-february` |
| `scope` | проще первая версия / известное ограничение | `delivery = released-with-limitation` |
| `quality` | надёжнее результат / менее надёжный результат, minor debt | quality-band / наличие minor debt |

Новая ось требует изменения спецификации, а не только контента. **Истинность маркера проверяется машинно:** симуляция по seeds и контекстам (`gamectl simulate`) подтверждает монотонность заявленного направления; несоответствие маркера и модели — ошибка валидации. Это измеримая форма метрики «correct prediction of trade-off direction» (`CHALLENGE-ENGINE §15`, ADR-015 «Verification»).

### 6. Anti-dominance как валидируемое свойство

Компилятор/валидатор баланса отклоняет январский v2 набор, если:

- один approach, background или learning mode Pareto-доминирует другой по **показываемым** осям хотя бы в одном declared context (background × learning mode × realized defect);
- у approach нет cost/unknown маркера;
- маркер не подтверждается предикатом (§5);
- `ask-for-help` не даёт реального upside (`finish-chance`) при честной цене (`participation = assisted`);
- множество достижимых outcome classes или максимум quality зависит от `startBackground` (запрет capability ceiling);
- валидатор нарушает `CHALLENGE-ENGINE §13` иначе (jargon requirement, failure без next step и т. д.).

v1 balance-таблицы (`balance/quality/january-1990.jsonc`, `balance/skill-evidence/january-1990.jsonc`) **не правятся на месте**: они входят в fingerprint v1 (§Совместимость). Anti-dominance применяется к v2 balance.

### 7. Без NPC и без state bars

- До `npc-foundation` ни decision text, ни approach label/forecast/tradeOffs, ни background/learning text, ни листинг не упоминают наставника, учителя, друга, родителя или иного NPC как участника выбора. «Помощь» — безличный способ действия («получить подсказку, разобрать вместе»), без источника-человека. Компилятор отклоняет контент с лексиконом NPC-ролей из закрытого реестра (реестр снимается ADR/спецификацией NPC foundation). Строка «отношение с наставником» из `CHALLENGE-UI §8` остаётся допустимой только в результате ассистированного исхода и только после появления NPC; в превью — никогда.
- Шкалы Energy / Stress / Confidence не показываются в январе и не вводятся как hidden state: authoritative state не содержит таких величин, а скрытое состояние требует текущего decision/consequence/exploit-protection/consistency purpose (`AGENTS.md`, hard boundaries). Player Rail не показывает выдуманные метрики; панель `Потребности` в январе не заполняется, пока нет честной проекции реального состояния (`DESIGN.md`, «no invented metrics»).

### 8. Имя персонажа

- Поле `character.displayName` в `CharacterState` (`DOMAIN-MODEL §3`, identity), хранится в **v2 save schema** (milestone M1 в терминах владельца: ProfessionalState v2 / MonthRun v2).
- Ввод — на экране новой игры; обязательное поле без предзаполненного значения (placeholder — пример, не значение). `Начать январь` недоступна, пока имя невалидно; ошибки — человеческий русский текст рядом с полем.
- Нормализация: Unicode NFC, `trim`, схлопывание внутренних пробелов в один; типографский апостроф U+2019 → U+0027.
- Длина: 1–24 Unicode scalar values после нормализации.
- Charset: буквы Cyrillic и Latin (`General_Category = L*`, `Script ∈ {Cyrillic, Latin}`), цифры `0–9`, пробел, дефис-минус `-`, апостроф `'`. Минимум одна буква; первый и последний символ — буква или цифра. Запрещены управляющие и format-символы (включая bidi, ZWJ/ZWNJ), private use, unassigned, суррогаты, standalone combining marks, emoji, прочие символы и пунктуация. Регистр сохраняется. Фильтра ненормативной лексики и проверки уникальности нет (offline, один локальный игрок).
- Единственный чистый validator живёт в shared schema-слое; renderer использует его только для мгновенной подсказки, authoritative принятие — в application/persistence command. Rust-граница дополнительно отклоняет значение длиннее лимита или с управляющими символами как защиту хранилища, но не судит геймплей.
- Имя **не участвует** в детерминизме: не входит в RNG-деривацию, rules/content/balance fingerprint и gameplay-решения; входит в save schema fingerprint (набор полей). Оно не попадает в логи, perf-телеметрию, repro/fixtures и PR evidence; фикстуры используют фиксированное вымышленное имя-константу.
- Отображение: верх Player Rail, одна строка, при переполнении — ellipsis с полным значением в accessible name.
- Legacy-сохранения без имени мигрируют с `displayName = null`; UI показывает локализованный fallback `Персонаж` (константа, не хранится). Переименование существующего сейва не входит в этот ADR (открытый вопрос).

### 9. Версионирование: January v1 остаётся, добавляется v2

- **January v1** (`january-1990`: решения `january-1990/access|learning|defect`, ответы `january-access-answer-v1`, `january-learning-answer-v1`, `january-defect-answer-v1`, `january-1990-month-plan-v1`, `january-1990-step-table-v1`, текущие balance и content semantics) остаётся воспроизводимым для существующих сейвов: активные v1 MonthRun дорабатываются под v1 ruleset (паттерн `sticky-legacy-checkpoint-drain`, `engine-02-january-authority-cutover`), завершённые v1 месяцы читаются без пересчёта.
- **January v2** — новый версионированный scenario (`january-1990-v2`), новый plan (`january-1990-month-plan-v2`), решение `january-1990/approach`, answer schema `january-approach-answer-v2`, prompt `january-approach-prompt-v2`, outcome и result v2, отдельный v2 balance. Все **новые** игры используют только v2.
- Изменение shared входа, которое двигает любой v1 fingerprint, запрещено, пока v1 поддерживается (§Совместимость).

## Последствия

### Положительные

- январь соответствует канону: одно блокирующее решение, background не блокирует, learning inline (`VERTICAL-SLICE-PLAN §3, §14`);
- игрок видит направление цены каждого подхода до выбора, а модель честно её исполняет;
- решение «помощь vs самостоятельность» получает прогноз до выбора, а не только объяснение после;
- содержательный контент (тексты, маркеры, листинг) переезжает из React в проверяемый компилятором контент;
- первая реализация `ProfessionalApproachOption` и dominance-валидатора становится фундаментом для общего `DecisionSurface` (февраль и далее, MonthRun v2);
- имя делает персонажа «своим» без влияния на детерминизм.

### Стоимость

- два параллельных January ruleset (v1 legacy + v2) до отдельного ADR о снятии v1;
- новый v2 balance family/таблицы, dominance- и truthfulness-валидаторы, second scenario artifact и расширение drift-gate;
- переработка UI January: новые компоненты + изолированный legacy-путь для активных v1 run;
- миграция save schema с backup и human review;
- русскоязычная строковая таблица как новый контентный артефакт.

### Риски

- ряд из четырёх карточек хрупок при long RU и 200 % zoom → обязательный reflow (§3.7) и Storybook/Playwright покрытие;
- карточки могут превратиться в «четыре плитки с символами»: ограничивается дисциплиной маркеров, запретом промоушена и playtest;
- маркер может не соответствовать модели → машинная проверка истинности (§5);
- inline-defaults неблокирующих выборов могут восприниматься как рекомендация → playtest-критерий;
- shared-вход v2 может непреднамеренно сдвинуть v1 fingerprint → compatibility spike и golden-fixture guard в начале REF-02B/02C;
- имя — персональные данные в локальном сейве → запрет попадания в логи/evidence.

## Совместимость

Оценка по измерениям `SAVE-COMPATIBILITY.md` («Compatibility dimensions»):

| Измерение | Изменение | Политика |
|---|---|---|
| Checkpoint schema `month-run-checkpoint-v1` | не меняется: новые `plan`, `prompt`, `answer`, outcome — `AuthoritativeJsonValue` | протокол MonthRun/persistence не меняется (аналогично `checkpointSchemaChanged: false` в `engine-02-certified-month-run-adapter`) |
| Rules fingerprint | v2 получает собственный fingerprint (answer schemas, decision id, step table, plan version, balance v2 fingerprint) | v1 fingerprint, `ANSWER_SCHEMA_FINGERPRINTS` v1 и checkpoint hashes в `EXECUTION-STATUS` (`access/learning/defect/completedCheckpointHash`) **не меняются**; golden-тесты v1 остаются зелёными |
| Balance fingerprint | v2 balance — отдельные файлы; v1 файлы неизменны | `createJanuary1990BalanceFingerprint` v1 входит в rules fingerprint v1, поэтому правка v1 balance запрещена |
| Content fingerprint | `contentFingerprint` покрывает required chunks `1990s/ecosystem`, `1990s/programming` и входит в `MonthRunCompatibility` v1 | любая правка этих chunk сдвигает v1 compatibility и блокирует resume активных v1 run. REF-02B начинает с compatibility spike: либо v2 контент добавляется в новые chunk/ID без изменения байтов v1-chunk, либо v1 guard версионируется точным transform с fixture. Выбор и доказательство — в REF-02B |
| Save schema fingerprint | v2 result/outcome set меняет `january-1990-save-schema-v1` fingerprint; имя добавляется в v2 save schema | v1 snapshot и completed month читаются без пересчёта; миграция — только когда нет активного MonthRun (active v1 run сначала дорабатывается под v1), с backup и golden fixture; v2 schema вводится **один раз** (REF-02C/M1 согласуют, кто её вводит; второй bump ради имени без нужды запрещён). Требует human review |
| Determinism manifest / RNG | переиспользуется `hierarchical-v1`; новые RNG domain paths имеют `v2` в имени | v1 domain paths и trace-fixtures не меняются |
| Scenario artifact | второй production-артефакт `january-1990-v2`; `check-january-scenario-artifact` и byte-comparison drift gate покрывают оба | инвариант `secondPublicArtifactAdded: false` относился к слайсу freshness и здесь осознанно снимается |
| Stable content IDs | v1 ID (`core.situation-kernel.first-bug`, `core.local-tech-availability.*`, `core.activity.*`, `core.event.*`, work packages) **не удаляются и не переименовываются**; v2 только добавляет | tombstone/migration review сейчас не запускается; запускается при ADR о снятии v1, когда ID перестают быть active dependency |
| Историческая корректность | платформа DOS PC / GW-BASIC неизменна; листинг получает provenance | source review листинга в REF-02B |
| Fixtures | `fixtures/repro/january-1990-first-program.repro.json`, `fixtures/persistence/*`, `fixtures/balance/*` — legacy v1 и сохраняются; v2 получает свои | перегенерация v1 фикстур запрещена |

Активные и завершённые состояния:

- активный v1 MonthRun (границы 2/4/7): resume и drain под v1; v2 не подхватывает чужой checkpoint;
- завершённый v1 месяц: читается, не пересчитывается (`SAVE-COMPATIBILITY`, «Historical record compatibility»);
- новая игра: только v2;
- save без `displayName`: `null` + fallback.

## Отклонённые альтернативы

- **Оставить три блокирующих шага и ограничиться UI-полировкой (Step 0).** Не устраняет расхождение с каноном и доминирование; отклонено решением 2.
- **Склеить январь в «Event 1/1» из четырёх карточек без изменения модели.** Подписывало бы три реальных варианта четырьмя картами; отклонено — модель сначала должна иметь четыре подхода и ось времени.
- **Модель B (вертикальные строки) или 2×2 как основная раскладка.** Лучше переносит zoom/long RU и ближе к `DESIGN.md`; отклонено решением 1. Из неё сохранён reflow как accessibility-механизм.
- **Модель C как единственная подача.** Не покрывает blocking `PendingDecision`; принята только для неблокирующих выборов (background, learning mode).
- **Модель D (диегетические hotspots).** Дрейф к coding puzzle/IDE, отвергнутый ADR-016; допустим только D-lite листинг.
- **Preselected первая карточка + кнопка на каждой карточке (как в визуальном референсе).** Выглядит как рекомендованный ответ, несколько primary actions; отклонено решением 1.
- **Маркеры «Programming skill ↑», «Project progress ↑», по 4 строки на карточку.** Названия навыков и метрик, оптимизация «по стрелкам»; отклонено решением 4.
- **Mentor/NPC voices и прогноз отношений («Mentor will appreciate»).** Раскрывают несуществующее скрытое состояние; отклонено решением 3.
- **Energy / Stress / Confidence bars.** Hidden state без модели, дублирование шкал; отклонено решением 5.
- **Править v1 balance на месте для устранения доминирования.** Двигает v1 fingerprints и ломает legacy replay; заменено v2 balance.
- **Имя по умолчанию без ввода / ввод имени после первого месяца.** Отклонено решением 6.
- **Мульти-locale runtime и общий `DecisionSurface` для всех ситуаций сейчас.** Преждевременно (ADR-015); январь v2 проектируется так, чтобы поверхность обобщалась позже.

## Вне scope

- новый situation kernel по мотивам референса («работает, но не понимаю почему») — решается отдельно при Phase 2;
- размер планировочного шага перед месяцем (commitments/forecast) вне января;
- NPC foundation, mentor mechanics, третий learning mode;
- переименование персонажа в существующем сейве;
- снятие v1 ruleset;
- общий `DecisionSurface`, MonthRun v2 как таковой и ProfessionalState v2 как таковой (M1 — внешняя зависимость REF-02E).

## Проверка

Решение считается подтверждённым, когда в playtest:

- игрок за 10–20 секунд называет разницу между двумя подходами и предсказывает направление trade-off (стартовый порог ≥ 80 %; `CASUAL-SIMULATION-DESIGN §9`, `CHALLENGE-UI §13`);
- распределение выбора четырёх подходов не имеет доминирующего; минимум две стратегии ощущаются жизнеспособными;
- ни один игрок не описывает экран как quiz, Jira, таблицу или dashboard;
- игрок не считает выделенную по умолчанию опцию background/learning рекомендацией;
- после месяца игрок называет минимум две причины результата и отличает assisted от independent;
- игрок не ищет Energy/Stress/Confidence и не спрашивает «кто этот наставник»;
- ряд из четырёх карточек читаем при long RU и 200 % zoom (reflow) и проходит keyboard-only сценарий;
- ввод имени занимает не более ~15 секунд, ошибки валидации понятны без пояснений;
- технически: reload до подтверждения не восстанавливает selection и не меняет ситуацию; duplicate confirm не создаёт второй outcome; v1 golden fixtures и активный v1 run проходят без изменений; маркеры проходят машинную проверку истинности; ни один v2 набор не проходит валидатор при Pareto-доминировании.
