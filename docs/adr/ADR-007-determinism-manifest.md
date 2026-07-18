---
title: "ADR-007-determinism-manifest"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-007: Determinism Manifest

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и replay/debugging requirements

## Контекст

Seeded PRNG недостаточен для воспроизводимости, если меняются порядок кандидатов, hash, fixed-point model, календарь, canonical serialization или effect ordering.

## Решение

Сохранять versioned `DeterminismManifest` с:

- rules version;
- RNG algorithm/version;
- hash algorithm/version;
- numeric model/version;
- calendar model/version;
- candidate sort policy;
- effect ordering policy;
- canonical serialization version.

Дополнительно обязательны:

- stable ID sorting до random selection;
- independent RNG forks по scope;
- canonical serialization;
- запрет system time, locale-dependent sorting, filesystem order и `Math.random`;
- input/decision log;
- phase trace hash;
- golden traces.

## Последствия

Любое изменение deterministic primitive становится явным breaking rules change. Старые месяцы не пересчитываются молча, а active drafts требуют exact compatibility.

Trace hash используется для диагностики, но не считается криптографической защитой сейва от пользователя.

## Альтернативы

- хранить только seed — отклонено;
- надеяться на текущий JS iteration order — отклонено;
- записывать все случайные результаты без версии правил — недостаточно для debugging effects;
- full event sourcing всей жизни — отклонено как чрезмерная сложность.

## Verification

- одинаковый input/seed/manifest даёт одинаковый canonical result и trace;
- намеренное изменение каждого manifest field ломает compatibility fixture ожидаемым образом;
- golden tests выполняются на clean process и не используют системную locale/timezone.