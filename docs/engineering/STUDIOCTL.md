---
title: "studioctl — repository development control plane"
type: engine
status: draft
canon: true
updated: 2026-08-31
---

# studioctl — repository development control plane

`studioctl` — тонкий read-only facade над существующими `.studio`-контрактами Runtime Human. Он отвечает за repository-development inspection и не становится вторым оркестратором. `gamectl` остаётся game-semantic и не получает Git/GitHub semantics.

Запуск:

```sh
pnpm studioctl <command>
```

В Slice A реализованы только `capabilities` и `inspect`. Capability discovery обязан показывать только реально существующие команды exact target.

## `capabilities`

```sh
pnpm studioctl capabilities --json
```

Схема: `runtime-human-studio-capabilities-v1`.

Текущий installed command map:

- `capabilities: 1`;
- `inspect: 1`.

Текущие contracts:

- inspection: `runtime-human-change-inspection-v1`;
- task envelope: `runtime-human-task-envelope-v1`;
- V3 authority: `pnpm verify`;
- V4 authority: `pnpm verify:release`.

`verify` и `evidence` относятся к следующему slice и намеренно не рекламируются до появления работающей реализации.

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

Inspection может рекомендовать V3, но inspection сам по себе не является quality verdict или merge approval.

## Deferred после Slice A

Пока не реализованы и не должны предполагаться агентом:

- `studioctl verify` facade;
- `studioctl evidence` и `runtime-human-pr-evidence-v1`;
- `/rh ...` remote PR command protocol;
- remote command artifacts и durable chat checkpoint;
- `gamectl catalog inspect/search`;
- `gamectl schema list/show`;
- `gamectl fingerprint`.

Slice A не требует локального workstation, self-hosted runner, отдельного backend или MCP-wrapper.
