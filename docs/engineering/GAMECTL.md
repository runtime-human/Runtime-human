---
title: "gamectl — headless game development CLI"
type: engine
status: draft
canon: true
updated: 2026-08-31
---

# gamectl — headless game development CLI

`gamectl` — headless API игры для агентов (P-03 headless parity, P-04 structured output). Это thin CLI shell над `@runtime-human/game-devtools` и `@runtime-human/game-simulation`: CLI не содержит gameplay-логики — только парсинг аргументов, вызовы библиотек, форматирование и exit codes. Без CLI-фреймворков: используется `util.parseArgs` из Node 24 (`strict: true`, `allowPositionals: true`).

Запуск: `pnpm gamectl <command>`. В Slice A package entry указывает на `tsx scripts/gamectl-entry.ts`: entry обрабатывает только exact-target `capabilities`, а все существующие game-semantic команды делегирует в `scripts/gamectl.ts`. Ни entry, ни engine не принимают PR/GitHub semantics. Корень репозитория для существующих game-команд по умолчанию — репозиторий, содержащий engine; переопределяется `--root <path>`.

## Command tree v1

- `capabilities` — exact-target discovery реализованных команд и versioned game contracts; result schema `runtime-human-gamectl-capabilities-v1`;
- `doctor` — проверки окружения и контента;
- `catalog list [--kind <kind>] [--domain <domain>] [--era <era>]`;
- `catalog show <id>`;
- `catalog refs <id>`;
- `catalog impact <id>`;
- `content validate`;
- `content source <id>`;
- `simulate run [--seeds <start>..<end>] [--fixture <id>] [--policies all|<id,id>]` — детерминированные прогон January 1990 через closed policies (`always-first-valid`, `learning-first`, `random-valid-v1`), отчёт `simulation-report-v1` (`--seeds` и `--fixture` взаимоисключающие; fixture читается из `fixtures/gameplay/<id>.jsonc`, `gameplay-fixture-v1` closed-парсером);
- `simulate compare --base <report.json> --candidate <report.json> [--threshold <metric>=<n>]...` — сравнение двух `simulation-report-v1` артефактов (файл может содержать как сам отчёт, так и `--json`-envelope `simulate run` — `result.report` разворачивается автоматически). Вывод: 13 метрик (счётчики + score bounds) со схемой `metric/baseline/candidate/delta/threshold/disposition`; dispositions: `unchanged | improved | within-budget | regression | not-comparable`. Информационные метрики (`blockingDecisions`, `stateTransitions`, score bounds) — всегда warnings без acceptance threshold; adverse-дельты по `completedRuns`/`monthsPlayed`/`softLocks`/`terminalFailures`/`invalidStates` при превышении threshold — regression. Git-ref механика (запуск на base-коммите) — deferred, owner-решение;
- `fixture list` — список `fixtures/gameplay/*.jsonc` через closed-парсер `gameplay-fixture-v1`; битый fixture — semantic failure (`fixture-invalid`), а не пропуск;
- `fixture materialize <id> [--policy all|<id,id>]` — терминальная сводка прогона (seed/policy/terminalState/scores) для seed фикстуры; явные `answers` фикстуры (closed intent: access/learning/response) переопределяют ответы policy, отсутствующие kind'ы берутся из policy; авторитетное состояние не пишется и не возвращается;
- `replay <path/*.repro.json> [--trace]` — воспроизведение `game-repro-v1` артефакта поверх активного ruleset (`fixtures/repro/`); `--trace` добавляет в вывод `game-replay-trace-v1` — decisions (requestId/decisionId/answer) и materialized quality scores завершённого прогона; trace не является authoritative state;
- `explain (--repro <file> | --outcome january-1990 --access <route> --learning <practice> --response <response> --roll <n>)` — structured explanation `quality-explain-v1` (ruleVersion `january-quality-v1`): contributions из таблиц активного баланса (`quality.base`, `quality.access.*`, `quality.learning.*`, `quality.response.*`, `quality.roll`) → result. В режиме `--repro` прогон воспроизводится и объясняется фактический outcome (roll выводится из quality scores); в режиме `--outcome` — явные closed-входы. Trace/explanation не являются authoritative state; reason codes стабильны и локализация строится поверх них.

### Exact-target capabilities

`pnpm gamectl capabilities --json` использует существующий transport envelope `runtime-human-gamectl-v1`, но result имеет отдельную схему `runtime-human-gamectl-capabilities-v1`.

Capability map содержит только команды, реально реализованные на этом head. В Slice A он включает `capabilities`, `doctor`, текущие `catalog.*`, `content.*`, `simulate.*`, `fixture.*`, `replay` и `explain`. Planned-команды не должны появляться в ответе заранее.

Контракт diagnostic остаётся `runtime-human-diagnostic-v1`.

Planned после Slice A (не реализовано, не вызывать): `catalog inspect`, deterministic `catalog search`, `schema list/show`, `fingerprint`, семантическое расширение `catalog impact` (risk/owner-слои), `balance`, `scenario`, `save`, `repro validate`.

## Output contract

Три режима вывода:

- human (по умолчанию): компактные строки; `catalog list` печатает заголовок `N entries` и строки `<id>\t<kind>\t<era>/<domain>\t<path>`; `content validate` — `content OK (N entries)` либо строки диагностики; `content source` — `<id> -> <path>`;
- `--json`: ровно один JSON-объект (envelope) на stdout:

  ```json
  {
    "schemaVersion": "runtime-human-gamectl-v1",
    "command": "catalog.list",
    "ok": true,
    "result": {}
  }
  ```

  При ошибке: тот же envelope с `"ok": false` и `"error": { "code", "message", "diagnostics"? }` (`diagnostics` — только когда есть). `command` — одно из `capabilities`, `doctor`, `catalog.list`, `catalog.show`, `catalog.refs`, `catalog.impact`, `content.validate`, `content.source`, `simulate.run`, `simulate.compare`, `fixture.list`, `fixture.materialize`, `replay`, `explain`; при неизвестной команде или ошибке разбора аргументов — `"unknown"`. Исключения при non-ok: `doctor` и `simulate compare` возвращают `result` с отчётом (без `error`) — отчёт и есть evidence; `simulate compare` с regressions даёт `ok: false`, `exit 1` и полный compare-отчёт.
- `--quiet`: минимальный вывод для `catalog list` (только id), `content validate`/`doctor` (итог `OK`/`FAIL`); для `show`/`refs`/`impact`/`source` принимается, но не меняет вывод.

Структурированные диагностики следуют контракту `runtime-human-diagnostic-v1`: `code`, `severity` (`error|warning|info`), `category` (`content|catalog|balance|scenario|environment`), `message` и опциональные `entityId`, `path`, `line`, `column`, `pointer` (JSON Pointer), `invariant`, `fixKind`.

## Exit codes

| Код | Значение |
|---|---|
| 0 | успех |
| 1 | semantic failure: контент невалиден (`content-invalid`, `SOURCE_ROOT_INVALID`), `.studio/zones.json` не разбирается (`zones-invalid`), content-check в `doctor` не прошёл; balance-файлы невалидны для симуляции (`balance-invalid`); expected-результат repro не воспроизвёлся (`repro-not-reproduced`); compare нашёл regressions (`ok:false` + compare-отчёт, без `error`); committed gameplay-фикстура не разбирается closed-схемой (`fixture-invalid`); explain получил непрогранённый/несовпадающий outcome (`explain-requires-completed-run`, `explain-outcome-mismatch`) |
| 2 | invalid input: неизвестная команда, неизвестный id, неверный `--kind`/пустой `--domain`/`--era`, несуществующий или пустой `--root` (`invalid-root`), usage/parse-ошибки (`unknown-command`, `usage-error`, `unknown-entity`, `invalid-kind`, `invalid-filter`, `repro-not-found`, `fixture-not-found`, `report-not-found`); repro-контракт не разбирается (`repro-invalid`); report-артефакт не разбирается closed-схемой (`report-invalid`); compare поверх разных seeds/policies (`compare-scope-mismatch`) или невалидный threshold (`compare-threshold-invalid`); explain без обязательных входов или с невалидными значениями (`explain-input-missing`, `explain-input-invalid`) |
| 3 | incompatible schema/ruleset: repro нацелен на другой ruleset fingerprint (`repro-incompatible`); compare поверх разных ruleset/content fingerprints (`compare-incompatible`) |
| 4 | environment failure: `doctor` — любой check с severity `environment` (включая битые JSON студийных конфигов); отсутствует `content/content.config.json` (`config-missing`); недоступна среда симуляции (`simulation-environment-unavailable`); файл существует, но нечитается (`file-unreadable` — EPERM/EISDIR и т.п.; ENOENT остаётся кодом 2); приоритет 4 над 1 |
| 5 | internal error: неожиданное исключение (`error.code = "internal-error"`) |

## Замечания об окружении Windows

- `--json` требует «голого» флага: `--json=true` parseArgs отвергает до определения режима (exit 2, envelope не выдаётся).
- При запуске через `pnpm` на ненулевом exit pnpm дописывает служебные строки в stdout — машинный парсинг legacy game-команд ведите с вызова `node --import tsx scripts/gamectl-entry.ts` напрямую либо парсингом от первого `{`.
- Transport `cmd` (pnpm→tsx) искажает особые argv (переводы строк режут команду, `%VAR%` разворачивается, есть лимит длины строки) — для таких аргументов вызывайте node напрямую.
- zones-matcher нормализует `\` → `/` и отбрасывает пустые и `.`-сегменты; сравнение сегментов case-sensitive.
- tests-скан `catalog impact` пропускает симлинки и нечитаемые файлы без diagnostics.

## Источники каталога

Каталог строится из графа content compiler (`projectContentCatalog`): входные точки — `content/content.config.json` (`sourceRoots`). Обратные ссылки (`incoming`, `consumers`) выводятся из `references` записей; `tests` — из скана каталога `tests/` по подстроке id; `zones` — из `.studio/zones.json` (`loadZoneDefinitions`).

## Примеры

```sh
pnpm gamectl capabilities --json
pnpm gamectl catalog list --json
pnpm gamectl catalog show core.skill.debugging
pnpm gamectl catalog refs core.skill.debugging
pnpm gamectl catalog impact core.skill.debugging --json
pnpm gamectl content validate
pnpm gamectl content source core.skill.debugging
pnpm gamectl doctor
pnpm gamectl simulate run --seeds 1..16 --json
pnpm gamectl simulate run --fixture january-start
pnpm gamectl simulate compare --base .studio/runtime/base.json --candidate .studio/runtime/candidate.json
pnpm gamectl fixture list
pnpm gamectl fixture materialize january-start
pnpm gamectl replay fixtures/repro/january-1990-first-program.repro.json --trace
pnpm gamectl explain --repro fixtures/repro/january-1990-first-program.repro.json
pnpm gamectl explain --outcome january-1990 --access home-pc --learning edit-and-debug --response inspect-listing --roll 1
```

## Ограничения v1

- read-only: команда не мутирует репозиторий (сборка/запись артефактов — `pnpm content:build`, не `gamectl`);
- `capabilities` — discovery, а не feature negotiation: отсутствующая команда считается отсутствующей и не должна угадываться агентом;
- tests-скан для `catalog impact` ищет подстроку id по каталогу `tests/` — без AST-анализа;
- references-циклы компилятор v1 принимает без диагностики (семантика циклов — решение content-зоны);
- zones сопоставляются по путям из `.studio/zones.json`;
- simulate compare принимает только локальные файлы отчётов (git-ref механика — deferred, owner-решение);
- fixture materialize доступен только для slice `january-1990` (единственный materializer);
- explain/trace не являются authoritative state и не входят в checkpoint hash;
- planned: `catalog inspect/search`, schema discovery, fingerprint, семантическое расширение `catalog impact`, `balance`, `scenario`, `save`.
