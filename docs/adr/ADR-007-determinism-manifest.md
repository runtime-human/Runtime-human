# ADR-007: Determinism Manifest

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

Seeded PRNG недостаточен для воспроизводимости, если меняются порядок кандидатов, hash, fixed-point model, календарь или effect ordering.

## Предлагаемое решение

Сохранять versioned `DeterminismManifest` с rules version, RNG algorithm, hash algorithm, numeric model, calendar model и candidate sort policy.

Дополнительно:

- stable ID sorting;
- independent RNG forks;
- canonical serialization;
- запрет system time/locale/Math.random;
- golden traces.

## Последствия

Любое изменение deterministic primitive становится явным breaking rules change. Старые месяцы не пересчитываются молча, а active drafts требуют exact compatibility.

## Альтернативы

- хранить только seed — отклонено;
- надеяться на текущий JS iteration order — отклонено;
- записывать все случайные результаты без версии правил — недостаточно для debugging effects.