---
title: "PROG-01B2C2 Writable Professional MonthRun v2 (M1) Implementation Plan"
type: plan
status: draft
canon: true
depends_on: [ADR-005, ADR-006, ADR-007, ADR-010, ADR-013, ADR-015, ADR-021]
updated: 2026-10-15
---

# PROG-01B2C2 — Writable Professional MonthRun v2 (milestone M1)

Нормативные источники: [ADR-013](../adr/ADR-013-authoritative-professional-progression-evidence.md) (§1, §6, §7), [ADR-010](../adr/ADR-010-authoritative-save-state.md), [ADR-005](../adr/ADR-005-suspended-month-run.md), [ADR-021](../adr/ADR-021-january-onboarding-decision-model-and-approach-cards.md) (§8, «Совместимость»), [Professional Progression Engine](../game-design/PROFESSIONAL-PROGRESSION-ENGINE.md), [Suspended MonthRun](../simulation/SUSPENDED-MONTH-RUN.md) (§3, §7, §8, §9), [Save Compatibility](../persistence/SAVE-COMPATIBILITY.md), [Migrations](../persistence/MIGRATIONS.md), [Backup and Restore](../persistence/BACKUP-AND-RESTORE.md). Этот план подчинён ADR и спецификациям; при расхождении приоритет у них (`docs/INDEX.md`, «Источник истины»).

План описывает порядок слайсов, а не расписание. Каждый слайс — отдельный PR, независимо проверяемый, с собственным rollback. Постановка вопросов владельцу — §11.

## 1. Определение M1

**M1 = PROG-01B2C2 = «authoritative professional persistence / writable MonthRun v2».** «M1» — термин владельца; этим документом он определён в каноне репозитория (раньше его не было в `ROADMAP`, `RELEASE-MILESTONES`, `EXECUTION-STATUS`; см. [REF-02 §4](REF-02-JANUARY-DECISION-MODEL-IMPLEMENTATION-PLAN.md)).

M1 впервые делает профессиональное состояние персонажа **authoritative и персистентным**: оно меняется только одним атомарным commit месяца и не меняется ничем другим. До M1 прогрессия существует только как изолированная лаборатория (`professional-lab-v1`) и read-only мост; в сейве и в MonthRun её нет.

M1 состоит из восьми частей (в скобках — слайс, который её поставляет):

| # | Часть | Содержание | Слайс |
|---|---|---|---|
| 1 | `ProfessionalStateV2` | authoritative skills: mastery, fluency, technology familiarity; aptitudes; ограниченная история применённых эпизодов (applied episode history); без grade | C2a |
| 2 | v2 save schema | единственное введение схемы: january snapshot + `professionalState` + `character.displayName` (nullable), собственный save schema fingerprint | C2a |
| 3 | `MonthRunV2` | persisted draft будущего месяца: versioned professional rules и inputs (pre-state hash, provider outcome refs, episode id, assessment, provisional delta, trace hash); begin / boundary / commit в Rust | C2b |
| 4 | Provider bridge → `ExperienceEpisode` | нормализованный immutable эпизод из provider truth (ADR-013 §1) | C2c |
| 5 | Progression assessor | чистая детерминированная оценка эпизода; не пишет в другие домены | C2c |
| 6 | Atomic commit | в одной `BEGIN IMMEDIATE` транзакции: save CAS + professional state + committed history + journal + request receipt | C2b |
| 7 | Migration + backup gate | v1 save → v2 save только без активного MonthRun, с verified backup; старые checkpoint дорабатываются legacy runtime | C2d |
| 8 | Recovery | duplicate, lost acknowledgement, process crash, corrupted receipt/state | C2e |

### Что M1 не является

- Не grade award, readiness и не «шкала навыков» для игрока: `ProfessionalGradeAward` остаётся пустым, Normal UI не показывает mastery/fluency/XP (ADR-013, ADR-015, `PROFESSIONAL-PROGRESSION-ENGINE`).
- Не новый gameplay месяца и не January v2 (REF-02C): M1 — платформа персистентности, провайдер месяца в M1 — существующий январь.
- Не профессиональная read model и UI прогрессии (PROG-01B2D и далее), не PROG-01C (разнообразная месячная практика), не окончательная числовая калибровка B1 (константы остаются provisional до отдельного acceptance, §11 Q3).

## 2. Инварианты M1

Приёмочный инвариант владельца:

> **I1. Никакого skill credit до commit. I2. Никакого двойного credit после рестарта.**

Следствия, проверяемые тестами каждого слайса:

1. Professional state в snapshot меняется **только** внутри commit-транзакции MonthRun; draft, checkpoint, journal, read model и UI не содержат применённого credit, только `provisional` черновик, явно не учитываемый как состояние.
2. Все изменения commit (snapshot, committed history, journal, receipt, revision) видимы вместе или не видны вовсе; частичного профессионального обновления нет ни при одном crash.
3. `ExperienceEpisodeId`/`ProfessionalResultId` детерминированы (`SUSPENDED-MONTH-RUN §6`); эпизод применяется ровно один раз: повтор commit, resume, lost ack и повтор orchestrator дают тот же результат.
4. Assessor и progression не пересчитывают provider truth и не пишут в project/learning/career/finance: единственный выход — professional delta (ADR-013 §1).
5. Hidden state нет: каждое authoritative поле имеет текущий decision/consequence/consistency purpose (`AGENTS.md`, hard boundaries). Единственное зафиксированное исключение — `character.displayName`, обоснованное ADR-021 §8.
6. Все authoritative расчёты — integer/fixed-point (ADR-006), RNG не используется assessor-ом сверх уже существующих scoped streams.
7. January v1 saves продолжают открываться и играться без пересчёта (`SAVE-COMPATIBILITY`, «Historical record compatibility»).

## 3. Зависимости

### 3.1 Цепочка PR PROG-01 (состояние на 2026-10-15)

Все четыре PR на момент написания **открыты как draft и не смержены** в `main`; они стековые и должны мержиться строго по порядку, каждый — после rebase и свежего V3 на своём head. Код M1 не начинается, пока не смержены все четыре (трекинг — issue #198).

| Порядок | PR | Слайс | Что даёт M1 |
|---|---|---|---|
| 1 | #200 | PROG-01B1 | `professional-lab-v1`: чистая детерминированная прогрессия (5 MVP skills, 2 aptitudes, одна technology familiarity), integer/BigInt round-half-even, один эпизод на месяц, идемпотентность, окно recent context ≤ 8, grade всегда `false` |
| 2 | #201 | PROG-01B2A | committed January → `ProfessionalLabEpisodeV1`: source fingerprint, stable episode id; явная assessment обязательна (provider не знает challenge band/feedback) |
| 3 | #202 | PROG-01B2B | `ProfessionalSaveCandidateV2` (закрытая схема), read-only preflight импорта; `migrationIsAtomic: false` — явно не авторизация |
| 4 | #203 | PROG-01B2C1 | Rust/SQLite команда `upgrade-professional-save-command-v1`: CAS-апгрейд завершённого legacy save с нулевым credit; не вызывается из UI |

M1 строится поверх них и не переопределяет их контракты. Единственное известное расхождение с каноном — кандидат/fingerprint v2 без `displayName`; по решению §11 Q4 (вариант B) его закрывает C2a.

### 3.2 ADR-021 и REF-02: v2 save schema вводится один раз

- [ADR-021 §8](../adr/ADR-021-january-onboarding-decision-model-and-approach-cards.md) помещает `character.displayName` в v2 save schema («milestone M1 в терминах владельца») и в «Совместимости» запрещает второй bump ради имени без нужды; [REF-02 §4](REF-02-JANUARY-DECISION-MODEL-IMPLEMENTATION-PLAN.md) требует, чтобы v2 save schema вводилась ровно одним слайсом.
- Решение этого плана: **единственная точка введения — C2a**. Она вводит все поля v2 save schema разом, включая `character.displayName: string | null` (значение всегда `null` до REF-02E; парсер в C2a принимает только `null`). REF-02C **использует** эту схему и не bump-ает её; REF-02E добавляет только validator, команду создания игры, UI и storage-guard — без изменения набора полей и без нового fingerprint.
- `displayName` не входит в RNG-деривацию, rules/content/balance/professional-rules fingerprint; входит только в save schema fingerprint (набор полей).

### 3.3 Прочие зависимости (смержены на `main`)

- persisted MonthRun (`january-1990-persisted-composition`, `sqlite-durable-month-run-store`), `sticky-legacy-checkpoint-drain` (`engine-02-january-authority-cutover`), существующие `backup.rs`/`backup_receipt.rs`, `failpoint.rs`, `request_receipts` и `month_run_journal` (SQLite schema v1);
- `ADR-021` и REF-02 (#207) — смержены; REF-02A–D не зависят от M1.

## 4. Порядок слайсов

```text
#200 ─► #201 ─► #202 ─► #203   (внешняя цепочка; merge по порядку)
                          │
                          ▼
                 C2a  v2 save schema + ProfessionalStateV2 + displayName + fingerprint
                          │
                          ▼
                 C2b  MonthRunV2 begin / boundary / atomic commit (Rust + contracts)
                          │
                          ▼
                 C2c  application orchestrator + provider bridge + assessor
                          │
                          ▼
                 C2d  backup gate + migration activation + player-facing activation
                          │
                          ▼
                 C2e  recovery / crash matrix (real process kill)   ── закрывает M1
```

- Цепочка строго последовательна: каждый слайс потребляет типы предыдущего.
- **C2d не включается для игрока до зелёного C2e** (feature flag выключен по умолчанию); это единственный способ получить `v1 → v2` в production.
- REF-02C стартует после C2a (использует схему); REF-02E — после C2d (новая игра создаёт v2 save). REF-02A/B/D параллельны M1.
- Каждый слайс обновляет свои спецификации и `docs/EXECUTION-STATUS.jsonc` в своём PR (правило REF-02 §3.6).

## C2a — v2 save schema, `ProfessionalStateV2`, `displayName`, fingerprint

**Скилл/зона:** `runtime-implement`, зоны `core`/`schema`, `application`, `persistence` (контракты). **Human review (persistence/migration, save schema fingerprint).**

### Scope

- Закрытая v2 save snapshot schema и её save schema fingerprint. Состав: исторический january snapshot без изменений, `professionalState`, `character.displayName: string | null`. Поля `professionalState` — только используемые в gameplay (ADR-013 §7): aptitude profile (2 значения), active skill mastery/fluency (5 MVP skills), technology familiarity (одна GW-BASIC), ограниченное окно применённых эпизодов (id + семантический контекст для anti-farming, граница ≤ 8 из B1) и набор awarded grades (пустой, грейды вне M1). Отдельный professional revision counter не вводится без найденного потребителя в C2b.
- Aptitudes: единственный источник — канонический default (§11 Q1); никакого caller-supplied значения в `fresh`/`import`/`upgrade` путях.
- `ProfessionalSaveCandidateV2` из #202 становится этой схемой (или строго эквивалентен ей): **две параллельные v2-формы не допускаются** (§11 Q4).
- Rust: известный набор save schema fingerprint расширяется до {v1, v2}; `verify_save_payloads` (`recovery_save.rs`) проверяет оба; неизвестный fingerprint по-прежнему отвергается, будущая версия — read-only (`SAVE-COMPATIBILITY`, «Open policy»).
- Правила совместимости: v1-runtime не открывает v2-save на запись, v2-runtime не открывает v1-save на запись (кроме read-only/upgrade-пути).
- Обновление `docs/persistence/SAVE-MODEL.md`, `SAVE-COMPATIBILITY.md`, `MIGRATIONS.md` («Professional progression migrations»), `docs/architecture/DOMAIN-MODEL.md` (`CharacterState`).

### Файлы (ориентировочно)

- `packages/game-schema/` (схема v2 snapshot, `ProfessionalStateV2`), `packages/game-application/src/january-1990/january-save-snapshot.ts` и файлы кандидата #202, `packages/game-persistence-contracts/`;
- `apps/desktop/src-tauri/src/persistence/{recovery_save.rs, contracts.rs}`; `migrations.rs` — **только** если §11 Q2 решён в пользу новой таблицы.

### Тесты и фикстуры

- golden: v1 `january-1990-save-snapshot-v1`, save schema fingerprint v1, `fixtures/persistence/*` неизменны; перегенерация v1 фикстур запрещена;
- golden v2: pinned save schema fingerprint; закрытый парсер отвергает неизвестные/отсутствующие поля, `displayName` ≠ `null`, ненулевые aptitudes вне default, credited эпизоды в fresh-состоянии, grade award;
- fingerprint: добавление/удаление поля двигает fingerprint; смена `displayName` и значений навыков — нет; rules/content/balance fingerprint неизменны;
- Rust: сейв с fingerprint v2 проходит `verify_save_integrity`, v1 тоже, произвольный — нет; cross-runtime открытие по матрице совместимости.

### Acceptance

- v2 save schema определена и запинена один раз; `displayName` присутствует и закрыт на `null`; ни один v1 fingerprint/fixture не сдвинут;
- нет путей, которые пишут промежуточную («candidate») схему в production-сейв.

### Non-goals

Запись professional state, MonthRun, UI, валидатор имени, миграция данных, grade.

## C2b — MonthRunV2: begin, boundary, atomic commit (Rust + contracts)

**Скилл/зона:** `runtime-implement` (+ `runtime-persistence`, когда активирован), зоны `persistence`, `application` (контракты). **Human review (persistence).**

### Scope

- `MonthRunV2` — run, привязанный к v2 save. Его compatibility дополняется professional rules fingerprint и **hash pre-state** `professionalState` базового snapshot; checkpoint несёт после provider outcome провизорный professional draft: episode id, assessment (ref/hash), provisional delta, progression trace hash (`SUSPENDED-MONTH-RUN §3`). Draft никогда не применяется к snapshot до commit.
- Протокол: по умолчанию сохраняется конверт `month-run-checkpoint-v1` с draft в authoritative payload (согласуется с ADR-021 «Совместимость»: протокол MonthRun не меняется); переход на `month-run-checkpoint-v2` — только по §11 Q5.
- `begin`: допускается только для v2 save; сохраняется инвариант одного активного run на save (`ux_month_runs_one_active_per_save`); v1-compat save отвергается.
- `boundary`: семантика checkpoint CAS и journal не меняется.
- `commit` — расширение существующей транзакции, один `BEGIN IMMEDIATE`:
  1. CAS: save revision, `updated_sequence`, snapshot SHA, **professional pre-state hash**, run revision/checkpoint hash;
  2. проверка, что `ExperienceEpisodeId` ещё не в истории (duplicate guard);
  3. запись нового snapshot (`professionalState` обновлён; TS уже вычислил и хэшировал его, Rust проверяет структуру/размер/hash/уникальность, **не** судит геймплей);
  4. committed history = committed MonthRun `result_json` + окно в snapshot (если §11 Q2 не решён иначе);
  5. journal entry, `request_receipts` (идемпотентность), revision +1 ровно один раз, очистка draft;
  6. `COMMIT`.
- Failpoints (`failpoint.rs`) вокруг каждого statement транзакции для C2e.

### Файлы (ориентировочно)

- `apps/desktop/src-tauri/src/persistence/{commands.rs, commit_contract.rs, store.rs, records.rs, contracts.rs, checkpoint_integrity.rs, failpoint.rs}`; `packages/game-persistence-contracts/src/{commit.ts, contracts.ts, parsers.ts}`; `packages/game-core/src/month-run/*` — только при §11 Q5; `docs/simulation/SUSPENDED-MONTH-RUN.md` (§3, §7).

### Тесты и фикстуры

- file-backed SQLite (Rust): begin → boundary → commit; duplicate commit receipt; request-payload conflict; stale save/run/pre-state-hash CAS; duplicate episode id отвергнут;
- инъекция ошибки после каждого statement транзакции: БД побайтово равна состоянию до commit (rollback), professional state/history/journal/receipt не изменены;
- cross: v1 begin на v2 save и v2 begin на v1 save отвергаются;
- January v1 persisted-composition и persistence fixtures зелёные без перегенерации.

### Acceptance

- после любого неуспешного commit — ни одного изменённого профессионального байта; после успешного — все пять записей присутствуют;
- professional state меняется только в commit; revision увеличивается один раз.

### Non-goals

Orchestrator и assessor, UI, backup gate, process-kill матрица (C2e).

## C2c — Application orchestrator, provider bridge, progression assessor

**Скилл/зона:** `runtime-implement` + `runtime-simulation`/`runtime-balance` (калибровка), зоны `application`, `core`, `balance`. R3.

### Scope

- Orchestrator (`packages/game-application`): begin v2 → provider (в M1 — существующий January runtime/authority) → completed → bridge → assessor → professional draft → boundary → commit. Provider truth не пересчитывается.
- Provider bridge: проекция **завершённого, ещё не committed** результата месяца в `ProfessionalLabEpisodeV1` (расширение B2A, которая сегодня принимает только committed SaveRecord): тот же source fingerprint, тот же stable episode id.
- Assessor — чистая функция версионированных правил `(providerFacts, professionalState) → ProfessionalAssessmentV1 + provisional delta`:
  - вход — только атрибутированные provider facts (participation, defect response, evidence kinds); **никогда** не выводит challenge band или feedback из численных quality scores (ограничение B2A сохраняется);
  - то, что провайдер удостоверить не может, остаётся `unassessed` и даёт нулевой credit по этому измерению; challenge первого задания ограничен guided/familiar (B2A);
  - не имеет доступа к project/learning/career/finance; единственный выход — professional delta; проверяется границей модулей (`scripts/check-boundaries.mjs`) и типами;
  - grade не присваивает.
- Draft сохраняется на boundary **до** commit; resume берёт сохранённый draft и сверяет его пересчётом из provider outcome (`SUSPENDED-MONTH-RUN §8`).
- Aptitudes берутся только из snapshot (§11 Q1).

### Файлы (ориентировочно)

- `packages/game-application/src/` (orchestrator; расширение bridge B2A), `packages/game-core/` (assessor, правила), `balance/` (versioned assessor rules — по `runtime-balance`), `scripts/check-boundaries.mjs`; `docs/game-design/PROFESSIONAL-PROGRESSION-ENGINE.md` (если правила уточнены).

### Тесты и фикстуры

- детерминизм: тот же seed + inputs → тот же draft hash; `gamectl simulate` по seeds подтверждает ограниченные дельты и отсутствие farming;
- **I1:** после begin/boundary/completed и после рестарта до commit `professionalState` равен базовому;
- **I2:** повтор orchestrator после commit с потерянным ack и после рестарта → один credit;
- негативные assessor-кейсы: forged/неизвестная assessment, unsupported claim, изменение quality score при тех же атрибутированных facts не меняет assessment, `unassessed` не кредитуется;
- boundary-guard: assessor не импортирует project/career/learning модули.

### Acceptance

- числовое acceptance правил зафиксировано (§11 Q3), professional rules fingerprint запинен;
- I1/I2 доказаны на уровне application с реальным persistence-harness.

### Non-goals

Read model/UI навыков, grade gates, January v2 outcome, PROG-01C.

## C2d — Backup gate, migration activation, player-facing activation

**Скилл/зона:** `runtime-implement` + `runtime-ui`, зоны `persistence`, `application`, `ui`. **Human review (migration, возможное расширение Tauri capabilities).**

### Scope

- **Backup gate (в Rust, внутри upgrade-транзакции, не только в TS-builder):** `v1 → v2` upgrade (#203) принимает только receipt проверенного backup (существующий `create_backup`: SQLite Backup API, `quick_check`, checksum, manifest), привязанный к SaveId, save revision и snapshot SHA исходного сейва и созданный **после** drain активного run. Отсутствующий, устаревший (ревизия сменилась), чужой, неверифицированный receipt → отказ, сейв не тронут.
- Drain: сейв с активным v1 MonthRun (`ready`/`suspended`/`completed`) не апгрейдится; v1 checkpoint доигрывается legacy runtime (sticky-legacy pattern); checkpoint **не** мигрируются; v2 не подхватывает чужой checkpoint и наоборот.
- Runtime selection по save schema: v1 save → legacy путь как сейчас; v2 save → MonthRunV2; новая игра → v2 save (нулевое professional state, default aptitudes, `displayName = null`).
- Player-facing activation за feature flag (выключен до зелёного C2e): одно компактное человеческое действие «обновить сохранение» с предложением создать резервную копию; кнопка недоступна без verified backup и при активном месяце — с объяснением на человеческом языке. Никаких stats/XP/навыков в UI.
- Документация: `BACKUP-AND-RESTORE.md`, `MIGRATIONS.md`, `SAVE-COMPATIBILITY.md`.

### Файлы (ориентировочно)

- `apps/desktop/src-tauri/src/persistence/{backup.rs, backup_receipt.rs, contracts.rs, commands.rs}`, `apps/desktop/src-tauri` capabilities (только если нужна новая команда); `packages/game-persistence-contracts/`, `packages/game-application/` (request builder #203, preflight #202); `apps/desktop/src/` (UI, stories), `apps/desktop/.storybook/`.

### Тесты и фикстуры

- gate matrix: нет backup; backup устарел после нового commit; backup другого сейва; повреждённый checksum; прерванный backup; нехватка места;
- golden migration fixture `v1 → v2`: committed исторический месяц побайтово сохранён, credit нулевой; идемпотентный повтор;
- restore из pre-upgrade backup открывает v1 save и играется legacy runtime;
- UI: Storybook (недоступно без backup / с активным месяцем / готово / ошибка), interaction-тесты, Playwright.

### Acceptance

- `v1 → v2` недоступен без verified backup ни через UI, ни через команду, ни напрямую через Rust-границу;
- January v1 saves открываются до и после включения; активные v1 run доигрываются.

### Non-goals

Показ навыков, переименование, January v2, удаление v1 runtime.

## C2e — Recovery и crash matrix (real process kill)

**Скилл/зона:** `runtime-qa` + `runtime-implement`, зоны `persistence`, `application`. **Human review.** Закрывает M1.

### Scope

Harness с **настоящим** убийством процесса: родительский тест запускает дочерний процесс на file-backed SQLite во временном каталоге, синхронизируется по barrier/failpoint и завершает его извне (`SIGKILL`/`TerminateProcess`), затем открывает базу заново. Существующий `failpoint.rs` использует `process::exit` в `cfg(test)`; он остаётся для in-process rollback, но не заменяет внешний kill.

| Класс | Кейсы |
|---|---|
| duplicate | тот же `requestId` + тот же payload → сохранённый outcome; тот же id + другой payload → conflict (begin, boundary, commit, upgrade) |
| lost ack | commit durable, ответ потерян (begin, boundary, commit, upgrade); retry возвращает тот же outcome без второго credit |
| process crash | kill до транзакции, после каждого statement, после `COMMIT` до ack, между boundary и commit, во время backup, во время upgrade; после reopen — состояние **целиком до** или **целиком после** (save revision +0 либо ровно +1; hash professional state, число history записей, journal chain, receipt согласованы) |
| corrupted receipt | несовпадение `result_sha256`: нет повторного исполнения и повторного credit; результат восстанавливается из верифицированного состояния либо вход в `recovery-required` / Safe Mode (политика — §11 Q6) |
| corrupted state | hash professional state не сходится → `professional-history-damaged`: Safe Mode/read-only/restore (`SAVE-COMPATIBILITY`) |
| draft | повреждён draft при целом provider outcome → детерминированный rebuild; повреждён provider checkpoint → abandon без reroll (`SUSPENDED-MONTH-RUN §8`) |
| stale | сейв изменился между preflight и commit/upgrade → CAS-отказ |
| fingerprint | professional rules fingerprint сменился при активном run → resume запрещён, recovery flow |

### Файлы (ориентировочно)

- `apps/desktop/src-tauri/src/persistence/*_tests.rs` + test-binary/harness; `packages/game-application/` (retry/ack-loss); `docs/simulation/SUSPENDED-MONTH-RUN.md` (§8–§9), `docs/persistence/SAVE-COMPATIBILITY.md`; `fixtures/persistence/` (новые v2 fixtures; v1 неизменны).

### Acceptance

- приёмка владельца: **file-backed SQLite + real process-kill тесты не показывают частичных профессиональных обновлений; January v1 saves продолжают открываться**;
- evidence (CI-run id GitHub-hosted Windows, V3) записано в `docs/EXECUTION-STATUS.jsonc` в PR слайса.

### Non-goals

Оптимизация persistence, новые recovery UI-flows сверх существующих, Safe Mode UI redesign.

## 5. Сквозные правила

1. **Legacy-guard.** Каждый слайс доказывает, что v1 не сдвинулся: golden `rulesFingerprint` и checkpoint hashes из `docs/EXECUTION-STATUS.jsonc`, `fixtures/repro/january-1990-first-program.repro.json`, `fixtures/persistence/*`, `fixtures/balance/january-1990-bounded-trace-v1.json`. Перегенерация v1 фикстур запрещена; нужда в ней — сигнал остановиться (`AGENTS.md`: never weaken a guard).
2. Hard boundaries `AGENTS.md`: `game-core` чист и детерминирован; Rust — граница хранения, не геймплейный судья; renderer без authoritative state и без raw SQL; WAL + `synchronous=FULL`, single writer; контент/сценарии не мутируют professional state напрямую.
3. Schema changes требуют compatibility/fingerprint assessment и migration review; generated files не правятся вручную.
4. **Verification:** V0/V1 в цикле, V2 перед PR, V3 (`pnpm verify`) для merge evidence (`docs/engineering/VERIFICATION-TIERS.md`); R3 маршрутизация и независимый review через `pnpm studio:route`.
5. Human review обязателен для C2a, C2b, C2d, C2e (persistence/migration/capabilities); C2c — R3 core review.
6. Публичные evidence-правила `AGENTS.md` («Agent security»): без личных путей и данных; фикстуры используют вымышленные значения.

## 6. Definition of Done для M1

- C2a–C2e смержены, каждый с V3 evidence на своём head; #200–#203 смержены ранее;
- профессиональное состояние персистентно и меняется только атомарным commit; **no skill credit before commit, no double credit after restart** доказаны тестами;
- file-backed SQLite + real process-kill матрица C2e зелёная на GitHub-hosted Windows;
- `v1 → v2` доступен только с verified backup; January v1 saves открываются, активные v1 run доигрываются;
- v2 save schema введена один раз и согласована с REF-02C/REF-02E; `displayName` в схеме, `null` до REF-02E;
- `docs/EXECUTION-STATUS.jsonc`, `SAVE-COMPATIBILITY`, `SAVE-MODEL`, `MIGRATIONS`, `SUSPENDED-MONTH-RUN` синхронизированы.

## 7. Связь с REF-02 и ROADMAP

- REF-02E зависит от M1: достаточно C2a (схема и поле) и C2d (новая игра создаёт v2 save). REF-02C использует v2 save schema из C2a.
- В [ROADMAP](ROADMAP.md) M1 обеспечивает exit Phase 0 «minimal `ExperienceEpisode` and atomic provider/progression commit» и Phase 1 «distinguishes guided result from independent capability»; он не расширяет Phase 0/1 скоупа.

## 8. Риски

| Риск | Митигация |
|---|---|
| Вторая v2 schema/второй bump | единая точка введения C2a; §11 Q4/Q6 |
| Credit до commit или двойной credit | draft ≠ state; deterministic ids; episode-id duplicate guard внутри транзакции; I1/I2 в тестах C2c/C2e |
| Rust судит геймплей | Rust проверяет структуру/hash/размер/уникальность, assessor — в TS core |
| Provider не может удостоверить challenge/feedback | `unassessed` = нулевой credit; капы B2A; не выводить из score (§11 Q3) |
| Констант B1 provisional | numeric acceptance перед C2d-активацией; versioned professional rules fingerprint |
| Потеря сейва при апгрейде | backup gate в Rust, drain, restore round-trip, golden migration fixture |
| Stacked PR #200–#203 не готовы | C2 не стартует до merge по порядку; план не зависит от их внутренних деталей сверх §3.1 |

## 9. Не входит в M1

Grade awards и readiness; professional read model/UI (PROG-01B2D); PROG-01C; January v2 и approach cards (REF-02A–D); имя персонажа как UI/validator (REF-02E); Career/Company/Open Source; multi-save/cloud; удаление legacy v1 runtime; Extended skill graph.

## 10. Owner gate

Эскалируются: authoritative state semantics (состав `ProfessionalStateV2`), stable contracts (v2 save schema/fingerprint), irreversible migration (`v1 → v2`), любая смена capability. Детали реализации, определяемые кодом/тестами/каноном, owner gate не требуют.

## 11. Открытые вопросы владельца

Каждый вопрос содержит рекомендуемое значение по умолчанию; слайс не стартует, пока вопрос, от которого он зависит, не закрыт.

| # | Вопрос | Предложение (default) | Блокирует |
|---|---|---|---|
| Q1 | **Источник aptitudes.** Ревью отметило, что значения, выбираемые вызывающим кодом (как в fresh candidate #202), — скрытое состояние без решения игрока. | Канонический нейтральный default (середина диапазона 0–1000 `PROFESSIONAL-PROGRESSION-ENGINE §5`, т. е. нулевой эффект modifier ≈ 10000 bps; точное значение сверяется с правилами B1 в C2a) для всех путей fresh/import/upgrade; параметра «aptitudes» в командах нет. Источник по-настоящему станет решением игрока только вместе с character creation (отдельное решение владельца, вне M1); смена default требует нового professional rules fingerprint. | C2a |
| Q2 | **Хранилище committed professional history.** ADR-013 §7 различает snapshot и append-only history; `SAVE-MODEL` предполагает нормализованные таблицы. | Без новой SQLite-таблицы в M1: history = committed MonthRun `result_json` (уже append-only, hash-проверяемый) + ограниченное окно в snapshot. Новая таблица — через SQLite schema v2 migration и отдельный review, только если размер/запросы это оправдают. | C2a, C2b |
| Q3 | **Что может удостоверить provider январского v1 и когда credit становится «настоящим».** Результат v1 доказывает практику, но не challenge band/feedback (B2A); константы B1 provisional. | M1 включает только credit, ограниченный guided/familiar (B2A) без feedback-измерения; полноценное удостоверение появится, когда REF-02C v2 outcome (`delivery`, `participation`) станет provider fact; рост правил — версионирование professional rules. Numeric acceptance правил (`runtime-balance`, multi-seed corpus) — условие C2d-активации. | C2c, C2d |
| Q4 | **#202/#203 vs `displayName`.** `ProfessionalSaveCandidateV2` и pinned fingerprint в #203 появились до ADR-021 §8. | **Решено (2026-10-15, по делегированию владельца): вариант B.** #202/#203 мержатся без `displayName`; upgrade-команда остаётся fail-closed (IPC dormant, #204), поэтому ни один player-reachable путь не пишет кандидат в production. C2a вводит единственную v2 save schema (с `character.displayName`) и пере-pin-ит цель upgrade-команды на неё; миграция кандидата не нужна, так как он никогда не был сохранён игроком. Вариант A отклонён: он задержал бы интеграцию стека ради поля, которое до C2a не используется. | C2a |
| Q5 | **Конверт checkpoint.** Оставить `month-run-checkpoint-v1` с draft в authoritative payload (согласуется с ADR-021) или ввести `month-run-checkpoint-v2`. | Оставить v1 конверт; v2 только если Rust обязан разбирать поля draft за пределами hash/size. Решение фиксируется в C2b до кода. | C2b |
| Q6 | **Политика lost ack и corrupted receipt.** | Состояние — источник истины: при целом committed-run (`result_sha256` сходится) ответ восстанавливается из состояния; иначе `recovery-required`/Safe Mode, повторного исполнения и credit нет. | C2e |
| Q7 | Нужно ли включать `displayName` в C2a, если REF-02E будет позже. | Да: поле нужно схеме ради единого bump (ADR-021 «Совместимость»), это единственное осознанное исключение из «нет неиспользуемых полей» до REF-02E. | C2a |
