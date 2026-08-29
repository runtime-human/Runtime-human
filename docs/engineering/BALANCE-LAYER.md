---
title: "Balance layer"
type: engine
status: draft
canon: true
updated: 2026-08-27
---

# Balance layer

Gameplay tuning живёт в top-level `balance/` как closed JSONC-семьи. Обычный balance tweak — это правка `balance/**/*.jsonc` плюс свидетельство fingerprint; правка `game-core` TypeScript для неё не нужна. Алгоритм (композиция score, RNG execution, evidence semantics, state transition) остаётся в `game-core`; в `balance/` — только tuning-константы.

## Раскладка

```text
balance/
  quality/january-1990.jsonc        # quality-balance-v1
  skill-evidence/january-1990.jsonc # skill-evidence-balance-v1
```

Семьи:

- `quality-balance-v1` — базовые score, exhaustive-таблицы модификаторов по `access` / `learning` / `defectResponse`, границы outcome roll. Каждая строка таблицы несёт все три измерения (`clarity`/`correctness`/`reliability`).
- `skill-evidence-balance-v1` — amounts для skill evidence по закрытым enum-таблицам (практика обучения, defect response, access route). Какие skill/reasonCode — решает Core.

Правила семей:

- `sliceId` обязателен, совпадает с именем файла (stem) и даёт ровно один документ каждой семьи на slice: `BAL001_INCOMPLETE_TABLE` (неполный slice), `BAL003_SLICE_ID_MISMATCH`, `BAL004_DUPLICATE_FAMILY`, `DUPLICATE_PATH` (дубль пути).
- Enum-таблицы полны и закрыты: ключи фиксированы схемой, лишние ключи и лишние измерения отклоняются (`SCHEMA_INVALID`); свойства `__proto__`/`constructor`/`prototype` запрещены (`BAL005_FORBIDDEN_PROPERTY`).
- Диапазоны: base 0–100; модификаторы 0–10; границы roll 0–10 и `minimum <= maximum` (`BAL002_INVALID_RANGE`); evidence amount 1–10.
- Derived maxima не хранятся: максимумы score выводятся из закрытых таблиц (`deriveJanuaryQualityScoreMaximums`). Материализация результата валидируется против максимумов активного баланса; парс сохранённых результатов — против стабильного save-контракта `JANUARY_1990_QUALITY_SCORE_MAXIMUMS`.

## Authority и валидация

```text
TypeBox definitions (packages/game-authoring-schema/src/balance-schema.ts)
  → JSON Schema 2020-12 parity (tests/balance-authoring-schema-parity.test.ts)
  → compiler валидация (packages/game-content-compiler/src/balance-set.ts, Ajv 2020)
  → Core parse (packages/game-core/src/january-1990/january-balance.ts, closed contract)
```

Эквивалентность значений по умолчанию: `JANUARY_1990_DEFAULT_BALANCE` в Core канонически равен компиляции `balance/**` (проверяют `tests/january-1990-balance.test.ts` и `pnpm balance:check`). January golden outputs (bounded trace) обязаны оставаться байт-идентичными при эквивалентных значениях.

## Ruleset manifest

`createJanuary1990RulesetManifest` (game-core) публикует `january-1990-ruleset-manifest-v1`: `coreRulesVersion`, `contentFingerprint`, `balanceFingerprint`, `scenarioFingerprint` (placeholder `null` до scenario-волны). Balance fingerprint входит в `createJanuary1990RulesFingerprint`: изменение balance двигает rules fingerprint; design-token/не-gameplay изменения — нет.

## Ограничения пилота (Wave 7)

- `JANUARY_1990_DEFAULT_BALANCE` в Core — канонический снапшот значений по умолчанию; `pnpm balance:check` удерживает его в каноническом равенстве с `balance/**`. Balance-твик меняет JSONC-данные плюс синхронизирует снапшот-константы в том же изменении (данные, не алгоритмы; fingerprint/свидетельство обязательны). Полная независимость рантайма от снапшота появится вместе с compiled-balance artifact pipeline (следующая волна, owner-решение).
- Desktop-рантайм (`createJanuary1990Runtime`) пока запускается на каноническом снапшоте; точка вайринга `balance` в input уже есть.
- Посторонние slice в `balance/` отвергаются гейтом `balance:check`, компилятор их валидирует, но не фильтрует.

## Верификация

- `pnpm balance:check` — компиляция и валидация `balance/**`, каноническое равенство с Core-default;
- `pnpm gamectl doctor && pnpm gamectl content validate` — смежный smoke (content pipeline);
- January-тесты (`tests/january-1990-balance.test.ts`, `tests/january-1990-balance-trace.test.ts`) — эквивалентность и goldens.
