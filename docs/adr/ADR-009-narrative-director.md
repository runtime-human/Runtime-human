# ADR-009: Narrative Director

- **Статус:** Accepted
- **Дата:** 2026-07-16
- **Основание принятия:** архитектурный red-team review, DR-001 и DR-002

## Контекст

Одних event requirements, weights и cooldown недостаточно: игра может повторять одинаковые события, создавать кризисные серии и бросать сюжетные цепочки.

## Решение

Создать отдельный чистый `NarrativeDirector`, который получает допустимые candidates от Event Engine и применяет pacing modifiers:

- blocking budget;
- anti-repeat/anti-streak;
- category/participant diversity;
- intensity/recovery windows;
- active arc priority;
- quiet months;
- milestones;
- novelty/recency score;
- protection от нескольких однотипных решений подряд.

Director не меняет effects, не обходит requirements и не создаёт недопустимые события. Все modifiers целочисленные и входят в versioned rules/determinism manifest.

## Последствия

Плюсы:

- управляемый ритм;
- разнообразие;
- сюжетная непрерывность;
- измеримый event pacing;
- возможность balance simulations.

Минусы:

- новый набор balance rules, metrics и golden snapshots;
- требуется объяснимый trace выбора события;
- плохие weights Director могут скрывать валидный контент.

## Альтернативы

- увеличивать число cooldown полей в каждом событии — плохо масштабируется;
- полностью scripted campaign — уменьшает реиграбельность;
- чистая случайность — ухудшает narrative quality.

## Verification

Mass simulation проверяет:

- долю blocking/quiet months;
- повтор событий и категорий;
- abandoned arcs;
- crisis streaks;
- diversity NPC;
- milestone delivery;
- deterministic selection trace.