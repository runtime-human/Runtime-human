---
title: "EVENT-CHAINS"
type: events
status: draft
canon: true
updated: 2026-07-18
---

# Цепочки событий

## Модель

Event chain — versioned state machine, связывающая несколько событий и delayed consequences.

```ts
type NarrativeArcState = Readonly<{
  arcId: NarrativeArcId;
  definitionVersion: number;
  stageId: string;
  participantIds: readonly PersonId[];
  unresolvedHooks: readonly HookId[];
  startedAt: GameDate;
  deadline?: GameDate;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
}>;
```

## Требования

- переходы объявляются в data definition;
- stages имеют stable IDs;
- участники сохраняются между этапами;
- цепочка может ждать календарную дату, условие или событие;
- отсутствующий следующий stage является validation error;
- completion/failure записываются в narrative history.

## Ветвление

Выбор игрока может менять stage, relationships, future weights и delayed effects. Все ветви должны быть достижимы либо явно помечены как reserved.

## Таймауты

Arc может завершиться, провалиться или перейти в fallback stage после deadline. Timeout не должен молча удалять историю.

## Совместимость

Активная цепочка сохраняет definition version. Изменение или удаление stage требует migration/tombstone mapping.

## Тестирование

- graph has no dangling transitions;
- обязательные stages достижимы;
- нет бесконечного zero-time loop;
- participants сохраняются;
- save/load между stages;
- migration активных arcs;
- deterministic continuation.