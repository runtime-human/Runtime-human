---
title: "Случайность"
type: simulation
status: draft
canon: true
updated: 2026-08-31
---

# Случайность

## Interface

```ts
interface RandomSource {
  nextUint32(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  weightedIndex(weights: readonly number[]): number;
  fork(scope: string): RandomSource;
  snapshot(): RandomState;
}
```

Core не зависит от конкретной библиотеки PRNG. Adapter фиксирует algorithm/version в DeterminismManifest.

## Seed

Новый сейв получает seed при создании. Seed сохраняется и экспортируется для воспроизведения. Пользовательский challenge seed может быть добавлен позднее.

## Forking

Fork использует parent state + canonical scope hash. Scope names являются стабильным API и не переименовываются без rules version bump.

### Hierarchical derivation foundation

Для новых изолированных RNG domains Game Core предоставляет additive contract `hierarchical-v1`: child state выводится из immutable root RNG state, versioned derivation manifest и полного canonical domain path. Одинаковые root state + path обязаны давать одинаковый child stream; создание или потребление sibling stream не должно менять результат другого sibling.

Domain path является частью deterministic API и должен строиться из стабильных semantic identities (period/subsystem/entity/purpose), а не из порядка обхода, timestamp или process state.

Этот contract пока не переинтерпретирует существующий `fork(scope)`, January MonthRun или сохранённые checkpoints. Authoritative cutover требует отдельной compatibility/fingerprint смены и evidence; до неё `hierarchical-v1` используется как additive foundation для дальнейшей изоляции RNG domains.

## Weighted choice

1. Проверить веса.
2. Исключить недоступные candidates до random call.
3. Отсортировать по stable ID.
4. Выбрать integer range.
5. Записать выбор в event trace.

## Save-scumming

Игра не должна агрессивно наказывать перезагрузку, но результат уже начатого MonthRun фиксируется сохранённым RNG state. Перезапуск draft не создаёт новый бросок.

## Cosmetic randomness

Фразы, визуальные вариации и неавторитетные детали используют отдельный fork, чтобы их изменение не меняло карьерные outcomes.

## Тесты

- одинаковый seed;
- snapshot/restore;
- fork independence;
- weighted edge cases;
- zero weights;
- invalid ranges;
- golden sequences для algorithm version.
