# ADR-006: Авторитетная числовая модель

- **Статус:** Proposed
- **Дата:** 2026-07-16

## Контекст

JavaScript `number` не представляет все 64-битные целые точно. Float также затрудняет межплатформенную воспроизводимость денег, вероятностей и прогресса.

## Предлагаемое решение

- Money в TS: `bigint` minor units.
- Money в Rust/SQLite: signed `i64`.
- Money через IPC: decimal string.
- Проценты: basis points.
- Вероятности: integer parts per million/weights.
- Прогресс и время: integer units.
- Коэффициенты: versioned fixed point.

Авторитетные операции проверяют overflow и имеют явный rounding mode.

## Последствия

Плюсы: точность, deterministic behavior, простой ledger и migration-safe storage.

Минусы: custom serialization и formatter, невозможность прямого JSON bigint, дополнительные helpers/tests.

## Альтернативы

- `number` с safe-range assumption — отклонено как неявная граница.
- decimal library — не требуется при фиксированных minor units и добавляет runtime dependency.