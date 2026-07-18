---
title: "RANDOMNESS"
type: simulation
status: draft
canon: true
updated: 2026-07-18
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