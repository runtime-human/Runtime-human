# Схема контента событий

## Формат

Исходники событий хранятся в JSONC. TypeBox определяет TypeScript type и JSON Schema; Ajv выполняет runtime validation.

## Минимальная форма

```ts
type EventDefinition = Readonly<{
  id: EventId;
  version: number;
  category: EventCategory;
  tags: readonly string[];
  availability: AvailabilityRule;
  requirements: readonly Condition[];
  weight: number;
  cooldownMonths?: number;
  blocking: boolean;
  participants?: readonly ParticipantSelector[];
  choices: readonly EventChoice[];
  journal: LocalizationKey;
  metadata: ContentMetadata;
}>;
```

## Choice

Choice содержит локализационный ключ, дополнительные requirements, immediate effects, delayed effects, chain transition и optional preview policy.

## Condition/effect registry

Каждая операция имеет:

- discriminator;
- schema;
- pure evaluator/handler;
- version;
- semantic checks;
- tests.

Неизвестный discriminator блокирует загрузку pack.

## Metadata

- author;
- review status;
- content version;
- created/last reviewed dates;
- sensitivity tags;
- narrative arc;
- target life stage;
- target frequency;
- sourceRefs для исторических claims.

## Validation levels

1. JSONC parse with source locations.
2. Schema validation.
3. Stable ID/namespace validation.
4. Reference resolution.
5. Chronology validation.
6. Reachability and chain validation.
7. Localization completeness.
8. Balance lint.

## Error UX

Validator показывает файл, line/column, JSON path, rule ID и безопасное исправление, если оно однозначно. Ошибка одного мода помещает pack в quarantine, а не повреждает core content.