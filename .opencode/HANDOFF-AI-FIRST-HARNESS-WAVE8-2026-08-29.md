# HANDOFF — Runtime Human «AI-First Harness»: Wave 7 (закрыта) + Wave 8 каркас (закрыт), далее — Wave 8 remainder и Wave 9+

Дата: 2026-08-29 · Репозиторий: `C:\Reposit\Runtime-human` · HEAD: `42d08b1e6519d402ad742c4583b0f9cf5c217f2b` (локальный, не запушен)
Следующая сессия: реализовать **Wave 8 remainder** (`simulate compare`, `explain`, `repro --trace`, `fixture list/materialize`, end-to-end intentional-bug proof), затем при запасе контекста — Wave 9. Отчитаться по `.studio/task-contract.md`.

**Статус рабочего дерева:** Waves 0-4 закоммичены (HEAD `42d08b1`). Поверх — НЕЗАКОММИЧЕННОЕ дерево (319 путей): Waves 5-6 (gamectl/catalog/authoring-schema, предыдущие сессии), Wave 7 (balance layer, эта серия) и Wave 8 каркас (simulation, эта серия). Владелец коммитит сам; НЕ merge/push/commit из агента.

---

## 1. Источники (читать, не дублировать)

- Master plan (4400 строк): `.opencode/Runtime-Human-AI-First-Game-Development-Implementation-Plan-2026-08-24.md`
  - Wave 8 remainder: §48 (~3684-3734) + §21.6 (compare), §24 (explain), §23.3 (`replay --trace`), §31.3 (`fixture list/materialize`), §22.4 (finding ledger integration).
  - Wave 9: §48 (~3736+), §54 приоритизация (~4059). Skills: §55. Adaptive review: §35.
  - Wave 10 scenario: §26. Wave 11-12: §30. Wave 13 tokens: §40+. Wave 14: §32-33.
  - Anti-patterns: §53 (строки 4036-4056). Self-review чеклист: §56 (строки 4190-4215).
- Контракт воркера: `.studio/task-contract.md` (блок `DONE|BLOCKED|FAILED …`); reviewer-формат: `.studio/finding-contract.md`.
- Правила репо: `AGENTS.md` (~104 строки), `GAME.md`, `docs/INDEX.md`, `docs/engineering/VERIFICATION-TIERS.md`, `AUTHORING-TOOLCHAIN.md`, `BALANCE-LAYER.md`, `GAMECTL.md`.
- Прошлые хэндоффы: `.opencode/HANDOFF-AI-FIRST-HARNESS-WAVE7-2026-08-27.md` (Wave 7 план/приоритеты — фактически закрыта), этот файл.

## 2. Факт: состояние репозитория на передачу

### Wave 7 — balance layer pilot (ЗАКРЫТА, uncommitted)

- `balance/quality/january-1990.jsonc` (`quality-balance-v1`), `balance/skill-evidence/january-1990.jsonc` (`skill-evidence-balance-v1`) — closed enum-таблицы, derived maxima НЕ хранятся.
- `packages/game-core/src/january-1990/january-balance.ts` — closed-парсер, `JANUARY_1990_DEFAULT_BALANCE`, `deriveJanuaryQualityScoreMaximums`, `createJanuary1990BalanceFingerprint`.
- Композиция January принимает balance как immutable parameter: `createJanuary1990MonthSteps(context, balance)`, `materializeJanuaryProgrammingState(state, roll, balance)`; материализация валидирует максимумы по активному балансу, парс сохранений — по стабильному контракту `JANUARY_1990_QUALITY_SCORE_MAXIMUMS`.
- `RulesetManifestV1` (`january-compatibility.ts`): coreRulesVersion + contentFingerprint + balanceFingerprint + scenarioFingerprint (null-placeholder); balanceFingerprint входит в `createJanuary1990RulesFingerprint(balance)` (теперь ОБЯЗАТЕЛЬНЫЙ параметр).
- Compiler: `balance-set.ts` + `balance-source-files.ts` (additive exports; коды BAL001_INCOMPLETE_TABLE, BAL002_INVALID_RANGE, BAL003_SLICE_ID_MISMATCH, BAL004_DUPLICATE_FAMILY, BAL005_FORBIDDEN_PROPERTY, DUPLICATE_PATH); `scripts/validate-balance.ts` + `pnpm balance:check` в `check:fast`.
- TypeBox-семья `packages/game-authoring-schema/src/balance-schema.ts` + parity-тест `tests/balance-authoring-schema-parity.test.ts` (35+ reject-мутаций, один Ajv2020).
- Application: `createJanuary1990Runtime({balance?})` (default = Core-снапшот); desktop пока на снапшоте (задокументированное ограничение пилота, см. BALANCE-LAYER.md «Ограничения пилота»).
- Свежий cross-family review проведён (glm-5.3, read-only): все 7 находок устранены (S1: максимумы активного баланса; S2: честные ограничения пилота в доке, sliceId==stem enforced, тавтологичный тест; S3: __proto__ диагностика, BAL004, тесты дубликатов).

### Wave 8 каркас (ЗАКРЫТ как каркас, uncommitted)

- `packages/game-simulation/` (deps: game-core + game-schema ТОЛЬКО; без fs/React/Tauri/time):
  - `simulation-types.ts`: `simulation-report-v1`, policies closed-set (`always-first-valid`, `learning-first`, `random-valid-v1`), terminal states (`completed|protocol-rejected|soft-lock`), invariants (`no-soft-lock`, `score-bounds`, `terminal-validity`);
  - `january-simulation.ts`: `createJanuary1990Simulation({context, balance, saveSchemaFingerprint})` → `simulate({seedStart, seedEnd, policies})` / `runOnce({seed, policyId})`; драйвер = чистый MonthRun (createMonthRunCheckpoint → runUntilBoundary → transitionMonthRun accept-decision); `runJanuaryCommandSequence` — общий путь для policy/repro (экспортирован);
  - `january-repro.ts`: `parseGameReproV1` (closed) + `replayJanuaryReproV1` → reproduced/not-reproduced/invalid/incompatible.
- `fixtures/gameplay/january-start.jsonc` (`gameplay-fixture-v1`: id/slice/seed/answers, intent-only); `fixtures/repro/january-1990-first-program.repro.json` (`game-repro-v1`, committed smoke-regression, reproduced ✓).
- `scripts/gamectl.ts`: команды `simulate run [--seeds a..b | --fixture <id>] [--policies all|список]` и `replay <path>`; envelope `runtime-human-gamectl-v1`; exit-коды: 0 ok / 1 semantic (`balance-invalid`, `repro-not-reproduced`) / 2 input (`invalid-filter`, `repro-not-found`, `repro-invalid`) / 3 incompatible (`repro-incompatible`) / 4 environment (`simulation-environment-unavailable`) / 5 internal. Обновлены GAMECTL.md, AGENTS.md, check-config, EXECUTION-STATUS (wave7+wave8 entries).
- Тесты: `tests/january-1990-simulation-properties.test.ts` (fast-check 4.9.0, 6 свойств: deterministic replay, resume-equivalence через `restoreMonthRunCheckpoint`, duplicate idempotency, no soft lock, score bounds, byte-stable report) + `tests/gamectl-simulation-cli.test.ts` (8 in-process CLI-тестов, temp-фикстуры в os.tmpdir()).
- Root devDeps += fast-check ^4.9.0, @runtime-human/game-simulation, @runtime-human/game-application, @runtime-human/game-content (для tsx-скриптов).

### Ключевые константы (для проверки согласованности)

- `rulesFingerprint`: `3a0f6d23ef98d8b67035ebdda85083ff612f3f0f5adc36278d7ffa5afe31cb76` (Wave 7 сдвинул с `dbc8a275…`; обе константы видны в docs/EXECUTION-STATUS.jsonc).
- `balanceFingerprint`: `aace2a1f5797c53ff893197ad3ad04708060efadd5a9dc638c73fb886b54f6f7`.
- Repro pinned `terminalCheckpointHash`: `10a2fbda782646a739e5a54b7c71cd5feee2b815886510fe62be47febd30314f` (runnerId `repro-v1`, seed 42, home-pc/read-and-run/inspect-listing).
- Валидация: `pnpm check:fast` → 0 (85 тест-файлов: 83 passed + 2 skipped; ~450 тестов). `pnpm gamectl doctor && pnpm gamectl content validate` → ok.

## 3. Грабли, собранные сессиями Wave 7-8 (экономь время)

1. **jsonc-parser `getNodeValue` возвращает объекты БЕЗ `Object.prototype`** → Core-парсеры с `requireRecord` (prototype check) падают с «must be a plain JSON object». Нормализация: `toPlainJson()` (см. `balance-set.ts`) — рекурсивный клон в plain-объекты. Переиспользуй паттерн.
2. **vitest.config.ts — явные include-списки проектов.** Каждый новый тест-файл ОБЯЗАН быть добавлен в проект (core-node/tooling-node/...), иначе «No test files found».
3. **Новый workspace-пакет — 8 точек регистрации:** `package.json` (+deps workspace:*), `tsconfig.json` (references), корневой `tsconfig.json` (references), `tests/tsconfig.json` (references), `tsconfig.base.json` (paths), vitest alias, `scripts/check-boundaries.mjs` ALLOWED_WORKSPACE_DEPENDENCIES, root devDeps (если нужен tsx-скриптам). Для скриптов: `scripts/tsconfig.json` — references + include нового скрипта, иначе TS6307.
4. **exactOptionalPropertyTypes: true** — опциональные поля `Readonly<{x?: T}>` не принимают `T | undefined` при передаче; либо `x?: T | undefined`, либо conditional spread.
5. **Repro/симуляционный checkpointHash зависит от runnerId** (`january-sim-<runnerId>-<seed>`), seed, контента и баланса. При смене контрактов пересчитывай pinned хэш probe-скриптом во Temp. Хэш в `fixtures/repro/*.repro.json` — это pinned golden.
6. **Смена rulesFingerprint двигает два pinned-места:** `tests/january-1990-month-run.test.ts` (~строка 499, правила+checkpoint-хэши; RNG-состояния НЕ меняются) и `fixtures/persistence/january-1990-persistence-flow-v1.json` (регенерация: `pnpm evidence:january:e2`).
7. **oxlint: no-unused-vars — ERROR** (не warning): неиспользуемые импорты/функции роняют `check:fast` немедленно. `preserve-caught-error` — pre-existing warnings, не трогать.
8. **pnpm fmt после правок** (oxfmt --check роняет гейт; gamectl.ts/format); `balance` добавлен в fmt-глобы, `fixtures/` — нет (json-фикстуры руками, LF).
9. **EOL/CR:** писать LF ([IO.File]::WriteAllText при починке content-артефактов); `git status` может показывать stat-only M — реальный дифф смотри `git diff --numstat`.
10. **balance:check — forcing function:** каноническое равенство `balance/**` ↔ `JANUARY_1990_DEFAULT_BALANCE`. Любой balance-твик = правка jsonc + синхронная правка снапшот-констант в Core В ТОМ ЖЕ изменении (данные, не алгоритмы). Полная независимость — после compiled-balance artifact pipeline (owner-решение; см. BALANCE-LAYER.md).
11. **CLI-тесты in-process** (import `runGamectlCli` из `scripts/gamectl.ts`), не спавн процесса; временные repro-файлы — только в `os.tmpdir()`, НЕ в репо.
12. **check-build-only-deps** сканирует только packages/+apps/ — fast-check в корне безопасен; BUILD_ONLY_OWNERS (ajv/jsonc-parser/typebox) не трогать.
13. Циклы content references — осознанный accept компилятора; models.json ассертится check-config'ом (не менять без owner-задачи).

## 4. РОЛИ СУБАГЕНТОВ (явное указание владельца — использовать в новой сессии)

В opencode-сессии доступен tool `task` (субагенты; `subagent_type: "general"`). Роутинг по `.studio/models.json`:

- **Реализация/поиск/тесты — субагенты `deepseek v4 flash`** (профиль `defaultWorker` = `opencode-go/deepseek-v4-flash`):
  - параллельная read-only разведка кода (промпт: «research-задача, НЕ пиши код, верни файл:строка + краткие выдержки»);
  - имплементация ИЗОЛИРОВАННЫХ файлов: новые тест-файлы, доки, CLI-обёртки, explain/compare-модули;
  - adversarial-тестирование CLI-поверхности (фикстуры — только в `os.tmpdir()`/`%TEMP%\opencode`, НЕ в репо).
- **Ревью — субагенты на модели `glm-5.3`** (роль `crossFamilyReviewer` из models.json; в сессии Wave 7-8 это была основная модель сессии — ревью-субагент наследует её): свежий контекст, read-only, формат находок `[ID] severity S0|S1|S2|S3 | file:line | проблема | evidence | фикс` (`.studio/finding-contract.md`). Ревьюить: дифф волны, канон-соответствие (AGENTS.md boundaries, §53 антипаттерны — особенно №2 giant constants, №3 formula language в balance), тестовое покрытие (тавтологии, слабые матрицы), Windows-специфику (EOL/CR, пути, temp-фикстуры). **Изменения January contracts / core public contracts / fingerprint-семантики требуют ОБЯЗАТЕЛЬНОГО fresh review glm-5.3 субагентом перед сдачей.**
- **Независимое тестирование** — `lunaTester` (`gpt-5.6-luna`, xhigh, readOnly, fresh) по `pnpm studio:route` — при полной волне/PR-подготовке (владелец решает).
- **Запреты (§49):** НЕ параллелить правки January rule contracts / compiler public contracts / game-schema / persistence schema / `packages/game-simulation/src/january-simulation.ts` между субагентами — имплементацию core-файлов ведёт ОДИН воркер (основная модель сессии); субагентам — только чтение, тесты, доки.
- Не менять `opencode.json` (check-config ассертит `permission.task="deny"`, `subagent_depth=0` — это про воркеров внутри Orca, не про сессию).
- Пример промпта ревью-субагента — см. как это сделано в Wave 7 (task-промпт с перечнем новых/изменённых файлов Wave, канон-файлами для сверки, 7 пунктами проверки и требованием вердикта ACCEPT/ACCEPT WITH FINDINGS/REJECT + находок по формату).

## 5. ЗАДАЧА: Wave 8 remainder (первоочередная)

### Цель
Достроить harness-контур Wave 8 до полного acceptance плана §48: «intentional bug найден property test → shrunk → exported repro → replayed deterministically → fixed → same repro passes».

### Шаг 0 — разведка
Прочитать `packages/game-simulation/src/*` (все 3 файла), `scripts/gamectl.ts` (команды simulate/replay), `tests/january-1990-simulation-properties.test.ts`, `fixtures/repro/january-1990-first-program.repro.json`, план §21.6, §22.3-22.4, §23.3, §24, §31.3.

### Создать
1. **`gamectl explain`** (§24): pure-модуль `quality-explain-v1` в game-simulation — входы (access/learning/response/roll) → contributions из таблиц баланса (base / learning / defectResponse по каждому измерению + roll) → result. CLI: `gamectl explain --repro <file>` (объяснить outcome из воспроизведённого прогона) и/или `--outcome january-1990 [--access … --learning … --response … --roll …]`. Trace не является authoritative state; reason codes стабильные (см. §24.3).
2. **`gamectl simulate compare`** (§21.6): сравнение двух `simulation-report-v1` артефактов (base vs candidate JSON-файлы) — metric/baseline/candidate/delta/threshold/disposition; warning budgets, не каждый delta — ошибка. Git-ref механику (запуск на base-коммите) НЕ делать — deferred, owner-решение.
3. **`gamectl replay --trace`** (§23.3): опциональный decision/materialization trace в выводе replay (не authoritative).
4. **`gamectl fixture list` / `fixture materialize`** (§31.3): список `fixtures/gameplay/*.jsonc` (валидация `gameplay-fixture-v1` closed-схемой — по образцу репро-парсера) и materialize → терминальная сводка прогона (seed/policy/terminalState/scores), без записи авторитетного состояния.
5. **End-to-end intentional-bug proof** (§48 acceptance): демонстрация цикла на изолированной ветке/фикстуре — свойство, ловящее инъецированный баг (например, сломанный max в `deriveJanuaryQualityScoreMaximums` или swap модификаторов), shrunk-минимизация fast-check, экспорт минимального repro в `fixtures/repro/` (или Temp для демо), replay → fix → same repro passes. Доказательство можно оформить тестом-документацией или отчётом; артефакт — `game-repro-v1`.

### Tests
- explain: contributions ≡ арифметике композиции (сверка с materializeJanuaryProgrammingState); rejected при неполных входах.
- compare: идентичные отчёты → disposition «unchanged»; превышение threshold → «regression»; NaN/отсутствующие метрики → invalid input.
- fixture: closed-schema reject-матрица; materialize детерминирован.
- Всё в существующих проектах vitest (не забыть include-списки!).

### Acceptance
См. §48; отчёт по `.studio/task-contract.md`; fresh review glm-5.3 обязателен (трогается gamectl + simulation contracts).

### Границы (§49)
`packages/game-simulation/**` и `scripts/gamectl.ts` — один воркер; субагентам deepseek — read-only разведка, новые тест-файлы, доки. `game-core` не трогать (explain строится ПОВЕРХ баланса, без правок композиции).

## 6. Если останется контекст — Wave 9 каркас (§54, приоритеты)

- **Skills v2:** активировать planned-скиллы по мере появления контрактов: `runtime-balance` (balance/, BALANCE-LAYER.md, balance:check — контракт уже есть), `runtime-simulation` (game-simulation + simulate/replay — есть), `runtime-persistence`, `runtime-harness` (по мере контрактов); `runtime-scenario` — ТОЛЬКО с Wave 10. Файлы: `.agents/skills/<name>/SKILL.md` + `.studio/skill-map.json` (status planned→active; check-skills.mjs валидирует). Скиллы роутируют работу, не переопределяют канон (§55).
- **Adaptive review по метрикам** (§35): `verification-policy.json` adaptiveReview + студийные метрики (finding-леджер `.studio/runtime/`), без ослабления обязательного fresh review для core-контрактов.
- **PERF-остатки:** duplicate typecheck в build-цепочке, cargo check/test overlap (PERF-01), sccache после baseline. Nx Cloud/remote cache — не сейчас.

## 7. Roadmap остаток (после Wave 9, приоритеты §54)

- **W10:** scenario v1 + analyzer (§26): authoring kind `scenario` в `content/1990s/programming/scenarios/`, closed node kinds (start/decision/provider/content-pool/gate/complete/terminal), reachability-валидатор (диагностики SCN001-SCN005), `gamectl scenario validate/graph`. Authoring-схема семьи scenario-v1 в game-authoring-schema + parity-тест (обязательное правило AUTHORING-TOOLCHAIN.md).
- **W11-12:** `apps/authoring` (§30) — только после headless parity (Wave 8 full).
- **W13:** DTCG tokens + Terrazzo — миграция без визуальных изменений.
- **W14:** Save Inspector / Dev Overlay (§32-33) — persistence devtools после safe dev boundary.

## 8. Верификация (focused; полный verify НЕ нужен)

```bash
pnpm check:fast                      # полный быстрый гейт (studio+docs+fmt+lint+tsc+content+balance+boundaries+test)
pnpm exec vitest run tests/january-1990-simulation-properties.test.ts --project core-node
pnpm exec vitest run tests/gamectl-simulation-cli.test.ts --project tooling-node
pnpm gamectl doctor && pnpm gamectl content validate
pnpm balance:check
pnpm gamectl simulate run --seeds 1..8 --json
pnpm gamectl replay fixtures/repro/january-1990-first-program.repro.json
pnpm exec tsc -b --pretty false      # точечно при необходимости
git diff --numstat                   # самопроверка: только заявленные файлы
```

## 9. Отчёт

Компактный блок `.studio/task-contract.md`: DONE/BLOCKED; Changed; Acceptance по критериям §5; Verification command→exit; Authority impact (canon-зоны → owner review; January/simulation contracts → обязательный fresh review glm-5.3 субагентом перед сдачей); Migration/content-ID impact; Risks; Question. **Не коммитить, не пушить.**
