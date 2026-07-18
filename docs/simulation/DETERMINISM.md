---
title: "Детерминированность"
type: simulation
status: draft
canon: true
depends_on: [ADR-007]
updated: 2026-07-18
---

# Детерминированность

Нормативное решение: [ADR-007](../adr/ADR-007-determinism-manifest.md).

## Цель

Одинаковые authoritative inputs, content/rules versions и `DeterminismManifest` обязаны давать одинаковый canonical result и trace hash на поддерживаемых платформах.

Детерминизм нужен для:

- crash-safe MonthRun resume;
- regression/golden tests;
- диагностики save divergence;
- mass balance simulation;
- совместимости исторического контента;
- безопасной эволюции правил.

## DeterminismManifest

```ts
type DeterminismManifest = Readonly<{
  rulesVersion: string;
  rngAlgorithm: 'xoshiro256ss-v1';
  hashAlgorithm: 'sha256-v1';
  numericModel: 'fixed-point-v1';
  calendarModel: 'gregorian-v1';
  candidateSort: 'stable-id-ascending-v1';
  effectOrdering: 'phase-then-priority-then-stable-id-v1';
  serializationVersion: 'canonical-json-v1';
}>;
```

Manifest сохраняется в committed save envelope, pending MonthRun draft и golden trace.

Изменение любого поля является явным compatibility event и требует новой версии/ADR/migration decision.

## Авторитетные входы MonthRun

Для воспроизводимости фиксируются:

- committed base state и revision;
- MonthPlan;
- rules version;
- content registry fingerprint;
- mod lock/fingerprint при наличии;
- Determinism Manifest;
- root RNG seed/state;
- decision/input log;
- explicit environment flags, влияющие на правила.

UI layout, system locale, wall clock, machine name и filesystem paths не являются входами симуляции.

## Обязательные правила

- `Math.random()` запрещён.
- `Date.now()`, system `Date` и timezone запрещены в core.
- Locale-dependent sorting/collation запрещены в authoritative selection/order.
- Event/NPC/project candidates сортируются по stable ID до weighted choice.
- Порядок файлов, JSON properties, object construction и map/set iteration не используется как неявный приоритет.
- Все authoritative коэффициенты integer/fixed-point.
- Hashing использует canonical serialization.
- Порядок применения effects явно определён и versioned.
- Parallel execution не меняет visible ordering или accumulation result.
- Diagnostic/flavor randomness не изменяет gameplay streams.
- Optional content absence обрабатывается явным compatibility/validation result, а не другим случайным порядком.

## Stable ordering

Любая коллекция, влияющая на outcome, получает явный comparator:

```text
phase
→ declared priority
→ stable entity/content ID
```

Запрещены:

- `localeCompare` в core;
- сортировка по отображаемому локализованному имени;
- зависимость от SQL row order без `ORDER BY`;
- зависимость от directory enumeration;
- last-write-wins без explicit load-order policy.

## RNG streams

Используются forked scopes:

```text
month/events
month/narrative
month/market
month/npc
month/projects
month/relationships
month/flavor
```

Fork key строится из versioned scope name и stable context ID. Добавление косметического текста не должно менять карьерный outcome.

`RandomSource` предоставляет integer-based operations:

```ts
interface RandomSource {
  nextUint32(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  weightedIndex(weights: readonly WeightInt[]): number;
  fork(scope: string): RandomSource;
  exportState(): SerializedRngState;
}
```

`nextFloat()` не является частью authoritative API.

## Decision/input log

При suspend/resume сохраняются:

- decision ID;
- selected option ID;
- request/idempotency ID;
- accepted run revision;
- canonical answer payload hash;
- resulting phase/trace hash.

Повтор того же ответа либо возвращает ранее сохранённый result, либо stable `AlreadyApplied`; он не потребляет RNG повторно.

## Trace

Trace создаётся по фазам MonthRun и содержит достаточно данных для поиска первого расхождения:

- phase/step ID;
- input state hash;
- relevant candidate IDs;
- selected IDs;
- RNG scope и before/after state hash;
- applied effect IDs/order;
- output state hash;
- pending decision metadata;
- final result hash.

Production trace может быть компактным и bounded. Debug build допускает расширенный trace, но оба используют одну canonical hash policy.

Trace hash — диагностический механизм, а не защита от изменения сейва пользователем.

## Canonical serialization

Canonical serializer задаёт:

- UTF-8;
- стабильный порядок object keys;
- canonical decimal strings для bigint/i64;
- отсутствие insignificant whitespace;
- явное различие missing и null по schema;
- stable enum/string representation;
- запрет NaN/Infinity/floats в authoritative payload;
- version tag.

Обычный `JSON.stringify` без подготовки canonical structure не считается достаточным контрактом.

## Golden trace

Golden fixture сохраняет:

- initial state hash;
- command/MonthPlan;
- content/rules/mod fingerprints;
- Determinism Manifest;
- root/fork RNG states;
- decision log;
- selected candidates;
- applied effects/order;
- phase hashes;
- final state/result hash.

Golden update требует human review причины и классификации изменения как intended balance/content/engine change.

## Совместимость

- Старый committed save не пересчитывается новым алгоритмом молча.
- Active MonthRun требует exact compatible manifest и content fingerprint.
- Изменение только UI не меняет manifest/rules version.
- Изменение event text без IDs/requirements/effects не должно менять gameplay fingerprint, если content fingerprint policy разделяет presentation и mechanics.
- Изменение candidate order/effect ordering/RNG/numeric scale требует новой version.
- Неизвестный manifest открывается только через supported migration, compatible legacy engine либо read-only/export flow.

## Проверки

- одинаковые inputs/manifest дают одинаковый state/trace на чистых процессах;
- тесты выполняются с разными system locale/timezone;
- random insertion order в исходных maps/files не меняет результат;
- добавление flavor RNG не меняет gameplay trace;
- duplicate resume/decision не меняет RNG state;
- каждый manifest field имеет compatibility fixture;
- SQL queries, влияющие на order, имеют explicit `ORDER BY`;
- TS и Rust canonical DTO/hash fixtures совпадают там, где boundary участвует в hash.