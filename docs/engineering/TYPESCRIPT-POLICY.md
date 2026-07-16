# TypeScript policy

## Production compiler

TypeScript 6 stable является блокирующим production typechecker до отдельного ADR о переходе.

## Compiler options

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noImplicitOverride": true,
  "composite": true,
  "incremental": true
}
```

Настройки могут различаться между package types, но ослабление strictness требует обоснования.

## Project references

Каждый package имеет собственный tsconfig и `composite`. Локальная проверка — `tsc -b`; clean CI — `tsc -b --force` или чистый cache.

## Oxlint

Blocking pipeline использует Oxlint без type-aware. Type-aware Oxlint/TypeScript-Go выполняется отдельной неблокирующей compatibility-задачей, пока стабильная TS7 линия не принята ADR.

## Типы

- branded IDs вместо plain string в domain APIs;
- readonly inputs/state;
- discriminated unions для outcomes/errors;
- `unknown` на внешних границах;
- runtime schemas для IPC/content/save DTO;
- запрет `any` без локального объяснения.

## Public API

Пакеты экспортируют только поддерживаемые контракты. Internal types не импортируются deep path. Breaking public change требует coordinated update consumers.

## Generated types

Generated schema/types содержат banner и не редактируются вручную. Source schema является единственным источником.

## Dates/numbers

JS `Date` не используется в core. Деньги — `bigint`. JSON boundary для bigint — decimal string с runtime validation.