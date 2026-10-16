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

## REF-02A1 — изолированный v2 outcome oracle

Новый `january-v2-approach-oracle.ts` — чистая детерминированная тестовая модель
четырёх подходов по ADR-021. Она принимает уже реализованный исход RNG (целое
`0..9`) и не запускает RNG сама. Exhaustive oracle проверяет 8 контекстов,
Pareto-anti-dominance, реальную цену `assisted`, преимущество помощи по
возможности закончить и неизменность множества доступных delivery/quality
классов при разных backgrounds.

**Статус: REF-02A1 — экспериментальная модель, не production balance.**
Таблица `JANUARY_V2_PROVISIONAL_APPROACH_TABLE` — временная тестовая
фикстура; она не является новой authoritative JSONC-family. Следующий
REF-02A2 должен перенести настройки в отдельную закрытую JSONC-семью,
реализовать TypeBox/Ajv компиляцию, добавить `pnpm balance:check` для v2,
детерминированный bounded-trace и закрепить fingerprint. До этого v2 outcome
не используется в игровом MonthRun; v1 JSONC/fingerprints не изменяются.
Формальная проверка недоминирования двух background должна учитывать их
подтверждённые смысловые контекстные преимущества и остаётся открытой:
равное множество outcome не доказывает отсутствие dominance по timing.

## REF-02A2a — проверяемый контракт approach-balance-v1 (2026-10-16)

Добавлена отдельная closed JSONC-семья `balance/approach/january-1990-v2.jsonc`.
Её четыре строки `approaches` проверяются Ajv 2020 и TypeBox parity,
а затем существующим `assertJanuaryV2ApproachBalance` (risk/help, cost,
Pareto-anti-dominance, invariants). `pnpm balance:check` теперь требует
наличия этой семьи и сверяет её с фиксированным Core snapshot. Её fingerprint
создаётся в отдельном домене `january-v2-approach-balance-v1`, а не через
January v1 rules fingerprint. Семьи v1 и исходные fixtures не меняются.

**Это узкий A2a, а не полный REF-02A.** Текущие модификаторы
background/learning/defect по-прежнему кодируются в изолированном oracle
(#210), а не в JSONC. A2b должен перенести их в версионированные закрытые
таблицы, продемонстрировать отсутствие dominance между стартовыми условиями
и вариантами обучения, добавить multi-seed bounded trace, закрепить fingerprint
как golden и проверить сохранение v1/legacy invariants. До этого новый баланс
не подключён к production MonthRun, save, UI или контенту.

## REF-02A2b — контекстные trade-offs, provisional

В отдельной closed JSONC-семье
`balance/context/january-1990-v2.jsonc` заданы модификаторы
`startBackground × approach`, `learningMode` и `defect`.
Core теперь вычисляет порог завершения по этим версионированным данным.
`home-pc` помогает самостоятельному поиску, `shared-school-pc` —
варианту `ask-for-help` (помощь без NPC). `read-and-run` улучшает шанс
закончить сейчас, `edit-and-debug` повышает *practiceOpportunity*.
Это только дизайнерская возможность практики, **не** авторитетное evidence,
не mastery и не автоматически присуждаемый грейд.

Недоминирование проверяется исчерпывающе для двух backgrounds, двух
learning modes, двух дефектов и релевантных подходов; исходы по роллам 0–9
закрепляются bounded-trace fixture. Финальный `balance:check` принимает
обе v2-семьи и сохраняет v1 правила без изменений. Этот контракт не
означает принятие production MonthRun v2, сохранений или игры до февраля.
Маркеры контента и их truthfulness остаются REF-02B.

## Верификация

- `pnpm balance:check` — компиляция и валидация `balance/**`, каноническое равенство с Core-default;
- `pnpm gamectl doctor && pnpm gamectl content validate` — смежный smoke (content pipeline);
- January-тесты (`tests/january-1990-balance.test.ts`, `tests/january-1990-balance-trace.test.ts`) — эквивалентность и goldens.
