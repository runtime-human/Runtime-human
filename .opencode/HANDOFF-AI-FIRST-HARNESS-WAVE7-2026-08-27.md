# HANDOFF — Runtime Human «AI-First Harness»: реализация Wave 7 (+ Wave 8 в перспективе)

Дата: 2026-08-27 · Репозиторий: `C:\Reposit\Runtime-human` · HEAD: `42d08b1e6519d402ad742c4583b0f9cf5c217f2b` (локальный, не запушен)
Следующая сессия: реализовать **Wave 7 (balance pilot)** по плану §48/§20, затем при запасе контекста — Wave 8. Отчитаться по `.studio/task-contract.md`.

---

## 1. Источники (читать, не дублировать)

- Master plan (4400 строк): `.opencode/Runtime-Human-AI-First-Game-Development-Implementation-Plan-2026-08-24.md`
  - Wave 7: §48 (~строки 3643-3682). Balance layer: §20 (~строки 1770-1788). Ruleset manifest: §20.5.
  - Wave 8: §48 (~3684-3734). Simulation: §21. fast-check: §22. Repro: §23. Explain: §24. Fixtures: §25.
  - Anti-patterns: §53. Self-review чеклист: §56. Параллелизация: §49. PR-схема: §50.
- Контракт воркера: `.studio/task-contract.md` (блок `DONE|BLOCKED|FAILED …`).
- Правила репо: `AGENTS.md` (уже сжат, 102 строки), `GAME.md`, `docs/INDEX.md`, `docs/engineering/VERIFICATION-TIERS.md`, `docs/engineering/AUTHORING-TOOLCHAIN.md`, `docs/engineering/GAMECTL.md`.
- Прошлые хэндоффы: `.opencode/HANDOFF-AI-FIRST-HARNESS-WAVE0-2026-08-24.md` (устарел по факту — Wave 0-6 закрыты).

## 2. Факт: состояние репозитория на передачу

**Waves 0-6 закрыты.** Коммит `42d08b1` (= Waves 0-4: canon alignment, task envelope, exec/affected/verify, Nx minimal, Vitest 7 проектов + Storybook browser). **Поверх него — НЕЗАОКОММИЧЕННОЕ рабочее дерево** с Waves 5-6 (владелец коммитит сам; не merge/push/commit):

Wave 5 (Game Catalog + gamectl) — новые файлы:
- `packages/game-devtools/` — lib: `catalog/content-catalog.ts` (loadContentCatalog), `catalog/catalog-queries.ts` (list/show/refs/impact), `catalog/zones.ts` (glob-matcher), `diagnostics/gamectl-diagnostics.ts` (runtime-human-diagnostic-v1), `doctor/doctor.ts`; deps: только `game-content-compiler`.
- `packages/game-content-compiler/src/content-catalog-projection.ts` — проекция каталога c `sourcePath`; **общий pipeline** `validateContentSet()` в `compile-content-sources.ts` (одна authority: и compileContentSources, и проекция идут через него — принцип «one invariant → one authority»).
- `scripts/gamectl.ts` — thin CLI (`util.parseArgs`, `--json`/`--quiet`, envelope `runtime-human-gamectl-v1`, exit-коды: 0 ok / 1 semantic (`content-invalid`, `SOURCE_ROOT_INVALID`, `zones-invalid`) / 2 invalid input (`invalid-root`, `invalid-filter`, `unknown-entity`, `usage-error`, `unknown-command`, `invalid-kind`) / 3 reserved / 4 environment (`config-missing`, doctor) / 5 internal).
- `docs/engineering/GAMECTL.md` + диагностический контракт c `pointer` (JSON Pointer) в `ContentDiagnostic`/`StructuredDiagnosticV1`.
- Тесты: `tests/gamectl-cli.test.ts` (22), `tests/game-devtools-catalog.test.ts`, `tests/content-catalog-projection.test.ts` (→ content-node проект).

Wave 6 (TypeBox authoring schema pilot):
- `packages/game-authoring-schema/` — `typebox 1.3.19` (exact pin), семья `content-source-v1`: `ContentSourceAuthoringSchemaV1` (JSON Schema 2020-12, `$defs`/`$ref`) + `ContentSourceAuthoringDocument` (Static).
- `tests/authoring-schema-equivalence.test.ts` — accept-parity (3 фикстуры + все `content/**`, ≥25) + reject-parity (38 мутаций) под одним Ajv2020. **Эквивалентность доказана.** Известные допустимые отличия генерата: `anyOf`-of-consts вместо `enum`, `anyOf` вместо `oneOf` (ветки disjoint).
- `docs/engineering/AUTHORING-TOOLCHAIN.md`; компилятор на генерат ещё НЕ переключён (family-by-family; следующий шаг — switch content-source семьи в `content-source-schema.ts` после owner-решения).
- Build-only изоляция: `scripts/check-build-only-dependencies.mjs` → owners-map (`ajv`/`jsonc-parser` → compiler; `typebox` → game-authoring-schema).

Инфра-правки в диффе: `AGENTS.md` (tool router: gamectl v1; authoring-schema), `docs/EXECUTION-STATUS.jsonc` (wave0-6 → complete, обновлён), `.studio/zones.json` + `context-map.json` (content += game-authoring-schema; tooling += gamectl.ts, game-devtools), `scripts/studio/check-config.mjs` (required += GAMECTL/AUTHORING-TOOLCHAIN/game-devtools/game-authoring-schema/gamectl.ts), `scripts/check-boundaries.mjs` (game-devtools, game-authoring-schema), `package.json` (`gamectl` script; devDeps +ajv 8.20.0 +jsonc-parser 3.3.1 для тестов), `tests/studio-routing.test.ts` (выровнен под canon: lunaReviewer=`max`, r3Reviewer=`medium` — на HEAD тест был красным).

**Верификация на передачу:** `pnpm check:fast` → 0 (79 тест-файлов, 422 теста). V3/V4 (`pnpm verify`, `verify:release`) НЕ запускались (serialized human gate — перед PR решает владелец/Producer).

## 3. Грабли, собранные сессией (экономь время)

1. **EOL/oxfmt**: worktree исторически CRLF, `.gitattributes` требует `eol=lf` (42d08b1). После правок запускай `pnpm fmt`; `git status` может показывать сотни stat-only M (реальный дифф смотри `git diff --numstat`).
2. **content:check — сырые байты**: если падает с `changed:…` у `apps/desktop/public/content/*.json` — проверь CR-байты; нормализация: перезаписать файл с LF ([IO.File]::WriteAllText, UTF8 без BOM).
3. **Новые доки** → `node scripts/build-toc.mjs` (регенерация MANIFEST/CATALOG), затем `pnpm docs:check`. Frontmatter: `title/type/status/canon/updated`; для `docs/engineering/*` type=`engine`.
4. **check-config.mjs** — forcing function: новые конфиги/доки/скрипты добавляй в `required` + пакеты в boundaries owners-map ОДНИМ изменением; зоны — в `zones.json` И `context-map.json` (чекер сверяет только id, но пути держи симметрично).
5. Тест-спавн CLI: `node --import tsx scripts/gamectl.ts` (env-хак TSX_TSCONFIG_PATH больше не нужен — workspace dep в корне).
6. `tests/**` матчится в зону qa-performance (R1) — новые тесты не попадают в tooling; это норма.
7. Циклы в content references — **осознанный** accept компилятора (тест `accepts a reachable reference cycle`); не «чинить» без ADR.
8. models.json жёстко ассертится check-config'ом: defaultWorker=`opencode-go/deepseek-v4-flash`, lunaTester/Reviewer=`gpt-5.6-luna` (xhigh/max, readOnly, fresh), r3Reviewer=`gpt-5.6-sol` (medium), crossFamilyReviewer=`opencode-go/glm-5.3`, forbiddenModels=kimi-k3. Не менять без owner-задачи.

## 4. РОЛИ СУБАГЕНТОВ (явное указание владельца)

В сессии доступен tool `task` (субагенты opencode). Использовать так:

- **Реализация/поиск/тесты — субагенты `deepseek v4 flash`** (профиль `defaultWorker` из `.studio/models.json` = `opencode-go/deepseek-v4-flash`): параллельная разведка кода (research-промпты, «не пиши код»), имплементация изолированных файлов (тесты, доки, CLI-обёртки), adversarial-тестирование нового CLI-поверхности (фикстуры — только в `C:\Users\<user>\AppData\Local\Temp\opencode`, НЕ в репо).
- **Ревью — субагенты на основной модели сессии `glm-5.3`** (роль `crossFamilyReviewer` из models.json): свежий контекст, read-only, формат находок `[ID] severity S0|S1|S2|S3 | file:line | проблема | evidence | фикс` (как в `.studio/finding-contract.md`). Ревьюить: дифф волны, канон-соответствие (AGENTS.md boundaries, §53 антипаттерны), тестовое покрытие, Windows-специфику.
- **Запреты**: НЕ параллелить правки January rule contracts / compiler public contracts / game-schema / persistence schema между субагентами (§49) — Wave 7 трогает January contracts ⇒ имплементацию core-файлов ведёт ОДИН воркер; субагентам — только чтение, тесты, доки.
- Не менять `opencode.json` (check-config ассертит `permission.task="deny"`, `subagent_depth=0` — это про воркеров внутри Orca, не про сессию).

## 5. ЗАДАЧА: Wave 7 — Balance layer pilot (план §48 «Wave 7», §20)

### Цель
Обычный balance tweak НЕ требует правки `game-core` TypeScript: tuning-константы January переезжают в canonical `balance/*.jsonc` (closed schema), алгоритмы остаются в Core.

### Шаг 0 — разведка (обязательна, до кода)
Прочитать `packages/game-core/src/january-1990/january-outcome.ts`, `january-reason-codes.ts`, `january-provisional-state.ts`, `tests/january-1990-balance-trace.test.ts`, `fixtures/balance/january-1990-bounded-trace-v1.json`, `tests/january-1990-contracts.test.ts`, `createJanuary1990RulesFingerprint` (january-1990/index.ts). Определить: какие константы — чистый tuning (base scores, access/learning/defect modifiers, roll bounds), а что — алгоритм (композиция, RNG, state transition). Только tuning выносим. Если разделение не подтверждается для какого-то домена — НЕ создавать файл (план §48: «только если анализ подтверждает»).

### Создать
1. `balance/quality/january-1990.jsonc` (+ при подтверждении `balance/skill-evidence/january-1990.jsonc`) — closed schema `quality-balance-v1` по форме §20.3 (base/access/...; enum-полные таблицы; derived maxima НЕ хранить, если выводимы).
2. Схему семьи `quality-balance-v1` в `packages/game-authoring-schema` (TypeBox; parity-тест по образцу `authoring-schema-equivalence.test.ts`, если появляется второйauthority-источник схемы).
3. `RulesetManifestV1` (§20.5): `coreRulesVersion` + `contentFingerprint` + `balanceFingerprint` (+`scenarioFingerprint` placeholder пока без scenario). Balance fingerprint входит в `createJanuary1990RulesFingerprint` (детерминированно, canonical JSON).
4. Compiler: загрузка/валидация balance-файлов (exhaustive enum mapping, диапазоны, derived limits) — расширение авторинг-реестра компилятора БЕЗ ломки public contracts (additive exports; `validateContentSet` не трогать — это content pipeline).

### Изменить
5. January outcome composition в Core: чтение compiled balance (передаётся как immutable input, НЕ глобальный mutable state; Core остаётся pure — balance data приходит параметром от application/compiler).
6. Goldens/тесты: **January golden outputs обязаны остаться байт-идентичными при эквивалентных default значениях** — это главный критерий эквивалентности миграции.

### Tests (план §48)
- goldens unchanged при defaults; incomplete enum table → reject; invalid range → reject; derived maxima exact; fingerprint меняется от balance-изменения; design-token/не-gameplay изменение fingerprint НЕ двигает.

### Acceptance
Balance tweak = правка `balance/**/*.jsonc` + fingerprint/симуляция-свидетельство, без TypeScript в Core. (Headless simulation compare — Wave 8; в Wave 7 свидетельство = focused January tests + fingerprint.)

### Границы (§49 — жёстко)
January rule contracts / compiler public contracts — один воркер, без параллельных субагентных правок этих файлов. Субагенты: разведка (read-only), новые тест-файлы, доки, red-team прогонов `gamectl`.

## 6. Если останется контекст — Wave 8 каркас (детали §21-25, §48)

- `packages/game-simulation` (deps: game-core, game-schema, compiled content; БЕЗ React/Tauri/fs/time), `fixtures/gameplay/`, `fixtures/repro/`, fast-check; `gamectl simulate run|compare`, `replay`, `explain` — расширяют `game-devtools`+CLI по контракту §31 (envelope, exit-коды, `--json`).
- Первые свойства на January MonthRun: deterministic replay, resume equivalence, duplicate idempotency, no soft lock, score bounds (§48 Wave 8 «First properties»).

## 7. Верификация Wave 7 (focused; полный verify НЕ нужен)

```bash
pnpm check:fast                      # полный быстрый гейт (включая новые тесты)
node scripts/build-toc.mjs           # после новых доков
pnpm gamectl doctor && pnpm gamectl content validate   # smoke
pnpm exec tsc -b --pretty false      # если нужно точечно
git diff --numstat                   # самопроверка: только заявленные файлы
```

## 8. Отчёт

Компактный блок `.studio/task-contract.md`: DONE/BLOCKED; Changed; Acceptance по критериям §5; Verification command→exit; Authority impact (canon-зоны → owner review; January contracts → обязательный fresh review glm-5.3 субагентом перед сдачей); Migration/content-ID impact; Risks; Question. **Не коммитить, не пушить.**

## 9. После Wave 7-8 (roadmap остаток, приоритеты §54)

W9: skills v2 (активировать planned-скиллы balance/simulation/persistence/harness по мере появления контрактов; runtime-scenario — только с Wave 10) + adaptive review по метрикам. W10: scenario v1 + analyzer. W11-12: apps/authoring (после headless parity). W13: DTCG tokens + Terrazzo (дизайн-миграция без визуальных изменений). W14: Save Inspector/Dev Overlay. PERF-остатки: duplicate typecheck в build-цепочке, cargo check/test overlap (PERF-01), sccache после baseline. Nx Cloud/remote cache — не сейчас.
