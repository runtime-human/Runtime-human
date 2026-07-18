---
title: "TypeScript policy"
type: engine
status: draft
canon: true
depends_on: [ADR-011]
updated: 2026-07-18
---

# TypeScript policy

## Production compiler

TypeScript 7 stable является единственным блокирующим production typechecker. Версия закрепляется точно в workspace и lockfile.

Нормативное решение: [ADR-011](../adr/ADR-011-typescript-7-baseline.md).

## Compiler options

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noImplicitOverride": true,
  "noUncheckedSideEffectImports": true,
  "composite": true,
  "incremental": true
}
```

`rootDir`, `types`, `target`, `module`, `moduleResolution` и `lib` задаются явно в package configs. Проект не полагается на changing defaults compiler major versions.

Настройки могут различаться между package types, но ослабление strictness требует обоснования и architecture review.

## Project references

Каждый package имеет собственный tsconfig и `composite`. Локальная проверка — `tsc -b`; clean CI — `tsc -b --force` либо build на чистом cache key.

Generated declaration outputs не коммитятся без отдельного решения. Cache не является источником истины.

## Oxlint

### Fast lane

```text
oxlint
```

Используется в pre-commit/`check:fast` для быстрого feedback.

### Full lane

```text
oxlint --type-aware
```

Входит в `verify` и blocking CI после compatibility burn-in scaffold. Type-aware lane не заменяет `tsc -b`.

## Ограничение Compiler API в TypeScript 7.0

TypeScript 7.0 не предоставляет публичный Compiler API.

Поэтому:

- не вводится `typescript-eslint` baseline;
- tooling не импортирует `typescript` программно без необходимости;
- `@typescript/typescript6` разрешён только в изолированном tooling package;
- использование compatibility package документирует consumer, причину, owner и условие удаления;
- TS6 compatibility executable не выполняет production typecheck.

## Типы

- branded IDs вместо plain string в domain APIs;
- readonly inputs/state;
- discriminated unions для outcomes/errors;
- `unknown` на внешних границах;
- runtime schemas для IPC/content/save DTO;
- запрет `any` без локального объяснения;
- integer/fixed-point branded types в authoritative core.

## Public API

Пакеты экспортируют только поддерживаемые контракты. Internal types не импортируются deep path. Breaking public change требует coordinated update consumers, schemas, fixtures и migration review.

## Generated types

Generated schema/types содержат banner и не редактируются вручную. Source schema является единственным источником.

## Dates/numbers

JS `Date` не используется в core. Деньги — `bigint`. JSON boundary для bigint — canonical decimal string с runtime validation. Floating point не используется в authoritative domain/simulation state.

## Verification

```bash
pnpm exec tsc -b
pnpm exec oxlint
pnpm exec oxlint --type-aware
```

Результаты должны быть воспроизводимы локально и в CI с закреплённой workspace-версией.