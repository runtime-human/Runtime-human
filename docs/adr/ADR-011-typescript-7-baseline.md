---
title: "ADR-011-typescript-7-baseline"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-011: TypeScript 7 как production baseline

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание:** DR-001, DR-002 и явное решение владельца проекта

## Контекст

TypeScript 7.0 выпущен как стабильный native compiler. Он обеспечивает существенно более быстрые full builds и language service и совместим с семантикой TypeScript 6 для типового React/Vite-проекта.

Прежний канон фиксировал TypeScript 6 и неблокирующий TypeScript-Go compatibility lane. После стабильного релиза это создаёт лишнюю двойственность и не позволяет использовать единый быстрый compiler/linter pipeline.

Ограничение TypeScript 7.0: публичный Compiler API ещё отсутствует. Некоторые инструменты, которые программно импортируют TypeScript, могут временно требовать compatibility package TS6.

## Решение

1. TypeScript 7.0.x является единственным production typechecker проекта.
2. Версия закрепляется точно в lockfile; автоматический major/minor drift запрещён.
3. `tsc -b` на TS7 является blocking проверкой локально и в CI.
4. TS7 LSP используется как основной editor language service.
5. Oxlint остаётся основным linter; полный ESLint/typescript-eslint baseline не вводится.
6. `oxlint --type-aware` входит в `pnpm verify` и CI после короткого compatibility burn-in на scaffold.
7. `@typescript/typescript6` допускается только для конкретного инструмента, которому нужен Compiler API. Такое использование:
   - локализуется в tooling package;
   - документируется;
   - не выполняет production typecheck;
   - имеет owner и условие удаления.
8. Новые зависимости, требующие удерживать весь проект на TS6, не принимаются без нового ADR.

## Compiler policy

Обязательны:

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

`rootDir`, `types`, `target`, `module` и `lib` задаются явно в package configs, чтобы не зависеть от изменения defaults.

## Последствия

Плюсы:

- один production compiler;
- быстрый full build и editor feedback;
- type-aware Oxlint без экспериментального второго контура;
- меньше CI времени и проще agent verification.

Минусы:

- возможна временная несовместимость tooling, использующего Compiler API;
- требуется явная настройка editor extension/LSP;
- переход требует clean build и проверки всех tsconfig references.

## Проверка внедрения

```text
pnpm exec tsc -b
pnpm exec oxlint
pnpm exec oxlint --type-aware
```

Каждая команда должна использовать закреплённую workspace-версию и выдавать одинаковый результат локально и в CI.

## Источники

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://oxc.rs/docs/guide/usage/linter/type-aware.html
