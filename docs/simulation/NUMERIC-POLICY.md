# Числовая политика

## Авторитетные представления

| Значение | Представление |
|---|---|
| Деньги в TypeScript | `bigint` minor units |
| Деньги в Rust/SQLite | signed `i64` |
| IPC money | decimal string |
| Проценты | basis points, integer |
| Вероятности | parts per million, integer |
| XP/progress | integer units |
| Время | integer work units/minutes |
| Коэффициенты | fixed-point integer |

## Money

```ts
type Money = Readonly<{
  currency: CurrencyCode;
  amountMinor: bigint;
}>;
```

В baseline используется одна вымышленная валюта города. CurrencyCode сохраняется для явности и будущих migration-safe contracts, но multi-currency economy не реализуется.

## Правила операций

- Запрещено смешивать валюты без явного converter.
- Каждое сложение/умножение проверяет диапазон `i64`.
- Округление задаётся операцией и покрывается тестом.
- Финансовый ledger хранит исходные minor units.
- UI форматирует сумму только на границе отображения.

## Вероятности

Weighted choices работают с неотрицательными целыми weights. Не используется сумма floating-point probabilities.

## Fixed point

Для коэффициента с точностью 1/10 000 хранится integer scale 10_000. Деление имеет явно выбранный rounding mode.

## Неавторитетный float

Допускается только для:

- анимаций;
- графиков;
- UI interpolation;
- диагностических статистик.

Float не сохраняется как источник истины для денег, вероятностей, прогресса и outcomes.

## Тесты

- границы `i64`;
- отрицательные значения и долг;
- rounding;
- serialization round trip;
- IPC string conversion;
- отсутствие NaN/Infinity в read models.