# NPC и narrative memory

## Уровни NPC

### Active

Полное состояние для партнёра, руководителя, близкого коллеги, co-founder, ключевого maintainer и других участников регулярных событий.

### Background

Сокращённое состояние: identity, role, organization, traits, relationship summary и last seen.

### Archived

Историческая запись после выхода из активной среды. Archived NPC сохраняет stable ID и ключевые связи для журнала и будущих возвращений.

## PersonState

Содержит:

- PersonId;
- identity и birth date;
- status/tier;
- traits;
- role и organization;
- location context;
- relationship refs;
- narrative memory;
- current availability.

## Narrative memory

Memory хранит только значимые facts:

- общие проекты;
- обещания;
- конфликты;
- помощь;
- увольнение/переход компании;
- семейные события;
- unresolved hooks.

Она не является свободным LLM-текстом и представлена typed records с source event ID.

## Promotion/demotion tiers

NPC повышается до active при попадании в важную цепочку или устойчивые отношения. Уход из активного окружения переводит его в background/archived после сохранения нужной истории.

## Генерация

NPC generation deterministic, использует era/city/organization profiles и отдельный RNG stream. Имена локализуемы и не должны повторяться в активном круге без намерения.

## Invariants

- стабильный PersonId;
- один current employer;
- relationships симметричны там, где это требуется типом;
- event participant существует;
- archived NPC не получает регулярные daily updates;
- narrative facts ссылаются на существующее event/history record.

## Privacy

NPC полностью вымышлены. Игра не импортирует реальные контакты пользователя и не использует внешние персональные данные.