---
title: "Authoring toolchain (TypeBox pilot)"
type: engine
status: draft
canon: true
updated: 2026-08-27
---

# Authoring toolchain — TypeBox pilot (Wave 6)

Authoring-схемы — это build-time контракт для canonical JSONC-данных. Runtime никогда не получает authoring-зависимости: `typebox`, `ajv` и `jsonc-parser` разрешены только в своих build-only владельцах (проверяется `pnpm boundaries:check`; владельцы: `game-content-compiler` — ajv/jsonc-parser, `game-authoring-schema` — typebox).

## Архитектура семьи

```text
TypeBox definitions (packages/game-authoring-schema)
  → JSON Schema 2020-12 (generated, $schema + $id + $defs/$ref)
  → существующий Ajv 2020 validation (compiler) — без замены валидатора
  → Static<T> TypeScript-типы для authoring-кода
```

Миграция family-by-family: одна семья за волну, эквивалентность доказывается тестом до переключения потребителя. Runtime boundary parsers (saves, MonthRun, persistence envelopes, security IPC) авторинг-схемами не заменяются никогда.

## Статус семей

| Семья | Статус | Пакет/модуль |
|---|---|---|
| content-source-v1 | **pilot: эквивалентность доказана** | `packages/game-authoring-schema` → `ContentSourceAuthoringSchemaV1` |
| quality-balance-v1 / skill-evidence-balance-v1 | **эквивалентность доказана** | `packages/game-authoring-schema` → `balance-schema.ts` (parity: `tests/balance-authoring-schema-parity.test.ts`) |
| balance / scenario / fixture / repro / diagnostic | planned | соответствующие волны (§48 плана) |

## Эквивалентность (контракт пилота)

`tests/authoring-schema-equivalence.test.ts` доказывает на одном Ajv2020 (одинаковые опции):

- accept-parity: 3 фикстуры `tests/fixtures/content-compiler/valid/` + весь реальный `content/**` (≥25 документов) принимаются обеими схемами;
- reject-parity: ≥30 мутаций (missing-поля, типы, паттерны, uniqueItems, minItems, additionalProperties, authoritative-number ограничения) отклоняются обеими;
- генерация детерминирована; `$schema` = 2020-12, `$id` закреплён.

Известные допустимые структурные отличия генерата: `anyOf` вместо `enum`/`oneOf` для закрытых множеств — ветки disjoint, решения Ajv идентичны (покрыто матрицей).

## Правила

- Новые семьи добавляются только с parity-тестом в том же PR.
- Генерат не коммитится как источник: source of truth — TypeBox-определения; JSON Schema — производный артефакт для Ajv/внешних инструментов.
- Runtime-бандл десктопа не импортирует authoring-пакет (boundary tests).
- Скриптовая дамп-команда — planned: `gamectl`/CLI-доступ к сгенерированным схемам появится вместе с catalog schema-слоем.
