---
title: "studioctl — repository development control plane"
type: engine
status: draft
canon: true
updated: 2026-08-31
---

# studioctl — repository development control plane

`studioctl` — тонкий read-only facade над существующими `.studio`-контрактами Runtime Human. Он отвечает за repository-development inspection/evidence и не становится вторым оркестратором. `gamectl` остаётся game-semantic и не получает Git/GitHub semantics.

Запуск:

```sh
pnpm studioctl <command>
```

Capability discovery обязан показывать только реально существующие команды exact target.

## `capabilities`

```sh
pnpm studioctl capabilities --json
```

Схема: `runtime-human-studio-capabilities-v1`.

Текущий installed command map:

- `capabilities: 1`;
- `inspect: 1`;
- `evidence: 1`.

Текущие contracts:

- inspection: `runtime-human-change-inspection-v1`;
- task envelope: `runtime-human-task-envelope-v1`;
- PR evidence: `runtime-human-pr-evidence-v1`;
- V3 authority: `pnpm verify`;
- V4 authority: `pnpm verify:release`.

## `inspect`

```sh
pnpm studioctl inspect --base <ref> --head <ref> --json
```

Схема: `runtime-human-change-inspection-v1`.

Команда:

- разрешает `base` и `head` в полные immutable commit SHA;
- получает deterministic sorted changed paths из exact Git diff;
- переиспользует существующие Studio primitives для zones, risk, skills, context budget, findings и verification;
- возвращает affected zones, primary zone, risk и authority-impact flags;
- возвращает budgeted `mustRead`/`mayRead`, `allowedWrite`, relevant unresolved findings и verification recommendation;
- показывает unmatched/ignored paths;
- не создаёт и не изменяет `.studio/runtime`.

`studioctl` не принимает PR number и не определяет GitHub review state. GitHub orchestration остаётся внешним слоем.

## `evidence`

```sh
pnpm studioctl evidence \
  --base <ref> \
  --head <ref> \
  --tested <ref> \
  --status <success|failure> \
  --exit-code <n> \
  --output .studio/runtime/evidence/runtime-human-pr-evidence-v1.json \
  --summary-output .studio/runtime/evidence/summary.md \
  --json
```

Схема: `runtime-human-pr-evidence-v1`.

Команда **не запускает verification**. Она принимает уже наблюдённый результат canonical V3, повторно строит exact inspection для base/head и упаковывает оба вида evidence в один versioned объект.

Ключевые identity поля имеют разный смысл:

- `baseSha` — commit, относительно которого рассматривается изменение;
- `headSha` — immutable candidate commit из PR head;
- `testedSha` — commit, который реально был checkout и прошёл `pnpm verify`.

Для GitHub Actions `pull_request` это различие существенно: `testedSha` обычно является synthetic merge commit, тогда как `headSha` остаётся raw PR head. Evidence не подменяет один SHA другим и всегда хранит все три явно.

Verification часть v1 закрыта:

```text
tier      = V3
authority = pnpm verify
status    = success | failure
result    = command + ok + numeric exit code
```

`success` допустим только с exit code `0`; `failure` — только с ненулевым кодом. Неполные SHA, неизвестный status, неверная inspection schema и malformed findings ledger завершаются fail-closed.

При обычном CLI-вызове команда остаётся read-only относительно tracked repository state. Файлы создаются только когда явно указаны `--output`/`--summary-output`; CI размещает их в `.studio/runtime/evidence/`, то есть в ephemeral runner state.

### GitHub PR evidence

Authoritative `foundation` workflow после canonical V3:

1. сохраняет настоящий V3 exit code/outcome;
2. строит `runtime-human-pr-evidence-v1` для PR base/head и фактически протестированного SHA;
3. добавляет compact Markdown в `GITHUB_STEP_SUMMARY`;
4. публикует JSON как Actions artifact с retention 7 дней;
5. если `pnpm verify` был RED, после публикации evidence возвращает job в RED — artifact не может превратить failure в success.

Evidence artifact предназначен для ChatGPT/reviewer как компактный independently-readable результат. Console log остаётся подробным источником для root-cause анализа, а не основным интерфейсом состояния PR.

Game fingerprints в `runtime-human-pr-evidence-v1` пока отсутствуют намеренно: они появятся только после отдельного работающего `gamectl fingerprint` contract.

## Game version contract

Версия игры начинается с `0.0.1` и изменяется только на единицу в третьем компоненте:

```text
0.0.1 -> 0.0.2 -> 0.0.3 -> ...
```

Это собственная release-numbering схема проекта; SemVer compatibility meaning из major/minor/patch позиций не выводится.

Canonical source:

```text
apps/desktop/src-tauri/tauri.conf.json > version
```

Обязательные mirrors:

- root `package.json > version`;
- `apps/desktop/package.json > version`;
- `apps/desktop/src-tauri/Cargo.toml [package].version`;
- package entry `runtime-human-desktop` в `Cargo.lock`.

Read-only проверка:

```sh
pnpm version:check
```

Она входит в `check:fast` и запрещает mirror drift, prerelease/build metadata и любую форму кроме `0.0.N`, где `N >= 1`.

Explicit bump:

```sh
pnpm version:bump
pnpm version:bump -- 0.0.2
```

`version:bump` вычисляет ровно `N + 1`, обновляет все mirrors и отклоняет target, если это не непосредственная следующая версия. Он не создаёт commit, tag или GitHub Release.

## Verification authority

`studioctl` не переопределяет verification policy. V3 остаётся только `pnpm verify`, V4 — `pnpm verify:release`. Normal PR V3 исполняется GitHub-hosted `foundation` workflow.

Inspection может рекомендовать V3, но inspection сам по себе не является quality verdict или merge approval. Evidence описывает уже выполненный V3 и тоже не является независимым merge authority.

## Deferred после evidence slice

Пока не реализованы и не должны предполагаться агентом:

- `studioctl verify` facade;
- cheap-vs-candidate CI split;
- `/rh ...` remote PR command protocol;
- автоматическое durable checkpoint management;
- `gamectl catalog inspect/search`;
- `gamectl schema list/show`;
- `gamectl fingerprint`.

Control-plane не требует локального workstation, self-hosted runner, отдельного backend или MCP-wrapper.
