---
title: "Tombstones и deprecation"
type: content
status: draft
canon: true
updated: 2026-07-18
---

# Tombstones и deprecation

## Проблема

Сейвы, active event chains и проекты хранят stable content IDs. Простое удаление или переиспользование ID ломает совместимость.

## Правила ID

- ID immutable после accepted release.
- Display name и localization key могут меняться отдельно.
- Удалённый ID никогда не назначается новой сущности.
- Rename реализуется alias/replacement mapping, а не сменой identity.

## Tombstone

```ts
type ContentTombstone = Readonly<{
  id: ContentId;
  removedIn: string;
  replacementId?: ContentId;
  fallbackPolicy: 'archive' | 'replace' | 'close' | 'read-only';
  migrationNote: string;
}>;
```

## Active objects

- project может перейти в archived legacy definition;
- event chain требует stage mapping;
- equipment сохраняет snapshot необходимых характеристик;
- company/technology reference может быть заменён только явной migration.

## Deprecation period

Deprecated definition остаётся в runtime до истечения support window старых сейвов. CI проверяет, что она не создаётся новым content selector.

## Validation

- no reused IDs;
- all removed IDs have tombstones;
- replacement exists and compatible;
- no replacement cycles;
- active fixture migrations pass;
- localization для legacy display доступна.

## Документация

Destructive content change описывается в changelog и PR. Массовая очистка «неиспользуемых» IDs через Knip-подобный инструмент запрещена без save reference analysis.