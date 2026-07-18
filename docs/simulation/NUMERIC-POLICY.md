---
title: "NUMERIC-POLICY"
type: simulation
status: draft
canon: true
updated: 2026-07-18
---

# Числовая политика

Нормативное решение: [ADR-006](../adr/ADR-006-numeric-model.md).

## Цель

Все авторитетные расчёты Runtime Human должны быть точными, воспроизводимыми, проверяемыми на переполнение и одинаковыми между TypeScript, Rust, SQLite и сохранёнными DTO.

Floating point не используется как источник истины в домене, симуляции, сейвах или IPC-контрактах.

## Авторитетные представления

| Значение | Тип/представление |
|---|---|
| Деньги в TypeScript | branded `bigint` minor units (`MoneyMinor`) |
| Деньги в Rust/SQLite | checked signed `i64` |
| IPC/JSON money | canonical decimal string |
| Проценты/ставки | `RateBps`, integer basis points |
| Вероятности | `ChancePpm` либо integer weights |
| Вес выбора | `WeightInt`, non-negative integer |
| XP | `XpPoint`, integer |
| Прогресс | `ProgressMilli` либо другой versioned integer scale |
| Время | `WorkUnit`/integer minutes |
| Коэффициенты | versioned fixed-point integer |

Конкретный scale является частью rules/numeric model version и не меняется молча.

## Нормативные типы

```ts
type MoneyMinor = bigint & { readonly __brand: 'MoneyMinor' };
type RateBps = number & { readonly __brand: 'RateBps' };
type ChancePpm = number & { readonly __brand: 'ChancePpm' };
type WeightInt = number & { readonly __brand: 'WeightInt' };
type ProgressMilli = number & { readonly __brand: 'ProgressMilli' };
type WorkUnit = number & { readonly __brand: 'WorkUnit' };
type XpPoint = number & { readonly __brand: 'XpPoint' };
```

В TypeScript числа кроме `bigint` физически представлены `number`, но constructors/validators разрешают только safe integers в установленном диапазоне. Дробное значение, `NaN`, `Infinity`, `-Infinity` и unsafe integer отклоняются на границе.

## Money

```ts
type Money = Readonly<{
  currency: CurrencyCode;
  amountMinor: MoneyMinor;
}>;
```

В baseline используется одна вымышленная валюта города. `CurrencyCode` сохраняется для явности и migration-safe contracts, но multi-currency economy не реализуется.

### Money boundary

- TypeScript core работает с `bigint`;
- Rust и SQLite сохраняют `i64`;
- IPC/JSON использует строку без экспоненты, пробелов, десятичной точки и ведущего `+`;
- парсер проверяет canonical form и диапазон `i64`;
- преобразование `bigint ↔ string ↔ i64` покрывается boundary tests.

## Правила операций

- Запрещено смешивать разные branded units без явного converter.
- Каждое сложение, вычитание и умножение проверяет диапазон целевого storage type.
- Деление требует явного rounding mode.
- Финансовый ledger хранит исходные minor units, а не отформатированный текст.
- UI форматирует сумму только на display boundary.
- Отрицательные деньги разрешены только в доменах, где долг является валидным состоянием.
- Saturating arithmetic не применяется молча; overflow является domain/application error.

## Rounding policy

Допустимые режимы задаются явно:

```text
toward-zero
floor
ceil
half-up
half-even
```

Каждая формула документирует:

- входные units;
- intermediate scale;
- rounding point;
- rounding mode;
- range/overflow policy;
- rules version.

Нельзя применять повторное округление на нескольких слоях без отдельной спецификации.

## Вероятности и weighted choices

Weighted choices работают с неотрицательными целыми weights. Не используется сумма floating-point probabilities.

Правила:

- negative weight — validation error;
- все нулевые weights — явный `NoEligibleCandidate`;
- accumulation проверяет overflow;
- порядок candidates стабилен до random selection;
- conversion из `ChancePpm` в outcome использует integer comparison;
- UI-проценты являются projection и не участвуют обратно в расчёте.

## Fixed-point

Для коэффициента с точностью 1/10 000 хранится integer scale 10_000. Другой scale получает отдельное имя/версию типа.

Пример:

```text
RateBps(12_50) = 12.50%
ProgressMilli(12_345) = 12.345 units
```

Не допускается один универсальный `ScaledNumber` без семантического типа: money, probability, progress и rate не взаимозаменяемы.

## Где float разрешён

Только вне authoritative core:

- анимации;
- графики;
- UI interpolation;
- layout/render calculations;
- диагностические статистические projections;
- profiler output.

Float result:

- не записывается обратно в GameState;
- не сериализуется как authoritative save value;
- не используется для выбора событий/outcomes;
- не является входом следующего MonthRun.

## Enforcement

- constructors/validators создают branded values только из safe integers;
- public core API не принимает plain коэффициенты без unit type;
- architecture tests запрещают domain types с незафиксированным floating semantics;
- TypeBox/Ajv schemas проверяют integer/string boundaries;
- Rust DTO conversion использует checked conversions;
- SQL constraints применяются там, где они не дублируют сложную бизнес-логику;
- balance data проходит semantic range validation.

## Тесты

- минимальная/максимальная граница `i64`;
- overflow/underflow каждой операции;
- отрицательные значения и долг;
- все rounding modes на положительных и отрицательных значениях;
- serialization round trip;
- non-canonical IPC string rejection;
- unsafe JS integer rejection;
- weighted choice zero/large weights;
- monotonicity основных формул;
- fixed-point scale compatibility;
- отсутствие float/NaN/Infinity в authoritative state и persistence DTO;
- property tests для последовательностей начислений и списаний.