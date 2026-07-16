# Детерминированность

## Цель

Одинаковые входы обязаны давать одинаковый результат на поддерживаемых платформах и версиях rules engine.

## DeterminismManifest

```ts
type DeterminismManifest = Readonly<{
  rulesVersion: string;
  rngAlgorithm: 'xoshiro256ss-v1';
  hashAlgorithm: 'sha256-v1';
  numericModel: 'fixed-point-v1';
  calendarModel: 'gregorian-v1';
  candidateSort: 'stable-id-ascending-v1';
}>;
```

Manifest сохраняется в сейве, MonthRun draft и golden trace.

## Обязательные правила

- `Math.random()` запрещён.
- `Date.now()` и системное время запрещены в core.
- Locale-dependent сортировка запрещена.
- Event candidates сортируются по stable ID перед weighted choice.
- Порядок файлов, JSON properties и map iteration не используется как неявный приоритет.
- Все authoritative коэффициенты целочисленные/fixed-point.
- Hashing использует canonical serialization.
- Порядок применения effects явно определён и versioned.

## RNG streams

Используются forked scopes:

```text
month/events
month/market
month/npc
month/projects
month/flavor
```

Добавление косметического случайного текста не должно менять карьерный исход, поэтому независимые направления получают независимые streams.

## Golden trace

Golden fixture сохраняет:

- initial state hash;
- command;
- content/rules fingerprints;
- RNG state;
- selected candidates;
- applied effects;
- final state hash.

## Совместимость

Изменение алгоритма или порядка эффектов требует новой rules version и migration/compatibility decision. Старый сейв не пересчитывается новым алгоритмом молча.