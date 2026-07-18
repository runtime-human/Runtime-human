---
title: "ADR-006: Авторитетная числовая модель"
type: adr
status: accepted
canon: true
updated: 2026-07-18
---

# ADR-006: Авторитетная числовая модель

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** DR-001, DR-002 и deterministic simulation requirements

## Контекст

JavaScript `number` не представляет все 64-битные целые точно. Floating point также затрудняет межплатформенную воспроизводимость денег, вероятностей, progression accumulators и балансовых формул.

## Решение

- Money в TS: branded `bigint` minor units.
- Money в Rust/SQLite: checked signed `i64`.
- Money через IPC/JSON: canonical decimal string.
- Проценты: integer basis points.
- Вероятности: integer parts per million либо integer weights.
- Прогресс и время: integer units.
- Коэффициенты: versioned fixed-point types с явным scale.
- Rounding mode задаётся явно для каждой формулы.
- Все авторитетные операции проверяют overflow/underflow.

Floating point запрещён в `shared-kernel`, `game-core`, simulation results и persistence contracts. Он допускается только для render-only animation, charts и неавторитетной diagnostics/analytics projection.

## Нормативные типы

```text
MoneyMinor
RateBps
ChancePpm
WeightInt
ProgressMilli
WorkUnit
XpPoint
```

Конкретные scales фиксируются в `NUMERIC-POLICY.md` и versioned rules manifest.

## Последствия

Плюсы:

- точность;
- deterministic behavior;
- простой ledger;
- migration-safe storage;
- golden tests не зависят от platform float behavior.

Минусы:

- custom serialization/formatters;
- JSON не поддерживает bigint напрямую;
- дополнительные conversion helpers и boundary tests;
- балансировщикам необходимо работать с явными scales.

## Альтернативы

- `number` с safe-range assumption — отклонено как неявная граница;
- decimal runtime library — не требуется для текущей модели и добавляет dependency;
- float с округлением в конце — отклонено, поскольку промежуточные ошибки остаются.

## Enforcement

- architecture/lint test запрещает plain float-like domain aliases;
- formulas принимают branded numeric types;
- DTO validation отклоняет non-canonical decimals;
- property tests проверяют range, monotonicity и rounding boundaries.